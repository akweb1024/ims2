import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { SESSION_USER_ROLES } from '@/lib/work-sessions';

/**
 * POST /api/work-sessions/[id]/activity — log what you're doing while the session runs.
 * Owner only, and only while the session is still running.
 * Body: { description }
 */
export const POST = authorizedRoute(
  SESSION_USER_ROLES,
  async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const id = (await params).id;
      const body = await req.json();
      const description = (body?.description || '').trim();
      if (!description) return createErrorResponse('Activity description is required', 400);

      const session = await prisma.projectWorkSession.findUnique({ where: { id }, select: { userId: true, endedAt: true } });
      if (!session) return createErrorResponse('Session not found', 404);
      if (session.userId !== user.id) return createErrorResponse('Unauthorized', 403);
      if (session.endedAt) return createErrorResponse('Session already stopped', 400);

      const activity = await prisma.projectWorkSessionActivity.create({
        data: { sessionId: id, description },
      });

      return NextResponse.json(activity, { status: 201 });
    } catch (error) {
      return createErrorResponse(error);
    }
  },
);
