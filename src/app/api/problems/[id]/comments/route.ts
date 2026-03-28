import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import {
    addProblemComment,
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
        const canManage = canManageProblems(user.role);
        if (!canManage && issue.reportedById !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const updated = await addProblemComment({
            issueId: issue.id,
            companyId: user.companyId,
            actor: user,
            content: String(body.content || ''),
        });

        return NextResponse.json({
            success: true,
            issue: serializeProblemIssue(updated, { revealReporter: canManage || issue.reportedById === user.id, internalView: canManage }),
        });
    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
});
