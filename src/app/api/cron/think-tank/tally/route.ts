import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGovernanceState, logThinkTankAudit, recalculateIdeaScore } from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const governance = getGovernanceState();
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
