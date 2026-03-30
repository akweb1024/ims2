import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import {
    getThinkTankVoteMonitor,
    rebuildThinkTankPointAccount,
    removeThinkTankVoteByAdmin,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute(['SUPER_ADMIN'], async (_req: NextRequest, user: any) => {
    if (!user?.companyId) {
        return NextResponse.json({ error: 'Company context is required.' }, { status: 400 });
    }

    const monitor = await getThinkTankVoteMonitor(user.companyId);
    return NextResponse.json(monitor);
});

export const POST = authorizedRoute(['SUPER_ADMIN'], async (req: NextRequest, user: any) => {
    if (!user?.companyId) {
        return NextResponse.json({ error: 'Company context is required.' }, { status: 400 });
    }

    const body = await req.json();
    const action = String(body.action || '').toUpperCase();

    if (action === 'REMOVE_VOTE') {
        const voteId = String(body.voteId || '').trim();
        if (!voteId) {
            return NextResponse.json({ error: 'voteId is required.' }, { status: 400 });
        }
        await removeThinkTankVoteByAdmin({
            companyId: user.companyId,
            voteId,
            adminUserId: user.id,
        });
    } else if (action === 'RESET_POINTS') {
        const cycleId = String(body.cycleId || '').trim();
        const userId = String(body.userId || '').trim();
        if (!cycleId || !userId) {
            return NextResponse.json({ error: 'cycleId and userId are required.' }, { status: 400 });
        }
        await rebuildThinkTankPointAccount({
            companyId: user.companyId,
            cycleId,
            userId,
        });
    } else {
        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    return NextResponse.json(await getThinkTankVoteMonitor(user.companyId));
});
