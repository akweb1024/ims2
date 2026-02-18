import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const projectId = searchParams.get('projectId');
            const status = searchParams.get('status');
            const assigneeId = searchParams.get('assigneeId');

            const where: any = { companyId: user.companyId };
            if (projectId) where.projectId = projectId;
            if (status) where.status = status;
            if (assigneeId) where.assigneeId = assigneeId;

            const issues = await prisma.issue.findMany({
                where,
                include: {
                    assignee: { select: { name: true, email: true } },
                    reporter: { select: { name: true, email: true } },
                    project: { select: { title: true } },
                    _count: { select: { followUps: true } }
                },
                orderBy: { updatedAt: 'desc' }
            });

            return NextResponse.json(issues);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const issue = await prisma.issue.create({
                data: {
                    companyId: user.companyId!,
                    projectId: body.projectId,
                    title: body.title,
                    description: body.description,
                    priority: body.priority || 'MEDIUM',
                    type: body.type || 'BUG',
                    status: 'OPEN',
                    reporterId: user.id,
                    assigneeId: body.assigneeId,
                    dueDate: body.dueDate ? new Date(body.dueDate) : undefined
                }
            });

            return NextResponse.json(issue);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
