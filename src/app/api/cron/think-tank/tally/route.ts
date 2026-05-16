import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getScheduledGovernanceState, logThinkTankAudit, recalculateIdeaScore } from '@/lib/think-tank';
import { validateCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const cronAuthError = validateCronRequest(req);
    if (cronAuthError) return cronAuthError;

    const governance = getScheduledGovernanceState();
    if (!governance.locked && !governance.revealWindow) {
        return NextResponse.json({ skipped: true, reason: 'Not in tally window.' });
    }

    const ideas = await prisma.thinkTankIdea.findMany({
        where: {
            status: { in: ['ACTIVE', 'LOCKED'] },
        },
        select: { id: true },
    });

    for (const idea of ideas) {
        await recalculateIdeaScore(idea.id);
        await prisma.thinkTankIdea.update({
            where: { id: idea.id },
            data: { status: 'LOCKED' },
        });
        await logThinkTankAudit({
            ideaId: idea.id,
            action: 'TALLY_RECALCULATED',
            outcome: 'SUCCESS',
        });
    }

    return NextResponse.json({ success: true, tallied: ideas.length });
}
