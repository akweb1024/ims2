import { Holiday } from '@prisma/client';

/**
 * Check if a given date is a working day
 * @param date - The date to check
 * @param holidays - Array of public holidays
 * @returns true if it's a working day, false otherwise
 */
export function isWorkingDay(date: Date, holidays: Holiday[]): boolean {
    // Sunday = 0
    if (date.getDay() === 0) {
        return false;
    }

    // Check if date matches any public holiday
    const isHoliday = holidays.some(holiday => {
        const holidayDate = new Date(holiday.date);
        return (
            holidayDate.getFullYear() === date.getFullYear() &&
            holidayDate.getMonth() === date.getMonth() &&
            holidayDate.getDate() === date.getDate()
        );
    });

    return !isHoliday;
}

/**
 * Calculate leave deduction for late arrival
 * Rules:
 * - < 31 min: No deduction
 * - 31-90 min: First 2 are free, then 0.5 day deduction
 * - > 90 min: Full day deduction
 * 
 * @param lateMinutes - Minutes late
 * @param monthlyLateCount - Count of late arrivals this month (before this one)
 * @returns Leave deduction amount
 */
export function calculateLateDeduction(
    lateMinutes: number,
    monthlyLateCount: number
): number {
    if (lateMinutes < 31) {
        return 0; // No deduction for less than 31 minutes
    }

    if (lateMinutes > 90) {
        return 1; // Full day for more than 90 minutes
    }

    // 31-90 minutes range
    if (monthlyLateCount < 2) {
        return 0; // First 2 late arrivals are free
    }

    return 0.5; // Half day deduction after 2nd late arrival
}

/**
 * Calculate leave deduction for short leave
 * Rules:
 * - Exactly 90 min: First 2 are free, then 0.5 day deduction
 * - Other durations: No deduction (handled separately)
 * 
 * @param shortLeaveMinutes - Duration of short leave in minutes
 * @param monthlyShortLeaveCount - Count of short leaves this month (before this one)
 * @returns Leave deduction amount
 */
export function calculateShortLeaveDeduction(
    shortLeaveMinutes: number,
    monthlyShortLeaveCount: number
): number {
    if (shortLeaveMinutes !== 90) {
        return 0; // Only 90-minute short leaves are tracked
    }

    if (monthlyShortLeaveCount < 2) {
        return 0; // First 2 short leaves are free
    }

    return 0.5; // Half day deduction after 2nd short leave
}

/**
 * Get the number of working days in a month
 * @param year - Year
 * @param month - Month (1-12)
 * @param holidays - Array of public holidays
 * @returns Number of working days
 */
export function getWorkingDaysInMonth(
    year: number,
    month: number,
    holidays: Holiday[]
): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (isWorkingDay(date, holidays)) {
            workingDays++;
        }
    }

    return workingDays;
}

/**
 * Calculate total leave balance details
 * @param openingBalance - Opening balance at start of month (last bal leave)
 * @param autoCredit - Monthly auto-credit (e.g., 1.5)
 * @param takenLeaves - Leaves taken during the month
 * @param lateDeductions - Deductions from late arrivals
 * @param shortLeaveDeductions - Deductions from short leaves
 * @returns Object with balance components
 */
export function calculateLeaveBalance(
    openingBalance: number,
    autoCredit: number,
    takenLeaves: number,
    lateDeductions: number,
    shortLeaveDeductions: number
): {
    actualBalance: number;
    displayBalance: number;
    negativeLeaves: number;
} {
    const actualBalance = openingBalance + autoCredit - takenLeaves - lateDeductions - shortLeaveDeductions;

    return {
        actualBalance,
        displayBalance: Math.max(0, actualBalance),
        negativeLeaves: actualBalance < 0 ? Math.abs(actualBalance) : 0
    };
}

/**
 * Check if it's time to credit monthly leaves (1st of the month)
 * @returns true if today is the 1st of the month
 */
export function shouldCreditMonthlyLeaves(): boolean {
    const today = new Date();
    return today.getDate() === 1;
}

/**
 * Get current month and year
 * @returns Object with month and year
 */
export function getCurrentMonthYear(): { month: number; year: number } {
    const now = new Date();
    return {
        month: now.getMonth() + 1, // 1-12
        year: now.getFullYear()
    };
}
