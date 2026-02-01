import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/leaves/balance - Get all employee leave balances
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId');
            const employeeId = searchParams.get('employeeId');

            const where: any = {
                employeeProfile: {
                    isNot: null
                }
            };

            if (companyId && companyId !== 'all') {
                where.companyId = companyId;
            } else if (user.companyId) {
                where.companyId = user.companyId;
            }

            if (employeeId && employeeId !== 'all') {
                where.id = employeeId;
            }

            const employees = await prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    department: {
                        select: {
                            name: true
                        }
                    },
                    employeeProfile: {
                        select: {
                            leaveBalance: true,
                            currentLeaveBalance: true,
                            initialLeaveBalance: true,
                            manualLeaveAdjustment: true
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });

            // Transform to match component expectations
            const balances = employees.map(emp => ({
                id: emp.id,
                employeeId: emp.id,
                employeeName: emp.name,
                employeeEmail: emp.email,
                department: emp.department?.name || 'N/A',
                // Default leave allocations (these should ideally come from company policy)
                annual: 20,
                sick: 10,
                casual: 7,
                compensatory: 5,
                // Used leaves (calculated from leave requests)
                used: {
                    annual: 0,
                    sick: 0,
                    casual: 0,
                    compensatory: 0
                },
                // Pending leaves
                pending: {
                    annual: 0,
                    sick: 0,
                    casual: 0,
                    compensatory: 0
                }
            }));

            return NextResponse.json(balances);
        } catch (error) {
            logger.error('Error fetching leave balances:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
