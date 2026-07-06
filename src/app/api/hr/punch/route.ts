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

            // Date filter — single date > range > last 30 days
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
                const from = new Date();
                from.setDate(from.getDate() - 30);
                from.setHours(0, 0, 0, 0);
                dateFilter = { gte: from, lte: new Date() };
            }

            const where: any = { date: dateFilter };

            const effectiveCompany = (companyIdParam && companyIdParam !== 'all')
                ? companyIdParam
                : (user.role !== 'SUPER_ADMIN' ? user.companyId : null);

            if (effectiveCompany) where.companyId = effectiveCompany;
            if (departmentId && departmentId !== 'all') where.employee = { user: { departmentId } };
            if (employeeId && employeeId !== 'all') where.employeeId = employeeId;

            const punchRecords = await prisma.attendance.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    department: { select: { name: true } }
                                }
                            }
                        }
                    },
                    shift: true
                },
                orderBy: { date: 'desc' },
                take: 500
            });

            const formattedRecords = punchRecords.map((record: any) => {
                const workingHours = record.checkIn && record.checkOut
                    ? (new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60)
                    : null;

                return {
                    id: record.id,
                    employeeId: record.employeeId,
                    employeeName: record.employee?.user?.name || 'Unknown',
                    employeeEmail: record.employee?.user?.email || '',
                    department: record.employee?.user?.department?.name || 'N/A',
                    date: record.date.toISOString().split('T')[0],
                    punchIn: record.checkIn?.toISOString() || null,
                    punchOut: record.checkOut?.toISOString() || null,
                    punchInLocation: record.locationName || 'N/A',
                    punchOutLocation: record.checkOut ? (record.locationName || 'N/A') : null,
                    status: record.checkOut ? 'COMPLETED' : (record.checkIn ? 'IN_PROGRESS' : 'PENDING'),
                    workingHours: workingHours ? Number(workingHours.toFixed(2)) : null,
                    workFrom: record.workFrom,
                    lateMinutes: record.lateMinutes,
                    otMinutes: record.otMinutes,
                    isLate: record.isLate,
                    attendanceStatus: record.status
                };
            });

            return NextResponse.json(formattedRecords);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
