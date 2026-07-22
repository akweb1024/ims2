import { prisma } from '@/lib/prisma';
import { DashboardScope, DashboardWidgetKey } from './widgets';
import { getISTDateRangeForPeriod, formatToISTDate } from '@/lib/date-utils';
import {
  previousMonthBase,
  PRESENT_STATUSES,
  enumerateDateKeys,
  aggregateDerived,
  type EmployeeAttendanceInput,
} from '@/lib/dashboard/attendance-summary';
import { getManagerTeamUserIds } from '@/lib/team-auth';
import { getDownlineUserIds } from '@/lib/hierarchy';

export interface DashboardFilters {
  companyId?: string | null;
  employeeId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface DashboardPayloadContext {
  user: {
    id: string;
    role: string;
    companyId?: string | null;
  };
  scope: DashboardScope;
  filters?: DashboardFilters;
}

function getBaseCompanyId(ctx: DashboardPayloadContext) {
  return ctx.filters?.companyId || ctx.user.companyId || null;
}

/**
 * Company filter for queries already scoped to a specific employee/user (e.g. attendance
 * by employeeId). For INDIVIDUAL scope the employeeId/userId already isolates the user's
 * own data, and the user's `User.companyId` frequently differs from the data's companyId
 * (company often lives in companyDesignations, not on the User) — so applying a company
 * filter wrongly hides their own records. Skip it for INDIVIDUAL; honour an explicit
 * filter override if one was passed.
 */
function selfScopedCompanyId(ctx: DashboardPayloadContext) {
  if (ctx.scope === 'INDIVIDUAL') return ctx.filters?.companyId || null;
  return getBaseCompanyId(ctx);
}

async function resolveUserIdsForScope(ctx: DashboardPayloadContext) {
  if (ctx.scope === 'INDIVIDUAL') {
    return [ctx.user.id];
  }

  if (['MANAGER', 'TEAM_LEADER'].includes(ctx.user.role)) {
    if (ctx.filters?.teamId && ctx.filters.teamId === ctx.user.id) {
      return getManagerTeamUserIds(ctx.user.id, ctx.user.companyId || undefined);
    }
    return getManagerTeamUserIds(ctx.user.id, ctx.user.companyId || undefined);
  }

  const companyId = getBaseCompanyId(ctx);
  if (!companyId) return [ctx.user.id];

  if (ctx.filters?.teamId && ['SUPER_ADMIN', 'ADMIN'].includes(ctx.user.role)) {
    return getManagerTeamUserIds(ctx.filters.teamId, companyId);
  }

  const users = await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      ...(ctx.filters?.departmentId ? { departmentId: ctx.filters.departmentId } : {}),
    },
    select: { id: true },
  });

  return users.map((user) => user.id);
}

async function resolveEmployeeIdsForScope(ctx: DashboardPayloadContext) {
  const userIds = await resolveUserIdsForScope(ctx);
  const employeeProfiles = await prisma.employeeProfile.findMany({
    where: {
      userId: { in: userIds },
    },
    select: { id: true, userId: true },
  });

  if (ctx.filters?.employeeId) {
    return employeeProfiles.filter((profile) => profile.id === ctx.filters?.employeeId).map((profile) => profile.id);
  }

  return employeeProfiles.map((profile) => profile.id);
}

async function resolveTeamUserIds(ctx: DashboardPayloadContext) {
  if (ctx.scope === 'INDIVIDUAL') return [ctx.user.id];
  if (['SUPER_ADMIN', 'ADMIN'].includes(ctx.user.role) && ctx.filters?.teamId) {
    return getManagerTeamUserIds(ctx.filters.teamId, ctx.user.companyId || undefined);
  }
  if (['MANAGER', 'TEAM_LEADER'].includes(ctx.user.role)) {
    return getDownlineUserIds(ctx.user.id, ctx.user.companyId || undefined).then((ids) => [ctx.user.id, ...ids]);
  }
  return resolveUserIdsForScope(ctx);
}

