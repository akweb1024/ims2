import { formatToISTDate } from '@/lib/date-utils';

export type AttendanceScope = 'GLOBAL' | 'COMPANY' | 'EMPLOYEE' | 'EMPLOYEE_SHIFT' | 'COMPANY_SHIFT';

export interface EffectiveAttendancePolicy {
  timezone: string;
  lateCheckInTime: string;
  shortLeaveTime: string;
  graceMinutes: number;
  source: AttendanceScope;
}

type AttendancePolicySnapshot = {
  isActive?: boolean | null;
  timezone?: string | null;
  lateCheckInTime?: string | null;
  shortLeaveTime?: string | null;
  graceMinutes?: number | null;
} | null | undefined;

const FALLBACK_POLICY: EffectiveAttendancePolicy = {
  timezone: 'Asia/Kolkata',
  lateCheckInTime: '09:30',
  shortLeaveTime: '10:30',
  graceMinutes: 0,
  source: 'GLOBAL',
};

/** A resolved Shift, expressed as the late/short thresholds it implies for its wearer. */
export type ShiftPolicySnapshot = {
  lateCheckInTime: string;
  shortLeaveTime: string;
  source: 'EMPLOYEE_SHIFT' | 'COMPANY_SHIFT';
} | null | undefined;

function addMinutesToTimeString(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + minutes + 1440) % 1440; // wrap safely, shifts don't cross midnight here
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Turns a Shift into the late/short thresholds it implies: late after start+gracePeriod,
 * short leave after an additional hour beyond that — mirroring the 09:30/10:30 (60min gap)
 * relationship of the hardcoded fallback policy.
 */
export function shiftToPolicySnapshot(
  shift: { startTime: string; gracePeriod: number } | null | undefined,
  source: 'EMPLOYEE_SHIFT' | 'COMPANY_SHIFT'
): ShiftPolicySnapshot {
  if (!shift) return null;
  const lateCheckInTime = addMinutesToTimeString(shift.startTime, shift.gracePeriod);
  const shortLeaveTime = addMinutesToTimeString(shift.startTime, shift.gracePeriod + 60);
  return { lateCheckInTime, shortLeaveTime, source };
}

export function toISTDateTime(baseDate: Date, time: string) {
  const istDate = formatToISTDate(baseDate);
  return new Date(`${istDate}T${time}:00+05:30`);
}

export function getMinutesDifference(later: Date, earlier: Date) {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60)));
}

