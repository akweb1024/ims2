import { prisma } from '@/lib/prisma';

/**
 * Creates a permanent Audit Log entry for accountability.
 */
export async function createAuditLog({
    userId,
    action,
    entity,
    entityId,
    changes,
    ipAddress = 'SYSTEM',
}: {
    userId?: string;
    action: string;
    entity: string;
    entityId: string;
    changes?: any;
    ipAddress?: string;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                changes: changes || {},
                ipAddress,
            }
        });
    } catch (error) {
        console.error('Failed to write Audit Log:', error);
    }
}

/**
 * Pushes a real-time Notification to a specific user.
 */
export async function pushNotification({
    userId,
    title,
    message,
    type = 'INFO',
    link
}: {
    userId: string;
    title: string;
    message: string;
    type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'DANGER' | 'ERROR';
    link?: string;
}) {
    try {
        return await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type: type === 'ERROR' ? 'DANGER' : type,
                link,
            }
        });
    } catch (error) {
        console.error('Failed to push Notification:', error);
    }
}
// ALIAS for legacy code
export const createNotification = pushNotification;
