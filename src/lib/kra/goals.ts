/**
 * Goal daily-loop + 2-step verification service (Plan B, Phase 3).
 *
 * Reuses MetricContribution as the dated progress-log ledger (spec's ProgressLog) and
 * EmployeeGoal as the goal. Progress is recomputed as the single source of truth:
 *   - verified contributions (AUTO_VERIFIED / MANAGER_APPROVED) count their verifiedValue
 *   - manual self-reports (source MANUAL, still pending) count their reportedValue
 *   - unverified SYSTEM contributions do not count yet
 *   - REJECTED never counts
 * The goal-level submit -> TL -> MANAGER chain is the verification gate (spec §10).
 */
import { prisma } from '@/lib/prisma';
import { computePeriodWindow, type KraPeriodType } from '@/lib/kra/period';
import {
  type Actor,
  KraScopeError,
  assertManagerScope,
  assertOwnership,
  requireRole,
  resolveSelfProfile,
} from '@/lib/kra/scope';
import { notify, userIdForProfile } from '@/lib/kra/notify';

const VERIFIED_STATUSES = new Set(['AUTO_VERIFIED', 'MANAGER_APPROVED']);
const EDITABLE_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'REJECTED']);

/** Contribution value that counts toward goal progress. */
function countableValue(c: { status: string; source: string; reportedValue: number; verifiedValue: number | null }): number {
  if (c.status === 'REJECTED') return 0;
  if (VERIFIED_STATUSES.has(c.status)) return c.verifiedValue ?? c.reportedValue;
  if (c.source === 'MANUAL') return c.reportedValue; // self-report counts immediately
  return 0; // unverified system contribution waits for review
}

/**
 * Recompute one goal's progress from its metric's contributions inside the window.
 * progressValue is ALWAYS the (countable) sum of logs — never incremented directly.
 */
export async function recomputeGoalProgress(goalId: string): Promise<void> {
  const goal = await prisma.employeeGoal.findUnique({
    where: { id: goalId },
    select: { id: true, employeeId: true, metricId: true, startDate: true, endDate: true, targetValue: true, status: true },
  });
  if (!goal || !goal.metricId) return;

  const contributions = await prisma.metricContribution.findMany({
    where: {
      employeeId: goal.employeeId,
      metricId: goal.metricId,
      date: { gte: goal.startDate, lte: goal.endDate },
    },
    select: { status: true, source: true, reportedValue: true, verifiedValue: true },
  });

  const done = contributions.reduce((s, c) => s + countableValue(c), 0);
  const pct = goal.targetValue > 0 ? Math.min(100, (done / goal.targetValue) * 100) : 0;

  await prisma.employeeGoal.update({
    where: { id: goal.id },
    data: {
      currentValue: done,
      verifiedValue: done,
      achievementPercentage: pct,
      // First log flips PENDING -> IN_PROGRESS; never override submitted/verified/rejected.
      ...(goal.status === 'PENDING' ? { status: 'IN_PROGRESS' } : {}),
    },
  });
}

/** Recompute every goal that draws on a given (employee, metric). */
export async function recomputeGoalsForMetric(employeeId: string, metricId: string): Promise<void> {
  const goals = await prisma.employeeGoal.findMany({
    where: { employeeId, metricId },
    select: { id: true },
  });
  for (const g of goals) await recomputeGoalProgress(g.id);
}

export interface LogProgressArgs {
  actorUserId: string;
  goalId: string;
  value: number;
  note?: string;
  date?: Date;
}

