/**
 * KRA validation engine (Phase 2).
 *
 * Decides, for a reported metric value, whether it can be auto-verified against a
 * system source-of-truth, must go to a manager (MANUAL), or should be flagged.
 *
 * Hybrid policy (agreed): metrics whose dataSource is SYSTEM/HYBRID and whose
 * sourceType has a registered verifier are checked against real records; everything
 * else is PENDING (manager approval). Anomalies are FLAGGED regardless.
 */
import { prisma } from '@/lib/prisma';

export type ContributionStatus =
  | 'PENDING'
  | 'AUTO_VERIFIED'
  | 'MANAGER_APPROVED'
  | 'REJECTED'
  | 'FLAGGED';

export interface MetricLike {
  id: string;
  dataSource: string | null;
  sourceType: string | null;
}

export interface EvaluateArgs {
  metric: MetricLike;
  employeeId: string;
  companyId: string;
  reportedValue: number;
  date: Date;
}

export interface EvaluateResult {
  status: ContributionStatus;
  verifiedValue: number | null;
  source: 'SYSTEM' | 'MANUAL';
  sourceRefId?: string | null;
  note?: string | null;
}

/** Anomaly threshold: reported beyond this multiple of trailing average gets flagged. */
const ANOMALY_FACTOR = 3;
const ANOMALY_LOOKBACK_DAYS = 30;

function dayWindow(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/**
 * System verifiers: given an employee + day, return the authoritative value from
 * the source module. Returning null means "no source data found for this day".
 */
type SystemVerifier = (args: { employeeId: string; companyId: string; date: Date }) => Promise<number | null>;

const SYSTEM_VERIFIERS: Record<string, SystemVerifier> = {
  // Revenue claimed by this employee that is already VERIFIED, on the report day.
  REVENUE_TRANSACTION: async ({ employeeId, companyId, date }) => {
    const { start, end } = dayWindow(date);
    const agg = await prisma.revenueTransaction.aggregate({
      _sum: { amount: true },
      where: {
        companyId,
        claimedByEmployeeId: employeeId,
        verificationStatus: 'VERIFIED',
        paymentDate: { gte: start, lte: end },
      },
    });
    return agg._sum.amount ?? 0;
  },
  // Future: SUPPORT_TICKET, SUBSCRIPTION, INVOICE, COURSE_SALE, DISPATCH, PUBLICATION_ARTICLE…
  // Until a verifier exists, those sourceTypes fall through to MANUAL (manager approval).
};

export function hasSystemVerifier(sourceType: string | null | undefined): boolean {
  return !!sourceType && sourceType in SYSTEM_VERIFIERS;
}

/** Is the reported value anomalous vs the employee's recent history for this metric? */
async function isAnomalous(metricId: string, employeeId: string, reportedValue: number, date: Date): Promise<boolean> {
  const since = new Date(date.getTime() - ANOMALY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const agg = await prisma.metricContribution.aggregate({
    _avg: { reportedValue: true },
    _count: true,
    where: { metricId, employeeId, date: { gte: since, lt: date } },
  });
  const avg = agg._avg.reportedValue ?? 0;
  if (agg._count < 3 || avg <= 0) return false; // not enough history to judge
  return reportedValue > avg * ANOMALY_FACTOR;
}

export async function evaluateContribution(args: EvaluateArgs): Promise<EvaluateResult> {
  const { metric, employeeId, companyId, reportedValue, date } = args;

  // 1) Anomaly guard first — overrides any auto-verify.
  if (await isAnomalous(metric.id, employeeId, reportedValue, date)) {
    return {
      status: 'FLAGGED',
      verifiedValue: null,
      source: 'MANUAL',
      note: `Anomaly: reported ${reportedValue} far exceeds recent average`,
    };
  }

  // 2) System auto-verify where a verifier exists and the metric opts in.
  const wantsSystem = metric.dataSource === 'SYSTEM' || metric.dataSource === 'HYBRID';
  if (wantsSystem && hasSystemVerifier(metric.sourceType)) {
    const verifier = SYSTEM_VERIFIERS[metric.sourceType as string];
    const systemValue = await verifier({ employeeId, companyId, date });

    if (systemValue === null) {
      // HYBRID with no source row → fall back to manager; SYSTEM with no row → flag mismatch.
      if (metric.dataSource === 'HYBRID') {
        return { status: 'PENDING', verifiedValue: null, source: 'MANUAL', note: 'No system record; needs manager review' };
      }
      return { status: 'FLAGGED', verifiedValue: null, source: 'SYSTEM', note: 'No matching system record found' };
    }

    // Compare reported vs system (1% tolerance for rounding).
    const tolerance = Math.max(0.01 * systemValue, 0.5);
    if (Math.abs(reportedValue - systemValue) <= tolerance) {
      return { status: 'AUTO_VERIFIED', verifiedValue: systemValue, source: 'SYSTEM', note: 'Matched system record' };
    }
    return {
      status: 'FLAGGED',
      verifiedValue: null,
      source: 'SYSTEM',
      note: `Mismatch: reported ${reportedValue}, system ${systemValue}`,
    };
  }

  // 3) MANUAL (or HYBRID without verifier) → manager approval queue.
  return { status: 'PENDING', verifiedValue: null, source: 'MANUAL', note: null };
}
