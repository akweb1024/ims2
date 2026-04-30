import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createRazorpaySyncResponse, performRazorpaySync } from '@/lib/services/razorpay-sync';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    // Manual forced sync from UI requires an authenticated admin session.
    const authHeader = req.headers.get('authorization');
    if (force) {
        const authUser = await getAuthenticatedUser();
        if (!authUser || !['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'].includes(authUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    } else {
        // Scheduled sync requires CRON_SECRET and a valid bearer token.
        if (!process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
        }
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const result = await performRazorpaySync({
            force,
            trigger: force ? 'manual' : 'cron',
        });

        return createRazorpaySyncResponse(result);
    } catch (error: any) {
        logger.error('Razorpay Sync Error', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
