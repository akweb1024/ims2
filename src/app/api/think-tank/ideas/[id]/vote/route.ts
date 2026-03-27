import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ThinkTankVoteState } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    encryptThinkTankIdentity,
    ensureThinkTankAccess,
    getGovernanceState,
    getOrCreateCurrentCycle,
    getVoteWeight,
    logThinkTankAudit,
    recalculateIdeaScore,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    const governance = getGovernanceState();
    if (!governance.votingOpen) {
        await logThinkTankAudit({
            actorUserId: user.id,
            ideaId: context?.params?.id,
            action: 'VOTE_ATTEMPT_WHILE_LOCKED',
            outcome: 'BLOCKED',
        });
        return NextResponse.json({ error: 'Voting is currently locked by governance schedule.' }, { status: 423 });
    }

    const body = await req.json();
    const vote = String(body.vote || '').toUpperCase() as ThinkTankVoteState;
    if (!Object.values(ThinkTankVoteState).includes(vote)) {
        return NextResponse.json({ error: 'Invalid vote value.' }, { status: 400 });
    }

    const idea = await prisma.thinkTankIdea.findFirst({
        where: {
            id: context?.params?.id,
            companyId: user.companyId,
            status: { in: ['ACTIVE', 'LOCKED'] },
        },
        include: {
            cycle: true,
        },
    });

    if (!idea) {
        return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    const cycle = await getOrCreateCurrentCycle(user.companyId);
    const userHash = crypto.createHash('sha256').update(user.id).digest('hex');
    const voter = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, employeeProfile: { select: { designation: true } } },
    });
    const weight = getVoteWeight(voter?.employeeProfile?.designation, voter?.role || user.role);
    const baseValue = vote === 'LIKE' ? 1 : vote === 'UNLIKE' ? -1 : 0;

    await prisma.thinkTankIdeaVote.upsert({
        where: {
            ideaId_cycleId_voterHash: {
                ideaId: idea.id,
                cycleId: cycle.id,
                voterHash: userHash,
            },
        },
        create: {
            ideaId: idea.id,
            cycleId: cycle.id,
            companyId: user.companyId,
            voterEncrypted: encryptThinkTankIdentity(user.id),
            voterHash: userHash,
            vote,
            weight,
            weightedValue: weight * baseValue,
        },
        update: {
            vote,
            weight,
            weightedValue: weight * baseValue,
        },
    });

    const updated = await recalculateIdeaScore(idea.id);
    await logThinkTankAudit({
        ideaId: idea.id,
        actorUserId: user.id,
        action: 'VOTE_CAST',
        outcome: 'SUCCESS',
        metadata: { vote },
    });

    return NextResponse.json({
        success: true,
        weightedScore: updated.weightedScore,
        voteCount: updated.voteCount,
    });
});
