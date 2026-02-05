import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// GET: Get specific work plan
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const workPlan = await prisma.workPlan.findUnique({
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
                    linkedGoal: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                            targetValue: true,
                            currentValue: true,
                            unit: true
                        }
                    },
                    comments: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            if (!workPlan) {
                return createErrorResponse('Work plan not found', 404);
            }

            // Check permissions
            if (['EXECUTIVE'].includes(user.role)) {
                if (workPlan.employeeId !== user.employeeProfile?.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(workPlan.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            return NextResponse.json(workPlan);
        } catch (error: any) {
            console.error('Error fetching work plan:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// PUT: Update work plan status/hours
export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const {
                agenda,
                strategy,
                priority,
                estimatedHours,
                actualHours,
                completionStatus,
                linkedGoalId,
                visibility
            } = body;

            // Find existing work plan
            const existingPlan = await prisma.workPlan.findUnique({
                where: { id }
            });

            if (!existingPlan) {
                return createErrorResponse('Work plan not found', 404);
            }

            // Check permissions
            if (['EXECUTIVE'].includes(user.role)) {
                if (existingPlan.employeeId !== user.employeeProfile?.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(existingPlan.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            const updatedPlan = await prisma.workPlan.update({
                where: { id },
                data: {
                    ...(agenda && { agenda }),
                    ...(strategy !== undefined && { strategy }),
                    ...(priority && { priority }),
                    ...(estimatedHours !== undefined && { estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null }),
                    ...(actualHours !== undefined && { actualHours: actualHours ? parseFloat(actualHours) : null }),
                    ...(completionStatus && { completionStatus }),
                    ...(linkedGoalId !== undefined && { linkedGoalId }),
                    ...(visibility && { visibility })
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
                    linkedGoal: {
                        select: {
                            title: true,
                            type: true
                        }
                    }
                }
            });

            return NextResponse.json(updatedPlan);
        } catch (error: any) {
            console.error('Error updating work plan:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// DELETE: Delete work plan
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const existingPlan = await prisma.workPlan.findUnique({
                where: { id }
            });

            if (!existingPlan) {
                return createErrorResponse('Work plan not found', 404);
            }

            // Check permissions
            if (['EXECUTIVE'].includes(user.role)) {
                if (existingPlan.employeeId !== user.employeeProfile?.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(existingPlan.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            await prisma.workPlan.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error: any) {
            console.error('Error deleting work plan:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