/** Employee logs dated progress against a goal they own. */
export async function logProgress(args: LogProgressArgs) {
  if (!args.value) throw new KraScopeError('A non-zero value is required', 400);
  const self = await resolveSelfProfile(args.actorUserId);

  const goal = await prisma.employeeGoal.findUnique({
    where: { id: args.goalId },
    select: { id: true, employeeId: true, companyId: true, metricId: true, status: true, ratePerUnit: true, title: true },
  });
  if (!goal) throw new KraScopeError('Goal not found', 404);
  assertOwnership(goal.employeeId, self.id);
  if (!goal.metricId) throw new KraScopeError('This goal has no metric to log against', 400);
  if (!EDITABLE_STATUSES.has(goal.status)) {
    throw new KraScopeError(`Goal is locked for editing (status ${goal.status})`, 409);
  }

  const date = args.date ?? new Date();

  const contribution = await prisma.metricContribution.create({
    data: {
      companyId: goal.companyId,
      employeeId: goal.employeeId,
      metricId: goal.metricId,
      reportedValue: args.value,
      verifiedValue: null,
      status: 'PENDING',
      source: 'MANUAL',
      note: args.note ?? null,
      date,
    },
  });

  // Auto-revenue: link a RevenueTransaction so it cascades away if the log is deleted.
  const rate = goal.ratePerUnit ?? 0;
  if (rate > 0) {
    await prisma.revenueTransaction.create({
      data: {
        companyId: goal.companyId,
        transactionNumber: `KRA-${contribution.id}`,
        amount: args.value * rate,
        paymentMethod: 'AUTO_KRA',
        paymentDate: date,
        claimedByEmployeeId: goal.employeeId,
        source: goal.title,
        description: `Auto-revenue from KRA goal "${goal.title}"`,
        metricContributionId: contribution.id,
      },
    });
  }

  await recomputeGoalProgress(goal.id);
  return { contributionId: contribution.id };
}

/** Employee deletes one of their own logs; linked auto-revenue cascades; progress drops. */
export async function deleteLog(actorUserId: string, logId: string) {
  const self = await resolveSelfProfile(actorUserId);
  const c = await prisma.metricContribution.findUnique({
    where: { id: logId },
    select: { id: true, employeeId: true, metricId: true, source: true },
  });
  if (!c) throw new KraScopeError('Log not found', 404);
  assertOwnership(c.employeeId, self.id);
  if (c.source !== 'MANUAL') throw new KraScopeError('Only manual logs can be deleted', 403);

  await prisma.metricContribution.delete({ where: { id: c.id } }); // RevenueTransaction cascades
  await recomputeGoalsForMetric(c.employeeId, c.metricId);
  return { ok: true as const };
}

/** Employee submits a goal for verification, attaching proof. Locks editing. */
export async function submitGoal(actorUserId: string, goalId: string, proofUrl?: string, proofNote?: string) {
  const self = await resolveSelfProfile(actorUserId);
  const goal = await prisma.employeeGoal.findUnique({
    where: { id: goalId },
    select: { id: true, employeeId: true, status: true, reviewerId: true, title: true },
  });
  if (!goal) throw new KraScopeError('Goal not found', 404);
  assertOwnership(goal.employeeId, self.id);
  if (!EDITABLE_STATUSES.has(goal.status)) {
    throw new KraScopeError(`Goal cannot be submitted from status ${goal.status}`, 409);
  }

  await prisma.$transaction([
    prisma.employeeGoal.update({ where: { id: goal.id }, data: { status: 'SUBMITTED' } }),
    prisma.proof.create({
      data: {
        goalId: goal.id,
        type: proofUrl ? 'LINK' : 'NOTE',
        url: proofUrl ?? null,
        note: proofNote ?? null,
      },
    }),
  ]);

  if (goal.reviewerId) {
    await notify({
      userId: goal.reviewerId,
      title: 'Goal submitted for verification',
      message: `A goal "${goal.title}" is awaiting your TL verification.`,
      type: 'KRA_VERIFY',
      link: '/dashboard/performance/verify',
    });
  }
  return { ok: true as const };
}

type Decision = 'APPROVE' | 'REJECT';

