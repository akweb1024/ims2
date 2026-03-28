import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ThinkTankDuplicateDecision, ThinkTankIdeaCategory } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    canUseThinkTankVeto,
    canManageThinkTankReview,
    createIdeaWithParticipants,
    ensureThinkTankAccess,
    findPotentialDuplicates,
    getGovernanceState,
    getOrCreateThinkTankPointAccount,
    getOrCreateCurrentCycle,
    notifyThinkTankReviewers,
    serializeThinkTankIdea,
    thinkTankIdeaInclude,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'vote';
    const cycle = await getOrCreateCurrentCycle(user.companyId);
    const userHash = crypto.createHash('sha256').update(user.id).digest('hex');

    const where: any = {
        companyId: user.companyId,
    };

    if (view === 'my') {
        where.OR = [
            { plannerHash: userHash },
            { partners: { some: { userHash } } },
            { teamMembers: { some: { userHash } } },
        ];
    } else if (view === 'results') {
        where.status = 'REVEALED';
    } else if (view === 'review') {
        if (!canManageThinkTankReview(user.role)) {
            return NextResponse.json({ error: 'Review board access denied.' }, { status: 403 });
        }
        where.status = { notIn: ['MERGED', 'ARCHIVED'] };
    } else {
        where.cycleId = cycle.id;
        where.status = { in: ['ACTIVE', 'LOCKED'] };
        where.NOT = {
            OR: [
                { plannerHash: userHash },
                { partners: { some: { userHash } } },
                { teamMembers: { some: { userHash } } },
            ],
        };
    }

    const ideas = await prisma.thinkTankIdea.findMany({
        where,
        include: thinkTankIdeaInclude,
        orderBy: view === 'results'
            ? [{ revealedAt: 'desc' }, { finalScore: 'desc' }, { weightedScore: 'desc' }]
            : view === 'review'
                ? [{ finalScore: 'desc' }, { weightedScore: 'desc' }, { createdAt: 'desc' }]
                : [{ createdAt: 'desc' }],
    });

    const voterProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            role: true,
            employeeProfile: {
                select: { designation: true },
            },
        },
    });
    const pointAccount = await getOrCreateThinkTankPointAccount({
        companyId: user.companyId,
        cycleId: cycle.id,
        userId: user.id,
        role: voterProfile?.role || user.role,
        designation: voterProfile?.employeeProfile?.designation,
    });

    return NextResponse.json({
        governance: await getGovernanceState(user.companyId),
        cycle,
        canReview: canManageThinkTankReview(user.role),
        canVeto: canUseThinkTankVeto(user.role),
        pointAccount: {
            basePoints: pointAccount.basePoints,
            maxPerIdeaPoints: pointAccount.maxPerIdeaPoints,
            allocatedPoints: pointAccount.allocatedPoints,
            remainingPoints: pointAccount.remainingPoints,
        },
        ideas: ideas.map((idea) => serializeThinkTankIdea(idea, {
            reveal: view === 'results',
            includeDuplicates: view === 'my' || view === 'review',
            currentUserHash: userHash,
            revealQuestionIdentity: user.role === 'SUPER_ADMIN',
        })),
    });
});

export const POST = authorizedRoute([], async (req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);
    const body = await req.json();
    const {
        topic,
        description,
        category,
        partnerIds = [],
        attachments = [],
        duplicateDecision,
        previewOnly = false,
    } = body;

    if (!topic?.trim() || !description?.trim() || !category) {
        return NextResponse.json({ error: 'Topic, description, and category are required.' }, { status: 400 });
    }

    const normalizedCategory = String(category).toUpperCase() as ThinkTankIdeaCategory;
    if (!Object.values(ThinkTankIdeaCategory).includes(normalizedCategory)) {
        return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
    }

    if (Array.isArray(partnerIds) && partnerIds.length > 3) {
        return NextResponse.json({ error: 'You can add up to 3 self-opted partners.' }, { status: 400 });
    }

    const cycle = await getOrCreateCurrentCycle(user.companyId);
    const duplicates = await findPotentialDuplicates({
        companyId: user.companyId,
        cycleId: cycle.id,
        category: normalizedCategory,
        description,
    });

    if (previewOnly) {
        return NextResponse.json({ duplicates, threshold: 0.85 });
    }

    if (duplicates.length > 0 && !duplicateDecision) {
        return NextResponse.json({
            error: 'Potential duplicate found.',
            requiresDecision: true,
            duplicates,
        }, { status: 409 });
    }

    const idea = await createIdeaWithParticipants({
        user,
        topic,
        description,
        category: normalizedCategory,
        partnerIds: Array.isArray(partnerIds) ? partnerIds : [],
        attachments: Array.isArray(attachments) ? attachments : [],
        duplicateDecision: duplicateDecision as ThinkTankDuplicateDecision | null,
    });

    await notifyThinkTankReviewers(
        user.companyId,
        'New Think Tank idea submitted',
        `A new idea "${idea.topic}" is ready for review.`,
        '/dashboard/think-tank'
    );

    return NextResponse.json({
        idea: serializeThinkTankIdea(idea, { includeDuplicates: true }),
    }, { status: 201 });
});
