import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { calculateSalaryBreakdown } from '@/lib/utils/salary-calculator';
import { normalizeKpis, upsertEmployeeKpis } from '@/lib/hr/employee-kpis';

export async function applyApprovedIncrement(
    increment: any,
    approvedByUserId: string,
    tx: Prisma.TransactionClient
) {
    const profileId = increment.employeeProfileId;

    // Current values — used to PRESERVE fields the increment record does not specify.
    // Minimal "quick" increment records carry only a new total salary; without this a
    // bare `|| 0` would wipe the employee's fixed/variable split, targets and perks.
    const existing = await tx.employeeProfile.findUnique({
        where: { id: profileId },
        include: { salaryStructure: true },
    });
    const curStruct = existing?.salaryStructure;

    // 1. Update Employee Profile with ALL relevant fields
    await tx.employeeProfile.update({
        where: { id: profileId },
        data: {
            // Salary components (preserve existing split when the record omits it)
            baseSalary: increment.newSalary ?? existing?.baseSalary ?? 0,
            salaryFixed: increment.newFixed ?? existing?.salaryFixed ?? 0,
            salaryVariable: increment.newVariable ?? existing?.salaryVariable ?? 0,
            salaryIncentive: increment.newIncentive ?? existing?.salaryIncentive ?? 0,

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
            monthlyTarget: increment.newMonthlyTarget ?? existing?.monthlyTarget ?? 0,
            yearlyTarget: (increment as any).newYearlyTarget ?? (increment.newMonthlyTarget != null ? increment.newMonthlyTarget * 12 : (existing?.yearlyTarget ?? 0)),

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
            statutoryBonus: (increment as any).statutoryBonus ?? curStruct?.statutoryBonus ?? 0,
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
            healthCare: increment.newHealthCare ?? curStruct?.healthCare ?? 0,
            travelling: increment.newTravelling ?? curStruct?.travelling ?? 0,
            mobile: increment.newMobile ?? curStruct?.mobile ?? 0,
            internet: increment.newInternet ?? curStruct?.internet ?? 0,
            booksAndPeriodicals: increment.newBooksAndPeriodicals ?? curStruct?.booksAndPeriodicals ?? 0,
            effectiveFrom: increment.effectiveDate,
            salaryFixed: increment.newFixed ?? existing?.salaryFixed ?? 0,
            salaryVariable: increment.newVariable ?? existing?.salaryVariable ?? 0,
            salaryIncentive: increment.newIncentive ?? existing?.salaryIncentive ?? 0,
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

    // 3. Sync EmployeeKPI records if newKPI is provided. Merge by title —
    // never wipe: KPIs the increment doesn't mention survive, and matched
    // KPIs keep their current progress (the unified service only writes
    // `current` when explicitly provided).
    if (increment.newKPI && Array.isArray(increment.newKPI) && increment.newKPI.length > 0) {
        try {
            await upsertEmployeeKpis(tx, {
                employeeId: profileId,
                kpis: normalizeKpis(increment.newKPI as any[]),
            });
        } catch (kpiErr) {
            // A KPI sync problem must not roll back an approved salary change.
            console.error('Increment KPI sync failed (non-fatal):', kpiErr);
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
