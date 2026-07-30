import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { elapsedMinutes } from '@/lib/work-sessions';

/**
 * GET /api/my/projects — every project the caller is personally on, across BOTH project
 * systems: IT projects (`ITProject`) and company projects (`Project`), which are separate
 * models by design.
 *
 * Why this exists rather than reusing /api/it/projects: that route's role list excludes
 * EMPLOYEE, so a plain employee gets a 403 and their own project list comes back empty. This
 * route is open to every authenticated role because it only ever returns projects the caller
 * is attached to — there is nothing to leak. For the same reason it filters on involvement
 * rather than companyId: someone legitimately assigned to a sister-company project should
 * still see it, and involvement is a tighter filter than company anyway.
 *
 * "On a project" means any of: named manager, named lead, tagged/enrolled member, or holding
 * at least one task on it.
 */
export const dynamic = 'force-dynamic';

type Kind = 'IT' | 'COMPANY';

interface MyProject {
  key: string;
  kind: Kind;
  id: string;
  name: string;
  code: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  href: string;
  myRoles: string[];
  myOpenTasks: number;
  myDoneTasks: number;
  /** My own minutes on this project — ended sessions plus anything running right now. */
  loggedMinutes: number;
  isRunning: boolean;
  runningSessionId: string | null;
  runningSince: string | null;
}

export const GET = authorizedRoute([], async (_req: NextRequest, user) => {
  try {
    const me = user.id;

    const [itProjects, companyProjects, mySessions] = await Promise.all([
      prisma.iTProject.findMany({
        where: {
          OR: [
            { projectManagerId: me },
            { teamLeadId: me },
            { taggedEmployees: { some: { id: me } } },
            { tasks: { some: { assignedToId: me } } },
          ],
        },
        select: {
          id: true, name: true, projectCode: true, status: true, priority: true,
          startDate: true, endDate: true, completedAt: true,
          projectManagerId: true, teamLeadId: true,
          taggedEmployees: { where: { id: me }, select: { id: true } },
          tasks: { where: { assignedToId: me }, select: { status: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { managerId: me },
            { leadId: me },
            { members: { some: { userId: me } } },
            { tasks: { some: { userId: me } } },
          ],
        },
        select: {
          id: true, title: true, status: true, priority: true,
          startDate: true, endDate: true,
          managerId: true, leadId: true,
          members: { where: { userId: me }, select: { role: true } },
          tasks: { where: { userId: me }, select: { status: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.projectWorkSession.findMany({
        where: { userId: me },
        select: {
          id: true, projectId: true, itProjectId: true,
          startedAt: true, endedAt: true, durationMinutes: true,
        },
      }),
    ]);

    // Fold my sessions into per-project totals. A running session contributes its elapsed
    // time so the figure does not jump when it is finally stopped.
    const totals = new Map<string, { minutes: number; runningId: string | null; since: Date | null }>();
    for (const s of mySessions) {
      const key = s.itProjectId ? `IT:${s.itProjectId}` : s.projectId ? `COMPANY:${s.projectId}` : null;
      if (!key) continue;
      const entry = totals.get(key) ?? { minutes: 0, runningId: null, since: null };
      entry.minutes += s.endedAt
        ? (s.durationMinutes ?? elapsedMinutes(s.startedAt, s.endedAt))
        : elapsedMinutes(s.startedAt, null);
      if (!s.endedAt) {
        entry.runningId = s.id;
        entry.since = s.startedAt;
      }
      totals.set(key, entry);
    }

    const countTasks = (tasks: { status: string }[]) => ({
      myDoneTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
      myOpenTasks: tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
    });

    const projects: MyProject[] = [
      ...itProjects.map((p) => {
        const key = `IT:${p.id}`;
        const t = totals.get(key);
        const roles: string[] = [];
        if (p.projectManagerId === me) roles.push('Manager');
        if (p.teamLeadId === me) roles.push('Lead');
        if (p.taggedEmployees.length) roles.push('Member');
        if (p.tasks.length) roles.push('Contributor');
        return {
          key, kind: 'IT' as Kind, id: p.id, name: p.name, code: p.projectCode,
          status: p.status, priority: p.priority,
          startDate: p.startDate?.toISOString() ?? null,
          endDate: p.endDate?.toISOString() ?? null,
          completedAt: p.completedAt?.toISOString() ?? null,
          href: `/dashboard/it-management/projects/${p.id}`,
          myRoles: roles,
          ...countTasks(p.tasks),
          loggedMinutes: t?.minutes ?? 0,
          isRunning: Boolean(t?.runningId),
          runningSessionId: t?.runningId ?? null,
          runningSince: t?.since?.toISOString() ?? null,
        };
      }),
      ...companyProjects.map((p) => {
        const key = `COMPANY:${p.id}`;
        const t = totals.get(key);
        const roles: string[] = [];
        if (p.managerId === me) roles.push('Manager');
        if (p.leadId === me) roles.push('Lead');
        if (p.members.length) roles.push(p.members[0].role?.trim() || 'Member');
        if (p.tasks.length) roles.push('Contributor');
        return {
          key, kind: 'COMPANY' as Kind, id: p.id, name: p.title, code: null,
          status: p.status, priority: p.priority,
          startDate: p.startDate?.toISOString() ?? null,
          endDate: p.endDate?.toISOString() ?? null,
          completedAt: null,
          href: `/dashboard/projects/${p.id}`,
          myRoles: roles,
          ...countTasks(p.tasks),
          loggedMinutes: t?.minutes ?? 0,
          isRunning: Boolean(t?.runningId),
          runningSessionId: t?.runningId ?? null,
          runningSince: t?.since?.toISOString() ?? null,
        };
      }),
    ];

    // Running first, then most time invested.
    projects.sort(
      (a, b) => Number(b.isRunning) - Number(a.isRunning) || b.loggedMinutes - a.loggedMinutes,
    );

    return NextResponse.json({
      projects,
      summary: {
        total: projects.length,
        running: projects.filter((p) => p.isRunning).length,
        // Sum of per-project minutes. With parallel sessions this is time-per-project and can
        // exceed the person's elapsed working time — never present it as person-hours.
        loggedMinutesAcrossProjects: projects.reduce((s, p) => s + p.loggedMinutes, 0),
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
