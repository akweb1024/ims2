import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/salary - List salary records
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId');
            const employeeId = searchParams.get('employeeId');
            const month = searchParams.get('month');
            const year = searchParams.get('year');

            const where: any = {};

            // Filter by company
            if (companyId) {
                where.employeeProfile = {
                    user: {
                        companyId
                    }
                };
            } else if (user.companyId) {
                where.employeeProfile = {
                    user: {
                        companyId: user.companyId
                    }
                };
            }

            // Filter by employee
            if (employeeId) {
                where.employeeId = employeeId;
            }

            // Filter by month/year (if using PayrollRecord model)
            // Note: This assumes you have a PayrollRecord or similar model
            // If not, this will need to be adjusted based on your schema

            const salaryRecords = await prisma.salaryStructure.findMany({
                where: {
                    employee: {
                        user: companyId ? { companyId } : user.companyId ? { companyId: user.companyId } : undefined
                    }
                },
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
                    effectiveFrom: 'desc'
                }
            });

            return NextResponse.json(salaryRecords);
        } catch (error) {
            logger.error('Error fetching salary records:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
