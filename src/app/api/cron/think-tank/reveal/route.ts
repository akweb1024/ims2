import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getScheduledGovernanceState, notifyThinkTankIdeaParticipants, revealCycleIdeas } from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const governance = getScheduledGovernanceState();
    if (!governance.revealWindow) {
        return NextResponse.json({ skipped: true, reason: 'Reveal window is not active.' });
    }

    const cycles = await prisma.thinkTankIdeaCycle.findMany({
        where: {
            status: { in: ['ACTIVE', 'LOCKED'] },
            revealAt: { lte: new Date() },
        },
        select: { id: true },
    });

    for (const cycle of cycles) {
        const ideas = await prisma.thinkTankIdea.findMany({
            where: { cycleId: cycle.id },
            select: { id: true, topic: true },
        });
        await revealCycleIdeas(cycle.id);
        for (const idea of ideas) {
            await notifyThinkTankIdeaParticipants(
                idea.id,
                'Think Tank results revealed',
                `Results have been revealed for "${idea.topic}".`,
                '/dashboard/think-tank/results'
            );
        }
    }

    return NextResponse.json({ success: true, revealedCycles: cycles.length });
}
