import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/system-notifications';

/**
 * A task moving into or out of BLOCKED must tell the employee's manager —
 * a silently blocked task sits until someone happens to look at the agenda.
 * Fires only on the transition, never on re-saves of an already-blocked task.
 */
export async function notifyBlockerTransition({
    previousStatus,
    nextStatus,
    employeeUserId,
    actorUserId,
    agenda,
    blockerReason,
    blockerOwner,
}: {
    previousStatus: string;
    nextStatus: string;
    employeeUserId: string;
    actorUserId: string;
    agenda: string;
    blockerReason?: string | null;
    blockerOwner?: string | null;
}) {
    const becameBlocked = previousStatus !== 'BLOCKED' && nextStatus === 'BLOCKED';
    const becameUnblocked = previousStatus === 'BLOCKED' && ['IN_PROGRESS', 'COMPLETED'].includes(nextStatus);
    if (!becameBlocked && !becameUnblocked) return;

    const employee = await prisma.user.findUnique({
        where: { id: employeeUserId },
        select: { name: true, email: true, managerId: true },
    });
    const managerId = employee?.managerId;
    // No manager on record, or the manager made the change themselves — nobody to tell.
    if (!managerId || managerId === actorUserId) return;

    const who = employee?.name || employee?.email || 'An employee';

    if (becameBlocked) {
        await createNotification({
            userId: managerId,
            title: 'Task blocked',
            message: `${who} blocked "${agenda}": ${blockerReason || 'no reason given'}${blockerOwner ? ` — can be unblocked by ${blockerOwner}` : ''}`,
            type: 'WARNING',
            link: '/dashboard/staff-portal?tab=team-ops',
        });
    } else {
        await createNotification({
            userId: managerId,
            title: 'Task unblocked',
            message: `${who} ${nextStatus === 'COMPLETED' ? 'completed' : 'resumed'} the previously blocked task "${agenda}".`,
            type: 'SUCCESS',
            link: '/dashboard/staff-portal?tab=team-ops',
        });
    }
}
