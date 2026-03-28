import { NextRequest, NextResponse } from 'next/server';
import {
    ProblemImpactType,
    ProblemRecurrence,
    ProblemSeverity,
    ProblemStatus,
    ProblemVisibility,
} from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import {
    canManageProblems,
    createProblemIssue,
    ensureProblemsAccess,
    findPotentialProblemDuplicates,
    PROBLEM_IMPACT_OPTIONS,
    PROBLEM_CATEGORY_OPTIONS,
    PROBLEM_RECURRENCE_OPTIONS,
    PROBLEM_SEVERITY_OPTIONS,
    PROBLEM_STATUS_OPTIONS,
    PROBLEM_VISIBILITY_OPTIONS,
    problemIssueInclude,
    serializeProblemIssue,
} from '@/lib/problems';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    try {
        ensureProblemsAccess(user);

        const { searchParams } = new URL(req.url);
        const view = searchParams.get('view') || 'my';
        const status = searchParams.get('status');
        const severity = searchParams.get('severity');
        const category = searchParams.get('category');
        const assigneeId = searchParams.get('assigneeId');
        const preview = searchParams.get('preview');

        const managementView = view === 'queue' && canManageProblems(user.role);

        if (preview === 'duplicates') {
            const title = String(searchParams.get('title') || '');
            const description = String(searchParams.get('description') || '');
            const previewCategory = String(searchParams.get('category') || '').trim().toUpperCase();

            if (!description.trim() || !previewCategory) {
                return NextResponse.json({ matches: [] });
            }

            const matches = await findPotentialProblemDuplicates({
                companyId: user.companyId,
                category: previewCategory,
                title,
                description,
            });

            return NextResponse.json({ matches });
        }

        const where: any = {
            companyId: user.companyId,
        };

        if (!managementView) {
            where.reportedById = user.id;
        }
        if (status) where.status = status;
        if (severity) where.severity = severity;
        if (category) where.category = category;
        if (assigneeId) where.assignedToId = assigneeId;

        const [issues, assignees] = await Promise.all([
            prisma.problemIssue.findMany({
                where,
                include: problemIssueInclude,
                orderBy: [
                    { updatedAt: 'desc' },
                    { createdAt: 'desc' },
                ],
            }),
            managementView
                ? prisma.user.findMany({
                    where: {
                        companyId: user.companyId,
                        isActive: true,
                        role: {
                            in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'IT_MANAGER', 'IT_ADMIN', 'FINANCE_ADMIN'],
                        },
                    },
                    select: { id: true, name: true, email: true, role: true },
                    orderBy: { name: 'asc' },
                })
                : Promise.resolve([]),
        ]);

        return NextResponse.json({
            issues: issues.map((issue) => serializeProblemIssue(issue, { revealReporter: managementView || issue.reportedById === user.id, internalView: managementView })),
            assignees,
            filters: {
                categories: PROBLEM_CATEGORY_OPTIONS,
                statuses: PROBLEM_STATUS_OPTIONS,
                severities: PROBLEM_SEVERITY_OPTIONS,
                visibility: PROBLEM_VISIBILITY_OPTIONS,
                recurrence: PROBLEM_RECURRENCE_OPTIONS,
                impactTypes: PROBLEM_IMPACT_OPTIONS,
            },
        });
    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
});

export const POST = authorizedRoute([], async (req: NextRequest, user: any) => {
    try {
        ensureProblemsAccess(user);
        const body = await req.json();

        const issue = await createProblemIssue({
            user,
            title: String(body.title || ''),
            description: String(body.description || ''),
            category: String(body.category || ''),
            severity: (String(body.severity || 'MEDIUM').toUpperCase() as ProblemSeverity),
            visibility: (String(body.visibility || 'NAMED').toUpperCase() as ProblemVisibility),
            recurrence: (String(body.recurrence || 'ONE_TIME').toUpperCase() as ProblemRecurrence),
            impactType: (String(body.impactType || 'OTHER').toUpperCase() as ProblemImpactType),
            location: body.location || null,
            affectedArea: body.affectedArea || null,
            departmentName: body.departmentName || null,
            isSensitive: Boolean(body.isSensitive),
        });

        return NextResponse.json({
            success: true,
            issue: serializeProblemIssue(issue, { revealReporter: true, internalView: true }),
        });
    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
});
