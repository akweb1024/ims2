import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ThinkTankDuplicateDecision, ThinkTankIdeaCategory } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    createIdeaWithParticipants,
    ensureThinkTankAccess,
    findPotentialDuplicates,
    getGovernanceState,
    getOrCreateCurrentCycle,
    serializeThinkTankIdea,
    thinkTankIdeaInclude,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'vote';
    const cycle = await getOrCreateCurrentCycle(user.companyId);

    const where: any = {
        companyId: user.companyId,
    };

    if (view === 'my') {
        where.OR = [
            { plannerHash: { equals: '' } },
            { partners: { some: { userHash: { equals: '' } } } },
        ];
        const userHash = crypto.createHash('sha256').update(user.id).digest('hex');
        where.OR = [
            { plannerHash: userHash },
            { partners: { some: { userHash } } },
            { teamMembers: { some: { userHash } } },
        ];
    } else if (view === 'results') {
        where.status = 'REVEALED';
    } else {
        where.cycleId = cycle.id;
        where.status = { in: ['ACTIVE', 'LOCKED'] };
    }

    const ideas = await prisma.thinkTankIdea.findMany({
        where,
        include: thinkTankIdeaInclude,
        orderBy: view === 'results'
            ? [{ revealedAt: 'desc' }, { weightedScore: 'desc' }]
            : [{ createdAt: 'desc' }],
    });

    return NextResponse.json({
        governance: await getGovernanceState(user.companyId),
        cycle,
        ideas: ideas.map((idea) => serializeThinkTankIdea(idea, {
            reveal: view === 'results',
            includeDuplicates: view === 'my',
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

    return NextResponse.json({
        idea: serializeThinkTankIdea(idea, { includeDuplicates: true }),
    }, { status: 201 });
});
