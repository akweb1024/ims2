import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { ensureThinkTankAccess, getThinkTankAnalytics } from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (_req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);
    const analytics = await getThinkTankAnalytics('GLOBAL');
    return NextResponse.json({ analytics });
});
