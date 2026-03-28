import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, AuthorizationError } from '@/lib/error-handler';
import {
    assignProblemIssue,
    canManageProblems,
    ensureProblemsAccess,
    serializeProblemIssue,
} from '@/lib/problems';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    try {
        ensureProblemsAccess(user);
        if (!canManageProblems(user.role)) {
            throw new AuthorizationError('Only management can assign problem issues.');
        }

        const body = await req.json();
        const issue = await assignProblemIssue({
            issueId: context?.params?.id,
            companyId: user.companyId,
            actorUserId: user.id,
            assigneeId: body.assigneeId || null,
            note: body.note || null,
        });

        return NextResponse.json({
            success: true,
            issue: serializeProblemIssue(issue, { revealReporter: true, internalView: true }),
        });
    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
});
