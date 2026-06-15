export const CRM_WORKER_ROLES = [
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'TEAM_LEADER',
    'EXECUTIVE',
    'FINANCE_ADMIN',
    'HR_MANAGER',
    'HR',
    'EMPLOYEE',
] as const;

export const CRM_CUSTOMER_EDITOR_ROLES = new Set<string>(CRM_WORKER_ROLES);
export const CRM_COMMUNICATION_ROLES = new Set<string>(CRM_WORKER_ROLES);
export const CRM_INVOICE_ROLES = new Set<string>(CRM_WORKER_ROLES);
export const CRM_PROFORMA_ROLES = new Set<string>(CRM_WORKER_ROLES);

export const canAccessCrmWorkflow = (role?: string | null) => {
    return CRM_CUSTOMER_EDITOR_ROLES.has(role || '');
};
