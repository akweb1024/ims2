/**
 * Period-window helpers for KRA goals.
 *
 * Given a period type and a reference date, returns the [start, end] window plus a
 * human label. DAILY/WEEKLY/MONTHLY use the calendar; QUARTERLY/HALF_YEARLY/YEARLY use
 * the Indian Financial Year (April–March) per the Goals & KRA module spec §8.
 *
 * Labels:
 *   DAILY       -> "2026-06-29"
 *   WEEKLY      -> "W 2026-06-29" (Monday-of-week date)
 *   MONTHLY     -> "2026-06"
 *   QUARTERLY   -> "Q1 FY 2026-27"
 *   HALF_YEARLY -> "H1 FY 2026-27"
 *   YEARLY      -> "FY 2026-27"
 */
export type KraPeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

export interface PeriodWindow {
  startDate: Date;
  endDate: Date;
  label: string;
  /** Indian FY start year (e.g. 2026 for "FY 2026-27"); set for QUARTERLY/HALF_YEARLY/YEARLY. */
  fyStartYear?: number;
  /** FY quarter 1-4 (Q1 = Apr–Jun); set for QUARTERLY. */
  quarter?: number;
  /** FY half 1-2 (H1 = Apr–Sep); set for HALF_YEARLY. */
  half?: number;
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Indian FY start year for a given month (0-11) and calendar year: April (month 3) starts a new FY. */
export function fyStartYearFor(month: number, year: number): number {
  return month >= 3 ? year : year - 1;
}

/** "FY 2026-27" from an FY start year. */
export function fyLabel(fyStartYear: number): string {
  return `FY ${fyStartYear}-${pad2((fyStartYear + 1) % 100)}`;
}

export function computePeriodWindow(type: KraPeriodType, ref: Date): PeriodWindow {
  const y = ref.getFullYear();
  const m = ref.getMonth(); // 0-11

  switch (type) {
    case 'DAILY': {
      return { startDate: startOfDay(ref), endDate: endOfDay(ref), label: dateKey(ref) };
    }
    case 'WEEKLY': {
      // ISO week: Monday 00:00 -> Sunday 23:59 of ref's week.
      const day = ref.getDay(); // 0=Sun .. 6=Sat
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = startOfDay(new Date(y, m, ref.getDate() + diffToMonday));
      const sunday = endOfDay(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6));
      return { startDate: monday, endDate: sunday, label: `W ${dateKey(monday)}` };
    }
    case 'MONTHLY': {
      const start = new Date(y, m, 1);
      const end = endOfDay(new Date(y, m + 1, 0));
      return { startDate: start, endDate: end, label: `${y}-${pad2(m + 1)}` };
    }
    case 'QUARTERLY': {
      // Indian FY quarters: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar.
      const fyStartYear = fyStartYearFor(m, y);
      let quarter: number;
      let startYear: number;
      let startMonth: number;
      if (m >= 3 && m <= 5) {
        quarter = 1; startYear = fyStartYear; startMonth = 3;
      } else if (m >= 6 && m <= 8) {
        quarter = 2; startYear = fyStartYear; startMonth = 6;
      } else if (m >= 9 && m <= 11) {
        quarter = 3; startYear = fyStartYear; startMonth = 9;
      } else {
        quarter = 4; startYear = fyStartYear + 1; startMonth = 0; // Jan–Mar
      }
      const start = new Date(startYear, startMonth, 1);
      const end = endOfDay(new Date(startYear, startMonth + 3, 0));
      return { startDate: start, endDate: end, label: `Q${quarter} ${fyLabel(fyStartYear)}`, fyStartYear, quarter };
    }
    case 'HALF_YEARLY': {
      // H1 Apr–Sep, H2 Oct–Mar.
      const fyStartYear = fyStartYearFor(m, y);
      const isH1 = m >= 3 && m <= 8;
      const start = isH1 ? new Date(fyStartYear, 3, 1) : new Date(fyStartYear, 9, 1);
      const end = isH1
        ? endOfDay(new Date(fyStartYear, 9, 0)) // Sep 30
        : endOfDay(new Date(fyStartYear + 1, 3, 0)); // Mar 31
      const half = isH1 ? 1 : 2;
      return { startDate: start, endDate: end, label: `H${half} ${fyLabel(fyStartYear)}`, fyStartYear, half };
    }
    case 'YEARLY': {
      // Indian FY: 1 Apr (FY start) -> 31 Mar (next year).
      const fyStartYear = fyStartYearFor(m, y);
      const start = new Date(fyStartYear, 3, 1);
      const end = endOfDay(new Date(fyStartYear + 1, 3, 0)); // Mar 31
      return { startDate: start, endDate: end, label: fyLabel(fyStartYear), fyStartYear };
    }
  }
}
