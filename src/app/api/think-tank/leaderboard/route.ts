import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { getThinkTankLeaderboard } from '@/lib/think-tank';

export const GET = authorizedRoute([], async (_req: NextRequest, user: any) => {
    const leaderboard = await getThinkTankLeaderboard(user.companyId);

    return NextResponse.json({
        ideas: leaderboard.ideas,
        topContributors: leaderboard.contributors,
    });
});
