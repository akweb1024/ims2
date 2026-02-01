import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
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
                where.employee = { departmentId };
            }

            if (employeeId && employeeId !== 'all') {
                where.employeeId = employeeId;
            }

            const status = searchParams.get('status');
            if (status && status !== 'all') {
                if (status === 'ACTIVE') {
                    where.employee = { ...where.employee, user: { isActive: true } };
                } else if (status === 'INACTIVE') {
                    where.employee = { ...where.employee, user: { isActive: false } };
                }
                // For ON_LEAVE / TERMINATED, we might match specific stats or just rely on isActive=false
                // For now, mapping broadly if needed, or ignoring. 
                // Given StaffFilters options, ON_LEAVE usually implies Active but on leave.
                // But User model only has isActive. 
                // If status is 'TERMINATED', it is likely inactive.
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
