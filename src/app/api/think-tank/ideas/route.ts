import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ThinkTankDuplicateDecision, ThinkTankIdeaCategory } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    canUseThinkTankVeto,
    canManageThinkTankReview,
    createMergedIdeaFromDuplicate,
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
    const governance = await getGovernanceState(user.companyId);
    const canReview = canManageThinkTankReview(user.role);
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
        if (!canReview) {
            return NextResponse.json({ error: 'Review board access denied.' }, { status: 403 });
        }
        where.status = { notIn: ['MERGED', 'ARCHIVED'] };
    } else {
        where.cycleId = cycle.id;
        if (!governance.votingOpen && !canReview) {
            return NextResponse.json({
                governance,
                cycle,
                canReview,
                canVeto: canUseThinkTankVeto(user.role),
                pointAccount: null,
                ideas: [],
            });
        }
        where.status = canReview ? { in: ['ACTIVE', 'LOCKED'] } : { in: ['ACTIVE'] };
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
        governance,
        cycle,
        canReview,
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
        mergeTargetIdeaId,
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

    const normalizedDuplicateDecision = duplicateDecision
        ? String(duplicateDecision).toUpperCase()
        : null;

    if (
        normalizedDuplicateDecision &&
        !Object.values(ThinkTankDuplicateDecision).includes(normalizedDuplicateDecision as ThinkTankDuplicateDecision)
    ) {
        return NextResponse.json({ error: 'Invalid duplicate decision.' }, { status: 400 });
    }

    const validatedPartnerIds = Array.isArray(partnerIds)
        ? Array.from(new Set(partnerIds.map((value) => String(value).trim()).filter(Boolean)))
        : [];

    if (validatedPartnerIds.length > 0) {
        const validPartners = await prisma.user.findMany({
            where: {
                id: { in: validatedPartnerIds },
                companyId: user.companyId,
                isActive: true,
            },
            select: { id: true },
        });

        if (validPartners.length !== validatedPartnerIds.length) {
            return NextResponse.json({ error: 'One or more selected partners are invalid for this company.' }, { status: 400 });
        }
    }

    const validatedAttachments = Array.isArray(attachments) ? attachments : [];
    const attachmentRecordIds = validatedAttachments
        .map((attachment: any) => attachment?.fileRecordId)
        .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);

    if (attachmentRecordIds.length !== validatedAttachments.length) {
        return NextResponse.json({ error: 'Every attachment must be uploaded before submission.' }, { status: 400 });
    }

    if (attachmentRecordIds.length > 0) {
        const fileRecords = await prisma.fileRecord.findMany({
            where: {
                id: { in: attachmentRecordIds },
                uploadedById: user.id,
                context: 'think_tank:idea',
            },
            select: {
                id: true,
                url: true,
                filename: true,
                mimeType: true,
                size: true,
            },
        });

        if (fileRecords.length !== attachmentRecordIds.length) {
            return NextResponse.json({ error: 'One or more attachments are invalid or not owned by you.' }, { status: 400 });
        }

        const recordsById = new Map(fileRecords.map((record) => [record.id, record]));
        const hasMismatch = validatedAttachments.some((attachment: any) => {
            const record = recordsById.get(String(attachment.fileRecordId));
            if (!record) return true;
            return record.url !== attachment.url
                || record.filename !== attachment.filename
                || record.mimeType !== attachment.mimeType
                || record.size !== attachment.size;
        });

        if (hasMismatch) {
            return NextResponse.json({ error: 'Attachment metadata mismatch detected. Please re-upload the file.' }, { status: 400 });
        }
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

    if (duplicates.length > 0 && !normalizedDuplicateDecision) {
        return NextResponse.json({
            error: 'Potential duplicate found.',
            requiresDecision: true,
            duplicates,
        }, { status: 409 });
    }

    if (normalizedDuplicateDecision === 'MERGE') {
        const targetIdeaId = typeof mergeTargetIdeaId === 'string' ? mergeTargetIdeaId.trim() : '';
        if (!targetIdeaId) {
            return NextResponse.json({ error: 'Please choose the idea you want to merge into.' }, { status: 400 });
        }

        const matchingDuplicate = duplicates.find((idea) => idea.id === targetIdeaId);
        if (!matchingDuplicate) {
            return NextResponse.json({ error: 'Selected merge target is not a valid duplicate candidate.' }, { status: 400 });
        }

        const mergedIdea = await createMergedIdeaFromDuplicate({
            user,
            topic,
            description,
            category: normalizedCategory,
            partnerIds: validatedPartnerIds,
            attachments: validatedAttachments,
            targetIdeaId,
        });

        return NextResponse.json({
            idea: serializeThinkTankIdea(mergedIdea, { includeDuplicates: true }),
            merged: true,
            targetIdeaId,
        }, { status: 201 });
    }

    const idea = await createIdeaWithParticipants({
        user,
        topic,
        description,
        category: normalizedCategory,
        partnerIds: validatedPartnerIds,
        attachments: validatedAttachments,
        duplicateDecision: normalizedDuplicateDecision as ThinkTankDuplicateDecision | null,
    });

    try {
        await notifyThinkTankReviewers(
            user.companyId,
            'New Think Tank idea submitted',
            `A new idea "${idea.topic}" is ready for review.`,
            '/dashboard/think-tank'
        );
    } catch (notificationError) {
        console.error('Think Tank reviewer notification failed after idea creation:', notificationError);
    }

    return NextResponse.json({
        idea: serializeThinkTankIdea(idea, { includeDuplicates: true }),
    }, { status: 201 });
});
