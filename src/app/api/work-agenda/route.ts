import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, AuthorizationError, NotFoundError } from '@/lib/error-handler';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { logger } from '@/lib/logger';
import { workPlanSchema } from '@/lib/validation/schemas';

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

            // Role-based filtering logic
            if (['EXECUTIVE'].includes(user.role)) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                where.employeeId = profile?.id;
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (employeeId) {
                    if (!profileIds.includes(employeeId)) {
                        throw new AuthorizationError('Forbidden: Employee not in your team');
                    }
                    where.employeeId = employeeId;
                } else {
                    where.employeeId = { in: profileIds };
                }
            } else if (employeeId) {
                where.employeeId = employeeId;
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
                    project: { select: { id: true, title: true } },
                    task: { select: { id: true, title: true, status: true } },
                    itProject: { select: { id: true, name: true } },
                    itTask: { select: { id: true, title: true, status: true } },
                    comments: {
                        include: {
                            user: { select: { name: true, email: true } }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                } as any,
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(workPlans);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

// POST: Create next-day agenda
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            
            // Centralized Zod Validation
            const validatedData = workPlanSchema.parse(body);
            
            let targetEmployeeId = validatedData.employeeId;

            // If no employeeId provided, infer from current user
            if (!targetEmployeeId) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (!profile) throw new NotFoundError('Employee profile');
                targetEmployeeId = profile.id;
            }

            // Authorization Checks
            if (['EXECUTIVE'].includes(user.role)) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (targetEmployeeId !== profile?.id) {
                    throw new AuthorizationError('Forbidden: Can only create your own work plans');
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const teamProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: [...downlineIds, user.id] } },
                    select: { id: true }
                });
                const allowedIds = teamProfiles.map(p => p.id);

                if (!allowedIds.includes(targetEmployeeId)) {
                    throw new AuthorizationError('Forbidden: Employee not in your team');
                }
            }

            const workPlan = await prisma.workPlan.create({
                data: {
                    employeeId: targetEmployeeId,
                    date: new Date(validatedData.date),
                    agenda: validatedData.agenda,
                    strategy: validatedData.strategy,
                    priority: validatedData.priority,
                    estimatedHours: validatedData.estimatedHours ? parseFloat(validatedData.estimatedHours.toString()) : null,
                    completionStatus: 'PLANNED',
                    linkedGoalId: validatedData.linkedGoalId === 'null' ? null : validatedData.linkedGoalId,
                    projectId: validatedData.projectId === 'null' ? null : validatedData.projectId,
                    taskId: validatedData.taskId === 'null' ? null : validatedData.taskId,
                    itProjectId: validatedData.itProjectId === 'null' ? null : validatedData.itProjectId,
                    itTaskId: validatedData.itTaskId === 'null' ? null : validatedData.itTaskId,
                    visibility: validatedData.visibility,
                    status: 'SHARED',
                    companyId: user.companyId || undefined
                } as any,
                include: {
                    employee: { select: { user: { select: { name: true, email: true } } } },
                    linkedGoal: { select: { title: true, type: true } },
                    project: { select: { title: true } },
                    task: { select: { title: true, status: true } },
                    itProject: { select: { name: true } },
                    itTask: { select: { title: true, status: true } }
                } as any
            });

            logger.info('Work plan created successfully', { 
                workPlanId: workPlan.id, 
                employeeId: targetEmployeeId,
                createdBy: user.id 
            });

            return NextResponse.json(workPlan, { status: 201 });
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

