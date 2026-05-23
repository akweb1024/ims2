import { Prisma } from '@prisma/client';
import { PayrollCalculator } from '@/lib/payroll';

export type GenerateSalarySlipsInput = {
  companyId: string;
  month: number;
  year: number;
  employees: Array<{
    id: string;
    currentLeaveBalance: number | null;
    salaryStructure: {
      grossSalary: number;
      basicSalary: number;
      hra: number;
      conveyance: number;
      medical: number;
      specialAllowance: number;
      otherAllowances: number;
      statutoryBonus: number;
      pfEmployee: number;
      pfEmployer: number;
      esicEmployee: number;
      esicEmployer: number;
      gratuity: number;
      healthCare: number;
      travelling: number;
      mobile: number;
      internet: number;
      booksAndPeriodicals: number;
      salaryFixed: number;
      salaryVariable: number;
      deductPF: boolean;
    } | null;
  }>;
};

export async function generateSalarySlips(
  input: GenerateSalarySlipsInput,
  tx: Prisma.TransactionClient
): Promise<{ generatedCount: number }> {
  const { companyId, month, year, employees } = input;

  if (employees.length === 0) return { generatedCount: 0 };

  const cfg = await tx.statutoryConfig.findUnique({ where: { companyId } });
  const statutoryConfig = {
    pfEmployeeRate: cfg?.pfEmployeeRate ?? 12.0,
    pfEmployerRate: cfg?.pfEmployerRate ?? 12.0,
    pfCeilingAmount: cfg?.pfCeilingAmount ?? 15000.0,
    esicEmployeeRate: cfg?.esicEmployeeRate ?? 0.75,
    esicEmployerRate: cfg?.esicEmployerRate ?? 3.25,
    esicLimitAmount: cfg?.esicLimitAmount ?? 21000.0,
    ptEnabled: cfg?.ptEnabled ?? true,
  };

  let generatedCount = 0;
  for (const emp of employees) {
    // Skip if already exists
    const existing = await tx.salarySlip.findFirst({
      where: { employeeId: emp.id, month, year },
      select: { id: true },
    });
    if (existing) continue;

    const struct = emp.salaryStructure;
    if (!struct || struct.grossSalary <= 0) continue;

    // 1. Check for Advances / EMIs
    const activeEmi = await tx.advanceEMI.findFirst({
      where: {
        advance: { employeeId: emp.id, status: 'APPROVED' },
        month,
        year,
        status: 'PENDING',
      },
    });

    // 2. Compute Leaves / LWP from LeaveLedger
    const ledger = await tx.leaveLedger.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: emp.id,
          month,
          year,
        },
      },
    });

    const opening = ledger?.openingBalance || emp.currentLeaveBalance || 0;
    const allotted = ledger?.autoCredit || 0;
    const taken = ledger?.takenLeaves || 0;
    const delayDeds = (ledger?.lateDeductions || 0) + (ledger?.shortLeaveDeductions || 0);

    const actualBalance = opening + allotted - taken - delayDeds;
    const lwpDays = actualBalance < 0 ? Math.abs(actualBalance) : 0;

    const displayBalance = Math.max(0, actualBalance);
    await tx.employeeProfile.update({
      where: { id: emp.id },
      data: {
        currentLeaveBalance: displayBalance,
        leaveBalance: displayBalance,
      },
    });

    const daysInMonth = new Date(year, month, 0).getDate();

    const breakdown = PayrollCalculator.calculate(
      {
        basicSalary: struct.basicSalary,
        hra: struct.hra,
        conveyance: struct.conveyance,
        medical: struct.medical,
        specialAllowance: struct.specialAllowance,
        otherAllowances: struct.otherAllowances,
        statutoryBonus: struct.statutoryBonus || 0,
        gratuity: struct.gratuity || 0,
        healthCare: struct.healthCare || 0,
        travelling: struct.travelling || 0,
        mobile: struct.mobile || 0,
        internet: struct.internet || 0,
        booksAndPeriodicals: struct.booksAndPeriodicals || 0,
        salaryFixed: struct.salaryFixed || 0,
        salaryVariable: struct.salaryVariable || 0,
        salaryIncentive: 0,
        pfEmployee: struct.deductPF ? struct.pfEmployee : 0,
        pfEmployer: struct.deductPF ? struct.pfEmployer : 0,
        esicEmployee: struct.esicEmployee,
        esicEmployer: struct.esicEmployer,
        lwpDays,
        daysInMonth,
      },
      statutoryConfig
    );

    // 3. Fetch and sum APPROVED incentives for this month/year
    const incentives = await tx.employeeIncentive.findMany({
      where: {
        employeeProfileId: emp.id,
        status: 'APPROVED',
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
        salarySlipId: null,
      },
    });
    const incentiveSum = incentives.reduce((sum, inc) => sum + inc.amount, 0);

    const finalNetPayable = breakdown.netPayable + incentiveSum;
    const finalCTC = breakdown.costToCompany + incentiveSum;

    const advanceDeduction = activeEmi ? activeEmi.amount : 0;
    const amountPaidData = Math.max(0, finalNetPayable - advanceDeduction);

    const slip = await tx.salarySlip.create({
      data: {
        employeeId: emp.id,
        month,
        year,
        amountPaid: parseFloat(amountPaidData.toFixed(2)),
        advanceDeduction,
        lwpDeduction: breakdown.deductions.lwpDeduction,
        basicSalary: breakdown.earnings.basic,
        hra: breakdown.earnings.hra,
        conveyance: breakdown.earnings.conveyance,
        medical: breakdown.earnings.medical,
        specialAllowance: breakdown.earnings.specialAllowance,
        otherAllowances: breakdown.earnings.otherAllowances,
        statutoryBonus: breakdown.earnings.statutoryBonus,
        grossSalary: breakdown.earnings.gross,
        pfEmployee: breakdown.deductions.pfEmployee,
        esicEmployee: breakdown.deductions.esicEmployee,
        professionalTax: breakdown.deductions.professionalTax,
        tds: breakdown.deductions.tds,
        totalDeductions: breakdown.deductions.total + advanceDeduction,
        pfEmployer: breakdown.employerContribution.pfEmployer,
        esicEmployer: breakdown.employerContribution.esicEmployer,
        gratuity: breakdown.employerContribution.gratuity,
        ctc: finalCTC,
        arrears: breakdown.arrears || 0,
        expenses: 0,
        healthCare: breakdown.perks.healthCare,
        travelling: breakdown.perks.travelling,
        mobile: breakdown.perks.mobile,
        internet: breakdown.perks.internet,
        booksAndPeriodicals: breakdown.perks.booksAndPeriodicals,
        salaryFixed: breakdown.salaryFixed,
        salaryVariable: breakdown.salaryVariable,
        salaryIncentive: incentiveSum,
        netPayable: amountPaidData,
        isPFDeducted: struct.deductPF,
        status: 'GENERATED',
        companyId,
      } as any,
    });

    if (incentives.length > 0) {
      await tx.employeeIncentive.updateMany({
        where: { id: { in: incentives.map((i) => i.id) } },
        data: { salarySlipId: slip.id, status: 'PAID' },
      });
    }

    if (activeEmi) {
      await tx.advanceEMI.update({
        where: { id: activeEmi.id },
        data: {
          status: 'PAID',
          salarySlipId: slip.id,
          paidAt: new Date(),
        },
      });

      const advance = await tx.salaryAdvance.findUnique({
        where: { id: activeEmi.advanceId },
        include: { emis: true },
      });

      if (advance) {
        const pendingEmis = advance.emis.filter((e) => e.status === 'PENDING').length;
        await tx.salaryAdvance.update({
          where: { id: advance.id },
          data: {
            status: pendingEmis === 0 ? 'COMPLETED' : 'APPROVED',
            paidEmis: advance.totalEmis - pendingEmis,
          },
        });
      }
    }

    generatedCount++;
  }

  return { generatedCount };
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
