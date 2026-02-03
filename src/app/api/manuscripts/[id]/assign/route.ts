import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// POST - Assign task/stage to a user
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF'],
    async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { stage, assigneeId, comments, dueDate } = await req.json();

            const assignment = await prisma.stageAssignment.create({
                data: {
                    articleId: params.id,
                    stage: stage,
                    assigneeId: assigneeId,
                    assignedById: user.id,
                    comments: comments,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    status: 'PENDING'
                }
            });

            return NextResponse.json(assignment);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// GET - Get assignments for this article
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const assignments = await prisma.stageAssignment.findMany({
                where: { articleId: params.id },
                include: {
                    assignee: { select: { id: true, name: true, email: true, role: true } },
                    assignedBy: { select: { id: true, name: true } }
                },
                orderBy: { assignedAt: 'desc' }
            });

            return NextResponse.json(assignments);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