async function recordVerification(
  actor: Actor,
  goalId: string,
  level: 'TL' | 'MANAGER',
  decision: Decision,
  expectedStatus: string,
  approveStatus: string,
  comment?: string,
) {
  const goal = await prisma.employeeGoal.findUnique({
    where: { id: goalId },
    select: { id: true, employeeId: true, status: true, title: true },
  });
  if (!goal) throw new KraScopeError('Goal not found', 404);
  await assertManagerScope(actor, goal.employeeId);
  if (goal.status !== expectedStatus) {
    throw new KraScopeError(`INVALID_STATE: goal must be ${expectedStatus}, is ${goal.status}`, 409);
  }

  const approved = decision === 'APPROVE';
  const newStatus = approved ? approveStatus : 'REJECTED';

  await prisma.$transaction([
    prisma.goalVerification.create({
      data: { goalId: goal.id, level, verifierId: actor.id, status: approved ? 'APPROVED' : 'REJECTED', comment: comment ?? null },
    }),
    prisma.employeeGoal.update({ where: { id: goal.id }, data: { status: newStatus } }),
  ]);

  const employeeUserId = await userIdForProfile(goal.employeeId);
  if (employeeUserId) {
    await notify({
      userId: employeeUserId,
      title: approved ? `Goal ${level}-approved` : `Goal rejected by ${level}`,
      message: approved
        ? `Your goal "${goal.title}" was approved at the ${level} step.`
        : `Your goal "${goal.title}" was rejected${comment ? `: ${comment}` : ''}. You can fix and resubmit.`,
      type: 'KRA_VERIFY',
      link: '/dashboard/my-performance',
    });
  }
  return { ok: true as const, status: newStatus };
}

/** TL verifies a SUBMITTED goal. Approve -> TL_VERIFIED, reject -> REJECTED. */
export async function tlVerify(actor: Actor, goalId: string, decision: Decision, comment?: string) {
  requireRole(actor.role, 2); // TEAM_LEADER+
  return recordVerification(actor, goalId, 'TL', decision, 'SUBMITTED', 'TL_VERIFIED', comment);
}

/** Manager verifies a TL_VERIFIED goal. Approve -> MANAGER_VERIFIED (final), reject -> REJECTED. */
export async function managerVerify(actor: Actor, goalId: string, decision: Decision, comment?: string) {
  requireRole(actor.role, 3); // MANAGER+
  return recordVerification(actor, goalId, 'MANAGER', decision, 'TL_VERIFIED', 'MANAGER_VERIFIED', comment);
}

export interface AssignGoalArgs {
  employeeId: string; // EmployeeProfile id
  title: string;
  period: KraPeriodType;
  target: number;
  metric: string; // unit label
  dailyTarget?: number;
  metricId?: string;
  ratePerUnit?: number;
  dimension?: string;
  reviewerId?: string;
}

/** Manual single goal assignment (spec §5a). MANAGER+ with scope. */
export async function assignGoal(actor: Actor, input: AssignGoalArgs) {
  requireRole(actor.role, 3); // MANAGER+
  const profile = await assertManagerScope(actor, input.employeeId);
  if (!input.title?.trim()) throw new KraScopeError('Title is required', 400);

  const win = computePeriodWindow(input.period, new Date());
  const companyId = profile.user?.companyId;
  if (!companyId) throw new KraScopeError('Employee has no company', 400);

  const goal = await prisma.employeeGoal.create({
    data: {
      employeeId: input.employeeId,
      companyId,
      title: input.title.trim(),
      unit: input.metric,
      targetValue: input.target,
      dailyTarget: input.dailyTarget ?? null,
      type: input.period,
      startDate: win.startDate,
      endDate: win.endDate,
      dueDate: win.endDate,
      status: 'PENDING',
      currentValue: 0,
      achievementPercentage: 0,
      assignedById: actor.id,
      metricId: input.metricId ?? null,
      ratePerUnit: input.ratePerUnit ?? null,
      dimension: (input.dimension as never) ?? null,
      reviewerId: input.reviewerId ?? null,
      visibility: 'MANAGER',
    },
  });

  const employeeUserId = await userIdForProfile(input.employeeId);
  if (employeeUserId) {
    await notify({
      userId: employeeUserId,
      title: 'New goal assigned',
      message: `New ${input.period} goal assigned: "${input.title}"`,
      type: 'KRA_GOAL',
      link: '/dashboard/my-performance',
    });
  }
  return { goalId: goal.id, period: win.label };
}
