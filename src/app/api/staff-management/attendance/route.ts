import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const date = searchParams.get('date');
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');
            const companyIdParam = searchParams.get('companyId');
            const departmentId = searchParams.get('departmentId');
            const employeeId = searchParams.get('employeeId');

            // Date range logic: single 'date' param > startDate+endDate range > last 30 days
            let dateFilter: any;
            if (date) {
                const targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                const nextDay = new Date(targetDate);
                nextDay.setDate(nextDay.getDate() + 1);
                dateFilter = { gte: targetDate, lt: nextDay };
            } else if (startDate || endDate) {
                const from = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
                const to = endDate ? new Date(endDate) : new Date();
                from.setHours(0, 0, 0, 0);
                to.setHours(23, 59, 59, 999);
                dateFilter = { gte: from, lte: to };
            } else {
                // Default: last 30 days for meaningful results
                const from = new Date();
                from.setDate(from.getDate() - 30);
                from.setHours(0, 0, 0, 0);
                dateFilter = { gte: from, lte: new Date() };
            }

            const where: any = { date: dateFilter };

            // Company filter — non-SUPER_ADMIN always scoped to their company
            const effectiveCompany = (companyIdParam && companyIdParam !== 'all')
                ? companyIdParam
                : (user.role !== 'SUPER_ADMIN' ? user.companyId : null);

            if (effectiveCompany) {
                where.companyId = effectiveCompany;
            }

            if (departmentId && departmentId !== 'all') {
                where.employee = { user: { departmentId } };
            }

            if (employeeId && employeeId !== 'all') {
                where.employeeId = employeeId;
            }

            const status = searchParams.get('status');
            // Only apply attendance status filter (not user active/inactive)
            if (status && status !== 'all' && !['ACTIVE', 'INACTIVE'].includes(status)) {
                where.status = status;
            }

            const search = searchParams.get('search');
            const searchType = searchParams.get('searchType') || 'all';

            if (search) {
                let employeeFilter: any = {};
                if (searchType === 'all') {
                    employeeFilter = {
                        OR: [
                            { user: { name: { contains: search, mode: 'insensitive' } } },
                            { user: { email: { contains: search, mode: 'insensitive' } } },
                            { employeeId: { contains: search, mode: 'insensitive' } }
                        ]
                    };
                } else if (searchType === 'name') {
                    employeeFilter = { user: { name: { contains: search, mode: 'insensitive' } } };
                } else if (searchType === 'email') {
                    employeeFilter = { user: { email: { contains: search, mode: 'insensitive' } } };
                } else if (searchType === 'id') {
                    employeeFilter = { employeeId: { contains: search, mode: 'insensitive' } };
                }
                where.employee = { ...where.employee, ...employeeFilter };
            }

            const attendance = await prisma.attendance.findMany({
                where,
                include: {
                    employee: {
                        include: { user: { select: { name: true, email: true } } }
                    },
                    shift: true
                },
                orderBy: { date: 'desc' },
                take: 500
            });

            return NextResponse.json(attendance);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
