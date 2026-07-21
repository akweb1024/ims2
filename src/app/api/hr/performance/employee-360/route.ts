import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { getCompanyActivity, getUserActivity } from '@/lib/services/activity-service';
import { companyScopeWhere } from '@/lib/company-scope';

const MANAGER_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'HR',
  'HR_MANAGER',
  'MANAGER',
  'TEAM_LEADER',
]);

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(1, days));
  return { start, end };
}

function getWorkingDays(start: Date, end: Date) {
  let count = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const limit = new Date(end);
  limit.setHours(0, 0, 0, 0);

  while (d <= limit) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get('scope') || 'self').toLowerCase();
    const employeeIdParam = searchParams.get('employeeId');
    const days = Number(searchParams.get('days') || 30);
    const trendMonths = Number(searchParams.get('trendMonths') || 6);

    const canSeeTeam = MANAGER_ROLES.has(user.role);
    if ((scope === 'team' || scope === 'company') && !canSeeTeam) {
      return createErrorResponse('Forbidden: this scope requires manager-level access', 403);
    }

    let targetUserIds: string[] = [];

    if (employeeIdParam && employeeIdParam !== 'self') {
      const targetProfile = await prisma.employeeProfile.findFirst({
        where: {
          OR: [{ id: employeeIdParam }, { userId: employeeIdParam }],
        },
        select: { id: true, userId: true },
      });

      if (!targetProfile) return createErrorResponse('Employee not found', 404);

      if (!canSeeTeam && targetProfile.userId !== user.id) {
        return createErrorResponse('Forbidden: you can only access your own metrics', 403);
      }

      if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
        if (!downline.includes(targetProfile.userId) && targetProfile.userId !== user.id) {
          return createErrorResponse('Forbidden: employee is outside your hierarchy', 403);
        }
      }

      if (['ADMIN', 'HR', 'HR_MANAGER'].includes(user.role) && user.companyId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: targetProfile.userId },
          select: { companyId: true },
        });
        if (targetUser?.companyId !== user.companyId) {
          return createErrorResponse('Forbidden: cross-company access denied', 403);
        }
      }

      targetUserIds = [targetProfile.userId];
    } else if (scope === 'company' && canSeeTeam) {
      const where: Prisma.UserWhereInput = {
        isActive: true,
        ...companyScopeWhere(user),
      };
      const users = await prisma.user.findMany({ where, select: { id: true } });
      targetUserIds = users.map((u) => u.id);
    } else if (scope === 'team' && canSeeTeam) {
      if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
        targetUserIds = Array.from(new Set([user.id, ...downline]));
      } else {
        const where: Prisma.UserWhereInput = {
          isActive: true,
          ...companyScopeWhere(user),
        };
        const users = await prisma.user.findMany({ where, select: { id: true } });
        targetUserIds = users.map((u) => u.id);
      }
    } else {
      targetUserIds = [user.id];
    }

    if (!targetUserIds.length) {
      return NextResponse.json({
        summary: null,
        employees: [],
        attendance: [],
        workReports: [],
        activities: [],
        kpiKra: { averageProgress: 0, topGaps: [] },
        monthlyTrends: [],
        managerInsights: { topPerformers: [], needsAttention: [], mostImproved: [] },
      });
    }

    const profiles = await prisma.employeeProfile.findMany({
      where: { userId: { in: targetUserIds } },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!profiles.length) {
      return createErrorResponse('No employee profiles found', 404);
    }

    const employeeIds = profiles.map((p) => p.id);
    const { start, end } = getDateRange(days);
    const expectedWorkingDays = getWorkingDays(start, end);

    const [attendanceRows, reportRows, kpis, snapshots] = await Promise.all([
      prisma.attendance.findMany({
        where: { employeeId: { in: employeeIds }, date: { gte: start, lte: end } },
        select: {
          employeeId: true,
          status: true,
          lateMinutes: true,
          checkIn: true,
          checkOut: true,
          date: true,
        },
      }),
      prisma.workReport.findMany({
        where: { employeeId: { in: employeeIds }, date: { gte: start, lte: end } },
        select: {
          id: true,
          employeeId: true,
          date: true,
          status: true,
          hoursSpent: true,
          tasksCompleted: true,
          revenueGenerated: true,
          kraMatchRatio: true,
          selfRating: true,
          managerRating: true,
          pointsEarned: true,
        },
      }),
      // KRA truth is EmployeeGoal (unification) — mapped to the legacy shape.
      prisma.employeeGoal.findMany({
        where: { employeeId: { in: employeeIds }, isKra: true },
        select: {
          id: true,
          employeeId: true,
          title: true,
          currentValue: true,
          targetValue: true,
          type: true,
          unit: true,
          updatedAt: true,
        },
      }).then((goals) => goals.map((g) => ({
        id: g.id,
        employeeId: g.employeeId,
        title: g.title,
        current: g.currentValue,
        target: g.targetValue,
        period: g.type as string,
        unit: g.unit,
        updatedAt: g.updatedAt,
      }))),
      prisma.monthlyPerformanceSnapshot.findMany({
        where: {
          employeeId: { in: employeeIds },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - Math.max(1, trendMonths - 1), 1),
          },
        },
        select: {
          employeeId: true,
          month: true,
          year: true,
          overallScore: true,
          attendanceScore: true,
          reportSubmissionRate: true,
          totalRevenueGenerated: true,
          trend: true,
          improvementScore: true,
          needsAttention: true,
          performanceGrade: true,
        },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      }),
    ]);

    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const attendanceByEmployee = new Map<string, typeof attendanceRows>();
    const reportsByEmployee = new Map<string, typeof reportRows>();
    const kpiByEmployee = new Map<string, typeof kpis>();
    const snapshotsByEmployee = new Map<string, typeof snapshots>();
    for (const empId of employeeIds) {
      attendanceByEmployee.set(empId, []);
      reportsByEmployee.set(empId, []);
      kpiByEmployee.set(empId, []);
      snapshotsByEmployee.set(empId, []);
    }
    for (const row of attendanceRows) attendanceByEmployee.get(row.employeeId)?.push(row);
    for (const row of reportRows) reportsByEmployee.get(row.employeeId)?.push(row);
    for (const row of kpis) kpiByEmployee.get(row.employeeId)?.push(row);
    for (const row of snapshots) snapshotsByEmployee.get(row.employeeId)?.push(row);

    const employees = employeeIds.map((empId) => {
      const profile = profileById.get(empId)!;
      const employeeAttendance = attendanceByEmployee.get(empId) || [];
      const employeeReports = reportsByEmployee.get(empId) || [];
      const employeeKpis = kpiByEmployee.get(empId) || [];
      const employeeSnapshots = snapshotsByEmployee.get(empId) || [];

      const presentDays = employeeAttendance.filter((a) => a.status === 'PRESENT').length;
      const lateDays = employeeAttendance.filter((a) => (a.lateMinutes || 0) > 0).length;
      const attendanceRate = expectedWorkingDays > 0 ? (presentDays / expectedWorkingDays) * 100 : 0;

      const submittedReports = employeeReports.length;
      const approvedReports = employeeReports.filter((r) => r.status === 'APPROVED').length;
      const reportSubmissionRate = expectedWorkingDays > 0 ? (submittedReports / expectedWorkingDays) * 100 : 0;
      const totalHours = employeeReports.reduce((sum, r) => sum + (r.hoursSpent || 0), 0);
      const totalTasks = employeeReports.reduce((sum, r) => sum + (r.tasksCompleted || 0), 0);
      const totalRevenue = employeeReports.reduce((sum, r) => sum + (r.revenueGenerated || 0), 0);
      const avgKra = submittedReports > 0
        ? employeeReports.reduce((sum, r) => sum + (r.kraMatchRatio || 0), 0) / submittedReports
        : 0;

      const managerRated = employeeReports.filter((r) => typeof r.managerRating === 'number');
      const selfRated = employeeReports.filter((r) => typeof r.selfRating === 'number');
      const avgManagerRating = managerRated.length > 0
        ? managerRated.reduce((sum, r) => sum + (r.managerRating || 0), 0) / managerRated.length
        : 0;
      const avgSelfRating = selfRated.length > 0
        ? selfRated.reduce((sum, r) => sum + (r.selfRating || 0), 0) / selfRated.length
        : 0;

      const kpiProgress = employeeKpis.map((k) => ({
        ...k,
        progressPercent: k.target > 0 ? Math.min(100, (k.current / k.target) * 100) : 0,
      }));
      const avgKpiProgress = kpiProgress.length > 0
        ? kpiProgress.reduce((sum, k) => sum + k.progressPercent, 0) / kpiProgress.length
        : 0;
      const topKpiGaps = [...kpiProgress]
        .sort((a, b) => a.progressPercent - b.progressPercent)
        .slice(0, 3);

      const latestSnapshot = employeeSnapshots[employeeSnapshots.length - 1];

      return {
        employeeId: empId,
        userId: profile.userId,
        name: profile.user?.name || profile.user?.email || 'Unknown',
        email: profile.user?.email || '',
        role: profile.user?.role || 'EMPLOYEE',
        designation: profile.designation || 'N/A',
        attendance: {
          presentDays,
          lateDays,
          expectedWorkingDays,
          attendanceRate: Number(attendanceRate.toFixed(2)),
        },
        workReports: {
          submittedReports,
          approvedReports,
          reportSubmissionRate: Number(reportSubmissionRate.toFixed(2)),
          totalHours: Number(totalHours.toFixed(2)),
          totalTasks,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          avgKraMatch: Number(avgKra.toFixed(4)),
          avgManagerRating: Number(avgManagerRating.toFixed(2)),
          avgSelfRating: Number(avgSelfRating.toFixed(2)),
        },
        kpiKra: {
          averageKpiProgress: Number(avgKpiProgress.toFixed(2)),
          topKpiGaps: topKpiGaps.map((k) => ({
            id: k.id,
            title: k.title,
            progressPercent: Number(k.progressPercent.toFixed(2)),
            current: k.current,
            target: k.target,
            unit: k.unit,
            period: k.period,
          })),
        },
        latestSnapshot: latestSnapshot || null,
      };
    });

    const monthlyTrendMap = new Map<string, {
      month: string;
      overallScore: number[];
      attendanceScore: number[];
      reportSubmissionRate: number[];
      totalRevenueGenerated: number[];
    }>();
    for (const s of snapshots) {
      const key = `${s.year}-${String(s.month).padStart(2, '0')}`;
      if (!monthlyTrendMap.has(key)) {
        monthlyTrendMap.set(key, {
          month: key,
          overallScore: [],
          attendanceScore: [],
          reportSubmissionRate: [],
          totalRevenueGenerated: [],
        });
      }
      const row = monthlyTrendMap.get(key)!;
      row.overallScore.push(s.overallScore || 0);
      row.attendanceScore.push(s.attendanceScore || 0);
      row.reportSubmissionRate.push(s.reportSubmissionRate || 0);
      row.totalRevenueGenerated.push(s.totalRevenueGenerated || 0);
    }

    const monthlyTrends = Array.from(monthlyTrendMap.values()).map((row) => ({
      month: row.month,
      overallScore: Number((row.overallScore.reduce((a, b) => a + b, 0) / Math.max(1, row.overallScore.length)).toFixed(2)),
      attendanceScore: Number((row.attendanceScore.reduce((a, b) => a + b, 0) / Math.max(1, row.attendanceScore.length)).toFixed(2)),
      reportSubmissionRate: Number((row.reportSubmissionRate.reduce((a, b) => a + b, 0) / Math.max(1, row.reportSubmissionRate.length)).toFixed(2)),
      totalRevenueGenerated: Number(row.totalRevenueGenerated.reduce((a, b) => a + b, 0).toFixed(2)),
    }));

    const summary = {
      employeeCount: employees.length,
      scope,
      dateRange: { start, end, days },
      expectedWorkingDays,
      attendanceRate: Number((employees.reduce((sum, e) => sum + e.attendance.attendanceRate, 0) / Math.max(1, employees.length)).toFixed(2)),
      reportSubmissionRate: Number((employees.reduce((sum, e) => sum + e.workReports.reportSubmissionRate, 0) / Math.max(1, employees.length)).toFixed(2)),
      avgKraMatch: Number((employees.reduce((sum, e) => sum + e.workReports.avgKraMatch, 0) / Math.max(1, employees.length)).toFixed(4)),
      avgManagerRating: Number((employees.reduce((sum, e) => sum + e.workReports.avgManagerRating, 0) / Math.max(1, employees.length)).toFixed(2)),
      avgKpiProgress: Number((employees.reduce((sum, e) => sum + e.kpiKra.averageKpiProgress, 0) / Math.max(1, employees.length)).toFixed(2)),
      totalTasksCompleted: employees.reduce((sum, e) => sum + e.workReports.totalTasks, 0),
      totalHours: Number(employees.reduce((sum, e) => sum + e.workReports.totalHours, 0).toFixed(2)),
      totalRevenue: Number(employees.reduce((sum, e) => sum + e.workReports.totalRevenue, 0).toFixed(2)),
      avgOverallScore: Number((employees
        .map((e) => e.latestSnapshot?.overallScore || 0)
        .reduce((a, b) => a + b, 0) / Math.max(1, employees.length)).toFixed(2)),
    };

    const managerInsights = {
      topPerformers: [...employees]
        .sort((a, b) => (b.latestSnapshot?.overallScore || 0) - (a.latestSnapshot?.overallScore || 0))
        .slice(0, 5)
        .map((e) => ({
          employeeId: e.employeeId,
          name: e.name,
          overallScore: e.latestSnapshot?.overallScore || 0,
          performanceGrade: e.latestSnapshot?.performanceGrade || 'N/A',
        })),
      needsAttention: employees
        .filter((e) =>
          e.attendance.attendanceRate < 70 ||
          e.workReports.reportSubmissionRate < 60 ||
          (e.latestSnapshot?.needsAttention ?? false)
        )
        .slice(0, 8)
        .map((e) => ({
          employeeId: e.employeeId,
          name: e.name,
          attendanceRate: e.attendance.attendanceRate,
          reportSubmissionRate: e.workReports.reportSubmissionRate,
          overallScore: e.latestSnapshot?.overallScore || 0,
        })),
      mostImproved: [...employees]
        .filter((e) => (e.latestSnapshot?.improvementScore || 0) > 0)
        .sort((a, b) => (b.latestSnapshot?.improvementScore || 0) - (a.latestSnapshot?.improvementScore || 0))
        .slice(0, 5)
        .map((e) => ({
          employeeId: e.employeeId,
          name: e.name,
          improvementScore: e.latestSnapshot?.improvementScore || 0,
          trend: e.latestSnapshot?.trend || 'STABLE',
        })),
    };

    let activities: any[] = [];
    if (scope === 'company' && user.companyId) {
      activities = await getCompanyActivity(user.companyId, 25);
    } else {
      const activitySlices = await Promise.all(
        employees.slice(0, 12).map((e) => getUserActivity(e.userId, 5))
      );
      activities = activitySlices
        .flat()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 30);
    }

    const topGaps = employees
      .flatMap((e) => e.kpiKra.topKpiGaps.map((k: any) => ({ ...k, employeeName: e.name, employeeId: e.employeeId })))
      .sort((a, b) => a.progressPercent - b.progressPercent)
      .slice(0, 10);

    const attendance = employees.map((e) => ({
      employeeId: e.employeeId,
      name: e.name,
      ...e.attendance,
    }));
    const workReports = employees.map((e) => ({
      employeeId: e.employeeId,
      name: e.name,
      ...e.workReports,
    }));

    return NextResponse.json({
      summary,
      employees,
      attendance,
      workReports,
      activities,
      kpiKra: {
        averageProgress: summary.avgKpiProgress,
        topGaps,
      },
      monthlyTrends: monthlyTrends.sort((a, b) => a.month.localeCompare(b.month)),
      managerInsights,
      generatedAt: new Date(),
      meta: {
        trendMonths,
        monthKeys: monthlyTrends.map((t) => t.month),
        rangeKey: `${monthKey(start)}..${monthKey(end)}`,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});

