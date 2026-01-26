import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createNotification } from '@/lib/system-notifications';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { channels, type } = body;

        await createNotification({
            userId: user.id,
            title: 'Integration Test Notification',
            message: `This is a test notification sent via: ${channels.join(', ')}`,
            type: type || 'INFO',
            channels: channels,
            link: '/dashboard'
        });

        return NextResponse.json({ success: true, message: 'Notification dispatched' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
