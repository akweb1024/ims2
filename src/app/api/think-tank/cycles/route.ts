import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import {
    ensureThinkTankAccess,
    getUpcomingCycles,
    hashIdentity
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);

    // Get next 6 available cycles
    const cycles = await getUpcomingCycles(user.companyId, 6);
    
    // Check if the current user has already submitted an active idea in each cycle
    const userHash = hashIdentity(user.id);

    const mappedCycles = await Promise.all(cycles.map(async (cycle) => {
        const existingIdea = await prisma.thinkTankIdea.findFirst({
            where: {
                companyId: user.companyId,
                cycleId: cycle.id,
                plannerHash: userHash,
                status: {
                    notIn: ['MERGED', 'ARCHIVED'],
                },
            },
            select: { id: true }
        });

        return {
            id: cycle.id,
            windowStart: cycle.windowStart,
            windowEnd: cycle.windowEnd,
            revealAt: cycle.revealAt,
            cycleLabel: cycle.cycleLabel,
            occupied: !!existingIdea,
        };
    }));

    return NextResponse.json({
        cycles: mappedCycles
    });
});
