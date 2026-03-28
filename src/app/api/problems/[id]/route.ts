import { NextRequest, NextResponse } from 'next/server';
import { ProblemSeverity, ProblemVisibility, ProblemRecurrence, ProblemImpactType } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, AuthorizationError, ValidationError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import {
    canManageProblems,
    ensureProblemsAccess,
    getProblemIssueById,
    problemIssueInclude,
    serializeProblemIssue,
} from '@/lib/problems';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    try {
        ensureProblemsAccess(user);
        const issue = await getProblemIssueById(context?.params?.id, user.companyId);
        const canManage = canManageProblems(user.role);

        if (!canManage && issue.reportedById !== user.id) {
            throw new AuthorizationError('You do not have access to this problem.');
        }

        return NextResponse.json({
            issue: serializeProblemIssue(issue, {
                revealReporter: canManage || issue.reportedById === user.id,
                internalView: canManage,
            }),
        });
    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
});

export const PATCH = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    try {
        ensureProblemsAccess(user);
        const issue = await getProblemIssueById(context?.params?.id, user.companyId);
        const canManage = canManageProblems(user.role);

        if (!canManage && issue.reportedById !== user.id) {
            throw new AuthorizationError('You do not have access to update this problem.');
        }

        const body = await req.json();
        const data: Record<string, any> = {};

        if (typeof body.title === 'string') data.title = body.title.trim();
        if (typeof body.description === 'string') data.description = body.description.trim();
        if (typeof body.location === 'string') data.location = body.location.trim();
        if (typeof body.affectedArea === 'string') data.affectedArea = body.affectedArea.trim();
        if (typeof body.departmentName === 'string') data.departmentName = body.departmentName.trim();

        if (canManage) {
            if (typeof body.category === 'string') data.category = body.category.trim().toUpperCase();
            if (body.severity) data.severity = String(body.severity).toUpperCase() as ProblemSeverity;
            if (body.visibility) data.visibility = String(body.visibility).toUpperCase() as ProblemVisibility;
            if (body.recurrence) data.recurrence = String(body.recurrence).toUpperCase() as ProblemRecurrence;
            if (body.impactType) data.impactType = String(body.impactType).toUpperCase() as ProblemImpactType;
            if (typeof body.aiSummary === 'string') data.aiSummary = body.aiSummary.trim();
            if (typeof body.rootCauseSummary === 'string') data.rootCauseSummary = body.rootCauseSummary.trim();
            if (typeof body.resolutionSummary === 'string') data.resolutionSummary = body.resolutionSummary.trim();
            if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
            if (body.isSensitive !== undefined) data.isSensitive = Boolean(body.isSensitive);
        }

        if (!Object.keys(data).length) {
            throw new ValidationError('No valid fields were provided for update.');
        }

        const updated = await prisma.problemIssue.update({
            where: { id: issue.id },
            data,
            include: problemIssueInclude,
        });

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
