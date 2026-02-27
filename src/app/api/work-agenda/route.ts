import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// GET: Get work plans (by date, employee)
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const date = searchParams.get('date');
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');
            const completionStatus = searchParams.get('completionStatus');

            // Build where clause
            const where: any = {
                companyId: user.companyId || undefined,
            };

            // Role-based filtering
            if (['EXECUTIVE'].includes(user.role)) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                where.employeeId = profile?.id;
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                if (employeeId) {
                    const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    const employeeProfiles = await prisma.employeeProfile.findMany({
                        where: { userId: { in: downlineIds } },
                        select: { id: true }
                    });
                    const profileIds = employeeProfiles.map(p => p.id);

                    if (!profileIds.includes(employeeId)) {
                        return createErrorResponse('Forbidden: Not in your team', 403);
                    }
                    where.employeeId = employeeId;
                } else {
                    const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    const employeeProfiles = await prisma.employeeProfile.findMany({
                        where: { userId: { in: downlineIds } },
                        select: { id: true }
                    });
                    where.employeeId = { in: employeeProfiles.map(p => p.id) };
                }
            } else {
                if (employeeId) {
                    where.employeeId = employeeId;
                }
            }

            // Date filtering
            if (date) {
                where.date = new Date(date);
            } else if (startDate && endDate) {
                where.date = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            if (completionStatus) {
                where.completionStatus = completionStatus;
            }

            const workPlans = await prisma.workPlan.findMany({
                where,
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
                            type: true
                        }
                    },
                    project: {
                        select: {
                            id: true,
                            title: true
                        }
                    },
                    task: {
                        select: {
                            id: true,
                            title: true,
                            status: true
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
                } as any,
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(workPlans);
        } catch (error: any) {
            console.error('Error fetching work plans:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// POST: Create next-day agenda
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const {
                employeeId,
                date,
                agenda,
                strategy,
                priority,
                estimatedHours,
                linkedGoalId,
                projectId,
                taskId,
                visibility
            } = body;

            let targetEmployeeId = employeeId;

            // If no employeeId provided, infer from current user
            if (!targetEmployeeId) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (!profile) return createErrorResponse('Employee profile not found', 404);
                targetEmployeeId = profile.id;
            }

            // Validation
            if (!date || !agenda) {
                return createErrorResponse('Missing required fields (date, agenda)', 400);
            }

            // Check permissions
            if (['EXECUTIVE'].includes(user.role)) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (targetEmployeeId !== profile?.id) {
                    return createErrorResponse('Forbidden: Can only create your own work plans', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: (await getDownlineUserIds(user.id, user.companyId || undefined)).concat([user.id]) } }, // Allow self + team
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(targetEmployeeId)) {
                    // Check if it is self?
                    const myProfile = await prisma.employeeProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
                    if (myProfile?.id !== targetEmployeeId) {
                        return createErrorResponse('Forbidden: Not in your team', 403);
                    }
                }
            }

            const workPlan = await prisma.workPlan.create({
                data: {
                    employeeId: targetEmployeeId,
                    date: new Date(date),
                    agenda,
                    strategy,
                    priority: priority || 'MEDIUM',
                    estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
                    completionStatus: 'PLANNED',
                    linkedGoalId: (linkedGoalId && linkedGoalId !== 'null') ? linkedGoalId : null,
                    projectId: (projectId && projectId !== 'null') ? projectId : null,
                    taskId: (taskId && taskId !== 'null') ? taskId : null,
                    visibility: visibility || 'MANAGER',
                    status: 'SHARED',
                    companyId: user.companyId || undefined
                } as any,
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
                    },
                    project: {
                        select: {
                            title: true
                        }
                    },
                    task: {
                        select: {
                            title: true,
                            status: true
                        }
                    }
                } as any
            });

            return NextResponse.json(workPlan);
        } catch (error: any) {
            console.error('Error creating work plan:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
