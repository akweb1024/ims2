import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { SESSION_OVERSEER_ROLES, sessionInclude, overseerScopeUserIds } from '@/lib/work-sessions';

/**
 * GET /api/work-sessions/analytics?days=7 — completed-session time over a window, for
 * managers/admins. Same scope as the live board (downline / company / all). Aggregates in
 * memory (the window is bounded) into per-project and per-person totals.
 */
export const GET = authorizedRoute(SESSION_OVERSEER_ROLES, async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '7', 10) || 7));
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000);

    const scopeIds = await overseerScopeUserIds(user);
    const where: any = { endedAt: { gte: from, lte: to } };
    if (scopeIds !== null) where.userId = { in: scopeIds };

    const sessions = await prisma.projectWorkSession.findMany({
      where,
      include: sessionInclude,
      take: 5000,
    });

    const byProject = new Map<string, { key: string; kind: 'COMPANY' | 'IT'; name: string; minutes: number; users: Set<string> }>();
    const byUser = new Map<string, { userId: string; name: string; minutes: number }>();
    let totalMinutes = 0;

    for (const s of sessions) {
      const mins = s.durationMinutes ?? 0;
      totalMinutes += mins;

      const pkey = s.projectId ? `p:${s.projectId}` : s.itProjectId ? `it:${s.itProjectId}` : 'none';
      const pname = s.project?.title || s.itProject?.name || 'Unassigned';
      const kind: 'COMPANY' | 'IT' = s.projectId ? 'COMPANY' : 'IT';
      const pcur = byProject.get(pkey) || { key: pkey, kind, name: pname, minutes: 0, users: new Set<string>() };
      pcur.minutes += mins;
      pcur.users.add(s.userId);
      byProject.set(pkey, pcur);

      const ucur = byUser.get(s.userId) || { userId: s.userId, name: s.user?.name || s.user?.email || 'Unknown', minutes: 0 };
      ucur.minutes += mins;
      byUser.set(s.userId, ucur);
    }

    return NextResponse.json({
      from,
      to,
      days,
      totalMinutes,
      sessionCount: sessions.length,
      byProject: [...byProject.values()].map((p) => ({ key: p.key, kind: p.kind, name: p.name, minutes: p.minutes, users: p.users.size })).sort((a, b) => b.minutes - a.minutes),
      byUser: [...byUser.values()].sort((a, b) => b.minutes - a.minutes),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
