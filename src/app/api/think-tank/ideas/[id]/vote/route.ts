import { NextRequest, NextResponse } from 'next/server';
import { ThinkTankVoteState } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    castThinkTankVote,
    ensureThinkTankAccess,
    getGovernanceState,
    logThinkTankAudit,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    const governance = await getGovernanceState(user.companyId);
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

    const voter = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, employeeProfile: { select: { designation: true } } },
    });
    const pointAllocation = body.pointAllocation !== undefined ? Number(body.pointAllocation) : undefined;
    const result = await castThinkTankVote({
        ideaId: idea.id,
        companyId: user.companyId,
        userId: user.id,
        role: voter?.role || user.role,
        designation: voter?.employeeProfile?.designation,
        vote,
        pointAllocation,
    });

    await logThinkTankAudit({
        ideaId: idea.id,
        actorUserId: user.id,
        action: 'VOTE_CAST',
        outcome: 'SUCCESS',
        metadata: { vote, pointAllocation: pointAllocation ?? null },
    });

    return NextResponse.json({
        success: true,
        weightedScore: result.idea.weightedScore,
        finalScore: result.idea.finalScore,
        voteCount: result.idea.voteCount,
        pointAccount: result.account
            ? {
                basePoints: result.account.basePoints,
                maxPerIdeaPoints: result.account.maxPerIdeaPoints,
                allocatedPoints: result.account.allocatedPoints,
                remainingPoints: result.account.remainingPoints,
            }
            : null,
    });
});
