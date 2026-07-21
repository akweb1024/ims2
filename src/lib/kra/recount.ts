/**
 * The ONE goal-recount engine (Phase 3 of KRA unification).
 *
 * Before this module, two functions computed goal progress with different
 * rules and overwrote the same columns:
 *   - goals.ts recomputeGoalProgress: counted verified + pending MANUAL
 *     self-reports ("countable"), wrote it to BOTH currentValue and
 *     verifiedValue;
 *   - contributions.ts rollupGoalsForMetric: counted verified-only, wrote it
 *     to both columns and flipped ACHIEVED at 100%.
 * Whichever ran last won, so the same goal's numbers flip-flopped.
 *
 * Unified semantics (each column now means one thing):
 *   - currentValue          = countable sum — verified contributions plus
 *                             pending MANUAL self-reports. Progress the
 *                             employee sees moves as soon as they log;
 *                             a manager rejection removes it.
 *   - verifiedValue         = verified-only sum (AUTO_VERIFIED /
 *                             MANAGER_APPROVED) — the audited layer.
 *   - achievementPercentage = countable vs target (what my-performance, the
 *                             index and roll-ups read).
 *   - status                = PENDING → IN_PROGRESS on first countable value;
 *                             IN_PROGRESS → ACHIEVED at ≥100%. Submitted /
 *                             verified / rejected states are never touched.
 *
 * Every counting path (manual log, manager review, system auto-credit,
 * publication credit) funnels through recountGoal/recountGoalsForMetric.
 */
import type { Prisma } from '@prisma/client';
import type { prisma } from '@/lib/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

export const VERIFIED_STATUSES = ['AUTO_VERIFIED', 'MANAGER_APPROVED'] as const;
const VERIFIED = new Set<string>(VERIFIED_STATUSES);

export interface ContributionLike {
    status: string;
    source: string;
    reportedValue: number;
    verifiedValue: number | null;
}

/** Value a single contribution adds to employee-facing (countable) progress. */
export function countableValue(c: ContributionLike): number {
    if (c.status === 'REJECTED') return 0;
    if (VERIFIED.has(c.status)) return c.verifiedValue ?? c.reportedValue;
    if (c.source === 'MANUAL') return c.reportedValue; // self-report counts immediately
    return 0; // unverified system contribution waits for review
}

/** Value a single contribution adds to the audited (verified) layer. */
export function verifiedOnlyValue(c: ContributionLike): number {
    return VERIFIED.has(c.status) ? (c.verifiedValue ?? c.reportedValue) : 0;
}

export interface ContributionSums { countable: number; verified: number }

/** Pure: fold contributions into the two progress layers. */
export function contributionSums(contributions: ContributionLike[]): ContributionSums {
    let countable = 0;
    let verified = 0;
    for (const c of contributions) {
        countable += countableValue(c);
        verified += verifiedOnlyValue(c);
    }
    return { countable, verified };
}

export interface StatusFlip { status?: string }

/** Pure: forward-only status flips driven by progress. */
export function progressStatusFlip(current: string, countable: number, pct: number): StatusFlip {
    if (current === 'PENDING' && countable > 0) {
        return { status: pct >= 100 ? 'ACHIEVED' : 'IN_PROGRESS' };
    }
    if (current === 'IN_PROGRESS' && pct >= 100) return { status: 'ACHIEVED' };
    return {};
}

/** Recount one goal from its metric's contributions inside its window. */
export async function recountGoal(db: Db, goalId: string): Promise<void> {
    const goal = await db.employeeGoal.findUnique({
        where: { id: goalId },
        select: { id: true, employeeId: true, metricId: true, startDate: true, endDate: true, targetValue: true, status: true },
    });
    if (!goal || !goal.metricId) return; // metric-less goals are managed manually

    const contributions = await db.metricContribution.findMany({
        where: {
            employeeId: goal.employeeId,
            metricId: goal.metricId,
            date: { gte: goal.startDate, lte: goal.endDate },
        },
        select: { status: true, source: true, reportedValue: true, verifiedValue: true },
    });

    const { countable, verified } = contributionSums(contributions);
    const pct = goal.targetValue > 0 ? Math.min(100, (countable / goal.targetValue) * 100) : 0;

    await db.employeeGoal.update({
        where: { id: goal.id },
        data: {
            currentValue: countable,
            verifiedValue: verified,
            achievementPercentage: pct,
            ...progressStatusFlip(goal.status, countable, pct),
        },
    });
}

/** Recount every goal that draws on a given (employee, metric). */
export async function recountGoalsForMetric(db: Db, args: { employeeId: string; metricId: string }): Promise<number> {
    const goals = await db.employeeGoal.findMany({
        where: { employeeId: args.employeeId, metricId: args.metricId },
        select: { id: true },
    });
    for (const g of goals) await recountGoal(db, g.id);
    return goals.length;
}