function sumAmount<T extends { amount: number }>(rows: T[]) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

async function getMarketingSalesPerformance(ctx: DashboardPayloadContext) {
  const companyId = getBaseCompanyId(ctx);
  const selfCompanyId = selfScopedCompanyId(ctx); // for employee/user-scoped queries (revenue, follow-ups)
  const current = getISTDateRangeForPeriod('MONTHLY');
  const previousBase = new Date(current.start);
  previousBase.setMonth(previousBase.getMonth() - 1);
  const previous = getISTDateRangeForPeriod('MONTHLY', previousBase);
  const today = getISTDateRangeForPeriod('DAILY');
  const teamUserIds = await resolveTeamUserIds(ctx);
  const individualEmployeeIds = ctx.scope === 'INDIVIDUAL' ? await resolveEmployeeIdsForScope(ctx) : [];

  const [currentRevenue, previousRevenue, todayFollowUps, missedFollowUps, invoices, proformas] = await Promise.all([
    prisma.revenueTransaction.findMany({
      where: {
        ...(selfCompanyId ? { companyId: selfCompanyId } : {}),
        paymentDate: { gte: current.start, lte: current.end },
        ...(ctx.scope === 'INDIVIDUAL' && individualEmployeeIds.length ? { claimedByEmployeeId: { in: individualEmployeeIds } } : {}),
      },
      select: { amount: true },
    }),
    prisma.revenueTransaction.findMany({
      where: {
        ...(selfCompanyId ? { companyId: selfCompanyId } : {}),
        paymentDate: { gte: previous.start, lte: previous.end },
        ...(ctx.scope === 'INDIVIDUAL' && individualEmployeeIds.length ? { claimedByEmployeeId: { in: individualEmployeeIds } } : {}),
      },
      select: { amount: true },
    }),
    prisma.communicationLog.findMany({
      where: {
        ...(selfCompanyId ? { companyId: selfCompanyId } : {}),
        userId: { in: teamUserIds },
        nextFollowUpDate: { gte: today.start, lte: today.end },
      },
      select: { id: true, isFollowUpCompleted: true },
    }),
    prisma.communicationLog.findMany({
      where: {
        ...(selfCompanyId ? { companyId: selfCompanyId } : {}),
        userId: { in: teamUserIds },
        nextFollowUpDate: { lt: new Date() },
        isFollowUpCompleted: false,
      },
      select: { id: true },
    }),
    prisma.invoice.aggregate({
      where: {
        ...(companyId ? { companyId } : {}),
        invoiceDate: { gte: current.start, lte: current.end },
        ...(ctx.scope === 'INDIVIDUAL' ? {} : {}),
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.proformaInvoice.aggregate({
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: current.start, lte: current.end },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
  ]);

  const todayFollowUpCounts = {
    completed: todayFollowUps.filter((log) => log.isFollowUpCompleted).length,
    total: todayFollowUps.length,
  };

  return {
    currentRevenue: sumAmount(currentRevenue),
    previousRevenue: sumAmount(previousRevenue),
    todayFollowUpCompleted: todayFollowUpCounts.completed,
    todayFollowUpTotal: todayFollowUpCounts.total,
    missedFollowUps: missedFollowUps.length,
    invoiceTotal: Number(invoices._sum.total || 0),
    invoiceCount: invoices._count.id,
    proformaTotal: Number(proformas._sum.total || 0),
    proformaCount: proformas._count.id,
  };
}

/** String min/max on YYYY-MM-DD keys (lexicographic == chronological). */
const maxKey = (a: string, b: string) => (a > b ? a : b);
const minKey = (a: string, b: string) => (a < b ? a : b);

/**
 * Derived, calendar-based attendance for one month window. Absence falls out of
 * the calendar (Sunday week-off, Sunday-sandwich, holiday-exempt, approved-leave
 * = leave) rather than needing explicit ABSENT rows — which the system never
 * writes, so the old widget always read absent = 0. The window is capped at
 * today so future days are never counted absent.
 */
async function deriveAttendanceWindow(
  window: { start: Date; end: Date },
  employeeIds: string[],
  companyId: string | null,
) {
  const todayKey = formatToISTDate(new Date());
  const startKey = formatToISTDate(window.start);
  const endKey = minKey(formatToISTDate(window.end), todayKey); // don't count the future
  const dateKeys = enumerateDateKeys(startKey, endKey);
  if (dateKeys.length === 0 || employeeIds.length === 0) {
    return { presentDays: 0, lateDays: 0, absentDays: 0, leaveDays: 0 };
  }

  const [attRows, leaves, holidays] = await Promise.all([
    prisma.attendance.findMany({
      where: { ...(companyId ? { companyId } : {}), employeeId: { in: employeeIds }, date: { gte: window.start, lte: window.end } },
      select: { employeeId: true, date: true, isLate: true, status: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        employeeId: { in: employeeIds },
        status: 'APPROVED',
        startDate: { lte: window.end },
        endDate: { gte: window.start },
      },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
    prisma.holiday.findMany({
      where: {
        date: { gte: window.start, lte: window.end },
        ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}),
      },
      select: { date: true },
    }),
  ]);

  const holidayDates = new Set(holidays.map((h) => formatToISTDate(h.date)));

  // Every scoped active employee participates — an employee with no present row
  // and no leave is genuinely absent on each working day.
  const byEmp = new Map<string, EmployeeAttendanceInput>();
  const ensure = (id: string) => {
    let e = byEmp.get(id);
    if (!e) { e = { present: new Map<string, boolean>(), leaveDates: new Set<string>() }; byEmp.set(id, e); }
    return e;
  };
  for (const id of employeeIds) ensure(id);
  for (const r of attRows) {
    if (PRESENT_STATUSES.has((r.status || '').toUpperCase())) ensure(r.employeeId).present.set(formatToISTDate(r.date), r.isLate);
  }
  for (const lv of leaves) {
    const e = ensure(lv.employeeId);
    const from = maxKey(formatToISTDate(lv.startDate), startKey);
    const to = minKey(formatToISTDate(lv.endDate), endKey);
    for (const k of enumerateDateKeys(from, to)) e.leaveDates.add(k);
  }

  return aggregateDerived(dateKeys, holidayDates, [...byEmp.values()]);
}

async function getAttendanceOverview(ctx: DashboardPayloadContext) {
  const current = getISTDateRangeForPeriod('MONTHLY');
  // One ms before the current IST month start is inside the previous IST
  // month — timezone-safe, unlike Date.setMonth() on a server-local reading.
  const previous = getISTDateRangeForPeriod('MONTHLY', previousMonthBase(current.start));
  const employeeIds = await resolveEmployeeIdsForScope(ctx);
  const companyId = selfScopedCompanyId(ctx);

  const [cur, prev] = await Promise.all([
    deriveAttendanceWindow(current, employeeIds, companyId),
    deriveAttendanceWindow(previous, employeeIds, companyId),
  ]);

  return {
    currentAttendance: cur.presentDays,
    previousAttendance: prev.presentDays,
    currentLate: cur.lateDays,
    previousLate: prev.lateDays,
    currentAbsent: cur.absentDays,
    previousAbsent: prev.absentDays,
    currentLeave: cur.leaveDays,
    previousLeave: prev.leaveDays,
  };
}

async function getTeamSummary(ctx: DashboardPayloadContext) {
  const teamUserIds = await resolveTeamUserIds(ctx);
  const companyId = getBaseCompanyId(ctx);
  const today = getISTDateRangeForPeriod('DAILY');
  const [members, attendance] = await Promise.all([
    prisma.user.count({
      where: {
        id: { in: teamUserIds },
        isActive: true,
        ...(companyId ? { companyId } : {}),
      },
    }),
    prisma.attendance.count({
      where: {
        ...(companyId ? { companyId } : {}),
        employee: { userId: { in: teamUserIds } },
        date: { gte: today.start, lte: today.end },
      },
    }),
  ]);

  return { members, attendance };
}

async function getIndividualSummary(ctx: DashboardPayloadContext) {
  const companyId = selfScopedCompanyId(ctx);
  const employeeIds = await resolveEmployeeIdsForScope(ctx);
  const today = getISTDateRangeForPeriod('DAILY');
  const [attendanceCount, followUps, tasks] = await Promise.all([
    prisma.attendance.count({
      where: {
        ...(companyId ? { companyId } : {}),
        employeeId: { in: employeeIds },
        date: { gte: today.start, lte: today.end },
      },
    }),
    prisma.communicationLog.count({
      where: {
        ...(companyId ? { companyId } : {}),
        userId: ctx.user.id,
        nextFollowUpDate: { gte: today.start, lte: today.end },
      },
    }),
    prisma.task.count({
      where: {
        ...(companyId ? { companyId } : {}),
        userId: ctx.user.id,
      },
    }),
  ]);

  return { attendanceCount, followUps, tasks };
}

async function getFollowUpSnapshot(ctx: DashboardPayloadContext) {
  const companyId = selfScopedCompanyId(ctx); // logs are scoped by userId; skip company filter for INDIVIDUAL
  const teamUserIds = await resolveTeamUserIds(ctx);
  const today = getISTDateRangeForPeriod('DAILY');

  const logs = await prisma.communicationLog.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      userId: { in: teamUserIds },
      nextFollowUpDate: { not: null },
    },
    select: {
      id: true,
      nextFollowUpDate: true,
      isFollowUpCompleted: true,
      subject: true,
      notes: true,
    },
    orderBy: { nextFollowUpDate: 'asc' },
  });

  const missed = logs.filter((log) => log.nextFollowUpDate && new Date(log.nextFollowUpDate) < today.start && !log.isFollowUpCompleted);
  const todayLogs = logs.filter((log) => log.nextFollowUpDate && new Date(log.nextFollowUpDate) >= today.start && new Date(log.nextFollowUpDate) <= today.end);
  const upcoming = logs.filter((log) => log.nextFollowUpDate && new Date(log.nextFollowUpDate) > today.end);

  return {
    missed: missed.length,
    today: todayLogs.length,
    upcoming: upcoming.length,
  };
}

async function getInvoiceVsProforma(ctx: DashboardPayloadContext) {
  const companyId = getBaseCompanyId(ctx);
  const current = getISTDateRangeForPeriod('MONTHLY');

  const [invoices, proformas] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        ...(companyId ? { companyId } : {}),
        invoiceDate: { gte: current.start, lte: current.end },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.proformaInvoice.aggregate({
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: current.start, lte: current.end },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
  ]);

  return {
    invoiceTotal: Number(invoices._sum.total || 0),
    invoiceCount: invoices._count.id,
    proformaTotal: Number(proformas._sum.total || 0),
    proformaCount: proformas._count.id,
  };
}

export async function getDashboardWidgetPayload(widgetKey: DashboardWidgetKey, ctx: DashboardPayloadContext) {
  switch (widgetKey) {
    case 'marketing_sales_performance':
      return getMarketingSalesPerformance(ctx);
    case 'attendance_overview':
      return getAttendanceOverview(ctx);
    case 'team_summary':
      return getTeamSummary(ctx);
    case 'individual_summary':
      return getIndividualSummary(ctx);
    case 'follow_up_snapshot':
      return getFollowUpSnapshot(ctx);
    case 'invoice_vs_proforma':
      return getInvoiceVsProforma(ctx);
    default:
      return {};
  }
}
