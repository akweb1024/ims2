import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// GET /api/work-assignments/[id]/history — the task's audit timeline
// (priority changes), straight from the generic AuditLog.
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const task = await prisma.task.findUnique({
                where: { id },
                select: { id: true, userId: true, assignedById: true },
            });
            if (!task) return createErrorResponse('Assignment not found', 404);

            if (['EXECUTIVE'].includes(user.role)) {
                if (task.userId !== user.id) return createErrorResponse('Forbidden', 403);
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!downlineIds.includes(task.userId) && task.assignedById !== user.id && task.userId !== user.id) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            const entries = await prisma.auditLog.findMany({
                where: { entity: 'task', entityId: id },
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });

            return NextResponse.json({
                history: entries.map((e) => ({
                    id: e.id,
                    action: e.action,
                    changes: e.changes,
                    by: e.user?.name || e.user?.email || 'System',
                    createdAt: e.createdAt,
                })),
            });
        } catch (error: any) {
            return createErrorResponse(error?.message || error);
        }
    }
);
