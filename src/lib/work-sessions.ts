/**
 * Project work sessions — an employee "clocks in" on a project (Company or IT), logs
 * activities while it runs, then clocks out. A session with `endedAt === null` is running;
 * that is the live "who is working now" signal. Sessions may run on SEVERAL projects at once;
 * only a second session on the same project is refused, in the API rather than the schema.
 *
 * A session references EXACTLY ONE of `projectId` (Company Project) or `itProjectId` (IT
 * project). `companyId` is the worker's company, so team/company dashboards scope by it.
 */
import { prisma } from '@/lib/prisma';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { canAccessAllCompanies } from '@/lib/company-scope';

/** Who may see other people's sessions (the live/team dashboards). Everyone else sees only their own. */
export const SESSION_OVERSEER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'TEAM_LEADER',
  'IT_MANAGER',
  'IT_ADMIN',
  'HR_MANAGER',
];

/** Every internal role may run their own sessions. */
export const SESSION_USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'TEAM_LEADER',
  'EXECUTIVE',
  'HR_MANAGER',
  'HR',
  'FINANCE_ADMIN',
  'IT_MANAGER',
  'IT_ADMIN',
  'EDITOR',
  'EDITOR_IN_CHIEF',
  'JOURNAL_MANAGER',
];

export const sessionInclude = {
  user: { select: { id: true, name: true, email: true } },
  project: {
    select: { id: true, title: true, status: true, companyId: true, company: { select: { id: true, name: true } } },
  },
  itProject: { select: { id: true, name: true, projectCode: true, status: true, companyId: true } },
  activities: { orderBy: { createdAt: 'desc' as const } },
} as const;

/** Whole minutes between start and end (or now, for a running session). Never negative. */
export function elapsedMinutes(startedAt: Date, endedAt?: Date | null): number {
  const end = endedAt ? endedAt.getTime() : Date.now();
  return Math.max(0, Math.round((end - startedAt.getTime()) / 60000));
}

/**
 * Whole minutes of DISTINCT wall-clock time covered by a set of sessions — overlapping
 * periods counted once.
 *
 * Sessions may run on several projects at once, so summing `durationMinutes` answers
 * "time per project" and will exceed the hours a person actually worked: three timers over
 * one afternoon sum to three afternoons. Anywhere the figure means *person-hours* — payroll,
 * utilisation, the WORK_SESSION_HOURS KRA metric — must union the intervals instead, which is
 * what this does.
 *
 * Sorts by start, then walks merging anything that overlaps or touches the open period.
 */
export function distinctMinutes(
  sessions: Array<{ startedAt: Date; endedAt?: Date | null }>,
  now: Date = new Date(),
): number {
  const spans = sessions
    .map((s) => ({ start: s.startedAt.getTime(), end: (s.endedAt ?? now).getTime() }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);
  if (spans.length === 0) return 0;

  let total = 0;
  let { start: openStart, end: openEnd } = spans[0];
  for (const span of spans.slice(1)) {
    if (span.start <= openEnd) {
      openEnd = Math.max(openEnd, span.end);
    } else {
      total += openEnd - openStart;
      openStart = span.start;
      openEnd = span.end;
    }
  }
  total += openEnd - openStart;
  return Math.max(0, Math.round(total / 60000));
}

type Actor = { id: string; role: string; companyId?: string | null; allowedModules?: string[] };

/**
 * The set of User.ids whose sessions an overseer may see:
 *  - group-wide admin (SUPER_ADMIN / ALL_COMPANIES) → null, meaning "no user filter, all"
 *  - MANAGER / TEAM_LEADER → their recursive downline (includes themselves)
 *  - other overseers (IT/HR managers, ADMIN without clearance) → everyone in their company
 */
export async function overseerScopeUserIds(user: Actor): Promise<string[] | null> {
  if (canAccessAllCompanies(user)) return null;
  if (user.role === 'MANAGER' || user.role === 'TEAM_LEADER') {
    return getDownlineUserIds(user.id, user.companyId ?? undefined);
  }
  const peers = await prisma.user.findMany({
    where: { companyId: user.companyId ?? undefined, isActive: true },
    select: { id: true },
  });
  return peers.map((u) => u.id);
}

/**
 * Resolve and validate the project reference on a start request. Returns the worker-facing
 * companyId to stamp on the session, or an error string. Requires exactly one of the two ids.
 */
export async function resolveProjectRef(body: {
  projectId?: string | null;
  itProjectId?: string | null;
}): Promise<{ projectId: string | null; itProjectId: string | null } | { error: string }> {
  const projectId = body.projectId || null;
  const itProjectId = body.itProjectId || null;
  if (!!projectId === !!itProjectId) {
    return { error: 'Provide exactly one of projectId or itProjectId' };
  }
  if (projectId) {
    const p = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!p) return { error: 'Project not found' };
  } else if (itProjectId) {
    const p = await prisma.iTProject.findUnique({ where: { id: itProjectId }, select: { id: true } });
    if (!p) return { error: 'IT project not found' };
  }
  return { projectId, itProjectId };
}

/** Shape a session row for the client, adding a live-safe elapsedMinutes. */
export function serializeSession(s: any) {
  return {
    ...s,
    isRunning: s.endedAt === null,
    elapsedMinutes: elapsedMinutes(s.startedAt, s.endedAt),
  };
}
