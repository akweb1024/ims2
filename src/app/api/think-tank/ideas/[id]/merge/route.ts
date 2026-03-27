import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ThinkTankDuplicateDecision } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    ensureThinkTankAccess,
    encryptThinkTankIdentity,
    logThinkTankAudit,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    const body = await req.json();
    const targetIdeaId = body.targetIdeaId as string | undefined;

    if (!targetIdeaId) {
        return NextResponse.json({ error: 'targetIdeaId is required.' }, { status: 400 });
    }

    const sourceIdea = await prisma.thinkTankIdea.findFirst({
        where: { id: context?.params?.id, companyId: user.companyId },
    });
    const targetIdea = await prisma.thinkTankIdea.findFirst({
        where: { id: targetIdeaId, companyId: user.companyId },
    });

    if (!sourceIdea || !targetIdea) {
        return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    const userHash = crypto.createHash('sha256').update(user.id).digest('hex');

    await prisma.$transaction(async (tx) => {
        await tx.thinkTankIdeaDuplicateMatch.updateMany({
            where: {
                ideaId: sourceIdea.id,
                matchedIdeaId: targetIdea.id,
            },
            data: {
                decision: ThinkTankDuplicateDecision.MERGE,
            },
        });

        try {
            await tx.thinkTankIdeaPartner.create({
                data: {
                    ideaId: targetIdea.id,
                    userEncrypted: encryptThinkTankIdentity(user.id),
                    userHash,
                    roleType: 'MERGED_PARTNER',
                },
            });
        } catch {
            // Partner credit already exists for this user on the canonical idea.
        }

        await tx.thinkTankIdea.update({
            where: { id: sourceIdea.id },
            data: {
                status: 'MERGED',
                duplicateDecision: 'MERGE',
                metadata: {
                    ...(sourceIdea.metadata as object || {}),
                    mergedIntoIdeaId: targetIdea.id,
                },
            },
        });
    });

    await logThinkTankAudit({
        ideaId: sourceIdea.id,
        actorUserId: user.id,
        action: 'IDEA_MERGED',
        outcome: 'SUCCESS',
        metadata: { targetIdeaId },
    });

    return NextResponse.json({ success: true });
});
