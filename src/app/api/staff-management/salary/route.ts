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
                            },
                            salarySlips: {
                                where: {
                                    month: month ? parseInt(month.split('-')[1]) : new Date().getMonth() + 1,
                                    year: year ? parseInt(year) : (month ? parseInt(month.split('-')[0]) : new Date().getFullYear())
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
                const slip = emp?.salarySlips?.[0]; // Get the slip for this month if exists

                const currentMonth = month || new Date().toISOString().slice(0, 7);
                const currentYear = year ? parseInt(year) : (month ? parseInt(month.split('-')[0]) : new Date().getFullYear());

                return {
                    id: slip?.id || record.id, // Use slip ID if exists, else structure ID (for key)
                    employeeId: record.employeeId,
                    employeeName: usr?.name || 'Unknown',
                    employeeEmail: usr?.email || 'N/A',
                    department: usr?.department?.name || 'N/A',
                    month: currentMonth,
                    year: currentYear,
                    basicSalary: slip ? slip.basicSalary : (record.basicSalary || 0),
                    hra: slip ? slip.hra : (record.hra || 0),
                    allowances: slip ? (slip.specialAllowance + slip.otherAllowances) : (record.specialAllowance + record.otherAllowances || 0),
                    otherAllowances: slip ? slip.otherAllowances : (record.otherAllowances || 0),
                    deductions: slip ? slip.totalDeductions : (record.totalDeductions || 0),
                    totalDeductions: slip ? slip.totalDeductions : (record.totalDeductions || 0),
                    tax: slip ? slip.tds : (record.tds || 0),
                    tds: slip ? slip.tds : (record.tds || 0),
                    netSalary: slip ? slip.netPayable : (record.netSalary || 0),
                    status: slip ? slip.status : 'PENDING',
                    paymentDate: slip?.amountPaid > 0 ? slip.generatedAt : null // Rough proxy for payment date
                };
            });

            return NextResponse.json(formattedRecords);
        } catch (error) {
            console.error('Error fetching salary records:', error); // Changed logger to console for now as logger was not imported correctly in context
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
