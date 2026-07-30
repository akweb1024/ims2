import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { SESSION_USER_ROLES, sessionInclude, serializeSession, resolveProjectRef } from '@/lib/work-sessions';

/**
 * GET /api/work-sessions
 *   ?projectId= / ?itProjectId=  → all sessions on that project (team view for its detail page)
 *   ?mine=true (or default)      → the caller's own sessions
 *   ?active=true                 → only running sessions (endedAt IS NULL)
 */
export const GET = authorizedRoute(SESSION_USER_ROLES, async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const itProjectId = searchParams.get('itProjectId');
    const active = searchParams.get('active') === 'true';
    const mine = searchParams.get('mine') === 'true' || (!projectId && !itProjectId);

    const where: any = {};
    if (active) where.endedAt = null;
    if (projectId) where.projectId = projectId;
    else if (itProjectId) where.itProjectId = itProjectId;
    else if (mine) where.userId = user.id;

    const sessions = await prisma.projectWorkSession.findMany({
      where,
      include: sessionInclude,
      orderBy: { startedAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(sessions.map(serializeSession));
  } catch (error) {
    return createErrorResponse(error);
  }
});

/**
 * POST /api/work-sessions — start a session ("clock in") on a project.
 * Body: { projectId? , itProjectId? , note? } — exactly one project id.
 *
 * An employee may run sessions on SEVERAL projects at once. Only a second session on the
 * *same* project is refused (409), since two timers on one project is always a mistake.
 *
 * Consequence to keep in mind when reading any hours figure: with parallel sessions, summed
 * session minutes are time-per-project and can exceed the person's elapsed working time. Use
 * the distinct-interval total (see /api/work-sessions/analytics) wherever person-hours are
 * meant, and label the two differently in the UI.
 */
export const POST = authorizedRoute(SESSION_USER_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const body = await req.json();

    const ref = await resolveProjectRef(body);
    if ('error' in ref) return createErrorResponse(ref.error, 400);

    // Parallel projects are allowed; a duplicate timer on the same project is not.
    const duplicate = await prisma.projectWorkSession.findFirst({
      where: {
        userId: user.id,
        endedAt: null,
        ...(ref.projectId ? { projectId: ref.projectId } : { itProjectId: ref.itProjectId }),
      },
      include: sessionInclude,
    });
    if (duplicate) {
      return NextResponse.json(
        {
          error: 'You already have a running session on this project.',
          running: serializeSession(duplicate),
        },
        { status: 409 },
      );
    }

    const session = await prisma.projectWorkSession.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        projectId: ref.projectId,
        itProjectId: ref.itProjectId,
        note: body.note?.trim() || null,
      },
      include: sessionInclude,
    });

    return NextResponse.json(serializeSession(session), { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
});
