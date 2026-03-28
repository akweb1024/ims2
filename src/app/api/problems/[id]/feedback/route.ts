import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import {
    addProblemResolutionFeedback,
    canManageProblems,
    ensureProblemsAccess,
    getProblemIssueById,
    serializeProblemIssue,
} from '@/lib/problems';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    try {
        ensureProblemsAccess(user);
        const issue = await getProblemIssueById(context?.params?.id, user.companyId);
        const body = await req.json();
        const outcome = String(body.outcome || '').toUpperCase();

        if (!['RESOLVED_CONFIRMED', 'REOPEN_REQUESTED'].includes(outcome)) {
            throw new ValidationError('Invalid resolution feedback outcome.');
        }

        const updated = await addProblemResolutionFeedback({
            issueId: issue.id,
            companyId: user.companyId,
            actor: user,
            outcome: outcome as 'RESOLVED_CONFIRMED' | 'REOPEN_REQUESTED',
            note: body.note || null,
        });

        const canManage = canManageProblems(user.role);
        return NextResponse.json({
            success: true,
            issue: serializeProblemIssue(updated, {
                revealReporter: canManage || issue.reportedById === user.id,
                internalView: canManage,
            }),
        });
    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
});
