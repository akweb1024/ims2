import { formatToISTDate } from '@/lib/date-utils';

export type AttendanceScope = 'GLOBAL' | 'COMPANY' | 'EMPLOYEE';

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
}): EffectiveAttendancePolicy {
  const { globalPolicy, companyPolicy, employeePolicy } = params;

  if (employeePolicy?.isActive) {
    return {
      timezone: employeePolicy.timezone || companyPolicy?.timezone || globalPolicy?.timezone || FALLBACK_POLICY.timezone,
      lateCheckInTime: employeePolicy.lateCheckInTime || companyPolicy?.lateCheckInTime || globalPolicy?.lateCheckInTime || FALLBACK_POLICY.lateCheckInTime,
      shortLeaveTime: employeePolicy.shortLeaveTime || companyPolicy?.shortLeaveTime || globalPolicy?.shortLeaveTime || FALLBACK_POLICY.shortLeaveTime,
      graceMinutes: employeePolicy.graceMinutes ?? companyPolicy?.graceMinutes ?? globalPolicy?.graceMinutes ?? FALLBACK_POLICY.graceMinutes,
      source: 'EMPLOYEE',
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

  const [globalPolicy, companyPolicy, employeePolicy] = await Promise.all([
    globalPolicyPromise,
    companyPolicyPromise,
    employeePolicyPromise,
  ]);

  return resolveEffectiveAttendancePolicyFromSnapshot({
    globalPolicy,
    companyPolicy,
    employeePolicy,
  });
}

export function resolveThresholdDate(baseDate: Date, time: string) {
  return toISTDateTime(baseDate, time);
}
