import { isSameDay } from 'date-fns';

export interface Holiday {
    date: Date | string;
    name: string;
}

/**
 * Check if a date is a working day (Excludes Sundays and Public Holidays)
 */
export function isWorkingDay(date: Date, holidays: Holiday[]): boolean {
    // Sunday = 0
    if (date.getDay() === 0) return false;

    // Check public holidays
    const isHoliday = holidays.some(h =>
        isSameDay(new Date(h.date), date)
    );

    return !isHoliday;
}

/**
 * Calculate deduction for late arrivals (31-90 minutes)
 * Rules:
 * - < 31 min: No deduction
 * - 31-90 min: 0.5 day deduction after 2nd occurrence in month
 * - > 90 min: treated as 1 full day short leave / half day depending on policy, 
 *   but here we'll follow the workflow's 0.5 day rule for > 3rd occurrence.
 */
export function calculateLateDeduction(
    lateMinutes: number,
    monthlyLateCount: number
): number {
    if (lateMinutes < 31) return 0;

    // According to workflow: 31-90 min
    // If > 90 min, it usually falls under "Short Leave" or "Half Day".
    // We'll stick to the specific 31-90 range for this specific counter.
    if (lateMinutes > 90) return 1; // Workflow Phase 4.1 suggests 1 full day for > 90 min

    // 31-90 min range
    if (monthlyLateCount <= 2) return 0; // First 2 are free
    return 0.5; // Half day deduction after 2nd occurrence
}

/**
 * Calculate deduction for short leaves (exactly 90 minutes or specific range)
 * Rules:
 * - First 2 occurrences in month are free.
 * - 3rd occurrence onwards: 0.5 day deduction.
 */
export function calculateShortLeaveDeduction(
    shortLeaveMinutes: number,
    monthlyShortLeaveCount: number
): number {
    // Workflow specifies "exactly 90 min" or "short leave logic (90 min)"
    if (shortLeaveMinutes < 90) return 0;

    if (monthlyShortLeaveCount <= 2) return 0; // First 2 are free
    return 0.5; // Half day deduction after 2nd occurrence
}

/**
 * Get current month (1-12) and year
 */
export function getCurrentMonthYear() {
    const now = new Date();
    return {
        month: now.getMonth() + 1,
        year: now.getFullYear()
    };
}

/**
 * Calculate leave balance based on standard components
 */
export function calculateLeaveBalance(
    opening: number,
    autoCredit: number,
    taken: number,
    lateDeductions: number,
    shortLeaveDeductions: number
) {
    const totalDeductions = taken + lateDeductions + shortLeaveDeductions;
    const currentBalance = opening + autoCredit - totalDeductions;

    // Safety: don't show negative balance in some UI contexts, but we return the raw value
    return {
        totalDeductions,
        displayBalance: Math.max(0, currentBalance),
        rawBalance: currentBalance
    };
}
