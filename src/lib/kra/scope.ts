/**
 * Role ranks & scope guards for the Goals & KRA module (Plan B, Phase 3).
 *
 * The spec's role ladder maps onto this project's UserRole enum:
 *   EMPLOYEE(1)  -> EXECUTIVE (and any non-managerial role)
 *   TEAM_LEAD(2) -> TEAM_LEADER
 *   MANAGER(3)   -> MANAGER
 *   DIRECTOR(4)  -> (no direct equivalent; HR/HR_MANAGER act group-wide)
 *   ADMIN(5)     -> ADMIN / SUPER_ADMIN
 *
 * Company scoping: MANAGER/TEAM_LEADER may only act on their downline; ADMIN-class
 * and HR roles are group-wide (bypass the downline check). Mirrors the inline logic
 * already used by the /api/kra/assign and /api/kra/my routes, centralised here.
 */
import { prisma } from '@/lib/prisma';
import { getDownlineUserIds } from '@/lib/hierarchy';

export type ActorRole = string;

/** Numeric rank for "requireRole(atLeast)" style checks. */
export const ROLE_RANK: Record<string, number> = {
  EXECUTIVE: 1,
  EMPLOYEE: 1,
  REVIEWER: 1,
  TEAM_LEADER: 2,
  MANAGER: 3,
  IT_MANAGER: 3,
  JOURNAL_MANAGER: 3,
  HR: 4,
  HR_MANAGER: 4,
  ADMIN: 5,
  SUPER_ADMIN: 5,
};

/** Roles that bypass downline/company scoping (group-wide ≈ DIRECTOR+). */
export const GROUP_WIDE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'HR', 'HR_MANAGER']);

/** Managerial roles that may assign/verify within their downline. */
export const MANAGERIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'];

export function rankOf(role: ActorRole): number {
  return ROLE_RANK[role] ?? 0;
}

export function requireRole(actorRole: ActorRole, atLeast: number): void {
  if (rankOf(actorRole) < atLeast) {
    throw new KraScopeError(`Insufficient role: requires rank ${atLeast}, actor has ${rankOf(actorRole)}`, 403);
  }
}

export class KraScopeError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = 'KraScopeError';
    this.status = status;
  }
}

export interface Actor {
  id: string;          // User id
  role: ActorRole;
  companyId?: string | null;
}

/**
 * Assert the actor may act within `companyId`.
 * Group-wide roles always pass; everyone else must match their own company.
 */
export function assertCompanyScope(actor: Actor, companyId: string | null | undefined): void {
  if (GROUP_WIDE_ROLES.has(actor.role)) return;
  if (!companyId || !actor.companyId || actor.companyId !== companyId) {
    throw new KraScopeError('Forbidden: target is outside your company scope', 403);
  }
}

/**
 * Assert the actor may act on the given EmployeeProfile.
 * - Group-wide roles pass.
 * - MANAGER/TEAM_LEADER must have the target's User in their downline.
 * Returns the resolved EmployeeProfile (id, userId, company/department of the user).
 */
export async function assertManagerScope(actor: Actor, employeeProfileId: string) {
  const profile = await prisma.employeeProfile.findUnique({
    where: { id: employeeProfileId },
    select: { id: true, userId: true, designationId: true, user: { select: { companyId: true, departmentId: true } } },
  });
  if (!profile) throw new KraScopeError('Employee not found', 404);

  if (GROUP_WIDE_ROLES.has(actor.role)) return profile;

  // Same-company requirement first.
  assertCompanyScope(actor, profile.user?.companyId);

  // Managers/TLs: target must be self or in downline.
  if (['MANAGER', 'TEAM_LEADER'].includes(actor.role)) {
    if (profile.userId === actor.id) return profile;
    const downline = await getDownlineUserIds(actor.id, actor.companyId ?? undefined);
    if (!downline.includes(profile.userId)) {
      throw new KraScopeError('Forbidden: employee is outside your team', 403);
    }
    return profile;
  }

  throw new KraScopeError('Insufficient role to manage this employee', 403);
}

/** Resolve the current user's own EmployeeProfile (for ownership checks). */
export async function resolveSelfProfile(userId: string) {
  const profile = await prisma.employeeProfile.findUnique({
    where: { userId },
    select: { id: true, userId: true, user: { select: { companyId: true, departmentId: true } } },
  });
  if (!profile) throw new KraScopeError('Employee profile not found for current user', 404);
  return profile;
}

/** Ownership guard: throws unless the goal belongs to the acting user's profile. */
export function assertOwnership(goalEmployeeId: string, selfProfileId: string): void {
  if (goalEmployeeId !== selfProfileId) {
    throw new KraScopeError('Forbidden: you can only act on your own goals', 403);
  }
}
