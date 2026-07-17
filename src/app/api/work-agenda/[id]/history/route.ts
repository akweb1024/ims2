import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// GET /api/work-agenda/[id]/history — the plan's audit timeline (priority
// changes and manager overrides), straight from the generic AuditLog.
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const workPlan = await prisma.workPlan.findUnique({
                where: { id },
                select: { id: true, employeeId: true, employee: { select: { userId: true } } },
            });
            if (!workPlan) return createErrorResponse('Work plan not found', 404);

            if (['EXECUTIVE'].includes(user.role)) {
                if (workPlan.employee.userId !== user.id) return createErrorResponse('Forbidden', 403);
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!downlineIds.includes(workPlan.employee.userId) && workPlan.employee.userId !== user.id) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            // Both entity spellings are live in this codebase for WorkPlan audits
            // ('work_plan' from the HR agenda route, 'WorkPlan' from the manager
            // modify path) — the timeline shows the union.
            const entries = await prisma.auditLog.findMany({
                where: { entity: { in: ['work_plan', 'WorkPlan'] }, entityId: id },
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
