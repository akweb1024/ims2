import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const notificationModel = prisma.notification;
        if (!notificationModel) {
            console.error('Prisma Notification model not found');
            return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
        }

        const notifications = await notificationModel.findMany({
            where: { userId: decoded.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return NextResponse.json(notifications);
    } catch (error: any) {
        console.error('Notifications GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const notificationModel = prisma.notification;
        if (!notificationModel) throw new Error('Notification model not found');

        // Mark all as read
        await notificationModel.updateMany({
            where: { userId: decoded.id, isRead: false },
            data: { isRead: true }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Notifications PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
