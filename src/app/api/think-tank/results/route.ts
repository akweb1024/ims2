import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { ensureThinkTankAccess, serializeThinkTankIdea, thinkTankIdeaInclude } from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (_req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);
    const ideas = await prisma.thinkTankIdea.findMany({
        where: {
            // GLOBAL: no companyId filter
            ...(user.role === 'SUPER_ADMIN'
                ? { status: { in: ['ACTIVE', 'LOCKED', 'REVEALED'] } }
                : { status: 'REVEALED' }),
        },
        include: thinkTankIdeaInclude,
        orderBy: [
            { revealedAt: 'desc' },
            { finalScore: 'desc' },
            { weightedScore: 'desc' },
        ],
    });

    return NextResponse.json({
        ideas: ideas.map((idea) => serializeThinkTankIdea(idea, { reveal: true })),
    });
});
