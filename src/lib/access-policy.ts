import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { TokenPayload } from '@/lib/auth-core';
import { AuthorizationError, ValidationError } from '@/lib/error-handler';

// Pure predicates live in lib/company-scope (no prisma import, so they stay
// unit-testable); re-exported here so existing callers keep working.
export { ACCESS_POLICY_MODULES, canAccessAllCompanies, companyScopeFilter } from '@/lib/company-scope';
import { ACCESS_POLICY_MODULES, canAccessAllCompanies } from '@/lib/company-scope';

export function normalizeAllowedModulesForWrite(
  actor: Pick<TokenPayload, 'role'>,
  requestedModules: string[] | undefined | null,
): string[] | undefined {
  if (!requestedModules) return undefined;

  const uniqueModules = Array.from(new Set(['CORE', ...requestedModules.filter(Boolean)]));
  if (actor.role === 'SUPER_ADMIN') {
    return uniqueModules;
  }

  return uniqueModules.filter((moduleId) => moduleId !== ACCESS_POLICY_MODULES.ALL_COMPANIES);
}

export async function getAvailableCompaniesForUser(user: Pick<TokenPayload, 'id' | 'role' | 'companyId' | 'allowedModules'>) {
  if (canAccessAllCompanies(user)) {
    return prisma.company.findMany({ orderBy: { name: 'asc' } });
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      company: true,
      companies: true,
    },
  });

  const companies = [...(fullUser?.companies || [])];
  if (fullUser?.company && !companies.some((company) => company.id === fullUser.company?.id)) {
    companies.unshift(fullUser.company);
  }

  return companies.sort((a, b) => a.name.localeCompare(b.name));
}

export async function userHasCompanyAccess(
  user: Pick<TokenPayload, 'id' | 'role' | 'companyId' | 'allowedModules'>,
  companyId: string | null | undefined,
): Promise<boolean> {
  if (!companyId) return canAccessAllCompanies(user);
  if (canAccessAllCompanies(user)) return true;
  if (user.companyId === companyId) return true;

  const linkedCompany = await prisma.user.findFirst({
    where: {
      id: user.id,
      companies: { some: { id: companyId } },
    },
    select: { id: true },
  });

  return !!linkedCompany;
}

export async function assertCompanyAccess(
  user: Pick<TokenPayload, 'id' | 'role' | 'companyId' | 'allowedModules'>,
  companyId: string | null | undefined,
  action = 'access this company',
): Promise<void> {
  const hasAccess = await userHasCompanyAccess(user, companyId);
  if (!hasAccess) {
    throw new AuthorizationError(`Forbidden: You do not have permission to ${action}`);
  }
}

type ResolveCompanyScopeOptions = {
  allowAll?: boolean;
  required?: boolean;
  fallbackToActiveCompany?: boolean;
};

export async function resolveCompanyScope(
  req: NextRequest,
  user: Pick<TokenPayload, 'id' | 'role' | 'companyId' | 'allowedModules'>,
  options: ResolveCompanyScopeOptions = {},
): Promise<string | null> {
  const {
    allowAll = false,
    required = true,
    fallbackToActiveCompany = true,
  } = options;

  const requestedCompanyId = req.nextUrl.searchParams.get('companyId');
  const targetCompanyId = requestedCompanyId || (fallbackToActiveCompany ? user.companyId : undefined);

  if (targetCompanyId === 'ALL') {
    if (!allowAll || !canAccessAllCompanies(user)) {
      throw new AuthorizationError('Forbidden: All Companies mode is not allowed for this operation');
    }
    return null;
  }

  if (!targetCompanyId) {
    if (!required) return null;
    if (canAccessAllCompanies(user)) {
      throw new ValidationError('Select a specific company or pass companyId for this operation');
    }
    throw new ValidationError('User is not associated with a company');
  }

  await assertCompanyAccess(user, targetCompanyId);
  return targetCompanyId;
}
