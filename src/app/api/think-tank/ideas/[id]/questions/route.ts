import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import {
    createThinkTankQuestion,
    ensureThinkTankAccess,
    logThinkTankAudit,
    notifyThinkTankIdeaParticipants,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    const body = await req.json();
    const question = String(body.question || '').trim();

    if (!question) {
        return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    const created = await createThinkTankQuestion({
        ideaId: context?.params?.id,
        userId: user.id,
        content: question,
    });

    await logThinkTankAudit({
        ideaId: context?.params?.id,
        actorUserId: user.id,
        action: 'QUESTION_ASKED',
        outcome: 'SUCCESS',
        entityId: created.id,
    });

    await notifyThinkTankIdeaParticipants(
        context?.params?.id,
        'Think Tank question received',
        'A voter has asked a question about your idea.',
        '/dashboard/think-tank'
    );

    return NextResponse.json({ question: created }, { status: 201 });
});
