import { prisma } from '@/lib/prisma';
import { calculateLateDeduction, calculateShortLeaveDeduction, getCurrentMonthYear, calculateLeaveBalance } from './leave-calculator';

/**
 * Process late arrival and update leave ledger
 * @param employeeId - Employee profile ID
 * @param lateMinutes - Minutes late
 * @param companyId - Company ID
 */
export async function processLateArrival(
    employeeId: string,
    lateMinutes: number,
    companyId?: string | null
): Promise<void> {
    if (lateMinutes < 31) {
        return; // No processing needed for less than 31 minutes
    }

    const { month, year } = getCurrentMonthYear();

    // Get or create leave ledger for current month
    const ledger = await prisma.leaveLedger.upsert({
        where: {
            employeeId_month_year: {
                employeeId,
                month,
                year
            }
        },
        update: {},
        create: {
            employeeId,
            month,
            year,
            openingBalance: 0,
            takenLeaves: 0,
            closingBalance: 0,
            lateArrivalCount: 0,
            shortLeaveCount: 0,
            lateDeductions: 0,
            shortLeaveDeductions: 0,
            companyId: companyId || undefined
        }
    });

    // Calculate deduction based on current late count
    const deduction = calculateLateDeduction(lateMinutes, ledger.lateArrivalCount);

    const { displayBalance } = calculateLeaveBalance(
        ledger.openingBalance,
        ledger.autoCredit || 0,
        ledger.takenLeaves,
        ledger.lateDeductions + deduction,
        ledger.shortLeaveDeductions
    );

    // Update ledger
    await prisma.leaveLedger.update({
        where: { id: ledger.id },
        data: {
            lateArrivalCount: { increment: 1 },
            lateDeductions: { increment: deduction },
            closingBalance: displayBalance
        }
    });

    // Update employee's current leave balance
    await prisma.employeeProfile.update({
        where: { id: employeeId },
        data: {
            currentLeaveBalance: displayBalance
        }
    });
}

/**
 * Process short leave and update leave ledger
 * @param employeeId - Employee profile ID
 * @param shortLeaveMinutes - Duration of short leave in minutes
 * @param companyId - Company ID
 */
export async function processShortLeave(
    employeeId: string,
    shortLeaveMinutes: number,
    companyId?: string | null
): Promise<void> {
    if (shortLeaveMinutes < 90) {
        return; // Only process short leaves of 90 minutes or more
    }

    const { month, year } = getCurrentMonthYear();

    // Get or create leave ledger for current month
    const ledger = await prisma.leaveLedger.upsert({
        where: {
            employeeId_month_year: {
                employeeId,
                month,
                year
            }
        },
        update: {},
        create: {
            employeeId,
            month,
            year,
            openingBalance: 0,
            takenLeaves: 0,
            closingBalance: 0,
            lateArrivalCount: 0,
            shortLeaveCount: 0,
            lateDeductions: 0,
            shortLeaveDeductions: 0,
            companyId: companyId || undefined
        }
    });

    // Calculate deduction based on current short leave count
    const deduction = calculateShortLeaveDeduction(shortLeaveMinutes, ledger.shortLeaveCount);

    const { displayBalance } = calculateLeaveBalance(
        ledger.openingBalance,
        ledger.autoCredit || 0,
        ledger.takenLeaves,
        ledger.lateDeductions,
        ledger.shortLeaveDeductions + deduction
    );

    // Update ledger
    await prisma.leaveLedger.update({
        where: { id: ledger.id },
        data: {
            shortLeaveCount: { increment: 1 },
            shortLeaveDeductions: { increment: deduction },
            closingBalance: displayBalance
        }
    });

    // Update employee's current leave balance
    await prisma.employeeProfile.update({
        where: { id: employeeId },
        data: {
            currentLeaveBalance: displayBalance
        }
    });
}

/**
 * Reset monthly counters for all employees (call on 1st of month)
 */
export async function resetMonthlyCounters(): Promise<void> {
    const { month, year } = getCurrentMonthYear();

    // This is handled automatically when creating new ledger entries
    // No explicit reset needed as each month has its own ledger
}

export async function reconcileAttendanceLedgerForMonth(
    employeeId: string,
    date: Date,
    companyId?: string | null
): Promise<void> {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const monthStart = new Date(date);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await prisma.attendance.findMany({
        where: {
            employeeId,
            date: {
                gte: monthStart,
                lte: monthEnd
            }
        },
        orderBy: { date: 'asc' }
    });

    let lateArrivalCount = 0;
    let shortLeaveCount = 0;
    let lateDeductions = 0;
    let shortLeaveDeductions = 0;

    for (const record of records) {
        if (record.lateMinutes >= 31) {
            lateDeductions += calculateLateDeduction(record.lateMinutes, lateArrivalCount);
            lateArrivalCount += 1;
        }

        if (record.shortMinutes >= 90) {
            shortLeaveDeductions += calculateShortLeaveDeduction(record.shortMinutes, shortLeaveCount);
            shortLeaveCount += 1;
        }
    }

    const existingLedger = await prisma.leaveLedger.findUnique({
        where: {
            employeeId_month_year: {
                employeeId,
                month,
                year
            }
        }
    });

    const { displayBalance } = calculateLeaveBalance(
        existingLedger?.openingBalance || 0,
        existingLedger?.autoCredit || 0,
        existingLedger?.takenLeaves || 0,
        lateDeductions,
        shortLeaveDeductions
    );

    await prisma.leaveLedger.upsert({
        where: {
            employeeId_month_year: {
                employeeId,
                month,
                year
            }
        },
        update: {
            lateArrivalCount,
            shortLeaveCount,
            lateDeductions,
            shortLeaveDeductions,
            closingBalance: displayBalance,
            companyId: existingLedger?.companyId || companyId || undefined
        },
        create: {
            employeeId,
            month,
            year,
            openingBalance: 0,
            autoCredit: 0,
            takenLeaves: 0,
            closingBalance: displayBalance,
            lateArrivalCount,
            shortLeaveCount,
            lateDeductions,
            shortLeaveDeductions,
            companyId: companyId || undefined
        }
    });

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    if (month === currentMonth && year === currentYear) {
        await prisma.employeeProfile.update({
            where: { id: employeeId },
            data: {
                currentLeaveBalance: displayBalance,
                leaveBalance: displayBalance
            }
        });
    }
}
