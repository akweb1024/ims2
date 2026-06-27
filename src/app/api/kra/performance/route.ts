import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { computePerformanceIndex } from '@/lib/kra/performance-index';
import type { KraPeriodType } from '@/lib/kra/period';

const MANAGERIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'];
const ALL_ROLES = [...MANAGERIAL_ROLES, 'EMPLOYEE', 'EXECUTIVE'];

// GET /api/kra/performance?employeeId=&periodType=MONTHLY&periodRef=ISO
//  - employee/executive (or no employeeId): own index
//  - manager/HR with employeeId: that employee's index (downline-checked)
//  - manager/HR without employeeId: team leaderboard
export const GET = authorizedRoute(ALL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get('employeeId');
    const periodType = (searchParams.get('periodType') || 'MONTHLY').toUpperCase() as KraPeriodType;
    const ref = searchParams.get('periodRef') ? new Date(searchParams.get('periodRef')!) : new Date();

    const isManager = MANAGERIAL_ROLES.includes(user.role);
    const wantSelf = searchParams.get('self') === '1';

    // Self view ("My Performance" forces this even for managers)
    if (wantSelf || !isManager || (employeeIdParam && ['EMPLOYEE', 'EXECUTIVE'].includes(user.role))) {
      const self = await prisma.employeeProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!self) return createErrorResponse('Profile not found', 404);
      const index = await computePerformanceIndex({ employeeId: self.id, companyId: user.companyId, periodType, ref, persist: true });
      return NextResponse.json({ index });
    }

    // Specific employee
    if (employeeIdParam) {
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
      const index = await computePerformanceIndex({ employeeId: target.id, companyId: user.companyId, periodType, ref, persist: true });
      return NextResponse.json({ index });
    }

    // Team leaderboard
    let profiles: { id: string; userId: string; user: { name: string | null; email: string } }[];
    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
      const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
      profiles = await prisma.employeeProfile.findMany({
        where: { userId: { in: [...downline, user.id] } },
        select: { id: true, userId: true, user: { select: { name: true, email: true } } },
      });
    } else {
      profiles = await prisma.employeeProfile.findMany({
        where: { user: { companyId: user.companyId, isActive: true } },
        select: { id: true, userId: true, user: { select: { name: true, email: true } } },
        take: 200,
      });
    }

    const leaderboard = [];
    for (const p of profiles) {
      const index = await computePerformanceIndex({ employeeId: p.id, companyId: user.companyId, periodType, ref, persist: true });
      leaderboard.push({ employeeId: p.id, name: p.user.name || p.user.email, ...index });
    }
    leaderboard.sort((a, b) => b.overallIndex - a.overallIndex);

    return NextResponse.json({ leaderboard, period: leaderboard[0]?.period, periodType });
  } catch (error) {
    return createErrorResponse(error);
  }
});
