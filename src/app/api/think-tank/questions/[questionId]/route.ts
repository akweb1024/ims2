import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    answerThinkTankQuestion,
    decryptThinkTankIdentity,
    ensureThinkTankAccess,
    logThinkTankAudit,
    notifyThinkTankIdeaParticipants,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const PATCH = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    const body = await req.json();
    const answer = String(body.answer || '').trim();

    if (!answer) {
        return NextResponse.json({ error: 'Answer is required.' }, { status: 400 });
    }

    const question = await prisma.thinkTankIdeaQuestion.findUnique({
        where: { id: context?.params?.questionId },
        include: {
            idea: {
                select: {
                    id: true,
                    companyId: true,
                    plannerEncrypted: true,
                    partners: { select: { userEncrypted: true } },
                },
            },
        },
    });

    if (!question || question.idea.companyId !== user.companyId) {
        return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    const plannerId = decryptThinkTankIdentity(question.idea.plannerEncrypted);
    const partnerIds = question.idea.partners.map((partner) => decryptThinkTankIdentity(partner.userEncrypted));
    const allowedAnswerers = new Set([plannerId, ...partnerIds]);
    if (!allowedAnswerers.has(user.id) && !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        return NextResponse.json({ error: 'Only the idea planner or review board can answer this question.' }, { status: 403 });
    }

    const updated = await answerThinkTankQuestion({
        questionId: question.id,
        answer,
        answeredByUserId: user.id,
    });

    await logThinkTankAudit({
        ideaId: question.idea.id,
        actorUserId: user.id,
        action: 'QUESTION_ANSWERED',
        outcome: 'SUCCESS',
        entityId: question.id,
    });

    await notifyThinkTankIdeaParticipants(
        question.idea.id,
        'Think Tank question answered',
        'A question on your idea now has an answer.',
        '/dashboard/think-tank'
    );

    return NextResponse.json({ question: updated });
});
