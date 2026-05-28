import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { isManagerialRole } from '@/lib/hr/work-agenda';
import { generateTodayAgendaForEmployees } from '@/lib/hr/work-agenda-generator';

async function resolveTargetEmployeeIds(user: any, requestedEmployeeId: string | null, scope: string) {
  if (requestedEmployeeId && requestedEmployeeId !== 'self') {
    const profile = await prisma.employeeProfile.findFirst({
      where: { OR: [{ id: requestedEmployeeId }, { userId: requestedEmployeeId }] },
      select: { id: true, userId: true }
    });
    if (!profile) throw new Error('Employee not found');
    if (!isManagerialRole(user.role) && profile.userId !== user.id) throw new Error('Forbidden');
    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
      const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
      if (!downline.includes(profile.userId) && profile.userId !== user.id) throw new Error('Forbidden');
    }
    return [profile.id];
  }

  if (!isManagerialRole(user.role)) {
    const selfProfile = await prisma.employeeProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    return selfProfile ? [selfProfile.id] : [];
  }

  if (scope === 'team' && ['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
    const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
    const profileRows = await prisma.employeeProfile.findMany({
      where: { userId: { in: [user.id, ...downline] } },
      select: { id: true }
    });
    return profileRows.map((p) => p.id);
  }

  const profiles = await prisma.employeeProfile.findMany({
    where: {
      user: {
        isActive: true,
        ...(user.role === 'SUPER_ADMIN' ? {} : user.companyId ? { companyId: user.companyId } : {})
      }
    },
    select: { id: true }
  });
  return profiles.map((p) => p.id);
}

export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
  async (req: NextRequest, user: any) => {
    try {
      const body = await req.json().catch(() => ({}));
      const scope = String(body.scope || 'self').toLowerCase();
      const requestedEmployeeId = body.employeeId ? String(body.employeeId) : null;
      const forceRegenerate = Boolean(body.forceRegenerate);

      const targetEmployeeIds = await resolveTargetEmployeeIds(user, requestedEmployeeId, scope);
      if (!targetEmployeeIds.length) return NextResponse.json({ success: true, generated: 0, skipped: 0, details: [] });

      const run = await generateTodayAgendaForEmployees({
        companyId: user.companyId || null,
        employeeIds: targetEmployeeIds,
        generatedBy: user.id,
        forceRegenerate,
      });

      return NextResponse.json({
        success: true,
        generated: run.generated,
        skipped: run.skipped,
        details: run.details,
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      return createErrorResponse(error?.message || error);
    }
  }
);
