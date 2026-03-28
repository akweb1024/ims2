import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { ensureThinkTankAccess, generateAIInsights } from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);
    const { ideaId } = await req.json();
    if (!ideaId) return NextResponse.json({ error: 'ideaId required' }, { status: 400 });

    const insights = await generateAIInsights({ ideaId, companyId: user.companyId });
    if (!insights) return NextResponse.json({ error: 'AI insights unavailable (no API key or idea not found).' }, { status: 503 });

    return NextResponse.json({ insights });
});
