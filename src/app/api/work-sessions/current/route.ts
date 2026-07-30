import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { SESSION_USER_ROLES, sessionInclude, serializeSession } from '@/lib/work-sessions';

/**
 * GET /api/work-sessions/current — the caller's running sessions.
 *
 * Sessions may now run on several projects at once, so this returns `sessions` (newest first).
 * `session` is kept as the newest one purely so older callers keep working; new code should
 * read `sessions`.
 */
export const GET = authorizedRoute(SESSION_USER_ROLES, async (_req: NextRequest, user) => {
  try {
    const running = await prisma.projectWorkSession.findMany({
      where: { userId: user.id, endedAt: null },
      include: sessionInclude,
      orderBy: { startedAt: 'desc' },
    });
    const sessions = running.map(serializeSession);
    return NextResponse.json({ session: sessions[0] ?? null, sessions });
  } catch (error) {
    return createErrorResponse(error);
  }
});
