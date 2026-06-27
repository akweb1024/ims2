import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { computePeriodWindow, KraPeriodType } from '@/lib/kra/period';

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE', 'EXECUTIVE'];

// GET /api/kra/my?employeeId=...&periodType=MONTHLY&periodRef=ISO
// Returns the (self or, for managers, a team member's) KRA goals for the active period window.
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

    const goals = await prisma.employeeGoal.findMany({
      where: { employeeId, isKra: true, type: periodType, startDate: win.startDate },
      include: { metric: true },
      orderBy: { title: 'asc' },
    });

    // Lightweight focus summary: weighted achievement across KRA goals.
    const totalWeight = goals.reduce((s, g) => s + (g.weight || 1), 0);
    const weightedAchievement = totalWeight
      ? goals.reduce((s, g) => s + Math.min(100, g.achievementPercentage) * (g.weight || 1), 0) / totalWeight
      : 0;

    return NextResponse.json({
      period: win.label,
      periodType,
      window: { start: win.startDate, end: win.endDate },
      goals: goals.map((g) => ({
        id: g.id,
        metricId: g.metricId,
        title: g.title,
        unit: g.unit,
        target: g.targetValue,
        current: g.currentValue,
        verifiedValue: g.verifiedValue,
        achievementPercentage: g.achievementPercentage,
        weight: g.weight,
        dataSource: g.dataSource,
        status: g.status,
      })),
      summary: { goalCount: goals.length, weightedAchievement: Math.round(weightedAchievement * 10) / 10 },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
