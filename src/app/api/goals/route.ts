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

            // 1. Fetch Explicit Goals
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

            // 2. If filtering by a single employee, synthesize additional "Virtual Goals" from KPIs
            let synthesizedGoals: any[] = [];
            if (employeeId && (typeof where.employeeId === 'string' || !where.employeeId)) {
                const targetEmployeeId = employeeId;

                // Fetch KPIs for this employee
                const kpis = await prisma.employeeKPI.findMany({
                    where: {
                        employeeId: targetEmployeeId,
                        // If type is specified, filter KPIs by period
                        period: type ? type : undefined
                    },
                    include: {
                        employee: {
                            include: {
                                user: {
                                    select: { name: true, email: true }
                                }
                            }
                        }
                    }
                });

                // Fetch Profile to get KRA and Monthly Target
                const profile = await prisma.employeeProfile.findUnique({
                    where: { id: targetEmployeeId },
                    select: {
                        kra: true,
                        monthlyTarget: true,
                        baseTarget: true,
                        user: { select: { name: true, email: true } }
                    }
                });

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                // Transform KPIs to Goal objects
                synthesizedGoals = kpis.map(kpi => ({
                    id: `virtual-kpi-${kpi.id}`,
                    title: kpi.title,
                    description: `Synthesized from Increment KPI (${kpi.category})`,
                    kra: profile?.kra || 'General',
                    targetValue: kpi.target,
                    currentValue: kpi.current,
                    achievementPercentage: kpi.target > 0 ? (kpi.current / kpi.target) * 100 : 0,
                    unit: kpi.unit || 'units',
                    type: kpi.period as any,
                    startDate: startOfMonth.toISOString(), // Placeholder for current period
                    endDate: endOfMonth.toISOString(),
                    status: kpi.current >= kpi.target ? 'COMPLETED' : 'IN_PROGRESS',
                    visibility: 'MANAGER',
                    employee: {
                        user: {
                            name: kpi.employee.user.name,
                            email: kpi.employee.user.email
                        }
                    },
                    isVirtual: true
                }));

                // Add a primary goal if profile has a target and it's not already covered
                if (profile?.monthlyTarget && profile.monthlyTarget > 0 && (!type || type === 'MONTHLY')) {
                    const hasMainTarget = goals.some(g => g.title.toLowerCase().includes('monthly target'));
                    if (!hasMainTarget) {
                        synthesizedGoals.push({
                            id: `virtual-profile-target-${targetEmployeeId}`,
                            title: 'Monthly Performance Target',
                            description: `Main target defined in employee profile / last increment`,
                            kra: profile.kra || 'Key Result Areas',
                            targetValue: profile.monthlyTarget,
                            currentValue: 0, // Profile doesn't track current monthly progress directly
                            achievementPercentage: 0,
                            unit: 'units',
                            type: 'MONTHLY',
                            startDate: startOfMonth.toISOString(),
                            endDate: endOfMonth.toISOString(),
                            status: 'IN_PROGRESS',
                            visibility: 'MANAGER',
                            employee: {
                                user: {
                                    name: profile.user?.name,
                                    email: profile.user?.email
                                }
                            },
                            isVirtual: true
                        });
                    }
                }
            }

            return NextResponse.json([...goals, ...synthesizedGoals]);
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
