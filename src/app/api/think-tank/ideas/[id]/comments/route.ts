import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { ensureThinkTankAccess, logThinkTankAudit, notifyThinkTankIdeaParticipants } from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    const body = await req.json();
    const content = String(body.content || '').trim();

    if (!content) {
        return NextResponse.json({ error: 'Comment content is required.' }, { status: 400 });
    }

    const idea = await prisma.thinkTankIdea.findFirst({
        where: {
            id: context?.params?.id,
            companyId: user.companyId,
        },
    });

    if (!idea) {
        return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    const comment = await prisma.thinkTankIdeaComment.create({
        data: {
            ideaId: idea.id,
            authorUserId: user.id,
            content,
            isInternal: body.isInternal !== false,
        },
        include: {
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    await logThinkTankAudit({
        ideaId: idea.id,
        actorUserId: user.id,
        action: 'IDEA_COMMENT_ADDED',
        outcome: 'SUCCESS',
    });

    await notifyThinkTankIdeaParticipants(
        idea.id,
        'New Think Tank review comment',
        'A new review comment was added for your idea.',
        '/dashboard/think-tank'
    );

    return NextResponse.json({ comment }, { status: 201 });
});
