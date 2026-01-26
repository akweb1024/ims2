import { prisma } from './prisma';

interface NotificationData {
    userId: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    link?: string;
}

export async function createNotification(data: NotificationData) {
    try {
        await prisma.notification.create({
            data: {
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type,
                link: data.link
            }
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
        // Don't throw - notifications are non-critical
    }
}

export async function markAsRead(notificationId: string) {
    try {
        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

export async function getUserNotifications(userId: string, limit = 20) {
    try {
        return await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        return [];
    }
}

export async function getUnreadCount(userId: string) {
    try {
        return await prisma.notification.count({
            where: { userId, isRead: false }
        });
    } catch (error) {
        console.error('Failed to get unread count:', error);
        return 0;
    }
}
