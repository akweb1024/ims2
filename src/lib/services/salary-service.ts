import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { calculateSalaryBreakdown } from '@/lib/utils/salary-calculator';

export async function applyApprovedIncrement(
    increment: any,
    approvedByUserId: string,
    tx: Prisma.TransactionClient
) {
    const profileId = increment.employeeProfileId;

    // 1. Update Employee Profile with ALL relevant fields
    await tx.employeeProfile.update({
        where: { id: profileId },
        data: {
            // Salary components
            baseSalary: increment.newSalary,
            salaryFixed: increment.newFixed || 0,
            salaryVariable: increment.newVariable || 0,
            salaryIncentive: increment.newIncentive || 0,

            // Opt-in Flags & Detailed Structure
            hasVariable: increment.optInVariable ?? undefined,
            variablePerTarget: increment.newVariablePerTarget ?? undefined,
            variableUpperCap: increment.newVariableUpperCap ?? undefined,
            variableDefinition: increment.variableDefinition ?? undefined,

            hasIncentive: increment.optInIncentive ?? undefined,
            incentivePercentage: increment.newIncentivePercentage ?? undefined,
            incentiveDefinition: increment.incentiveDefinition ?? undefined,

            // Target fields
            baseTarget: increment.newBaseTarget ?? undefined,
            variableRate: increment.newVariableRate ?? undefined,
            variableUnit: increment.newVariableUnit ?? undefined,
            monthlyTarget: increment.newMonthlyTarget ?? 0,
            yearlyTarget: (increment as any).newYearlyTarget ?? (increment.newMonthlyTarget ? increment.newMonthlyTarget * 12 : 0),

            // Performance & Designation
            designation: increment.newDesignation ?? undefined,
            designationJustification: increment.reason ?? undefined,
            kra: increment.newKRA ?? undefined,
            metrics: increment.newKPI ?? undefined,
            jobDescription: (increment as any).newJobDescription ?? undefined,

            // Metadata
            lastIncrementDate: increment.effectiveDate,
            lastIncrementPercentage: increment.percentage,
            lastPromotionDate: increment.type === 'PROMOTION' ? increment.effectiveDate : undefined
        } as any
    });

    // 2. Upsert SalaryStructure with centralized breakdown logic
    const {
        basicSalary,
        hra,
        specialAllowance,
        conveyance,
        medical,
        grossSalary,
        pfEmployee,
        esicEmployee,
        totalDeductions,
        pfEmployer,
        esicEmployer,
        gratuity,
        netSalary,
        ctc
    } = calculateSalaryBreakdown(increment.newSalary || 0, increment.deductPF ?? true);

    await tx.salaryStructure.upsert({
        where: { employeeId: profileId },
        update: {
            basicSalary,
            hra,
            conveyance,
            medical,
            specialAllowance,
            statutoryBonus: (increment as any).statutoryBonus || 0,
            grossSalary,
            pfEmployee,
            esicEmployee,
            totalDeductions,
            pfEmployer,
            esicEmployer,
            gratuity,
            netSalary,
            ctc,
            deductPF: increment.deductPF ?? true,
            healthCare: increment.newHealthCare || 0,
            travelling: increment.newTravelling || 0,
            mobile: increment.newMobile || 0,
            internet: increment.newInternet || 0,
            booksAndPeriodicals: increment.newBooksAndPeriodicals || 0,
            effectiveFrom: increment.effectiveDate,
            salaryFixed: increment.newFixed || 0,
            salaryVariable: increment.newVariable || 0,
            salaryIncentive: increment.newIncentive || 0,
        },
        create: {
            employeeId: profileId,
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
            healthCare: increment.newHealthCare || 0,
            travelling: increment.newTravelling || 0,
            mobile: increment.newMobile || 0,
            internet: increment.newInternet || 0,
            booksAndPeriodicals: increment.newBooksAndPeriodicals || 0,
            effectiveFrom: increment.effectiveDate,
            salaryFixed: increment.newFixed || 0,
            salaryVariable: increment.newVariable || 0,
            salaryIncentive: increment.newIncentive || 0
        }
    });

    // 3. Sync EmployeeKPI records if newKPI is provided
    if (increment.newKPI && Array.isArray(increment.newKPI) && increment.newKPI.length > 0) {
        const empWithUser = await tx.employeeProfile.findUnique({
            where: { id: profileId },
            include: { user: { select: { companyId: true } } }
        });

        const companyId = empWithUser?.user?.companyId;

        if (companyId) {
            await tx.employeeKPI.deleteMany({
                where: { employeeId: profileId }
            });

            for (const kpi of increment.newKPI as any[]) {
                if (kpi.title && kpi.target !== undefined) {
                    await tx.employeeKPI.create({
                        data: {
                            employeeId: profileId,
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

    // 4. Update CompanyDesignation if designation changed
    if (increment.newDesignation) {
        const empWithUser = await tx.employeeProfile.findUnique({
            where: { id: profileId },
            include: { user: { select: { companyId: true } } }
        });

        const companyId = empWithUser?.user?.companyId;

        if (companyId) {
            await tx.employeeCompanyDesignation.upsert({
                where: {
                    employeeId_companyId: {
                        employeeId: profileId,
                        companyId: companyId
                    }
                },
                update: {
                    designation: increment.newDesignation,
                    isPrimary: true
                },
                create: {
                    employeeId: profileId,
                    companyId: companyId,
                    designation: increment.newDesignation,
                    isPrimary: true
                }
            });
        }
    }
}
