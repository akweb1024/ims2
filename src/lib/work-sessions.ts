/**
 * Project work sessions — an employee "clocks in" on a project (Company or IT), logs
 * activities while it runs, then clocks out. A session with `endedAt === null` is running;
 * that is the live "who is working now" signal. One running session per employee is
 * enforced here (in the API), not the schema, so a person is focused on one thing at a time.
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
  'EMPLOYEE',
  'HR_MANAGER',
  'HR',
  'FINANCE_ADMIN',
  'IT_MANAGER',
  'IT_ADMIN',
  'IT_SUPPORT',
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
