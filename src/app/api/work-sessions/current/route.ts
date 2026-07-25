import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { SESSION_USER_ROLES, sessionInclude, serializeSession } from '@/lib/work-sessions';

/** GET /api/work-sessions/current — the caller's running session, or { session: null }. */
export const GET = authorizedRoute(SESSION_USER_ROLES, async (_req: NextRequest, user) => {
  try {
    const session = await prisma.projectWorkSession.findFirst({
      where: { userId: user.id, endedAt: null },
      include: sessionInclude,
      orderBy: { startedAt: 'desc' },
    });
    return NextResponse.json({ session: session ? serializeSession(session) : null });
  } catch (error) {
    return createErrorResponse(error);
  }
});
