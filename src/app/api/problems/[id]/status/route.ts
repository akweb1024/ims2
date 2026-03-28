import { NextRequest, NextResponse } from 'next/server';
import { ProblemStatus } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, AuthorizationError, ValidationError } from '@/lib/error-handler';
import {
    canManageProblems,
    ensureProblemsAccess,
    getProblemIssueById,
    serializeProblemIssue,
    updateProblemStatus,
} from '@/lib/problems';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    try {
        ensureProblemsAccess(user);
        const body = await req.json();
        const nextStatus = String(body.status || '').toUpperCase() as ProblemStatus;
        if (!Object.values(ProblemStatus).includes(nextStatus)) {
            throw new ValidationError('Invalid problem status.');
        }

        const issue = await getProblemIssueById(context?.params?.id, user.companyId);
        const canManage = canManageProblems(user.role);
        const isReporter = issue.reportedById === user.id;

        if (!canManage) {
            const reporterAllowed = nextStatus === ProblemStatus.REOPENED || nextStatus === ProblemStatus.CLOSED;
            if (!(isReporter && reporterAllowed)) {
                throw new AuthorizationError('You cannot change this problem status.');
            }
            if (nextStatus === ProblemStatus.CLOSED && issue.status !== ProblemStatus.RESOLVED) {
                throw new ValidationError('Only resolved problems can be closed.');
            }
        }

        const updated = await updateProblemStatus({
            issueId: issue.id,
            companyId: user.companyId,
            actorUserId: user.id,
            nextStatus,
            note: body.note || null,
        });

        return NextResponse.json({
            success: true,
            issue: serializeProblemIssue(updated, { revealReporter: canManage || isReporter, internalView: canManage }),
        });
    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
});
