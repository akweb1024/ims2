import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// READ-ONLY. Goal/KRA creation & edits are consolidated onto the single canonical
// KRA system (/dashboard/performance/assign → /api/kra/*). The write handlers
// (POST/PATCH/DELETE) were removed; this route only lists goals for the various
// read views. Progress (currentValue) is driven by KRA contributions, not here.
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'HR_MANAGER', 'EMPLOYEE', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeIdParam = searchParams.get('employeeId');
            const type = searchParams.get('type');
            const status = searchParams.get('status');

            const where: any = {
                companyId: user.companyId || undefined,
            };

            const selfProfile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id },
                select: { id: true },
            });

            if (['EMPLOYEE', 'EXECUTIVE'].includes(user.role)) {
                if (!selfProfile) return createErrorResponse('Profile not found', 404);
                where.employeeId = selfProfile.id;
            } else if (employeeIdParam) {
                const targetProfile = await prisma.employeeProfile.findFirst({
                    where: {
                        OR: [{ id: employeeIdParam }, { userId: employeeIdParam }],
                    },
                    select: { id: true, userId: true },
                });
                if (!targetProfile) return createErrorResponse('Employee not found', 404);

                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
                    if (!downline.includes(targetProfile.userId) && targetProfile.userId !== user.id) {
                        return createErrorResponse('Forbidden: Employee is outside your team', 403);
                    }
                }

                where.employeeId = targetProfile.id;
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
                const profileIds = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downline } },
                    select: { id: true },
                });
                where.employeeId = { in: profileIds.map((p) => p.id) };
            }

            if (type) where.type = type;
            if (status) where.status = status;

            const goals = await prisma.employeeGoal.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        }
                    },
                    kpi: true,
                    evaluations: {
                        include: {
                            evaluator: { select: { name: true } },
                        },
                    },
                },
                orderBy: { endDate: 'asc' },
            });

            return NextResponse.json(goals);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
