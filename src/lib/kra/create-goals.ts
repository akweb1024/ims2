/**
 * The single goal-creation service (unification plan U1, docs/kra-unification-plan.md).
 *
 * Every path that creates an EmployeeGoal — template assignment, manual single
 * assignment, new-hire provisioning, the monthly rollover cron — goes through
 * upsertGoal(), so the rules cannot diverge again:
 *
 *  - one dedupe key: (employeeId, metricId, type, startDate), falling back to
 *    (employeeId, title, type, startDate) for metric-less goals. Re-assigning
 *    updates; it never duplicates.
 *  - carry-forward is computed whenever the goal is metric-linked (the policy
 *    itself — MONTHLY/OUTPUT only — lives in computeCarryForward).
 *  - dimension, dueDate (= period end), assignedById, origin and visibility are
 *    always persisted.
 *  - one initial status: PENDING (recomputeGoalProgress flips it to IN_PROGRESS
 *    on the first activity).
 *  - updates never touch progress fields (currentValue / verifiedValue /
 *    achievementPercentage / status).
 *  - provenance lives in `origin`; `isKra` means exactly "counts toward the
 *    weighted KRA score".
 *
 * Notifications are the caller's job via notifyGoalsAssigned() — one summary
 * per employee, not one per goal, so bulk assignment doesn't spam.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeCarryForward } from '@/lib/kra/carry-forward';
import { notify, userIdForProfile } from '@/lib/kra/notify';

export type GoalOrigin = 'TEMPLATE' | 'MANUAL' | 'PROVISION' | 'ROLLOVER';

type Db = Prisma.TransactionClient | typeof prisma;

export interface UnifiedGoalInput {
    employeeId: string;
    companyId: string;
    origin: GoalOrigin;
    title: string;
    unit: string;
    /** Base target for the period; carry-forward may raise the effective target. */
    targetValue: number;
    type: string; // period type (DAILY..YEARLY)
    startDate: Date;
    endDate: Date;
    isKra: boolean;
    kra?: string | null;
    weight?: number;
    dimension?: string | null;
    metricId?: string | null;
    templateId?: string | null;
    dataSource?: string | null;
    dailyTarget?: number | null;
    ratePerUnit?: number | null;
    reviewerId?: string | null;
    assignedById?: string | null;
    visibility?: string;
}

export interface UpsertGoalResult {
    id: string;
    created: boolean;
}

export async function upsertGoal(db: Db, input: UnifiedGoalInput): Promise<UpsertGoalResult> {
    // Carry any unmet prior-period target into this one (policy inside the helper).
    const carry = await computeCarryForward(db as Prisma.TransactionClient, {
        employeeId: input.employeeId,
        metricId: input.metricId ?? null,
        periodType: input.type as never,
        windowStart: input.startDate,
        base: input.targetValue,
        dimension: (input.dimension as never) ?? null,
    });

    const periodType = input.type as never; // period strings map onto the GoalType enum
    const dedupeWhere = input.metricId
        ? { employeeId: input.employeeId, metricId: input.metricId, type: periodType, startDate: input.startDate }
        : { employeeId: input.employeeId, title: input.title, type: periodType, startDate: input.startDate, metricId: null };

    const existing = await db.employeeGoal.findFirst({ where: dedupeWhere, select: { id: true } });

    const data = {
        title: input.title,
        kra: input.kra ?? null,
        unit: input.unit,
        targetValue: carry.targetValue,
        baseTargetValue: carry.baseTargetValue,
        carriedInValue: carry.carriedInValue,
        sourceGoalId: carry.sourceGoalId,
        type: periodType,
        startDate: input.startDate,
        endDate: input.endDate,
        dueDate: input.endDate,
        isKra: input.isKra,
        origin: input.origin,
        weight: input.weight ?? 1,
        dimension: (input.dimension as never) ?? null,
        metricId: input.metricId ?? null,
        templateId: input.templateId ?? null,
        dataSource: input.dataSource ?? 'MANUAL',
        dailyTarget: input.dailyTarget ?? null,
        ratePerUnit: input.ratePerUnit ?? null,
        visibility: input.visibility ?? 'MANAGER',
        ...(input.reviewerId !== undefined ? { reviewerId: input.reviewerId } : {}),
        ...(input.assignedById ? { assignedById: input.assignedById } : {}),
    };

    if (existing) {
        await db.employeeGoal.update({ where: { id: existing.id }, data });
        return { id: existing.id, created: false };
    }

    const goal = await db.employeeGoal.create({
        data: {
            ...data,
            employeeId: input.employeeId,
            companyId: input.companyId,
            currentValue: 0,
            verifiedValue: 0,
            achievementPercentage: 0,
            status: 'PENDING',
        },
    });
    return { id: goal.id, created: true };
}

const ORIGIN_MESSAGES: Record<GoalOrigin, (n: number, period?: string) => { title: string; message: string }> = {
    TEMPLATE: (n, period) => ({
        title: 'New goals assigned',
        message: `${n} goal${n > 1 ? 's' : ''} assigned to you${period ? ` for ${period}` : ''}. Check your performance dashboard.`,
    }),
    MANUAL: (n, period) => ({
        title: 'New goal assigned',
        message: `A new${period ? ` ${period}` : ''} goal was assigned to you.`,
    }),
    PROVISION: (n) => ({
        title: 'Your starter goals are ready',
        message: `${n} goal${n > 1 ? 's have' : ' has'} been set up for you. Review them on your performance dashboard.`,
    }),
    ROLLOVER: (n) => ({
        title: 'Monthly goals rolled over',
        message: `${n} goal${n > 1 ? 's were' : ' was'} carried into the new month, including any unmet targets.`,
    }),
};

/** One summary notification per employee per operation — never one per goal. */
export async function notifyGoalsAssigned(args: {
    employeeId: string; // EmployeeProfile id
    origin: GoalOrigin;
    count: number;
    periodLabel?: string;
}): Promise<void> {
    if (args.count <= 0) return;
    const userId = await userIdForProfile(args.employeeId);
    if (!userId) return;
    const { title, message } = ORIGIN_MESSAGES[args.origin](args.count, args.periodLabel);
    await notify({ userId, title, message, type: 'KRA_GOAL', link: '/dashboard/my-performance' });
}
