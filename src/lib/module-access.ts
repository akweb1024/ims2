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

export const hasModuleAccess = (user: TokenPayload, moduleId: string): boolean => {
    if (user.role === 'SUPER_ADMIN') return true;

    const explicitModules = user.allowedModules || [];
    if (explicitModules.includes('*') || explicitModules.includes(moduleId)) return true;

    const roleModules = DEFAULT_MODULES_BY_ROLE[user.role] || ['CORE', 'IT'];
    if (roleModules.includes('*') || roleModules.includes(moduleId)) return true;

    return false;
};

export const getRequiredSensitiveModule = (pathname: string): string | null => {
    const matched = SENSITIVE_MODULE_ROUTES.find((entry) => pathname.startsWith(entry.prefix));
    return matched?.moduleId || null;
};
