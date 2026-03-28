import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import {
    canManageProblems,
    ensureProblemsAccess,
    getProblemsAnalytics,
} from '@/lib/problems';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    try {
        ensureProblemsAccess(user);

        if (!canManageProblems(user.role)) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Problems insights are available only to management roles.' },
                { status: 403 }
            );
        }

        const analytics = await getProblemsAnalytics({
            companyId: user.companyId,
        });

        return NextResponse.json(analytics);
    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
});
