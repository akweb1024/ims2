import { prisma } from '@/lib/prisma';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { sendPushNotification } from '@/lib/system-notifications';

// Roles that must never receive internal broadcasts.
const EXTERNAL_ROLES = ['CUSTOMER', 'AGENCY'];

export type NotificationScope =
    | { kind: 'USERS'; userIds: string[] }
    | { kind: 'TEAM'; managerId: string }
    | { kind: 'COMPANY'; companyId: string }
    | { kind: 'GLOBAL' };

// Resolve a scope to concrete recipient user ids. Callers are responsible for
// authorising the scope itself; this only expands it.
export async function resolveAudience(scope: NotificationScope): Promise<string[]> {
    switch (scope.kind) {
        case 'USERS': {
            const users = await prisma.user.findMany({
                where: { id: { in: scope.userIds }, isActive: true },
                select: { id: true }
            });
            return users.map((u) => u.id);
        }
        case 'TEAM': {
            const downline = await getDownlineUserIds(scope.managerId, undefined);
            const ids = Array.from(new Set([scope.managerId, ...downline]));
            const users = await prisma.user.findMany({
                where: { id: { in: ids }, isActive: true },
                select: { id: true }
            });
            return users.map((u) => u.id);
        }
        case 'COMPANY': {
            const users = await prisma.user.findMany({
                where: {
                    companyId: scope.companyId,
                    isActive: true,
                    role: { notIn: EXTERNAL_ROLES as any }
                },
                select: { id: true }
            });
            return users.map((u) => u.id);
        }
        case 'GLOBAL': {
            const users = await prisma.user.findMany({
                where: { isActive: true, role: { notIn: EXTERNAL_ROLES as any } },
                select: { id: true }
            });
            return users.map((u) => u.id);
        }
    }
}

export interface FanoutPayload {
    title: string;
    message: string;
    link?: string | null;
    type?: string;
}

// In-app rows are written in one createMany; web push is best-effort and
// batched so a big audience can't hold the response hostage.
export async function notifyUsers(recipientIds: string[], payload: FanoutPayload): Promise<number> {
    if (!recipientIds.length) return 0;

    await prisma.notification.createMany({
        data: recipientIds.map((userId) => ({
            userId,
            title: payload.title,
            message: payload.message,
            type: payload.type || 'INFO',
            link: payload.link || null
        }))
    });

    // Fire-and-forget: never block or fail the request on push delivery.
    void (async () => {
        const BATCH = 25;
        for (let i = 0; i < recipientIds.length; i += BATCH) {
            const batch = recipientIds.slice(i, i + BATCH);
            await Promise.allSettled(
                batch.map((userId) =>
                    sendPushNotification(userId, payload.title, payload.message, payload.link || null)
                )
            );
        }
    })().catch((err) => console.error('Notification push fan-out failed (non-fatal):', err));

    return recipientIds.length;
}
