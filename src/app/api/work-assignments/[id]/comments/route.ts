import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { pushNotification } from '@/lib/notifications';
import type { Task } from '@prisma/client';

// Same visibility rule as /api/work-assignments/[id]: admins and HR see all,
// EXECUTIVE only their own tasks, MANAGER/TEAM_LEADER their downline's tasks
// or ones they assigned themselves.
const canAccessTask = async (
    user: { id: string; role: string; companyId?: string | null },
    task: Pick<Task, 'userId' | 'assignedById'>
): Promise<boolean> => {
    if (['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'].includes(user.role)) return true;
    if (task.userId === user.id || task.assignedById === user.id) return true;
    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
        return downlineIds.includes(task.userId);
    }
    return false;
};

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'];

export const GET = authorizedRoute(
    ROLES,
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const task = await prisma.task.findUnique({
                where: { id },
                select: { userId: true, assignedById: true }
            });
            if (!task) return createErrorResponse('Assignment not found', 404);
            if (!(await canAccessTask(user, task))) return createErrorResponse('Forbidden', 403);

            const comments = await prisma.taskComment.findMany({
                where: { taskId: id },
                include: { user: { select: { id: true, name: true, email: true, role: true } } },
                orderBy: { createdAt: 'asc' }
            });
            return NextResponse.json(comments);
        } catch (error: any) {
            console.error('Error fetching task comments:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

export const POST = authorizedRoute(
    ROLES,
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const content = typeof body.content === 'string' ? body.content.trim() : '';
            if (!content) return createErrorResponse('Comment content is required', 400);
            if (content.length > 5000) return createErrorResponse('Comment is too long (max 5000 characters)', 400);

            const task = await prisma.task.findUnique({
                where: { id },
                select: { userId: true, assignedById: true, title: true }
            });
            if (!task) return createErrorResponse('Assignment not found', 404);
            if (!(await canAccessTask(user, task))) return createErrorResponse('Forbidden', 403);

            const comment = await prisma.taskComment.create({
                data: { taskId: id, userId: user.id, content },
                include: { user: { select: { id: true, name: true, email: true, role: true } } }
            });

            // Let the other side of the assignment know (best-effort).
            const recipients = [task.userId, task.assignedById].filter(
                (rid): rid is string => Boolean(rid) && rid !== user.id
            );
            for (const rid of recipients) {
                try {
                    await pushNotification({
                        userId: rid,
                        title: 'New comment on a task',
                        message: `${comment.user.name || comment.user.email} commented on "${task.title}"`,
                        type: 'INFO',
                        link: '/dashboard/staff-portal?tab=assignments'
                    });
                } catch (notifyErr) {
                    console.error('Task-comment notification failed (non-fatal):', notifyErr);
                }
            }

            return NextResponse.json(comment, { status: 201 });
        } catch (error: any) {
            console.error('Error creating task comment:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
