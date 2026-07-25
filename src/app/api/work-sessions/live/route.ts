import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { SESSION_OVERSEER_ROLES, sessionInclude, serializeSession, overseerScopeUserIds } from '@/lib/work-sessions';

/**
 * GET /api/work-sessions/live — who is working right now, for managers/admins.
 * Scope: group-wide admin sees all; MANAGER/TEAM_LEADER see their downline; other
 * overseers see their company. Returns the flat list of running sessions plus a small
 * per-project rollup (headcount) so the dashboard can group without a second call.
 */
export const GET = authorizedRoute(SESSION_OVERSEER_ROLES, async (_req: NextRequest, user) => {
  try {
    const scopeIds = await overseerScopeUserIds(user);
    const where: any = { endedAt: null };
    if (scopeIds !== null) where.userId = { in: scopeIds };

    const sessions = await prisma.projectWorkSession.findMany({
      where,
      include: sessionInclude,
      orderBy: { startedAt: 'asc' }, // longest-running first
    });

    const serialized = sessions.map(serializeSession);

    // Per-project rollup: how many people are active on each project and total live minutes.
    const byProject = new Map<string, { key: string; kind: 'COMPANY' | 'IT'; name: string; activeUsers: number; totalMinutes: number }>();
    for (const s of serialized) {
      const key = s.projectId ? `p:${s.projectId}` : s.itProjectId ? `it:${s.itProjectId}` : 'none';
      const name = s.project?.title || s.itProject?.name || 'Unassigned';
      const kind: 'COMPANY' | 'IT' = s.projectId ? 'COMPANY' : 'IT';
      const cur = byProject.get(key) || { key, kind, name, activeUsers: 0, totalMinutes: 0 };
      cur.activeUsers += 1;
      cur.totalMinutes += s.elapsedMinutes;
      byProject.set(key, cur);
    }

    return NextResponse.json({
      sessions: serialized,
      totalActive: serialized.length,
      byProject: [...byProject.values()].sort((a, b) => b.activeUsers - a.activeUsers),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
