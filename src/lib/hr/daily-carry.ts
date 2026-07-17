/**
 * Daily task carry-forward + automatic scoring (task-system plan S3; policy
 * decisions are the user's, recorded in docs/kra-unification-plan.md §3):
 *
 *  - An unfinished WorkPlan rolls to the next day as a new plan carrying
 *    `carriedFromId` and an incrementing `carryCount` in its metadata. The
 *    original row is left untouched as history. Idempotent — a plan that
 *    already produced a carry never produces a second one.
 *  - AUTO-PENALTY (explicit user decision, no human confirmation): each missed
 *    plan writes a -1 EmployeePointLog (type TASK_MISSED_AUTO).
 *  - Over-achievement marker: an employee who completed every plan yesterday
 *    (and had at least one) gets +1 (type DAY_COMPLETED_AUTO). No carry.
 *  - One summary notification per employee: DANGER for carried tasks (the
 *    dashboard plays an alert sound for DANGER/WARNING), SUCCESS for a clean
 *    day. This runs inside agenda generation, so every generation trigger
 *    (cron, scheduler, manual, config-panel resync) applies it.
 *
 * NOTE: distinct from the KRA monthly carry-forward (lib/kra/carry-forward.ts)
 * — that rolls unmet goal targets; this rolls unfinished daily tasks.
 */
import { prisma } from '@/lib/prisma';
import { decodeAgendaMetadata, encodeAgendaMetadata, getISTDayRange } from '@/lib/hr/work-agenda';
import { createNotification } from '@/lib/system-notifications';

const UNFINISHED = ['PLANNED', 'IN_PROGRESS', 'BLOCKED'];
// Carried rows are placed late in the day-window minute space so they can
// never collide with generator rows (idx from 0) under @@unique([employeeId, date]).
const CARRY_MINUTE_OFFSET = 600;

export interface DailyCarryResult {
    carried: number;
    penalized: number;
    rewarded: number;
}

export async function rollUnfinishedPlans(args: {
    employeeIds: string[];
    companyId?: string | null;
    asOf?: Date;
}): Promise<DailyCarryResult> {
    const result: DailyCarryResult = { carried: 0, penalized: 0, rewarded: 0 };
    if (!args.employeeIds.length) return result;

    const { start: todayStart, end: todayEnd } = getISTDayRange(args.asOf);
    const yesterdayRef = new Date(todayStart.getTime() - 12 * 60 * 60 * 1000);
    const { start: yStart, end: yEnd } = getISTDayRange(yesterdayRef);

    const [yesterdayPlans, todayPlans] = await Promise.all([
        prisma.workPlan.findMany({
            where: {
                employeeId: { in: args.employeeIds },
                date: { gte: yStart, lte: yEnd },
                ...(args.companyId ? { companyId: args.companyId } : {}),
            },
            select: {
                id: true, employeeId: true, companyId: true, agenda: true, priority: true,
                estimatedHours: true, completionStatus: true, strategy: true,
                linkedGoalId: true, visibility: true,
            },
        }),
        prisma.workPlan.findMany({
            where: {
                employeeId: { in: args.employeeIds },
                date: { gte: todayStart, lte: todayEnd },
            },
            select: { id: true, employeeId: true, strategy: true },
        }),
    ]);
    if (!yesterdayPlans.length) return result;

    // Plans that already produced a carry today (idempotency).
    const alreadyCarried = new Set(
        todayPlans
            .map((p) => decodeAgendaMetadata(p.strategy)?.carriedFromId)
            .filter((id): id is string => Boolean(id)),
    );

    const byEmployee = new Map<string, typeof yesterdayPlans>();
    for (const p of yesterdayPlans) {
        if (!byEmployee.has(p.employeeId)) byEmployee.set(p.employeeId, []);
        byEmployee.get(p.employeeId)!.push(p);
    }

    for (const [employeeId, plans] of byEmployee) {
        const unfinished = plans.filter((p) => UNFINISHED.includes(p.completionStatus));
        const employeeUser = await prisma.employeeProfile.findUnique({
            where: { id: employeeId },
            select: { userId: true, user: { select: { companyId: true } } },
        });
        const companyId = employeeUser?.user?.companyId || plans[0].companyId || null;

        if (unfinished.length === 0) {
            // Clean day: positive marker, once (idempotent per calendar day).
            if (companyId && employeeUser) {
                const already = await prisma.employeePointLog.findFirst({
                    where: { employeeId, type: 'DAY_COMPLETED_AUTO', date: { gte: todayStart, lte: todayEnd } },
                    select: { id: true },
                });
                if (!already) {
                    await prisma.employeePointLog.create({
                        data: {
                            employeeId, companyId, type: 'DAY_COMPLETED_AUTO', points: 1,
                            reason: 'All planned tasks completed yesterday',
                            date: todayStart,
                        },
                    });
                    result.rewarded++;
                    if (employeeUser.userId) {
                        await createNotification({
                            userId: employeeUser.userId,
                            title: 'Clean day — all tasks completed',
                            message: 'Every task on yesterday\'s agenda was completed. +1 point.',
                            type: 'SUCCESS',
                            link: '/dashboard/staff-portal',
                        });
                    }
                }
            }
            continue;
        }

        let carriedForEmployee = 0;
        for (let idx = 0; idx < unfinished.length; idx++) {
            const plan = unfinished[idx];
            if (alreadyCarried.has(plan.id)) continue;

            const meta = decodeAgendaMetadata(plan.strategy) || { version: 1 as const, sourceType: 'MANUAL' as const };
            const carryCount = (meta.carryCount || 0) + 1;
            const carriedMeta = encodeAgendaMetadata({
                ...meta,
                carriedFromId: plan.id,
                carryCount,
                conflictFlag: false,
                blockerReason: meta.blockerReason ?? null,
                generatedAt: new Date().toISOString(),
            });

            await prisma.workPlan.create({
                data: {
                    employeeId,
                    companyId: plan.companyId,
                    date: new Date(todayStart.getTime() + (CARRY_MINUTE_OFFSET + idx) * 60 * 1000),
                    agenda: plan.agenda,
                    strategy: carriedMeta,
                    priority: plan.priority,
                    estimatedHours: plan.estimatedHours,
                    completionStatus: plan.completionStatus === 'BLOCKED' ? 'BLOCKED' : 'PLANNED',
                    linkedGoalId: plan.linkedGoalId,
                    visibility: plan.visibility,
                    status: 'CARRIED',
                } as never,
            });
            result.carried++;
            carriedForEmployee++;

            // AUTO-PENALTY — explicit user decision: no human confirmation step.
            if (companyId) {
                await prisma.employeePointLog.create({
                    data: {
                        employeeId, companyId, type: 'TASK_MISSED_AUTO', points: -1,
                        reason: `Missed: "${plan.agenda}" (carry #${carryCount})`,
                        date: todayStart,
                    },
                });
                result.penalized++;
            }
        }

        if (carriedForEmployee > 0 && employeeUser?.userId) {
            await createNotification({
                userId: employeeUser.userId,
                title: 'Unfinished tasks carried to today',
                message: `${carriedForEmployee} unfinished task${carriedForEmployee > 1 ? 's' : ''} from yesterday moved to today's agenda (−${carriedForEmployee} point${carriedForEmployee > 1 ? 's' : ''}).`,
                type: 'DANGER',
                link: '/dashboard/staff-portal',
            });
        }
    }

    return result;
}
