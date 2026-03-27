import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGovernanceState, revealCycleIdeas } from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const governance = getGovernanceState();
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
        await revealCycleIdeas(cycle.id);
    }

    return NextResponse.json({ success: true, revealedCycles: cycles.length });
}
