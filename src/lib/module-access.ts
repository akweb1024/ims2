import { TokenPayload } from '@/lib/auth-core';

const DEFAULT_MODULES_BY_ROLE: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    ADMIN: ['CORE', 'MANAGEMENT', 'HR', 'FINANCE', 'CRM', 'COMPANY', 'PUBLICATION', 'LMS', 'IT', 'WEB_MONITOR', 'QUALITY', 'STAFF_MANAGEMENT'],
    MANAGER: ['CORE', 'MANAGEMENT', 'CRM', 'HR', 'PUBLICATION', 'IT', 'QUALITY'],
    TEAM_LEADER: ['CORE', 'MANAGEMENT', 'CRM', 'HR', 'IT', 'QUALITY'],
    FINANCE_ADMIN: ['CORE', 'FINANCE', 'QUALITY', 'HR'],
    HR_MANAGER: ['CORE', 'HR', 'STAFF_MANAGEMENT', 'LMS', 'QUALITY'],
    EXECUTIVE: ['CORE', 'CRM', 'PUBLICATION', 'QUALITY', 'LOGISTIC'],
    EMPLOYEE: ['CORE', 'IT'],
    IT_MANAGER: ['CORE', 'IT', 'QUALITY'],
    IT_ADMIN: ['CORE', 'IT', 'QUALITY'],
    IT_SUPPORT: ['CORE', 'IT'],
};

const SENSITIVE_MODULE_ROUTES: Array<{ prefix: string; moduleId: string }> = [
    { prefix: '/api/companies', moduleId: 'COMPANY' },
    { prefix: '/api/finance', moduleId: 'FINANCE' },
    { prefix: '/api/payments', moduleId: 'FINANCE' },
    { prefix: '/api/revenue', moduleId: 'FINANCE' },
    { prefix: '/api/proforma', moduleId: 'FINANCE' },
    { prefix: '/api/hr', moduleId: 'HR' },
    { prefix: '/api/staff-management', moduleId: 'HR' },
    { prefix: '/api/recruitment', moduleId: 'HR' },
];

const MODULE_ACCESS_EXACT_ROUTE_EXCEPTIONS = new Set([
    // HR self-service endpoints used by staff portal
    '/api/hr/profile',
    '/api/hr/profile/me',
    '/api/hr/profile/upload-photo',
    '/api/hr/attendance',
    '/api/hr/work-reports',
    '/api/hr/work-reports/comments',
    '/api/hr/leave-requests',
    '/api/hr/salary-slips',
    '/api/hr/performance',
    '/api/hr/performance/kra-kpi-overview',
    '/api/hr/performance/monthly',
    '/api/hr/performance/kpis',
    '/api/hr/performance/goals',
    '/api/hr/performance/insights',
    '/api/hr/my-documents',
    '/api/hr/onboarding/compliance',
    '/api/hr/onboarding/progress',
    '/api/hr/tasks',
    '/api/hr/reimbursements',
    '/api/hr/documents/my-digital',
]);

const MODULE_ACCESS_PREFIX_EXCEPTIONS = [
    // Executive/employee finance-facing endpoints with explicit route-level role checks
    '/api/proforma',
    '/api/revenue/transactions',
    '/api/revenue/claims',
    // Employee self-service record endpoints
    '/api/hr/salary-slips',
    '/api/hr/tasks',
    '/api/hr/work-reports',
];

export const hasModuleAccess = (user: TokenPayload, moduleId: string): boolean => {
    if (user.role === 'SUPER_ADMIN') return true;

    const explicitModules = user.allowedModules || [];
    if (explicitModules.includes('*') || explicitModules.includes(moduleId)) return true;

    const roleModules = DEFAULT_MODULES_BY_ROLE[user.role] || ['CORE', 'IT'];
    if (roleModules.includes('*') || roleModules.includes(moduleId)) return true;

    return false;
};

export const getRequiredSensitiveModule = (pathname: string): string | null => {
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    if (MODULE_ACCESS_EXACT_ROUTE_EXCEPTIONS.has(normalizedPath)) {
        return null;
    }

    const isPrefixException = MODULE_ACCESS_PREFIX_EXCEPTIONS.some((prefix) =>
        normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
    );
    if (isPrefixException) {
        return null;
    }

    const matched = SENSITIVE_MODULE_ROUTES.find((entry) => normalizedPath.startsWith(entry.prefix));
    return matched?.moduleId || null;
};
