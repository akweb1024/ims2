import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createRazorpaySyncResponse, performRazorpaySync } from '@/lib/services/razorpay-sync';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    // Check for authorization (Optional: CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    const authUser = await getAuthenticatedUser();

    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Fallback: check if it's a valid user session for manual sync from UI
        if (!authUser && process.env.CRON_SECRET) {
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
