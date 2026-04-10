import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import {
    clearGovernanceOverride,
    getGovernanceOverride,
    getGovernanceState,
    GovernanceOverrideMode,
    setGovernanceOverride,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (_req: NextRequest, user: any) => {
    return NextResponse.json({
        governance: await getGovernanceState(),
        override: await getGovernanceOverride(),
        canManage: user.role === 'SUPER_ADMIN',
    });
});

export const POST = authorizedRoute(['SUPER_ADMIN'], async (req: NextRequest, user: any) => {
    const body = await req.json();
    const mode = String(body.mode || 'SCHEDULED').toUpperCase() as GovernanceOverrideMode;
    const reason = body.reason ? String(body.reason) : null;

    if (!['SCHEDULED', 'SUBMISSIONS_OPEN', 'VOTING_OPEN', 'LOCKED', 'REVEAL_READY'].includes(mode)) {
        return NextResponse.json({ error: 'Invalid override mode.' }, { status: 400 });
    }

    if (mode === 'SCHEDULED') {
        await clearGovernanceOverride(null, user.id);
    } else {
        await setGovernanceOverride({
            mode,
            reason,
            userId: user.id,
        });
    }

    return NextResponse.json({
        success: true,
        governance: await getGovernanceState(),
        override: await getGovernanceOverride(),
        canManage: true,
    });
});
