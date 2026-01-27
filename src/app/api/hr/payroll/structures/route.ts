import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const where: any = {};

            if (user.companyId) {
                where.employee = { user: { companyId: user.companyId } };
            }

            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const { getDownlineUserIds } = await import('@/lib/hierarchy');
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const allowedIds = [...subIds, user.id];
                where.employee = {
                    ...where.employee,
                    userId: { in: allowedIds }
                };
            }

            if (employeeId) {
                // If it's a manager, ensure the employee is in their downline
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const { getDownlineUserIds } = await import('@/lib/hierarchy');
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    const allowedIds = [...subIds, user.id];
                    const targetEmp = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { userId: true } });
                    if (!targetEmp || !allowedIds.includes(targetEmp.userId)) {
                        return createErrorResponse('Forbidden: Not in your team', 403);
                    }
                }
                where.employeeId = employeeId;
                const structure = await prisma.salaryStructure.findUnique({
                    where: { employeeId }
                });
                return NextResponse.json(structure || {});
            }

            const structures = await prisma.salaryStructure.findMany({
                where,
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
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            // Handle Bulk Import (Array) or Single
            const items = Array.isArray(body) ? body : [body];
            const results = [];

            for (const item of items) {
                const { employeeId, basicSalary, hra, conveyance, medical, specialAllowance, pfEmployee, esicEmployee, professionalTax, tds, pfEmployer, esicEmployer, gratuity, insurance } = item;

                if (!employeeId) continue;

                // Calculate Totals (with 2 decimal precision)
                // Earnings
                const earnings = Number(((basicSalary || 0) + (hra || 0) + (conveyance || 0) + (medical || 0) + (specialAllowance || 0)).toFixed(2));

                // Deductions
                const deductions = Number(((pfEmployee || 0) + (esicEmployee || 0) + (professionalTax || 0) + (tds || 0)).toFixed(2));

                // Employer contribs
                const employerContrib = Number(((pfEmployer || 0) + (esicEmployer || 0) + (gratuity || 0) + (insurance || 0)).toFixed(2));

                const netSalary = Number((earnings - deductions).toFixed(2));
                const ctc = Number((earnings + employerContrib).toFixed(2));

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
