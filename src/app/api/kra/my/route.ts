import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { computePeriodWindow, KraPeriodType } from '@/lib/kra/period';

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE', 'EXECUTIVE'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Pace rollup: remaining, needed/day, current pace/day, on-track vs behind. */
function paceRollup(current: number, target: number, start: Date, end: Date, now: Date) {
  const clampedNow = now < start ? start : now > end ? end : now;
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
  const elapsedDays = Math.max(1, Math.round((clampedNow.getTime() - start.getTime()) / DAY_MS) + 1);
  const remainingDays = Math.max(0, Math.round((end.getTime() - clampedNow.getTime()) / DAY_MS));
  const remaining = Math.max(0, target - current);
  const pacePerDay = current / elapsedDays;
  const neededPerRemainingDay = remainingDays > 0 ? remaining / remainingDays : remaining;
  const expectedByNow = target * (elapsedDays / totalDays);
  return {
    remaining,
    remainingDays,
    pacePerDay: Math.round(pacePerDay * 100) / 100,
    neededPerRemainingDay: Math.round(neededPerRemainingDay * 100) / 100,
    onTrack: current >= expectedByNow,
  };
}

// GET /api/kra/my?employeeId=...&periodType=MONTHLY&periodRef=ISO
// Returns the (self or, for managers, a team member's) KRA goals for the active period
// window, enriched with progress logs, pace rollup, proofs and verification history.
export const GET = authorizedRoute(ALL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get('employeeId');
    const periodType = (searchParams.get('periodType') || 'MONTHLY').toUpperCase() as KraPeriodType;
    const ref = searchParams.get('periodRef') ? new Date(searchParams.get('periodRef')!) : new Date();

    // Resolve which employee profile we are reading.
    let employeeId: string;
    if (!employeeIdParam || ['EMPLOYEE', 'EXECUTIVE'].includes(user.role)) {
      const self = await prisma.employeeProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!self) return createErrorResponse('Profile not found', 404);
      employeeId = self.id;
    } else {
      const target = await prisma.employeeProfile.findFirst({
        where: { OR: [{ id: employeeIdParam }, { userId: employeeIdParam }] },
        select: { id: true, userId: true },
      });
      if (!target) return createErrorResponse('Employee not found', 404);
      if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
        if (!downline.includes(target.userId) && target.userId !== user.id) {
          return createErrorResponse('Forbidden: Employee is outside your team', 403);
        }
      }
      employeeId = target.id;
    }

    const win = computePeriodWindow(periodType, ref);
    const now = new Date();

    const goals = await prisma.employeeGoal.findMany({
      where: { employeeId, isKra: true, type: periodType, startDate: win.startDate },
      include: {
        metric: true,
        proofs: { orderBy: { createdAt: 'desc' } },
        verifications: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { title: 'asc' },
    });

    // Fetch all contributions (progress logs) for these goals' metrics in the window, once.
    const metricIds = Array.from(new Set(goals.map((g) => g.metricId).filter((m): m is string => !!m)));
    const logs = metricIds.length
      ? await prisma.metricContribution.findMany({
          where: { employeeId, metricId: { in: metricIds }, date: { gte: win.startDate, lte: win.endDate } },
          orderBy: { date: 'desc' },
          select: { id: true, metricId: true, reportedValue: true, verifiedValue: true, status: true, source: true, note: true, date: true },
        })
      : [];
    const logsByMetric = new Map<string, typeof logs>();
    for (const l of logs) {
      const arr = logsByMetric.get(l.metricId) ?? [];
      arr.push(l);
      logsByMetric.set(l.metricId, arr);
    }

    // Lightweight focus summary: weighted achievement across KRA goals.
    const totalWeight = goals.reduce((s, g) => s + (g.weight || 1), 0);
    const weightedAchievement = totalWeight
      ? goals.reduce((s, g) => s + Math.min(100, g.achievementPercentage) * (g.weight || 1), 0) / totalWeight
      : 0;

    return NextResponse.json({
      period: win.label,
      periodType,
      window: { start: win.startDate, end: win.endDate },
      goals: goals.map((g) => {
        const remaining = Math.max(0, g.targetValue - g.currentValue);
        const overflow = Math.max(0, g.currentValue - g.targetValue);
        const earned = (g.ratePerUnit ?? 0) * g.currentValue;
        const goalLogs = g.metricId ? logsByMetric.get(g.metricId) ?? [] : [];
        const locked = !['PENDING', 'IN_PROGRESS', 'REJECTED'].includes(g.status);
        return {
          id: g.id,
          metricId: g.metricId,
          title: g.title,
          dimension: g.dimension,
          unit: g.unit,
          target: g.targetValue,
          baseTargetValue: g.baseTargetValue,
          carriedInValue: g.carriedInValue,
          dailyTarget: g.dailyTarget,
          current: g.currentValue,
          remaining,
          overflow,
          verifiedValue: g.verifiedValue,
          achievementPercentage: g.achievementPercentage,
          weight: g.weight,
          dataSource: g.dataSource,
          ratePerUnit: g.ratePerUnit,
          earned,
          status: g.status,
          locked,
          pace: paceRollup(g.currentValue, g.targetValue, win.startDate, win.endDate, now),
          logs: goalLogs,
          proofs: g.proofs,
          verifications: g.verifications,
        };
      }),
      summary: {
        goalCount: goals.length,
        weightedAchievement: Math.round(weightedAchievement * 10) / 10,
        totalEarned: Math.round(goals.reduce((s, g) => s + (g.ratePerUnit ?? 0) * g.currentValue, 0)),
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
