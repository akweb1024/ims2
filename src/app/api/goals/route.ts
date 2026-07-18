import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { canAccessAllCompanies } from '@/lib/access-policy';
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
            // Prisma drops an undefined key rather than matching null, so
            // `companyId: user.companyId || undefined` returned every company's rows
            // to a null-company user (User.companyId is nullable).
            const where: any = {};
            if (!canAccessAllCompanies(user)) {
                if (!user.companyId) return NextResponse.json([]);
                where.companyId = user.companyId;
            }

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

            // Virtual-goal synthesis (KPI rows + profile monthlyTarget dressed up as
            // goals with invented statuses) was removed in the KRA unification:
            // it inflated totals, dragged the average down with a permanent-0%
            // row, and used statuses (COMPLETED) real goals never have. This
            // route now returns real EmployeeGoal rows only.
            return NextResponse.json(goals);

        } catch (error: any) {
            console.error('Error fetching goals:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
