import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ recordId: string }> }
) {
    try {
        const { recordId } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user || !['HR_MANAGER', 'HR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const record = await prisma.salaryIncrementRecord.findUnique({
            where: { id: recordId },
            include: { employeeProfile: true }
        });

        if (!record) {
            return NextResponse.json({ error: 'Increment record not found' }, { status: 404 });
        }

        if (record.status !== 'RECOMMENDED') {
            return NextResponse.json({ error: 'Only RECOMMENDED increments can be approved' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Record Status
            const updatedRecord = await tx.salaryIncrementRecord.update({
                where: { id: recordId },
                data: {
                    status: 'APPROVED',
                    approvedByUserId: user.id
                }
            });

            // 2. Update Employee Profile with ALL relevant fields
            const profileUpdate = await tx.employeeProfile.update({
                where: { id: record.employeeProfileId },
                data: {
                    // Salary components
                    baseSalary: record.newSalary,
                    salaryFixed: record.newFixed || 0,
                    salaryVariable: record.newVariable || 0,
                    salaryIncentive: record.newIncentive || 0,

                    // Target fields
                    baseTarget: record.newBaseTarget || undefined,
                    variableRate: record.newVariableRate || undefined,
                    variableUnit: record.newVariableUnit || undefined,
                    monthlyTarget: record.newMonthlyTarget || undefined,
                    yearlyTarget: record.newYearlyTarget || undefined,

                    // Performance & Designation
                    designation: record.newDesignation || undefined,
                    kra: record.newKRA || undefined,
                    jobDescription: record.newJobDescription || undefined,

                    // Metadata
                    lastIncrementDate: record.type === 'INCREMENT' ? record.effectiveDate : undefined,
                    lastIncrementPercentage: record.type === 'INCREMENT' ? record.percentage : undefined,
                    lastPromotionDate: record.type === 'PROMOTION' ? record.effectiveDate : undefined
                }
            });

            // 3. Upsert SalaryStructure with detailed breakdown
            const newSalary = record.newSalary || 0;
            const basicSalary = newSalary * 0.4; // 40% basic
            const hra = newSalary * 0.3; // 30% HRA
            const specialAllowance = newSalary * 0.2; // 20% special allowance
            const conveyance = newSalary * 0.05; // 5% conveyance
            const medical = newSalary * 0.05; // 5% medical

            const grossSalary = basicSalary + hra + specialAllowance + conveyance + medical;

            // Employee deductions (12% PF on basic, 0.75% ESIC on gross if applicable)
            const pfEmployee = basicSalary * 0.12;
            const esicEmployee = grossSalary <= 21000 ? grossSalary * 0.0075 : 0;
            const totalDeductions = pfEmployee + esicEmployee;

            // Employer contributions
            const pfEmployer = basicSalary * 0.12;
            const esicEmployer = grossSalary <= 21000 ? grossSalary * 0.0325 : 0;
            const gratuity = basicSalary * 0.0481; // 4.81% of basic

            const netSalary = grossSalary - totalDeductions;
            const ctc = grossSalary + pfEmployer + esicEmployer + gratuity;

            await tx.salaryStructure.upsert({
                where: { employeeId: record.employeeProfileId },
                update: {
                    basicSalary,
                    hra,
                    conveyance,
                    medical,
                    specialAllowance,
                    grossSalary,
                    pfEmployee,
                    esicEmployee,
                    totalDeductions,
                    pfEmployer,
                    esicEmployer,
                    gratuity,
                    netSalary,
                    ctc,
                    healthCare: record.newHealthCare || 0,
                    travelling: record.newTravelling || 0,
                    mobile: record.newMobile || 0,
                    internet: record.newInternet || 0,
                    booksAndPeriodicals: record.newBooksAndPeriodicals || 0,
                    effectiveFrom: record.effectiveDate
                },
                create: {
                    employeeId: record.employeeProfileId,
                    basicSalary,
                    hra,
                    conveyance,
                    medical,
                    specialAllowance,
                    grossSalary,
                    pfEmployee,
                    esicEmployee,
                    totalDeductions,
                    pfEmployer,
                    esicEmployer,
                    gratuity,
                    netSalary,
                    ctc,
                    healthCare: record.newHealthCare || 0,
                    travelling: record.newTravelling || 0,
                    mobile: record.newMobile || 0,
                    internet: record.newInternet || 0,
                    booksAndPeriodicals: record.newBooksAndPeriodicals || 0,
                    effectiveFrom: record.effectiveDate
                }
            });

            // 4. Sync EmployeeKPI records if newKPI is provided
            if (record.newKPI && Array.isArray(record.newKPI) && record.newKPI.length > 0) {
                // Get companyId from employee profile
                const empWithUser = await tx.employeeProfile.findUnique({
                    where: { id: record.employeeProfileId },
                    include: { user: { select: { companyId: true } } }
                });

                const companyId = empWithUser?.user?.companyId;

                if (companyId) {
                    // Delete existing KPIs for this employee
                    await tx.employeeKPI.deleteMany({
                        where: { employeeId: record.employeeProfileId }
                    });

                    // Create new KPIs from increment record
                    for (const kpi of record.newKPI as any[]) {
                        if (kpi.title && kpi.target !== undefined) {
                            await tx.employeeKPI.create({
                                data: {
                                    employeeId: record.employeeProfileId,
                                    companyId: companyId,
                                    title: kpi.title,
                                    target: parseFloat(kpi.target) || 0,
                                    unit: kpi.unit || 'units',
                                    period: kpi.period || 'MONTHLY',
                                    category: kpi.category || 'GENERAL'
                                }
                            });
                        }
                    }
                }
            }

            // 5. Update CompanyDesignation if designation changed
            if (record.newDesignation) {
                const empWithUser = await tx.employeeProfile.findUnique({
                    where: { id: record.employeeProfileId },
                    include: { user: { select: { companyId: true } } }
                });

                const companyId = empWithUser?.user?.companyId;

                if (companyId) {
                    await tx.employeeCompanyDesignation.upsert({
                        where: {
                            employeeId_companyId: {
                                employeeId: record.employeeProfileId,
                                companyId: companyId
                            }
                        },
                        update: {
                            designation: record.newDesignation,
                            isPrimary: true
                        },
                        create: {
                            employeeId: record.employeeProfileId,
                            companyId: companyId,
                            designation: record.newDesignation,
                            isPrimary: true
                        }
                    });
                }
            }

            return updatedRecord;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Approval Error:', error);
        return NextResponse.json({ error: 'Failed to approve increment' }, { status: 500 });
    }
}
