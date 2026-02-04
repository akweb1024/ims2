import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const date = searchParams.get('date');
            const companyId = searchParams.get('companyId');
            const departmentId = searchParams.get('departmentId');
            const employeeId = searchParams.get('employeeId');

            const targetDate = date ? new Date(date) : new Date();
            targetDate.setHours(0, 0, 0, 0);

            const where: any = {
                date: targetDate
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

            const punchRecords = await prisma.attendance.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    department: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    shift: true
                },
                orderBy: { date: 'desc' }
            });

            // Transform data to match frontend expectations
            const formattedRecords = punchRecords.map((record: any) => {
                const workingHours = record.checkIn && record.checkOut
                    ? (new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60)
                    : null;

                return {
                    id: record.id,
                    employeeId: record.employeeId,
                    employeeName: record.employee.user.name,
                    employeeEmail: record.employee.user.email,
                    department: record.employee.user.department?.name || 'N/A',
                    date: record.date.toISOString().split('T')[0],
                    punchIn: record.checkIn?.toISOString() || null,
                    punchOut: record.checkOut?.toISOString() || null,
                    punchInLocation: record.locationName || 'N/A',
                    punchOutLocation: record.checkOut ? (record.locationName || 'N/A') : null,
                    status: record.checkOut ? 'COMPLETED' : 'PENDING',
                    workingHours: workingHours ? Number(workingHours.toFixed(2)) : null,
                    workFrom: record.workFrom,
                    lateMinutes: record.lateMinutes,
                    otMinutes: record.otMinutes
                };
            });

            return NextResponse.json(formattedRecords);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
