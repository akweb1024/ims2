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
    if (shortLeaveMinutes !== 90) {
        return; // Only process 90-minute short leaves
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
