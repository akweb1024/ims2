import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ThinkTankIdeaCategory } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    ensureThinkTankAccess,
    getGovernanceState,
    logThinkTankAudit,
    serializeThinkTankIdea,
    thinkTankIdeaInclude,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (_req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    const idea = await prisma.thinkTankIdea.findFirst({
        where: {
            id: context?.params?.id,
            companyId: user.companyId,
        },
        include: thinkTankIdeaInclude,
    });

    if (!idea) {
        return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    return NextResponse.json({
        idea: serializeThinkTankIdea(idea, {
            reveal: idea.status === 'REVEALED',
            includeDuplicates: true,
        }),
    });
});

export const PATCH = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    const governance = getGovernanceState();
    if (!governance.submissionOpen) {
        return NextResponse.json({ error: 'Ideas are locked for editing right now.' }, { status: 423 });
    }

    const body = await req.json();
    const idea = await prisma.thinkTankIdea.findFirst({
        where: {
            id: context?.params?.id,
            companyId: user.companyId,
        },
    });

    if (!idea) {
        return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    const userHash = crypto.createHash('sha256').update(user.id).digest('hex');
    const isOwner = idea.plannerHash === userHash || ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
    if (!isOwner) {
        return NextResponse.json({ error: 'You can only update your own idea.' }, { status: 403 });
    }

    const data: any = {};
    if (body.topic) data.topic = String(body.topic).trim();
    if (body.description) data.description = String(body.description).trim();
    if (body.category) {
        const category = String(body.category).toUpperCase() as ThinkTankIdeaCategory;
        if (!Object.values(ThinkTankIdeaCategory).includes(category)) {
            return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
        }
        data.category = category;
    }
    if (body.status && ['DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED'].includes(body.status)) {
        data.status = body.status;
    }

    const updated = await prisma.thinkTankIdea.update({
        where: { id: idea.id },
        data,
        include: thinkTankIdeaInclude,
    });

    await logThinkTankAudit({
        ideaId: idea.id,
        actorUserId: user.id,
        action: 'IDEA_UPDATED',
        outcome: 'SUCCESS',
    });

    return NextResponse.json({
        idea: serializeThinkTankIdea(updated, { includeDuplicates: true }),
    });
});
