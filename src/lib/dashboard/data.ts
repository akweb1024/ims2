import { prisma } from '@/lib/prisma';
import { DashboardScope, DashboardWidgetKey } from './widgets';
import { getISTDateRangeForPeriod } from '@/lib/date-utils';
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
        ...(companyId ? { companyId } : {}),
        paymentDate: { gte: current.start, lte: current.end },
        ...(ctx.scope === 'INDIVIDUAL' && individualEmployeeIds.length ? { claimedByEmployeeId: { in: individualEmployeeIds } } : {}),
      },
      select: { amount: true },
    }),
    prisma.revenueTransaction.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        paymentDate: { gte: previous.start, lte: previous.end },
        ...(ctx.scope === 'INDIVIDUAL' && individualEmployeeIds.length ? { claimedByEmployeeId: { in: individualEmployeeIds } } : {}),
      },
      select: { amount: true },
    }),
    prisma.communicationLog.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        userId: { in: teamUserIds },
        nextFollowUpDate: { gte: today.start, lte: today.end },
      },
      select: { id: true, isFollowUpCompleted: true },
    }),
    prisma.communicationLog.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
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

async function getAttendanceOverview(ctx: DashboardPayloadContext) {
  const current = getISTDateRangeForPeriod('MONTHLY');
  const previousBase = new Date(current.start);
  previousBase.setMonth(previousBase.getMonth() - 1);
  const previous = getISTDateRangeForPeriod('MONTHLY', previousBase);
  const employeeIds = await resolveEmployeeIdsForScope(ctx);
  const companyId = getBaseCompanyId(ctx);

  const [currentAttendance, previousAttendance, activeEmployees] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        employeeId: { in: employeeIds },
        date: { gte: current.start, lte: current.end },
      },
      select: { employeeId: true, isLate: true, status: true, date: true },
    }),
    prisma.attendance.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        employeeId: { in: employeeIds },
        date: { gte: previous.start, lte: previous.end },
      },
      select: { employeeId: true, isLate: true, status: true, date: true },
    }),
    prisma.employeeProfile.count({
      where: {
        id: { in: employeeIds },
        user: {
          isActive: true,
          ...(companyId ? { companyId } : {}),
        },
      },
    }),
  ]);

  const uniqueCurrentPresent = new Set(currentAttendance.map((record) => record.employeeId)).size;
  const uniquePreviousPresent = new Set(previousAttendance.map((record) => record.employeeId)).size;
  const currentLate = currentAttendance.filter((record) => record.isLate).length;
  const previousLate = previousAttendance.filter((record) => record.isLate).length;
  const currentAbsent = Math.max(0, activeEmployees - uniqueCurrentPresent);
  const previousAbsent = Math.max(0, activeEmployees - uniquePreviousPresent);

  return {
    currentAttendance: uniqueCurrentPresent,
    previousAttendance: uniquePreviousPresent,
    currentLate,
    previousLate,
    currentAbsent,
    previousAbsent,
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
  const companyId = getBaseCompanyId(ctx);
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
  const companyId = getBaseCompanyId(ctx);
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
