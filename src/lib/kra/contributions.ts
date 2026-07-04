/**
 * KRA contribution service (Phase 2).
 *
 * - recordContributions: turn reported metric values into validated MetricContribution rows.
 * - rollupGoalsForMetric: recompute the backing EmployeeGoal(s) from verified contributions.
 * - reviewContribution: manager approve/reject, then re-roll.
 */
import { prisma } from '@/lib/prisma';
import { evaluateContribution, type ContributionStatus } from '@/lib/kra/validation';

const VERIFIED_STATUSES: ContributionStatus[] = ['AUTO_VERIFIED', 'MANAGER_APPROVED'];

export interface ContributionEntry {
  metricId: string;
  value: number;
}

export interface RecordArgs {
  companyId: string;
  employeeId: string;
  workReportId?: string | null;
  date?: Date;
  entries: ContributionEntry[];
}

export async function recordContributions(args: RecordArgs) {
  const date = args.date ?? new Date();
  const results: Array<{ metricId: string; status: ContributionStatus; verifiedValue: number | null; note?: string | null }> = [];
  const touchedMetricIds = new Set<string>();

  for (const entry of args.entries) {
    const metric = await prisma.performanceMetricDefinition.findFirst({
      where: { id: entry.metricId, companyId: args.companyId, scope: 'KRA' },
      select: { id: true, dataSource: true, sourceType: true, metadata: true },
    });
    if (!metric) {
      results.push({ metricId: entry.metricId, status: 'REJECTED', verifiedValue: null, note: 'Unknown metric' });
      continue;
    }

    const verdict = await evaluateContribution({
      metric,
      employeeId: args.employeeId,
      companyId: args.companyId,
      reportedValue: entry.value,
      date,
    });

    await prisma.metricContribution.create({
      data: {
        companyId: args.companyId,
        employeeId: args.employeeId,
        metricId: metric.id,
        workReportId: args.workReportId ?? null,
        reportedValue: entry.value,
        verifiedValue: verdict.verifiedValue,
        status: verdict.status,
        source: verdict.source,
        sourceRefId: verdict.sourceRefId ?? null,
        note: verdict.note ?? null,
        date,
      },
    });

    touchedMetricIds.add(metric.id);
    results.push({ metricId: metric.id, status: verdict.status, verifiedValue: verdict.verifiedValue, note: verdict.note });
  }

  // Roll up goals for any metric that gained an auto-verified value.
  for (const metricId of touchedMetricIds) {
    await rollupGoalsForMetric({ employeeId: args.employeeId, metricId });
  }

  const summary = {
    total: results.length,
    autoVerified: results.filter((r) => r.status === 'AUTO_VERIFIED').length,
    pending: results.filter((r) => r.status === 'PENDING').length,
    flagged: results.filter((r) => r.status === 'FLAGGED').length,
    rejected: results.filter((r) => r.status === 'REJECTED').length,
  };

  return { results, summary };
}

/**
 * Recompute every KRA EmployeeGoal for (employee, metric) from its verified
 * contributions whose date falls inside the goal's [startDate, endDate] window.
 * The same daily contribution naturally counts toward MONTHLY/QUARTERLY/YEARLY goals.
 */
export async function rollupGoalsForMetric(args: { employeeId: string; metricId: string }) {
  const goals = await prisma.employeeGoal.findMany({
    where: { employeeId: args.employeeId, metricId: args.metricId, isKra: true },
    select: { id: true, startDate: true, endDate: true, targetValue: true, status: true },
  });

  for (const goal of goals) {
    const agg = await prisma.metricContribution.aggregate({
      _sum: { verifiedValue: true },
      where: {
        employeeId: args.employeeId,
        metricId: args.metricId,
        status: { in: VERIFIED_STATUSES },
        date: { gte: goal.startDate, lte: goal.endDate },
      },
    });
    const verified = agg._sum.verifiedValue ?? 0;
    const achievement = goal.targetValue > 0 ? Math.min(100, (verified / goal.targetValue) * 100) : 0;

    await prisma.employeeGoal.update({
      where: { id: goal.id },
      data: {
        verifiedValue: verified,
        currentValue: verified,
        achievementPercentage: achievement,
        ...(achievement >= 100 && goal.status === 'IN_PROGRESS' ? { status: 'ACHIEVED' } : {}),
      },
    });
  }

  return goals.length;
}

export interface ReviewArgs {
  id: string;
  companyId: string;
  reviewerId: string;
  action: 'APPROVE' | 'REJECT';
  verifiedValue?: number;
  note?: string;
}

export async function reviewContribution(args: ReviewArgs) {
  const contribution = await prisma.metricContribution.findFirst({
    where: { id: args.id, companyId: args.companyId },
    select: { id: true, employeeId: true, metricId: true, reportedValue: true },
  });
  if (!contribution) return { ok: false as const, error: 'Contribution not found' };

  const approved = args.action === 'APPROVE';
  await prisma.metricContribution.update({
    where: { id: contribution.id },
    data: {
      status: approved ? 'MANAGER_APPROVED' : 'REJECTED',
      verifiedValue: approved ? (args.verifiedValue ?? contribution.reportedValue) : 0,
      verifiedById: args.reviewerId,
      verifiedAt: new Date(),
      note: args.note ?? null,
    },
  });

  await rollupGoalsForMetric({ employeeId: contribution.employeeId, metricId: contribution.metricId });
  return { ok: true as const };
}
