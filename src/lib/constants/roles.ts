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
