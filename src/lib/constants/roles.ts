/**
 * The single source of truth for the Prisma `UserRole` enum.
 *
 * Why this module exists: role names were re-typed as string literals in ~40 files, and three
 * of them do not exist in the enum at all — `EMPLOYEE`, `IT_SUPPORT` and `STAFF`. No user can
 * ever hold those, so every gate naming them was dead. With `ignoreBuildErrors: true` in
 * next.config, nothing caught it.
 *
 * Two failure modes came out of that, and they pull in opposite directions:
 *   - a role list like ['MANAGER', 'EMPLOYEE'] reads as "managers and ordinary staff" but only
 *     ever granted MANAGER, so ordinary staff were silently DENIED;
 *   - a check like `user.role === 'EMPLOYEE'` is always false, so the restricted branch never
 *     ran and everyone fell through to the unrestricted one.
 *
 * Import `USER_ROLES` / `BASE_STAFF_ROLE` and type role maps as `Record<UserRoleValue, …>` so
 * the compiler catches the next drift instead of a user discovering it.
 *
 * ⚠️ Not every capitalised string is a role. `STAFF` is also a legitimate *audience* value on
 * `Announcement.targetRole` and knowledge-base articles (ALL | STAFF | CUSTOMER | AGENCY), and
 * `EMPLOYEE` is also a search category and a performance *scope*. Those are unrelated to this
 * module — check the column before assuming.
 */

// Type-only import: erased at build time, so this stays safe in client components.
import type { UserRole } from '@prisma/client';

export const USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'TEAM_LEADER',
  'EXECUTIVE',
  'FINANCE_ADMIN',
  'CUSTOMER',
  'AGENCY',
  'EDITOR',
  'JOURNAL_MANAGER',
  'PLAGIARISM_CHECKER',
  'QUALITY_CHECKER',
  'EDITOR_IN_CHIEF',
  'SECTION_EDITOR',
  'REVIEWER',
  'IT_MANAGER',
  'IT_ADMIN',
  'HR',
  'HR_MANAGER',
] as const;

export type UserRoleValue = (typeof USER_ROLES)[number];

/**
 * Compile-time guard that the list above matches the generated Prisma enum exactly. Adding,
 * removing or renaming a member in schema.prisma stops this file compiling.
 *
 * Must be an `Expect<…>` constraint: a conditional type that merely *resolves* to an error
 * object compiles happily while drifted, so it would catch nothing.
 */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Expect<T extends true> = T;
export type UserRoleListMatchesPrismaEnum = Expect<Equals<UserRoleValue, UserRole>>;

/**
 * The ordinary staff member — someone with no elevated privileges. This is `EXECUTIVE`.
 *
 * A lot of code reached for a role called `EMPLOYEE` for this and got a value the database
 * cannot store. If you are writing a gate that should include rank-and-file staff, use this.
 */
export const BASE_STAFF_ROLE = 'EXECUTIVE' as const satisfies UserRoleValue;

/** Roles that belong to customers/partners rather than internal staff. */
export const EXTERNAL_ROLES = ['CUSTOMER', 'AGENCY'] as const satisfies readonly UserRoleValue[];

/** Every internal role — i.e. everyone who is not an external customer or agency. */
export const INTERNAL_ROLES = USER_ROLES.filter(
  (r): r is Exclude<UserRoleValue, 'CUSTOMER' | 'AGENCY'> =>
    !(EXTERNAL_ROLES as readonly string[]).includes(r),
);

export function isUserRole(v: unknown): v is UserRoleValue {
  return typeof v === 'string' && (USER_ROLES as readonly string[]).includes(v);
}

/* ─── Multiple roles per user ─────────────────────────────────────────────── */

/**
 * A user carries one *primary* role (`User.role`) plus any number of *additional* roles
 * (`User.roles`). The primary role is what the app displays and what rank checks read; the
 * additional ones only ever grant more access, never less.
 *
 * The `roles` column existed in the schema from the baseline migration but nothing read or
 * wrote it, so it had drifted — most rows still held the `[EXECUTIVE]` default while their
 * real role was something else. Treat it as additive-only and always union with `role`, so a
 * stale or empty array can never take access away from someone.
 */
export interface RoleBearer {
  role?: string | null;
  roles?: string[] | null;
}

/** Every role a user effectively holds: their primary role plus any additional ones. */
export function effectiveRoles(user: RoleBearer | null | undefined): string[] {
  if (!user) return [];
  const all = new Set<string>();
  if (user.role) all.add(user.role);
  for (const r of user.roles ?? []) if (r) all.add(r);
  return [...all];
}

/**
 * Does the user hold at least one of `allowed`?
 *
 * `'*'` in `allowed` means everyone. An empty `allowed` list means "no role requirement",
 * matching how authorizedRoute has always treated it.
 */
export function hasAnyRole(user: RoleBearer | null | undefined, allowed: readonly string[]): boolean {
  if (allowed.length === 0) return true;
  if (allowed.includes('*')) return true;
  const held = effectiveRoles(user);
  return allowed.some((r) => held.includes(r));
}

/** Keep only real enum members, drop duplicates and drop the primary role. */
export function sanitiseAdditionalRoles(input: unknown, primaryRole?: string | null): UserRoleValue[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<UserRoleValue>();
  for (const v of input) {
    if (isUserRole(v) && v !== primaryRole) seen.add(v);
  }
  return [...seen];
}
