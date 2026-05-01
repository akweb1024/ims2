import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';
import { generateSalarySlips } from '@/lib/services/payroll/generateSalarySlips';

// POST /api/staff-management/salary/generate
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { month, companyId, departmentId, employeeId } = body; // month is "YYYY-MM"

            if (!month) {
                return NextResponse.json({ error: 'Month is required' }, { status: 400 });
            }

            const [yearStr, monthStr] = month.split('-');
            const year = parseInt(yearStr);
            const monthInt = parseInt(monthStr);

            // 1. Fetch Eligible Employees
            const where: any = {
                user: {
                    isActive: true,
                },
            };

            // If user is not super_admin, force companyId
            const resolvedCompanyId = user.companyId && user.role !== 'SUPER_ADMIN'
                ? user.companyId
                : (companyId && companyId !== 'all' ? companyId : user.companyId);

            if (!resolvedCompanyId) {
                return NextResponse.json({ error: 'Company context required' }, { status: 400 });
            }

            where.user.companyId = resolvedCompanyId;

            if (departmentId && departmentId !== 'all') {
                where.user.departmentId = departmentId;
            }
            if (employeeId && employeeId !== 'all') {
                where.id = employeeId;
            }

            const employees = await prisma.employeeProfile.findMany({
                where,
                include: {
                    salaryStructure: true,
                    user: { select: { email: true, name: true } }
                }
            });

            const { generatedCount } = await prisma.$transaction((tx) =>
                generateSalarySlips(
                    {
                        companyId: resolvedCompanyId,
                        month: monthInt,
                        year,
                        employees: employees.map((e: any) => ({
                            id: e.id,
                            currentLeaveBalance: e.currentLeaveBalance,
                            salaryStructure: e.salaryStructure,
                        })),
                    },
                    tx
                )
            );

            return NextResponse.json({
                message: `Salary generation complete. ${generatedCount} slips generated.`,
                count: generatedCount,
            });
        } catch (error) {
            logger.error('Error generating salary:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
