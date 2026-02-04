import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/leaves - List leave requests
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId');
            const employeeId = searchParams.get('employeeId');
            const departmentId = searchParams.get('departmentId');
            const status = searchParams.get('status');

            const where: any = {};

            // Filter by company
            if (companyId) {
                where.employee = {
                    user: {
                        companyId
                    }
                };
            } else if (user.companyId) {
                where.employee = {
                    user: {
                        companyId: user.companyId
                    }
                };
            }

            // Filter by department
            if (departmentId && departmentId !== 'all') {
                where.employee = {
                    ...where.employee,
                    user: {
                        ...where.employee?.user,
                        departmentId
                    }
                };
            }

            // Filter by employee
            if (employeeId) {
                where.employeeId = employeeId;
            }

            // Filter by status
            if (status && status !== 'all') {
                where.status = status;
            }

            const leaves = await prisma.leaveRequest.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            user: {
                                select: {
                                    id: true,
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
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return NextResponse.json(leaves);
        } catch (error) {
            logger.error('Error fetching leaves:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);

// PUT /api/staff-management/leaves/[id] - Approve/reject leave
export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { leaveId, status, comment } = body;

            if (!leaveId || !status) {
                return NextResponse.json({ error: 'Leave ID and status are required' }, { status: 400 });
            }

            const leave = await prisma.leaveRequest.update({
                where: { id: leaveId },
                data: {
                    status,
                    ...(status === 'APPROVED' && {
                        approvedBy: {
                            connect: { id: user.id }
                        }
                    })
                }
            });

            return NextResponse.json({ message: 'Leave updated successfully', leave });
        } catch (error) {
            logger.error('Error updating leave:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
