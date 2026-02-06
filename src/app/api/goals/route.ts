import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// GET: List goals (filtered by employee, period, visibility)
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const type = searchParams.get('type'); // MONTHLY, QUARTERLY, YEARLY
            const status = searchParams.get('status');

            // Build where clause based on role and filters
            const where: any = {
                companyId: user.companyId || undefined,
            };

            // Role-based filtering
            if (['EXECUTIVE'].includes(user.role)) {
                // Employees can only see their own goals
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                where.employeeId = profile?.id;
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                // Managers can see their team's goals
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
                    // Get all team member goals
                    const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    const employeeProfiles = await prisma.employeeProfile.findMany({
                        where: { userId: { in: downlineIds } },
                        select: { id: true }
                    });
                    where.employeeId = { in: employeeProfiles.map(p => p.id) };
                }
            } else {
                // Admins can see all goals, optionally filtered by employee
                if (employeeId) {
                    where.employeeId = employeeId;
                }
            }

            // Apply additional filters
            if (type) where.type = type;
            if (status) where.status = status;

            const goals = await prisma.employeeGoal.findMany({
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
                    kpi: true,
                    reviewer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                } as any,
                orderBy: [
                    { type: 'asc' },
                    { startDate: 'desc' }
                ]
            });

            return NextResponse.json(goals);
        } catch (error: any) {
            console.error('Error fetching goals:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// POST: Create new goal/KRA/KPI
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const {
                employeeId,
                title,
                description,
                kra,
                targetValue,
                unit,
                type,
                startDate,
                endDate,
                visibility,
                kpiId
            } = body;

            // Validation
            if (!employeeId || !title || !targetValue || !unit || !type || !startDate || !endDate) {
                return createErrorResponse('Missing required fields', 400);
            }

            // Check if user can create goals for this employee
            if (['EXECUTIVE'].includes(user.role)) {
                // Employees can only create their own goals
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (employeeId !== profile?.id) {
                    return createErrorResponse('Forbidden: Can only create your own goals', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                // Managers can create goals for their team
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            const goal = await prisma.employeeGoal.create({
                data: {
                    employeeId,
                    title,
                    description,
                    kra,
                    targetValue: parseFloat(targetValue),
                    currentValue: 0,
                    achievementPercentage: 0,
                    unit,
                    type,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    status: 'IN_PROGRESS',
                    visibility: visibility || 'MANAGER',
                    companyId: user.companyId || '',
                    kpiId: kpiId || null,
                    reviewerId: ['MANAGER', 'TEAM_LEADER'].includes(user.role) ? user.id : null
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
                    kpi: true
                }
            });

            return NextResponse.json(goal);
        } catch (error: any) {
            console.error('Error creating goal:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
