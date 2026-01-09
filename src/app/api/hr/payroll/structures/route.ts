import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = user.companyId // Context

            // If we want specific employee
            const employeeId = searchParams.get('employeeId');

            if (employeeId) {
                const structure = await prisma.salaryStructure.findUnique({
                    where: { employeeId }
                });
                return NextResponse.json(structure || {});
            }

            const structures = await prisma.salaryStructure.findMany({
                where: {
                    employee: {
                        user: {
                            companyId: companyId || undefined
                        }
                    }
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            employeeId: true,
                            designation: true,
                            user: {
                                select: {
                                    email: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            return NextResponse.json(structures);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            // Handle Bulk Import (Array) or Single
            const items = Array.isArray(body) ? body : [body];
            const results = [];

            for (const item of items) {
                const { employeeId, basicSalary, hra, conveyance, medical, specialAllowance, pfEmployee, esicEmployee, professionalTax, tds, pfEmployer, esicEmployer, gratuity, insurance } = item;

                if (!employeeId) continue;

                // Calculate Totals
                // Earnings
                const earnings = (basicSalary || 0) + (hra || 0) + (conveyance || 0) + (medical || 0) + (specialAllowance || 0);

                // Deductions
                const deductions = (pfEmployee || 0) + (esicEmployee || 0) + (professionalTax || 0) + (tds || 0);

                // Employer contribs
                const employerContrib = (pfEmployer || 0) + (esicEmployer || 0) + (gratuity || 0) + (insurance || 0);

                const netSalary = earnings - deductions;
                const ctc = earnings + employerContrib;

                // Upsert
                const saved = await prisma.salaryStructure.upsert({
                    where: { employeeId },
                    update: {
                        basicSalary: basicSalary || 0,
                        hra: hra || 0,
                        conveyance: conveyance || 0,
                        medical: medical || 0,
                        specialAllowance: specialAllowance || 0,

                        grossSalary: earnings,

                        pfEmployee: pfEmployee || 0,
                        esicEmployee: esicEmployee || 0,
                        professionalTax: professionalTax || 0,
                        tds: tds || 0,
                        totalDeductions: deductions,

                        pfEmployer: pfEmployer || 0,
                        esicEmployer: esicEmployer || 0,
                        gratuity: gratuity || 0,
                        insurance: insurance || 0,

                        netSalary,
                        ctc
                    },
                    create: {
                        employeeId,
                        basicSalary: basicSalary || 0,
                        hra: hra || 0,
                        conveyance: conveyance || 0,
                        medical: medical || 0,
                        specialAllowance: specialAllowance || 0,

                        grossSalary: earnings,

                        pfEmployee: pfEmployee || 0,
                        esicEmployee: esicEmployee || 0,
                        professionalTax: professionalTax || 0,
                        tds: tds || 0,
                        totalDeductions: deductions,

                        pfEmployer: pfEmployer || 0,
                        esicEmployer: esicEmployer || 0,
                        gratuity: gratuity || 0,
                        insurance: insurance || 0,

                        netSalary,
                        ctc
                    }
                });
                results.push(saved);
            }

            return NextResponse.json({ message: 'Processed', count: results.length });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
