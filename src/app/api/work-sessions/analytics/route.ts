import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { SESSION_OVERSEER_ROLES, sessionInclude, overseerScopeUserIds, distinctMinutes } from '@/lib/work-sessions';

/**
 * GET /api/work-sessions/analytics?days=7 — completed-session time over a window, for
 * managers/admins. Same scope as the live board (downline / company / all). Aggregates in
 * memory (the window is bounded) into per-project and per-person totals.
 *
 * Two different measures, because sessions can run on several projects at once:
 *  - `minutes` on a project, and `totalMinutes`, are time-per-project. Summed across projects
 *    they exceed the hours anyone actually worked. Correct for "where did effort go".
 *  - `personMinutes` on a user, and `totalPersonMinutes`, union each person's overlapping
 *    sessions, so they are real person-hours. Use these for utilisation or payroll.
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
    const byUser = new Map<string, { userId: string; name: string; minutes: number; spans: { startedAt: Date; endedAt: Date | null }[] }>();
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

      const ucur = byUser.get(s.userId) || { userId: s.userId, name: s.user?.name || s.user?.email || 'Unknown', minutes: 0, spans: [] };
      ucur.minutes += mins;
      ucur.spans.push({ startedAt: s.startedAt, endedAt: s.endedAt });
      byUser.set(s.userId, ucur);
    }

    // Per person, overlapping sessions collapse to the time they actually spent.
    const people = [...byUser.values()].map((u) => ({
      userId: u.userId,
      name: u.name,
      minutes: u.minutes,
      personMinutes: distinctMinutes(u.spans),
    }));
    const totalPersonMinutes = people.reduce((s, u) => s + u.personMinutes, 0);

    return NextResponse.json({
      from,
      to,
      days,
      totalMinutes,
      totalPersonMinutes,
      sessionCount: sessions.length,
      byProject: [...byProject.values()].map((p) => ({ key: p.key, kind: p.kind, name: p.name, minutes: p.minutes, users: p.users.size })).sort((a, b) => b.minutes - a.minutes),
      byUser: people.sort((a, b) => b.personMinutes - a.personMinutes),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
