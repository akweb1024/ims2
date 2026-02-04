import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/salary - List salary records
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
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

            if (year) {
                // If there's a year filter, we could potentially filter by effective date
                // but keeping it simple for now to return current records
            }

            if (employeeId && employeeId !== 'all') {
                where.employeeId = employeeId;
            }

            const salaryRecords = await prisma.salaryStructure.findMany({
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
                orderBy: [
                    { employee: { user: { name: 'asc' } } }
                ]
            });

            // Transform to match SalaryManagement.tsx expectations
            const formattedRecords = salaryRecords.map((record: any) => {
                const emp = record.employee;
                const usr = emp?.user;

                return {
                    id: record.id,
                    employeeId: record.employeeId,
                    employeeName: usr?.name || 'Unknown',
                    employeeEmail: usr?.email || 'N/A',
                    department: usr?.department?.name || 'N/A',
                    month: month || new Date().toISOString().slice(0, 7),
                    year: year ? parseInt(year) : new Date().getFullYear(),
                    basicSalary: record.basicSalary || 0,
                    hra: record.hra || 0,
                    allowances: record.otherAllowances || 0,
                    otherAllowances: record.otherAllowances || 0,
                    deductions: record.totalDeductions || 0,
                    totalDeductions: record.totalDeductions || 0,
                    tax: record.tds || 0,
                    tds: record.tds || 0,
                    netSalary: record.netSalary || 0,
                    status: 'PENDING', // Placeholder since monthly history is not in schema yet
                    paymentDate: null
                };
            });

            return NextResponse.json(formattedRecords);
        } catch (error) {
            logger.error('Error fetching salary records:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
