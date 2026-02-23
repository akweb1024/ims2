import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const date = searchParams.get('date');
            const companyId = searchParams.get('companyId');
            const departmentId = searchParams.get('departmentId');
            const employeeId = searchParams.get('employeeId');

            const targetDate = date ? new Date(date) : new Date();
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            const where: any = {
                date: {
                    gte: targetDate,
                    lt: nextDay
                }
            };

            if (companyId && companyId !== 'all') {
                where.companyId = companyId;
            }

            if (departmentId && departmentId !== 'all') {
                where.employee = { user: { departmentId } };
            }

            if (employeeId && employeeId !== 'all') {
                where.employeeId = employeeId;
            }

            const status = searchParams.get('status');
            if (status && status !== 'all') {
                if (status === 'ACTIVE') {
                    where.employee = { ...where.employee, user: { ...where.employee?.user, isActive: true } };
                } else if (status === 'INACTIVE') {
                    where.employee = { ...where.employee, user: { ...where.employee?.user, isActive: false } };
                }
            }

            const search = searchParams.get('search');
            const searchType = searchParams.get('searchType') || 'all';

            if (search) {
                // Determine the filter based on searchType
                let employeeFilter: any = {};

                if (searchType === 'all') {
                    employeeFilter = {
                        OR: [
                            { user: { name: { contains: search, mode: 'insensitive' } } },
                            { user: { email: { contains: search, mode: 'insensitive' } } },
                            { phoneNumber: { contains: search, mode: 'insensitive' } },
                            { employeeId: { contains: search, mode: 'insensitive' } }
                        ]
                    };
                } else if (searchType === 'name') {
                    employeeFilter = { user: { name: { contains: search, mode: 'insensitive' } } };
                } else if (searchType === 'email') {
                    employeeFilter = { user: { email: { contains: search, mode: 'insensitive' } } };
                } else if (searchType === 'phone') {
                    employeeFilter = { phoneNumber: { contains: search, mode: 'insensitive' } };
                } else if (searchType === 'id') {
                    employeeFilter = { employeeId: { contains: search, mode: 'insensitive' } };
                }

                // Merge with existing employee filter
                where.employee = {
                    ...where.employee,
                    ...employeeFilter,
                    // Ensure user filter is merged properly if both exist (e.g. status + name search)
                    // If employeeFilter has user, and where.employee has user, we need to merge them.
                    // But OR clause makes it tricky if we rely on simple spread.
                    // For 'all' OR, it works as AND (other filters) AND (OR conditions).
                    // For specific 'name'/'email', it works as AND.
                    // BUT: 'user' inside employeeFilter vs 'user' inside where.employee (from status)
                };

                // Deep merge helper for 'user' if needed
                if (where.employee.user && employeeFilter.user) {
                    where.employee.user = { ...where.employee.user, ...employeeFilter.user };
                }
            }

            const attendance = await prisma.attendance.findMany({
                where,
                include: {
                    employee: {
                        include: { user: { select: { name: true, email: true } } }
                    },
                    shift: true
                },
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(attendance);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
