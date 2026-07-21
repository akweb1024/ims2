/**
 * Pure helpers for the dashboard Attendance Overview widget.
 *
 * The widget previously mis-reported in three ways:
 *  - any record counted as "present" — including rows explicitly marked
 *    ABSENT / LEAVE / HOLIDAY / WEEKOFF by the manual-attendance API;
 *  - "attendance" counted unique employees while "late" counted day-records
 *    (incoherent units), and "absent" was actives-minus-anyone-with-a-record,
 *    which collapses toward zero;
 *  - the previous-month range was derived via Date.setMonth() on the
 *    server-local reading of an IST boundary instant, so on UTC servers
 *    "last month" actually showed two months back.
 *
 * Now: all three metrics are person-DAY counts over recorded rows (present
 * days by status, late days, explicitly recorded absent days), and the
 * previous month is derived inside IST.
 */

/** Statuses that mean the employee worked that day (same family the
 * performance index uses). */
export const PRESENT_STATUSES = new Set(['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME', 'WFH']);

/** Recorded non-working day that counts against the employee. LEAVE, HOLIDAY
 * and WEEKOFF are neither present nor "absent" — they're sanctioned days. */
export const ABSENT_STATUSES = new Set(['ABSENT']);

export interface AttendanceRecordLike {
    status: string;
    isLate: boolean;
}

export interface AttendanceSummary {
    presentDays: number;
    lateDays: number;
    absentDays: number;
}

/** Fold day-records into coherent person-day counts. */
export function summarizeAttendance(records: AttendanceRecordLike[]): AttendanceSummary {
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    for (const r of records) {
        const status = (r.status || '').toUpperCase();
        if (PRESENT_STATUSES.has(status)) presentDays++;
        if (ABSENT_STATUSES.has(status)) absentDays++;
        if (r.isLate && !ABSENT_STATUSES.has(status)) lateDays++;
    }
    return { presentDays, lateDays, absentDays };
}

/**
 * A base instant guaranteed to fall inside the PREVIOUS IST month of a range
 * that starts at an IST month boundary: one millisecond before the start.
 * Timezone-safe — no Date.setMonth() on server-local wall clocks.
 */
export function previousMonthBase(currentStart: Date): Date {
    return new Date(currentStart.getTime() - 1);
}
