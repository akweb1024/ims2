import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/leaves/balance/[employeeId] - Get specific employee balance
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user, { params }: { params: { employeeId: string } }) => {
        try {
            const { employeeId } = params;

            const employee = await prisma.user.findUnique({
                where: { id: employeeId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    employeeProfile: {
                        select: {
                            leaveBalance: true,
                            currentLeaveBalance: true,
                            initialLeaveBalance: true,
                            manualLeaveAdjustment: true
                        }
                    }
                }
            });

            if (!employee) {
                return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
            }

            return NextResponse.json({
                employeeId: employee.id,
                employeeName: employee.name,
                email: employee.email,
                leaveBalance: employee.employeeProfile?.leaveBalance || 0,
                currentLeaveBalance: employee.employeeProfile?.currentLeaveBalance || 0,
                initialLeaveBalance: employee.employeeProfile?.initialLeaveBalance || 0,
                manualAdjustment: employee.employeeProfile?.manualLeaveAdjustment || 0
            });
        } catch (error) {
            logger.error('Error fetching employee leave balance:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);

// PUT /api/staff-management/leaves/balance/[employeeId] - Adjust leave balance
export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user, { params }: { params: { employeeId: string } }) => {
        try {
            const { employeeId } = params;
            const body = await req.json();
            const { adjustment, reason } = body;

            if (adjustment === undefined) {
                return NextResponse.json({ error: 'Adjustment value is required' }, { status: 400 });
            }

            // Update employee profile with manual adjustment
            await prisma.employeeProfile.updateMany({
                where: { userId: employeeId },
                data: {
                    manualLeaveAdjustment: {
                        increment: adjustment
                    },
                    currentLeaveBalance: {
                        increment: adjustment
                    }
                }
            });

            return NextResponse.json({ message: 'Leave balance adjusted successfully' });
        } catch (error) {
            logger.error('Error adjusting leave balance:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
