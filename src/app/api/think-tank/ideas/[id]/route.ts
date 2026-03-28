import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ThinkTankIdeaCategory } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    canManageThinkTankReview,
    ensureThinkTankAccess,
    getGovernanceState,
    logThinkTankAudit,
    notifyThinkTankIdeaParticipants,
    notifyThinkTankReviewers,
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
    const canReview = canManageThinkTankReview(user.role);
    const isOwner = idea.plannerHash === userHash || ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
    const governance = await getGovernanceState(user.companyId);

    if (!canReview && !governance.submissionOpen) {
        return NextResponse.json({ error: 'Ideas are locked for editing right now.' }, { status: 423 });
    }
    if (!isOwner && !canReview) {
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
    if (canReview && body.reviewStage) {
        data.reviewStage = String(body.reviewStage).toUpperCase();
        if (data.reviewStage === 'SHORTLISTED' && !idea.shortlistedAt) data.shortlistedAt = new Date();
        if (data.reviewStage === 'APPROVED' && !idea.approvedAt) data.approvedAt = new Date();
        if (data.reviewStage === 'IMPLEMENTED' && !idea.implementedAt) data.implementedAt = new Date();
        data.decisionById = user.id;
    }
    if (canReview && body.implementationStatus) {
        data.implementationStatus = String(body.implementationStatus).toUpperCase();
        if (data.implementationStatus === 'COMPLETED' && !idea.implementedAt) data.implementedAt = new Date();
        data.decisionById = user.id;
    }
    if (canReview && body.decisionNotes !== undefined) {
        data.decisionNotes = body.decisionNotes ? String(body.decisionNotes).trim() : null;
        data.decisionById = user.id;
    }

    const updated = await prisma.thinkTankIdea.update({
        where: { id: idea.id },
        data,
        include: thinkTankIdeaInclude,
    });

    await logThinkTankAudit({
        ideaId: idea.id,
        actorUserId: user.id,
        action: canReview ? 'IDEA_REVIEW_UPDATED' : 'IDEA_UPDATED',
        outcome: 'SUCCESS',
    });

    if (canReview) {
        await notifyThinkTankIdeaParticipants(
            idea.id,
            'Think Tank idea updated',
            `Your idea "${updated.topic}" moved to ${updated.reviewStage} with implementation status ${updated.implementationStatus}.`,
            '/dashboard/think-tank/results'
        );

        if (updated.reviewStage === 'SHORTLISTED' || updated.reviewStage === 'APPROVED') {
            await notifyThinkTankReviewers(
                user.companyId,
                `Think Tank idea ${updated.reviewStage.toLowerCase()}`,
                `"${updated.topic}" is now ${updated.reviewStage.toLowerCase()}.`,
                '/dashboard/think-tank'
            );
        }
    }

    return NextResponse.json({
        idea: serializeThinkTankIdea(updated, { includeDuplicates: true }),
    });
});