export function resolveEffectiveAttendancePolicyFromSnapshot(params: {
  globalPolicy?: AttendancePolicySnapshot;
  companyPolicy?: AttendancePolicySnapshot;
  employeePolicy?: AttendancePolicySnapshot;
  shiftPolicy?: ShiftPolicySnapshot;
}): EffectiveAttendancePolicy {
  const { globalPolicy, companyPolicy, employeePolicy, shiftPolicy } = params;

  // An explicit per-employee override (manually configured, e.g. via Settings) always wins —
  // it's a deliberate exception, not a scheduling default.
  if (employeePolicy?.isActive) {
    return {
      timezone: employeePolicy.timezone || companyPolicy?.timezone || globalPolicy?.timezone || FALLBACK_POLICY.timezone,
      lateCheckInTime: employeePolicy.lateCheckInTime || companyPolicy?.lateCheckInTime || globalPolicy?.lateCheckInTime || FALLBACK_POLICY.lateCheckInTime,
      shortLeaveTime: employeePolicy.shortLeaveTime || companyPolicy?.shortLeaveTime || globalPolicy?.shortLeaveTime || FALLBACK_POLICY.shortLeaveTime,
      graceMinutes: employeePolicy.graceMinutes ?? companyPolicy?.graceMinutes ?? globalPolicy?.graceMinutes ?? FALLBACK_POLICY.graceMinutes,
      source: 'EMPLOYEE',
    };
  }

  // A Shift (the employee's own standing assignment, or the company's default) is more specific
  // than the older raw-time CompanyAttendancePolicy — if one applies, prefer it.
  if (shiftPolicy) {
    return {
      timezone: companyPolicy?.timezone || globalPolicy?.timezone || FALLBACK_POLICY.timezone,
      lateCheckInTime: shiftPolicy.lateCheckInTime,
      shortLeaveTime: shiftPolicy.shortLeaveTime,
      graceMinutes: companyPolicy?.graceMinutes ?? globalPolicy?.graceMinutes ?? FALLBACK_POLICY.graceMinutes,
      source: shiftPolicy.source,
    };
  }

  if (companyPolicy?.isActive) {
    return {
      timezone: companyPolicy.timezone || globalPolicy?.timezone || FALLBACK_POLICY.timezone,
      lateCheckInTime: companyPolicy.lateCheckInTime || globalPolicy?.lateCheckInTime || FALLBACK_POLICY.lateCheckInTime,
      shortLeaveTime: companyPolicy.shortLeaveTime || globalPolicy?.shortLeaveTime || FALLBACK_POLICY.shortLeaveTime,
      graceMinutes: companyPolicy.graceMinutes ?? globalPolicy?.graceMinutes ?? FALLBACK_POLICY.graceMinutes,
      source: 'COMPANY',
    };
  }

  if (globalPolicy?.isActive) {
    return {
      timezone: globalPolicy.timezone || FALLBACK_POLICY.timezone,
      lateCheckInTime: globalPolicy.lateCheckInTime || FALLBACK_POLICY.lateCheckInTime,
      shortLeaveTime: globalPolicy.shortLeaveTime || FALLBACK_POLICY.shortLeaveTime,
      graceMinutes: globalPolicy.graceMinutes ?? FALLBACK_POLICY.graceMinutes,
      source: 'GLOBAL',
    };
  }

  return FALLBACK_POLICY;
}

export async function resolveEffectiveAttendancePolicy(params: {
  employeeId?: string;
  companyId?: string | null;
}): Promise<EffectiveAttendancePolicy> {
  const { prisma } = await import('@/lib/prisma');
  const globalPolicyPromise = prisma.attendancePolicy.findUnique({
    where: { id: 'singleton' },
  });

  const companyPolicyPromise = params.companyId
    ? prisma.companyAttendancePolicy.findUnique({
        where: { companyId: params.companyId },
      })
    : Promise.resolve(null);

  const employeePolicyPromise = params.employeeId
    ? prisma.employeeAttendancePolicyOverride.findUnique({
        where: { employeeId: params.employeeId },
      })
    : Promise.resolve(null);

  // The employee's own standing shift assignment, if any; else the company's default shift.
  const employeeShiftPromise = params.employeeId
    ? prisma.employeeProfile.findUnique({
        where: { id: params.employeeId },
        select: { shift: { select: { startTime: true, gracePeriod: true } } },
      })
    : Promise.resolve(null);

  const companyDefaultShiftPromise = params.companyId
    ? prisma.shift.findFirst({
        where: { companyId: params.companyId, isDefault: true },
        select: { startTime: true, gracePeriod: true },
      })
    : Promise.resolve(null);

  const [globalPolicy, companyPolicy, employeePolicy, employeeShiftResult, companyDefaultShift] = await Promise.all([
    globalPolicyPromise,
    companyPolicyPromise,
    employeePolicyPromise,
    employeeShiftPromise,
    companyDefaultShiftPromise,
  ]);

  const shiftPolicy = employeeShiftResult?.shift
    ? shiftToPolicySnapshot(employeeShiftResult.shift, 'EMPLOYEE_SHIFT')
    : shiftToPolicySnapshot(companyDefaultShift, 'COMPANY_SHIFT');

  return resolveEffectiveAttendancePolicyFromSnapshot({
    globalPolicy,
    companyPolicy,
    shiftPolicy,
    employeePolicy,
  });
}

export function resolveThresholdDate(baseDate: Date, time: string) {
  return toISTDateTime(baseDate, time);
}
