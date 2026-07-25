import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import {
  SESSION_USER_ROLES,
  SESSION_OVERSEER_ROLES,
  sessionInclude,
  serializeSession,
  elapsedMinutes,
  overseerScopeUserIds,
} from '@/lib/work-sessions';

/**
 * POST /api/work-sessions/[id]/stop — "clock out". The owner may stop their own session;
 * an overseer may stop one within their scope (to close a session someone left running).
 * Body: { note? } — optional closing note appended to the session.
 */
export const POST = authorizedRoute(
  SESSION_USER_ROLES,
  async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const id = (await params).id;
      const session = await prisma.projectWorkSession.findUnique({ where: { id }, select: { id: true, userId: true, startedAt: true, endedAt: true, note: true } });
      if (!session) return createErrorResponse('Session not found', 404);

      if (session.userId !== user.id) {
        const canOversee = SESSION_OVERSEER_ROLES.includes(user.role);
        const scopeIds = canOversee ? await overseerScopeUserIds(user) : [];
        const inScope = scopeIds === null || scopeIds.includes(session.userId);
        if (!canOversee || !inScope) return createErrorResponse('Unauthorized', 403);
      }

      if (session.endedAt) return createErrorResponse('Session already stopped', 400);

      const body = await req.json().catch(() => ({}));
      const closingNote = body?.note?.trim();
      const endedAt = new Date();

      const updated = await prisma.projectWorkSession.update({
        where: { id },
        data: {
          endedAt,
          durationMinutes: elapsedMinutes(session.startedAt, endedAt),
          note: closingNote ? [session.note, closingNote].filter(Boolean).join(' — ') : undefined,
        },
        include: sessionInclude,
      });

      return NextResponse.json(serializeSession(updated));
    } catch (error) {
      return createErrorResponse(error);
    }
  },
);
