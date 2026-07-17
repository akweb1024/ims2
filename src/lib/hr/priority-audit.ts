import { createAuditLog } from '@/lib/notifications';

/**
 * Priority changes are recorded in the generic AuditLog (indexed on
 * [entity, entityId]) — no dedicated table. The comment is REQUIRED at the
 * API layer: an unexplained priority change is exactly the thing being
 * complained about.
 */

export const PRIORITY_CHANGE_ACTION = 'priority_change';
export const PRIORITY_COMMENT_REQUIRED =
    'A comment explaining the priority change is required (priorityChangeComment)';

export function isPriorityChange(from: string | null | undefined, to: string | null | undefined): boolean {
    return Boolean(to) && Boolean(from) && String(from) !== String(to);
}

export async function recordPriorityChange({
    entity,
    entityId,
    userId,
    from,
    to,
    comment,
}: {
    entity: 'work_plan' | 'task';
    entityId: string;
    userId: string;
    from: string;
    to: string;
    comment: string;
}) {
    await createAuditLog({
        userId,
        action: PRIORITY_CHANGE_ACTION,
        entity,
        entityId,
        changes: { from, to, comment },
    });
}
