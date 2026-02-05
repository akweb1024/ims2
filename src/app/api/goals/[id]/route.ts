import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// GET: Get goal details
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const goal = await prisma.employeeGoal.findUnique({
                where: { id },
                include: {
                    employee: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            },
                            designation: true
                        }
                    },
                    kpi: true,
                    reviewer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    workPlans: {
                        orderBy: { date: 'desc' },
                        take: 10
                    }
                }
            });

            if (!goal) {
                return createErrorResponse('Goal not found', 404);
            }

            // Check access permissions
            if (['EXECUTIVE'].includes(user.role)) {
                if (goal.employeeId !== user.employeeProfile?.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(goal.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            return NextResponse.json(goal);
        } catch (error: any) {
            console.error('Error fetching goal:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// PUT: Update goal progress/status
export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const {
                currentValue,
                status,
                reviewNotes,
                title,
                description,
                kra,
                targetValue,
                visibility
            } = body;

            // Find existing goal
            const existingGoal = await prisma.employeeGoal.findUnique({
                where: { id }
            });

            if (!existingGoal) {
                return createErrorResponse('Goal not found', 404);
            }

            // Check permissions
            if (['EXECUTIVE'].includes(user.role)) {
                if (existingGoal.employeeId !== user.employeeProfile?.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(existingGoal.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            // Calculate achievement percentage if currentValue is provided
            let achievementPercentage = existingGoal.achievementPercentage;
            const newCurrentValue = currentValue !== undefined ? parseFloat(currentValue) : existingGoal.currentValue;
            const newTargetValue = targetValue !== undefined ? parseFloat(targetValue) : existingGoal.targetValue;

            if (newTargetValue > 0) {
                achievementPercentage = (newCurrentValue / newTargetValue) * 100;
            }

            // Update goal
            const updatedGoal = await prisma.employeeGoal.update({
                where: { id },
                data: {
                    ...(currentValue !== undefined && { currentValue: newCurrentValue }),
                    ...(status && { status }),
                    ...(reviewNotes !== undefined && { reviewNotes }),
                    ...(title && { title }),
                    ...(description !== undefined && { description }),
                    ...(kra !== undefined && { kra }),
                    ...(targetValue !== undefined && { targetValue: newTargetValue }),
                    ...(visibility && { visibility }),
                    achievementPercentage,
                    ...(reviewNotes && { reviewerId: user.id })
                },
                include: {
                    employee: {
                        select: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    kpi: true,
                    reviewer: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return NextResponse.json(updatedGoal);
        } catch (error: any) {
            console.error('Error updating goal:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// DELETE: Delete goal
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            // Find existing goal
            const existingGoal = await prisma.employeeGoal.findUnique({
                where: { id }
            });

            if (!existingGoal) {
                return createErrorResponse('Goal not found', 404);
            }

            // Check permissions
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(existingGoal.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            await prisma.employeeGoal.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error: any) {
            console.error('Error deleting goal:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
