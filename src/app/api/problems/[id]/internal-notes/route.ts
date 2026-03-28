import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import {
    addProblemInternalNote,
    ensureProblemsAccess,
    serializeProblemIssue,
} from '@/lib/problems';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    try {
        ensureProblemsAccess(user);
        const body = await req.json();
        const updated = await addProblemInternalNote({
            issueId: context?.params?.id,
            companyId: user.companyId,
            actor: user,
            content: String(body.content || ''),
        });

        return NextResponse.json({
            success: true,
            issue: serializeProblemIssue(updated, { revealReporter: true, internalView: true }),
        });
    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
});
