import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import {
    applyThinkTankVeto,
    canUseThinkTankVeto,
    ensureThinkTankAccess,
    logThinkTankAudit,
    notifyThinkTankIdeaParticipants,
    serializeThinkTankIdea,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    if (!canUseThinkTankVeto(user.role)) {
        return NextResponse.json({ error: 'Only Super Admin can apply veto.' }, { status: 403 });
    }

    const body = await req.json();
    const reason = String(body.reason || '').trim();
    if (!reason) {
        return NextResponse.json({ error: 'Veto reason is required.' }, { status: 400 });
    }

    const idea = await applyThinkTankVeto({
        ideaId: context?.params?.id,
        vetoedByUserId: user.id,
        reason,
    });

    await logThinkTankAudit({
        ideaId: context?.params?.id,
        actorUserId: user.id,
        action: 'IDEA_VETOED',
        outcome: 'SUCCESS',
        metadata: { reason },
    });

    await notifyThinkTankIdeaParticipants(
        context?.params?.id,
        'Think Tank idea vetoed',
        'A Super Admin has vetoed this idea for the current cycle.',
        '/dashboard/think-tank/results'
    );

    return NextResponse.json({ idea: serializeThinkTankIdea(idea, { includeDuplicates: true }) });
});
