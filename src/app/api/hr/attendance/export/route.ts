import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            if (!startDate || !endDate) {
                return createErrorResponse('Start date and end date are required', 400);
            }

            const where: any = {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            };

            if (user.companyId) {
                where.companyId = user.companyId;
            }

            const attendanceRecords = await prisma.attendance.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            user: { select: { name: true, email: true } }
                        }
                    },
                    shift: { select: { name: true } }
                },
                orderBy: { date: 'asc' }
            });

            // Convert to CSV
            const headers = ['Employee ID', 'Name', 'Email', 'Date', 'Check In', 'Check Out', 'Status', 'Shift', 'Late (mins)', 'OT (mins)', 'Work From'];
            const rows = attendanceRecords.map(record => {
                const checkIn = record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-';
                const checkOut = record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-';
                const date = new Date(record.date).toLocaleDateString();

                return [
                    record.employee.employeeId || '-',
                    `"${record.employee.user.name || '-'}"`,
                    record.employee.user.email,
                    date,
                    checkIn,
                    checkOut,
                    record.status,
                    record.shift?.name || '-',
                    record.lateMinutes,
                    record.otMinutes,
                    record.workFrom
                ].join(',');
            });

            const csvContent = [headers.join(','), ...rows].join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="attendance_${startDate}_${endDate}.csv"`
                }
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
