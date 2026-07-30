import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { SESSION_OVERSEER_ROLES, overseerScopeUserIds, elapsedMinutes } from '@/lib/work-sessions';

/**
 * GET /api/team/work — what the caller's team is actually working on: a per-person roll-up plus
 * the team's projects, tasks and tickets. The team counterpart to /api/my/projects.
 *
 * Scoping reuses `overseerScopeUserIds`, which the live board already relies on: recursive
 * downline for MANAGER/TEAM_LEADER (it seeds with the caller, so they are included), the whole
 * company for other overseers, and unrestricted for group-wide admins. That last case is
 * narrowed to the caller's company here — a per-person roster across every company would be
 * unbounded, and there are company-level dashboards for that.
 *
 * The per-person figures come from ASSIGNED WORK, not from timers. The existing Live Work
 * Activity board only queries running sessions, so anyone who never clocks in looks idle even
 * with a pile of late work; that is the blind spot this closes.
 */
export const dynamic = 'force-dynamic';

/** Bound on the task/ticket lists behind the tabs. The per-person counts are exact regardless. */
const LIST_LIMIT = 400;

const OPEN_TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'];
const CLOSED_TICKET_STATUSES = ['RESOLVED', 'CLOSED'];

export const GET = authorizedRoute(SESSION_OVERSEER_ROLES, async (_req: NextRequest, user) => {
  try {
    const companyId = (user as any).companyId as string | null | undefined;
    const scopeIds = await overseerScopeUserIds(user as any);

    const members = await prisma.user.findMany({
      where: scopeIds === null
        ? { isActive: true, ...(companyId ? { companyId } : {}) }
        : { id: { in: scopeIds }, isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    const memberIds = members.map((m) => m.id);
    if (memberIds.length === 0) {
      return NextResponse.json({
        scope: { kind: scopeKind(user as any, scopeIds), memberCount: 0 },
        members: [], projects: [], tasks: [], tickets: [],
        summary: { running: 0, openTasks: 0, overdueTasks: 0, openTickets: 0, overdueTickets: 0, idleWithOverdue: 0 },
      });
    }

    const now = new Date();

    const [running, itTasks, companyTasks, tickets, itProjects, companyProjects, lastSessions] =
      await Promise.all([
        prisma.projectWorkSession.findMany({
          where: { userId: { in: memberIds }, endedAt: null },
          select: {
            id: true, userId: true, startedAt: true, projectId: true, itProjectId: true,
            project: { select: { id: true, title: true } },
            itProject: { select: { id: true, name: true } },
          },
          orderBy: { startedAt: 'asc' },
        }),
        prisma.iTTask.findMany({
          where: { assignedToId: { in: memberIds } },
          select: {
            id: true, taskCode: true, title: true, status: true, priority: true,
            startDate: true, dueDate: true, completedAt: true, progressPercent: true,
            assignedToId: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
          take: LIST_LIMIT,
        }),
        prisma.task.findMany({
          where: { userId: { in: memberIds } },
          select: {
            id: true, title: true, status: true, priority: true,
            startDate: true, dueDate: true, userId: true,
            project: { select: { id: true, title: true } },
          },
          orderBy: { dueDate: 'asc' },
          take: LIST_LIMIT,
        }),
        prisma.iTSupportTicket.findMany({
          where: { assignedToId: { in: memberIds } },
          select: {
            id: true, title: true, status: true, priority: true, assignedToId: true,
            createdAt: true, dueAt: true, resolvedAt: true,
            department: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: LIST_LIMIT,
        }),
        prisma.iTProject.findMany({
          where: {
            OR: [
              { projectManagerId: { in: memberIds } },
              { teamLeadId: { in: memberIds } },
              { taggedEmployees: { some: { id: { in: memberIds } } } },
              { tasks: { some: { assignedToId: { in: memberIds } } } },
            ],
          },
          select: {
            id: true, name: true, projectCode: true, status: true, priority: true,
            startDate: true, endDate: true, completedAt: true,
            projectManagerId: true, teamLeadId: true,
            taggedEmployees: { where: { id: { in: memberIds } }, select: { id: true } },
            tasks: { where: { assignedToId: { in: memberIds } }, select: { assignedToId: true, status: true } },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.project.findMany({
          where: {
            OR: [
              { managerId: { in: memberIds } },
              { leadId: { in: memberIds } },
              { members: { some: { userId: { in: memberIds } } } },
              { tasks: { some: { userId: { in: memberIds } } } },
            ],
          },
          select: {
            id: true, title: true, status: true, priority: true,
            startDate: true, endDate: true,
            managerId: true, leadId: true,
            members: { where: { userId: { in: memberIds } }, select: { userId: true } },
            tasks: { where: { userId: { in: memberIds } }, select: { userId: true, status: true } },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.projectWorkSession.findMany({
          where: { userId: { in: memberIds } },
          select: { userId: true, startedAt: true, endedAt: true },
          orderBy: { startedAt: 'desc' },
          take: 1000,
        }),
      ]);

    const isTaskOverdue = (t: { dueDate: Date | null; status: string }) =>
      Boolean(t.dueDate) && t.dueDate! < now && OPEN_TASK_STATUSES.includes(t.status);
    const isTicketOpen = (t: { status: string }) => !CLOSED_TICKET_STATUSES.includes(t.status);
    const isTicketOverdue = (t: { dueAt: Date | null; status: string }) =>
      Boolean(t.dueAt) && t.dueAt! < now && isTicketOpen(t);

    /* ── Per-person roll-up ─────────────────────────────────────────────── */
    const rows = members.map((m) => {
      const mine = {
        itTasks: itTasks.filter((t) => t.assignedToId === m.id),
        coTasks: companyTasks.filter((t) => t.userId === m.id),
        tickets: tickets.filter((t) => t.assignedToId === m.id),
        running: running.filter((s) => s.userId === m.id),
      };

      const openTasks =
        mine.itTasks.filter((t) => OPEN_TASK_STATUSES.includes(t.status)).length +
        mine.coTasks.filter((t) => OPEN_TASK_STATUSES.includes(t.status)).length;
      const overdueTasks =
        mine.itTasks.filter(isTaskOverdue).length + mine.coTasks.filter(isTaskOverdue).length;
      const openTickets = mine.tickets.filter(isTicketOpen).length;
      const overdueTickets = mine.tickets.filter(isTicketOverdue).length;

      const projectCount =
        itProjects.filter(
          (p) =>
            p.projectManagerId === m.id ||
            p.teamLeadId === m.id ||
            p.taggedEmployees.some((e) => e.id === m.id) ||
            p.tasks.some((t) => t.assignedToId === m.id),
        ).length +
        companyProjects.filter(
          (p) =>
            p.managerId === m.id ||
            p.leadId === m.id ||
            p.members.some((x) => x.userId === m.id) ||
            p.tasks.some((t) => t.userId === m.id),
        ).length;

      const last = lastSessions.find((s) => s.userId === m.id);

      return {
        userId: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        isYou: m.id === user.id,
        running: mine.running.map((s) => ({
          id: s.id,
          startedAt: s.startedAt.toISOString(),
          minutes: elapsedMinutes(s.startedAt, null),
          projectName: s.itProject?.name || s.project?.title || 'Unassigned',
          kind: s.itProjectId ? ('IT' as const) : ('COMPANY' as const),
          href: s.itProjectId
            ? `/dashboard/it-management/projects/${s.itProjectId}`
            : s.projectId ? `/dashboard/projects/${s.projectId}` : '#',
        })),
        openTasks,
        overdueTasks,
        openTickets,
        overdueTickets,
        projectCount,
        lastActiveAt: last ? (last.endedAt ?? last.startedAt).toISOString() : null,
      };
    });

    // The point of the whole screen: nothing running, but work is already late.
    const withIdleFlag = rows.map((r) => ({
      ...r,
      idleWithOverdue: r.running.length === 0 && r.overdueTasks + r.overdueTickets > 0,
    }));

    // Problems first: idle-but-late, then most overdue, then most loaded.
    withIdleFlag.sort(
      (a, b) =>
        Number(b.idleWithOverdue) - Number(a.idleWithOverdue) ||
        b.overdueTasks + b.overdueTickets - (a.overdueTasks + a.overdueTickets) ||
        b.openTasks + b.openTickets - (a.openTasks + a.openTickets) ||
        (a.name || '').localeCompare(b.name || ''),
    );

    const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? null;

    /* ── Tab lists ──────────────────────────────────────────────────────── */
    const projects = [
      ...itProjects.map((p) => {
        const people = new Set<string>(
          [
            p.projectManagerId, p.teamLeadId,
            ...p.taggedEmployees.map((e) => e.id),
            ...p.tasks.map((t) => t.assignedToId),
          ].filter((id): id is string => Boolean(id) && memberIds.includes(id!)),
        );
        return {
          key: `IT:${p.id}`, kind: 'IT' as const, id: p.id, name: p.name, code: p.projectCode,
          status: p.status, priority: p.priority,
          startDate: p.startDate?.toISOString() ?? null,
          endDate: p.endDate?.toISOString() ?? null,
          completedAt: p.completedAt?.toISOString() ?? null,
          href: `/dashboard/it-management/projects/${p.id}`,
          teamOnIt: people.size,
          liveNow: running.filter((s) => s.itProjectId === p.id).length,
          teamOpenTasks: p.tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
        };
      }),
      ...companyProjects.map((p) => {
        const people = new Set<string>(
          [p.managerId, p.leadId, ...p.members.map((x) => x.userId), ...p.tasks.map((t) => t.userId)]
            .filter((id): id is string => Boolean(id) && memberIds.includes(id!)),
        );
        return {
          key: `COMPANY:${p.id}`, kind: 'COMPANY' as const, id: p.id, name: p.title, code: null,
          status: p.status, priority: p.priority,
          startDate: p.startDate?.toISOString() ?? null,
          endDate: p.endDate?.toISOString() ?? null,
          completedAt: null,
          href: `/dashboard/projects/${p.id}`,
          teamOnIt: people.size,
          liveNow: running.filter((s) => s.projectId === p.id).length,
          teamOpenTasks: p.tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
        };
      }),
    ].sort((a, b) => b.liveNow - a.liveNow || b.teamOpenTasks - a.teamOpenTasks);

    const taskList = [
      ...itTasks.map((t) => ({
        key: `IT:${t.id}`, kind: 'IT' as const, id: t.id, code: t.taskCode, title: t.title,
        status: t.status, priority: t.priority,
        startDate: t.startDate?.toISOString() ?? null,
        dueDate: t.dueDate?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        progressPercent: t.progressPercent,
        projectName: t.project?.name ?? null,
        assigneeId: t.assignedToId,
        assigneeName: nameOf(t.assignedToId),
        href: `/dashboard/it-management/tasks/${t.id}`,
      })),
      ...companyTasks.map((t) => ({
        key: `COMPANY:${t.id}`, kind: 'COMPANY' as const, id: t.id, code: null, title: t.title,
        status: t.status, priority: t.priority,
        startDate: t.startDate?.toISOString() ?? null,
        dueDate: t.dueDate?.toISOString() ?? null,
        completedAt: null,
        progressPercent: 0,
        projectName: t.project?.title ?? null,
        assigneeId: t.userId,
        assigneeName: nameOf(t.userId),
        href: t.project ? `/dashboard/projects/${t.project.id}` : '/dashboard/my-todos',
      })),
    ];

    const ticketList = tickets.map((t) => ({
      id: t.id, title: t.title, status: t.status, priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      dueAt: t.dueAt?.toISOString() ?? null,
      resolvedAt: t.resolvedAt?.toISOString() ?? null,
      departmentName: t.department?.name ?? null,
      assigneeId: t.assignedToId,
      assigneeName: nameOf(t.assignedToId),
      href: `/dashboard/support-desk/${t.id}`,
    }));

    return NextResponse.json({
      scope: { kind: scopeKind(user as any, scopeIds), memberCount: members.length },
      members: withIdleFlag,
      projects,
      tasks: taskList,
      tickets: ticketList,
      summary: {
        running: running.length,
        openTasks: withIdleFlag.reduce((s, r) => s + r.openTasks, 0),
        overdueTasks: withIdleFlag.reduce((s, r) => s + r.overdueTasks, 0),
        openTickets: withIdleFlag.reduce((s, r) => s + r.openTickets, 0),
        overdueTickets: withIdleFlag.reduce((s, r) => s + r.overdueTickets, 0),
        idleWithOverdue: withIdleFlag.filter((r) => r.idleWithOverdue).length,
      },
      listLimit: LIST_LIMIT,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});

function scopeKind(user: { role: string }, scopeIds: string[] | null): 'DOWNLINE' | 'COMPANY' | 'ALL' {
  if (scopeIds === null) return 'ALL';
  return user.role === 'MANAGER' || user.role === 'TEAM_LEADER' ? 'DOWNLINE' : 'COMPANY';
}
