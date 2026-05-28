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
