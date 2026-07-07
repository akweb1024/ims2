import { getISTToday } from '@/lib/date-utils';

export const AGENDA_META_PREFIX = 'AGENDA_META::';

export type AgendaSourceType = 'EMPLOYEE_TEMPLATE' | 'ROLE_TEMPLATE' | 'GENERIC_TEMPLATE' | 'MANAGER_OVERRIDE' | 'MANUAL';

export interface AgendaMetadata {
  version: 1;
  sourceType: AgendaSourceType;
  templateId?: string | null;
  linkedKpiId?: string | null;
  mandatory?: boolean;
  sequence?: number;
  conflictFlag?: boolean;
  blockerReason?: string | null;
  generatedAt?: string;
  generatedBy?: string | null;
  overrideBy?: string | null;
}

/** IST calendar-day string (YYYY-MM-DD) for a given instant — the canonical "which day is this" answer used across work-report submission/approval. */
export const getISTDateString = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

/** [00:00, 23:59:59.999] IST window for an IST calendar-day string (defaults to today). */
export const getISTDateRange = (dateStr?: string) => {
  const base = dateStr || getISTDateString();
  return {
    base,
    start: new Date(`${base}T00:00:00+05:30`),
    end: new Date(`${base}T23:59:59.999+05:30`),
  };
};

export const getISTDayRange = (baseDate?: Date) => {
  const start = baseDate ? new Date(baseDate) : getISTToday();
  if (!baseDate) {
    // getISTToday already returns start of day in IST
  } else {
    start.setHours(0, 0, 0, 0);
  }
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end };
};

export const encodeAgendaMetadata = (meta: AgendaMetadata) => `${AGENDA_META_PREFIX}${JSON.stringify(meta)}`;

export const decodeAgendaMetadata = (strategy?: string | null): AgendaMetadata | null => {
  if (!strategy || !strategy.startsWith(AGENDA_META_PREFIX)) return null;
  try {
    const parsed = JSON.parse(strategy.slice(AGENDA_META_PREFIX.length));
    if (parsed && parsed.version === 1) return parsed as AgendaMetadata;
    return null;
  } catch {
    return null;
  }
};

export const isManagerialRole = (role?: string) =>
  ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'].includes(role || '');
