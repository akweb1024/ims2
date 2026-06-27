/**
 * Period-window helpers for KRA goals.
 * Given a period type and a reference date, returns the [start, end] window
 * and a human label ("2026-06", "2026-Q2", "2026-H1", "2026").
 */
export type KraPeriodType = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

export interface PeriodWindow {
  startDate: Date;
  endDate: Date;
  label: string;
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function computePeriodWindow(type: KraPeriodType, ref: Date): PeriodWindow {
  const y = ref.getFullYear();
  const m = ref.getMonth(); // 0-11

  switch (type) {
    case 'MONTHLY': {
      const start = new Date(y, m, 1);
      const end = endOfDay(new Date(y, m + 1, 0));
      const label = `${y}-${String(m + 1).padStart(2, '0')}`;
      return { startDate: start, endDate: end, label };
    }
    case 'QUARTERLY': {
      const q = Math.floor(m / 3); // 0-3
      const start = new Date(y, q * 3, 1);
      const end = endOfDay(new Date(y, q * 3 + 3, 0));
      return { startDate: start, endDate: end, label: `${y}-Q${q + 1}` };
    }
    case 'HALF_YEARLY': {
      const h = m < 6 ? 0 : 1;
      const start = new Date(y, h * 6, 1);
      const end = endOfDay(new Date(y, h * 6 + 6, 0));
      return { startDate: start, endDate: end, label: `${y}-H${h + 1}` };
    }
    case 'YEARLY': {
      const start = new Date(y, 0, 1);
      const end = endOfDay(new Date(y, 11, 31));
      return { startDate: start, endDate: end, label: `${y}` };
    }
  }
}
