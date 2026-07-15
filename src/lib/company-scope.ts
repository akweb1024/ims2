import type { TokenPayload } from '@/lib/auth-core';

/**
 * Pure company-scoping predicates.
 *
 * Deliberately free of the prisma import (which validates env on load) so this logic
 * stays unit-testable; `access-policy.ts` re-exports both for existing callers.
 */

export const ACCESS_POLICY_MODULES = {
  ALL_COMPANIES: 'ALL_COMPANIES',
} as const;

export function canAccessAllCompanies(
  user: Pick<TokenPayload, 'role' | 'allowedModules'> | null | undefined,
): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || (user.allowedModules || []).includes(ACCESS_POLICY_MODULES.ALL_COMPANIES);
}

/**
 * The company filter to spread into a Prisma `where` for a read.
 *
 *  - `{}`            — cleared for every company (SUPER_ADMIN or ALL_COMPANIES)
 *  - `{ companyId }` — scoped to the user's own company
 *  - `null`          — no company and no clearance; the caller MUST return an empty
 *                      result rather than running the query
 *
 * Exists because `where: { companyId: user.companyId || undefined }` and
 * `where: { ...(user.companyId ? { companyId } : {}) }` both read as scoping but do the
 * opposite: Prisma drops an undefined key, and `{}` is no filter at all — so a user whose
 * companyId is null (User.companyId is nullable) reads EVERY company's rows. Both shapes
 * were repeated ~40 times across this codebase.
 *
 *   const scope = companyScopeFilter(user);
 *   if (!scope) return NextResponse.json([]);
 *   const rows = await prisma.thing.findMany({ where: { ...scope, ...rest } });
 */
export function companyScopeFilter(
  user: Pick<TokenPayload, 'role' | 'companyId' | 'allowedModules'> | null | undefined,
): { companyId?: string } | null {
  if (!user) return null;
  if (canAccessAllCompanies(user)) return {};
  if (!user.companyId) return null;
  return { companyId: user.companyId };
}

type CompanyWhere = { companyId?: string | { in: string[] } };

/**
 * Spread-safe form of {@link companyScopeFilter} for `where` clauses, so call sites need
 * no early return:
 *
 *   where: { ...companyScopeWhere(user), status: 'ACTIVE' }
 *
 * A null-company user with no clearance gets `{ companyId: { in: [] } }`, which matches
 * zero rows — the safe direction. That is the whole difference from the `{}` that the old
 * `user.companyId ? { companyId } : {}` produced, which matched EVERY row.
 *
 * Prefer companyScopeFilter where you can return early and skip the query entirely.
 */
export function companyScopeWhere(
  user: Pick<TokenPayload, 'role' | 'companyId' | 'allowedModules'> | null | undefined,
): CompanyWhere {
  return companyScopeFilter(user) ?? { companyId: { in: [] } };
}
