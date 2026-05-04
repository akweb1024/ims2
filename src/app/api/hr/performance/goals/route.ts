import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { employeeGoalSchema } from '@/lib/validators/hr';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

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

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const result = employeeGoalSchema.safeParse(body);

            if (!result.success) {
                return createErrorResponse(result.error);
            }

            if (!user.companyId) {
                return createErrorResponse('Company association required', 403);
            }

            const goal = await prisma.employeeGoal.create({
                data: {
                    ...result.data,
                    companyId: user.companyId,
                },
            });

            return NextResponse.json(goal);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'HR_MANAGER', 'EMPLOYEE', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, currentValue, status, reviewNotes, ...data } = body;

            if (!id) return createErrorResponse('Goal ID is required', 400);

            const existingGoal = await prisma.employeeGoal.findUnique({
                where: { id: String(id) },
                select: { id: true, employeeId: true, targetValue: true },
            });
            if (!existingGoal) return createErrorResponse('Goal not found', 404);

            if (['EMPLOYEE', 'EXECUTIVE'].includes(user.role)) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true },
                });
                if (!profile || profile.id !== existingGoal.employeeId) {
                    return createErrorResponse('Unauthorized', 403);
                }

                const updateData: any = {};
                if (currentValue !== undefined && currentValue !== null) {
                    const parsedCurrent = Number(currentValue);
                    updateData.currentValue = Number.isFinite(parsedCurrent) ? parsedCurrent : 0;
                    updateData.achievementPercentage =
                        existingGoal.targetValue > 0
                            ? (updateData.currentValue / existingGoal.targetValue) * 100
                            : 0;
                }

                const updated = await prisma.employeeGoal.update({
                    where: { id: String(id) },
                    data: updateData,
                });
                return NextResponse.json(updated);
            }

            const updateData: any = { ...data };
            if (currentValue !== undefined && currentValue !== null) {
                const parsedCurrent = Number(currentValue);
                updateData.currentValue = Number.isFinite(parsedCurrent) ? parsedCurrent : 0;
                updateData.achievementPercentage =
                    existingGoal.targetValue > 0
                        ? (updateData.currentValue / existingGoal.targetValue) * 100
                        : 0;
            }
            if (status) updateData.status = status;
            if (reviewNotes) {
                updateData.reviewNotes = String(reviewNotes);
                updateData.reviewerId = user.id;
            }

            const updated = await prisma.employeeGoal.update({
                where: { id: String(id) },
                data: updateData,
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) return createErrorResponse('ID required', 400);

            await prisma.employeeGoal.delete({
                where: { id }
            });

            return NextResponse.json({ message: 'Goal deleted successfully' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
