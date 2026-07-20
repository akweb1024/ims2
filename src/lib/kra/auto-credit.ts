/**
 * Auto-credit a KRA metric when a linked IT project/task is completed.
 *
 * Unlike the manual-log flow (recordContributions -> evaluateContribution), a
 * completion is itself the authoritative event, so we write a directly-verified
 * MetricContribution (status AUTO_VERIFIED, source SYSTEM) tagged with the
 * project/task id in sourceRefId. That id makes crediting idempotent
 * (re-completing won't double-count) and reversible (reopening removes it).
 */
import { prisma } from '@/lib/prisma';
import { rollupGoalsForMetric } from '@/lib/kra/contributions';

/** Map a User.id (project PM/lead, task assignee) to their EmployeeProfile.id. */
async function profileIdForUser(userId: string): Promise<string | null> {
  const p = await prisma.employeeProfile.findFirst({ where: { userId }, select: { id: true } });
  return p?.id ?? null;
}

export interface CreditArgs {
  companyId: string;
  metricId: string;
  /** IT project or task id — the idempotency / reversal key. */
  sourceRefId: string;
  /** User.ids to credit (project PM + team lead, or task assignee). */
  ownerUserIds: Array<string | null | undefined>;
  value?: number;
  date: Date;
}

/**
 * Credit `value` (default 1) of `metricId` to each distinct owner for this
 * completion. No-op for owners already credited for this sourceRefId+metric, or
 * when the metric isn't a KRA metric in this company. Never throws to the caller
 * (a KRA hiccup must not fail the project/task update) — logs and moves on.
 */
export async function creditLinkedMetric(args: CreditArgs): Promise<void> {
  try {
    const metric = await prisma.performanceMetricDefinition.findFirst({
      where: { id: args.metricId, companyId: args.companyId, scope: 'KRA' },
      select: { id: true },
    });
    if (!metric) return; // link points at a non-KRA / cross-company metric — ignore

    const value = args.value ?? 1;
    const userIds = [...new Set(args.ownerUserIds.filter((x): x is string => !!x))];

    for (const userId of userIds) {
      const employeeId = await profileIdForUser(userId);
      if (!employeeId) continue;

      const already = await prisma.metricContribution.findFirst({
        where: { employeeId, metricId: metric.id, sourceRefId: args.sourceRefId },
        select: { id: true },
      });
      if (already) continue; // idempotent

      await prisma.metricContribution.create({
        data: {
          companyId: args.companyId,
          employeeId,
          metricId: metric.id,
          reportedValue: value,
          verifiedValue: value,
          status: 'AUTO_VERIFIED',
          source: 'SYSTEM',
          sourceRefId: args.sourceRefId,
          note: 'Auto-credited on completion',
          date: args.date,
        },
      });

      await rollupGoalsForMetric({ employeeId, metricId: metric.id });
    }
  } catch (err) {
    console.error('[auto-credit] creditLinkedMetric failed', { sourceRefId: args.sourceRefId, metricId: args.metricId, err });
  }
}

/**
 * Remove the auto-credit contributions for this sourceRefId+metric (the linked
 * project/task was reopened or its link changed) and re-roll affected goals.
 */
export async function reverseLinkedMetricCredit(args: { metricId: string; sourceRefId: string }): Promise<void> {
  try {
    const rows = await prisma.metricContribution.findMany({
      where: { metricId: args.metricId, sourceRefId: args.sourceRefId, source: 'SYSTEM' },
      select: { id: true, employeeId: true },
    });
    if (rows.length === 0) return;

    await prisma.metricContribution.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });

    for (const employeeId of [...new Set(rows.map((r) => r.employeeId))]) {
      await rollupGoalsForMetric({ employeeId, metricId: args.metricId });
    }
  } catch (err) {
    console.error('[auto-credit] reverseLinkedMetricCredit failed', { sourceRefId: args.sourceRefId, metricId: args.metricId, err });
  }
}
