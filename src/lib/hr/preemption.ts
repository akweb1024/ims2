/**
 * Critical-task preemption (task-system plan S6 — the "override all tasks"
 * request, made reversible). Inserting a critical task does NOT wipe the
 * employee's day: their other unfinished plans are MOVED to tomorrow with a
 * `preemptedBy` trail, everyone affected is told (the employee, their manager,
 * and any other manager whose assigned task got deferred), and the whole event
 * lands in the AuditLog — so "who blew up my sprint" is always answerable.
 */
import { prisma } from '@/lib/prisma';
import { decodeAgendaMetadata, encodeAgendaMetadata, getISTDayRange } from '@/lib/hr/work-agenda';
import { createNotification } from '@/lib/system-notifications';
import { createAuditLog } from '@/lib/notifications';

const UNFINISHED = ['PLANNED', 'IN_PROGRESS', 'BLOCKED'];
// Distinct minute-offset spaces under @@unique([employeeId, date]):
// generator rows 0+, S3 carries 600+, the critical task 599, deferred rows 650+.
const CRITICAL_MINUTE_OFFSET = 599;
const DEFER_MINUTE_OFFSET = 650;

export interface PreemptResult {
    criticalPlanId: string;
    deferredCount: number;
}

export async function preemptWithCriticalTask(args: {
    employeeId: string; // EmployeeProfile id
    actorId: string;
    title: string;
    reason: string;
    estimatedHours?: number | null;
    description?: string | null;
}): Promise<PreemptResult> {
    const profile = await prisma.employeeProfile.findUnique({
        where: { id: args.employeeId },
        select: { id: true, userId: true, user: { select: { companyId: true, managerId: true, name: true, email: true } } },
    });
    if (!profile) throw new Error('Employee profile not found');
    const companyId = profile.user?.companyId ?? null;

    const { start: todayStart, end: todayEnd } = getISTDayRange();
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // 1) The critical task, pinned to the top of the day.
    const critical = await prisma.workPlan.create({
        data: {
            employeeId: profile.id,
            companyId,
            date: new Date(todayStart.getTime() + CRITICAL_MINUTE_OFFSET * 60 * 1000),
            agenda: args.title,
            strategy: encodeAgendaMetadata({
                version: 1,
                sourceType: 'MANAGER_OVERRIDE',
                mandatory: true,
                sequence: 0,
                generatedAt: new Date().toISOString(),
                generatedBy: args.actorId,
            }),
            priority: 'HIGH',
            estimatedHours: args.estimatedHours ?? null,
            completionStatus: 'PLANNED',
            visibility: 'MANAGER',
            status: 'CRITICAL',
        } as never,
    });

    // 2) Move (never delete) today's other unfinished plans to tomorrow.
    const toDefer = await prisma.workPlan.findMany({
        where: {
            employeeId: profile.id,
            date: { gte: todayStart, lte: todayEnd },
            completionStatus: { in: UNFINISHED },
            id: { not: critical.id },
        },
        select: { id: true, agenda: true, strategy: true },
        orderBy: { date: 'asc' },
    });

    const assignerIds = new Set<string>();
    for (let idx = 0; idx < toDefer.length; idx++) {
        const plan = toDefer[idx];
        const meta = decodeAgendaMetadata(plan.strategy) || { version: 1 as const, sourceType: 'MANUAL' as const };
        if (meta.overrideBy) assignerIds.add(meta.overrideBy);
        if (meta.generatedBy) assignerIds.add(meta.generatedBy);
        await prisma.workPlan.update({
            where: { id: plan.id },
            data: {
                date: new Date(tomorrowStart.getTime() + (DEFER_MINUTE_OFFSET + idx) * 60 * 1000),
                strategy: encodeAgendaMetadata({
                    ...meta,
                    preemptedBy: critical.id,
                    deferredFrom: todayStart.toISOString(),
                }),
            },
        });
    }

    // 3) Audit — the answerable record of who moved what and why.
    await createAuditLog({
        userId: args.actorId,
        action: 'critical_preemption',
        entity: 'work_plan',
        entityId: critical.id,
        changes: {
            employeeId: profile.id,
            reason: args.reason,
            title: args.title,
            deferredPlanIds: toDefer.map((p) => p.id),
        },
    });

    // 4) Tell everyone affected. DANGER type → the dashboard alert sound.
    const who = profile.user?.name || profile.user?.email || 'the employee';
    const recipients = new Map<string, { title: string; message: string }>();
    if (profile.userId) {
        recipients.set(profile.userId, {
            title: 'Critical task assigned — your day was re-planned',
            message: `"${args.title}" takes priority today (${args.reason}). ${toDefer.length} other task${toDefer.length === 1 ? '' : 's'} moved to tomorrow.`,
        });
    }
    if (profile.user?.managerId) {
        recipients.set(profile.user.managerId, {
            title: `Critical preemption: ${who}`,
            message: `"${args.title}" preempted ${who}'s day (${args.reason}); ${toDefer.length} task${toDefer.length === 1 ? '' : 's'} deferred to tomorrow.`,
        });
    }
    for (const assignerId of assignerIds) {
        if (!recipients.has(assignerId)) {
            recipients.set(assignerId, {
                title: `A task you assigned was deferred`,
                message: `A critical task ("${args.title}") preempted ${who}'s day; a task you assigned moved to tomorrow.`,
            });
        }
    }
    recipients.delete(args.actorId); // the actor knows — they did it
    for (const [userId, note] of recipients) {
        await createNotification({
            userId,
            title: note.title,
            message: note.message,
            type: 'DANGER',
            link: '/dashboard/staff-portal?tab=team-ops',
        });
    }

    return { criticalPlanId: critical.id, deferredCount: toDefer.length };
}
