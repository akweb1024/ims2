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

// ---------------------------------------------------------------------------
// Derived (calendar-based) attendance
//
// The status-row counts above only see days the system actually recorded. But
// a missed day usually has NO row at all, so "absent" read as zero. The derived
// model instead walks every calendar day of the period and classifies it, so
// absences fall out of the calendar rather than needing an explicit ABSENT row.
//
// Rules (per the business):
//   - Sunday is the weekly off and is NOT absent …
//   - … unless it is *sandwiched* between absent days on both sides, then it is.
//   - A public holiday is never absent.
//   - An approved leave counts as leave, not absent.
//   - Any other working day with no present record is absent.
// The caller caps the window at "today" so future days are never absent.
// ---------------------------------------------------------------------------

export type DayClass = 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'WEEKOFF';

export interface DerivedCounts {
    presentDays: number;
    lateDays: number;
    absentDays: number;
    leaveDays: number;
}

/** Calendar day-of-week for a YYYY-MM-DD key (0 = Sunday), timezone-independent. */
export function isSundayKey(dateKey: string): boolean {
    return new Date(`${dateKey}T00:00:00Z`).getUTCDay() === 0;
}

/** Inclusive, consecutive list of YYYY-MM-DD keys from startKey to endKey. */
export function enumerateDateKeys(startKey: string, endKey: string): string[] {
    const keys: string[] = [];
    if (!startKey || !endKey || startKey > endKey) return keys;
    const cur = new Date(`${startKey}T00:00:00Z`);
    const end = new Date(`${endKey}T00:00:00Z`);
    while (cur <= end) {
        keys.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return keys;
}

/**
 * Classify one employee's days over an ordered, consecutive date-key list.
 * Priority: worked (present row) > approved leave > holiday > Sunday week-off >
 * absent. Then a sandwich pass flips any Sunday week-off flanked by ABSENT on
 * both adjacent calendar days to ABSENT.
 */
export function classifyEmployeeDays(
    dateKeys: string[],
    present: Map<string, boolean>, // dateKey -> isLate
    leaveDates: Set<string>,
    holidayDates: Set<string>,
): DayClass[] {
    const cls: DayClass[] = dateKeys.map((d) => {
        if (present.has(d)) return present.get(d) ? 'LATE' : 'PRESENT';
        if (leaveDates.has(d)) return 'LEAVE';
        if (holidayDates.has(d)) return 'HOLIDAY';
        if (isSundayKey(d)) return 'WEEKOFF';
        return 'ABSENT';
    });
    // Sundays are never adjacent to each other, so reading the (partly mutated)
    // array is safe — a Sunday's neighbours are always Sat/Mon, never Sundays.
    for (let i = 0; i < cls.length; i++) {
        if (cls[i] !== 'WEEKOFF') continue;
        const prev = i > 0 ? cls[i - 1] : undefined;
        const next = i < cls.length - 1 ? cls[i + 1] : undefined;
        if (prev === 'ABSENT' && next === 'ABSENT') cls[i] = 'ABSENT';
    }
    return cls;
}

export function countClasses(cls: DayClass[]): DerivedCounts {
    let presentDays = 0, lateDays = 0, absentDays = 0, leaveDays = 0;
    for (const c of cls) {
        if (c === 'PRESENT' || c === 'LATE') presentDays++;
        if (c === 'LATE') lateDays++;
        if (c === 'ABSENT') absentDays++;
        if (c === 'LEAVE') leaveDays++;
    }
    return { presentDays, lateDays, absentDays, leaveDays };
}

export interface EmployeeAttendanceInput {
    present: Map<string, boolean>; // dateKey -> isLate
    leaveDates: Set<string>;
}

/** Sum derived person-day counts across a set of employees over one window. */
export function aggregateDerived(
    dateKeys: string[],
    holidayDates: Set<string>,
    employees: EmployeeAttendanceInput[],
): DerivedCounts {
    const total: DerivedCounts = { presentDays: 0, lateDays: 0, absentDays: 0, leaveDays: 0 };
    for (const e of employees) {
        const c = countClasses(classifyEmployeeDays(dateKeys, e.present, e.leaveDates, holidayDates));
        total.presentDays += c.presentDays;
        total.lateDays += c.lateDays;
        total.absentDays += c.absentDays;
        total.leaveDays += c.leaveDays;
    }
    return total;
}
