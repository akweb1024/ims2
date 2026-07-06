import type { Prisma, PrismaClient } from '@prisma/client';
import type { KraPeriodType } from './period';

type Tx = Prisma.TransactionClient | PrismaClient;

// Carry-forward applies only to cumulative OUTPUT goals (volume / revenue-per-unit).
// Carrying a "remainder" for QUALITY/TAT/COLLABORATION/etc. is meaningless.
const CARRY_DIMENSIONS = ['OUTPUT'];

export interface CarryResult {
  /** The period's own recurring target, before any carry-in. */
  baseTargetValue: number;
  /** Unmet target rolled in from the immediately-prior period (0 if none / not eligible). */
  carriedInValue: number;
  /** Effective target for the goal = baseTargetValue + carriedInValue. */
  targetValue: number;
  /** The prior-period goal this carry came from (audit), or null. */
  sourceGoalId: string | null;
}

/**
 * Compute the carry-forward for a MONTHLY OUTPUT goal in the window starting at
 * `windowStart`, for (employeeId, metricId). Finds the most recent same-metric
 * goal that ended before this window and rolls its FULL unmet target in
 * (policy: no cap — the shortfall compounds month over month).
 *
 * Only OUTPUT + MONTHLY + metric-linked goals carry; everything else returns a
 * zero carry (targetValue = base), so callers can use it unconditionally.
 */
export async function computeCarryForward(
  tx: Tx,
  opts: {
    employeeId: string;
    metricId: string | null;
    periodType: KraPeriodType | string;
    windowStart: Date;
    base: number;
    dimension?: string | null;
  }
): Promise<CarryResult> {
  const { employeeId, metricId, periodType, windowStart, base, dimension } = opts;
  const noCarry: CarryResult = { baseTargetValue: base, carriedInValue: 0, targetValue: base, sourceGoalId: null };

  if (!metricId) return noCarry;                                  // need a metric key to match the prior period
  if (periodType !== 'MONTHLY') return noCarry;                   // carry-forward is a monthly concept
  if (!dimension || !CARRY_DIMENSIONS.includes(dimension)) return noCarry;

  // Most recent prior goal for the same (employee, metric, period) that started before this window.
  const prior = await tx.employeeGoal.findFirst({
    where: { employeeId, metricId, type: 'MONTHLY', startDate: { lt: windowStart } },
    orderBy: { startDate: 'desc' },
    select: { id: true, targetValue: true, verifiedValue: true },
  });
  if (!prior) return noCarry;

  // Full remaining shortfall against the prior effective target (which already
  // includes its own carry) — this is what makes it compound with no cap.
  const shortfall = Math.max(0, prior.targetValue - (prior.verifiedValue ?? 0));

  return {
    baseTargetValue: base,
    carriedInValue: shortfall,
    targetValue: base + shortfall,
    sourceGoalId: prior.id,
  };
}
