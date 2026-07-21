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
import { upsertGoal } from '@/lib/kra/create-goals';
import { recountGoal, recountGoalsForMetric } from '@/lib/kra/recount';

const EDITABLE_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'REJECTED']);

/**
 * Progress counting is delegated to the ONE recount engine (Phase 3
 * unification): src/lib/kra/recount.ts. These wrappers keep the historical
 * names for this module's internal call sites.
 */
export async function recomputeGoalProgress(goalId: string): Promise<void> {
  await recountGoal(prisma, goalId);
}

/** Recompute every goal that draws on a given (employee, metric). */
export async function recomputeGoalsForMetric(employeeId: string, metricId: string): Promise<void> {
  await recountGoalsForMetric(prisma, { employeeId, metricId });
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
      link: '/dashboard/review-inbox?tab=goals',
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

  // Unified goal service: dedupes on (employee, metric-or-title, period, window)
  // — re-submitting the same goal updates it instead of duplicating — and
  // computes carry-forward when the goal is metric-linked.
  const res = await upsertGoal(prisma, {
    employeeId: input.employeeId,
    companyId,
    origin: 'MANUAL',
    title: input.title.trim(),
    unit: input.metric,
    targetValue: input.target,
    type: input.period,
    startDate: win.startDate,
    endDate: win.endDate,
    isKra: false,
    dailyTarget: input.dailyTarget ?? null,
    metricId: input.metricId ?? null,
    ratePerUnit: input.ratePerUnit ?? null,
    dimension: input.dimension ?? null,
    reviewerId: input.reviewerId ?? null,
    assignedById: actor.id,
  });

  const employeeUserId = await userIdForProfile(input.employeeId);
  if (employeeUserId) {
    await notify({
      userId: employeeUserId,
      title: res.created ? 'New goal assigned' : 'Goal updated',
      message: `${res.created ? 'New' : 'Updated'} ${input.period} goal: "${input.title.trim()}"`,
      type: 'KRA_GOAL',
      link: '/dashboard/my-performance',
    });
  }
  return { goalId: res.id, period: win.label };
}

export interface UpdateGoalArgs {
  goalId: string;
  title?: string;
  target?: number;
  dailyTarget?: number | null;
  ratePerUnit?: number | null;
  reviewerId?: string | null;
}

/** Manager edits an assigned goal in scope. Recomputes achievement% if the target moved. */
export async function updateGoal(actor: Actor, input: UpdateGoalArgs) {
  requireRole(actor.role, 3); // MANAGER+
  const goal = await prisma.employeeGoal.findUnique({
    where: { id: input.goalId },
    select: { id: true, employeeId: true, metricId: true, currentValue: true, targetValue: true, title: true },
  });
  if (!goal) throw new KraScopeError('Goal not found', 404);
  await assertManagerScope(actor, goal.employeeId);

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.target !== undefined) data.targetValue = input.target;
  if (input.dailyTarget !== undefined) data.dailyTarget = input.dailyTarget;
  if (input.ratePerUnit !== undefined) data.ratePerUnit = input.ratePerUnit;
  if (input.reviewerId !== undefined) data.reviewerId = input.reviewerId;

  // Target moved on a goal with no metric ledger: refresh achievement% from currentValue here,
  // since recomputeGoalProgress early-returns for metric-less goals.
  if (input.target !== undefined && !goal.metricId) {
    data.achievementPercentage = input.target > 0 ? Math.min(100, (goal.currentValue / input.target) * 100) : 0;
  }

  await prisma.employeeGoal.update({ where: { id: goal.id }, data });

  // Metric-backed goal: recompute current + achievement% from the ledger against the new target.
  if (input.target !== undefined && goal.metricId) {
    await recomputeGoalProgress(goal.id);
  }

  const employeeUserId = await userIdForProfile(goal.employeeId);
  if (employeeUserId) {
    await notify({
      userId: employeeUserId,
      title: 'Goal updated',
      message: `Your manager updated the goal "${(data.title as string) ?? goal.title}"`,
      type: 'KRA_GOAL',
      link: '/dashboard/my-performance',
    });
  }
  return { goalId: goal.id };
}

/** Manager unassigns (deletes) a goal in scope. Proofs + verifications cascade; the
 *  metric/revenue ledger (keyed on employee+metric, not the goal) is left intact. */
export async function deleteGoal(actor: Actor, goalId: string) {
  requireRole(actor.role, 3); // MANAGER+
  const goal = await prisma.employeeGoal.findUnique({
    where: { id: goalId },
    select: { id: true, employeeId: true, title: true },
  });
  if (!goal) throw new KraScopeError('Goal not found', 404);
  await assertManagerScope(actor, goal.employeeId);

  await prisma.employeeGoal.delete({ where: { id: goal.id } });

  const employeeUserId = await userIdForProfile(goal.employeeId);
  if (employeeUserId) {
    await notify({
      userId: employeeUserId,
      title: 'Goal removed',
      message: `Your manager removed the goal "${goal.title}"`,
      type: 'KRA_GOAL',
      link: '/dashboard/my-performance',
    });
  }
  return { goalId };
}
