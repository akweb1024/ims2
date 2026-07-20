// Login personas: the "Sign in as…" tiles on the login page. A persona is a
// UX grouping over existing UserRole values — it never grants access; after
// credentials are verified the account's real role must belong to the chosen
// persona or the login is rejected client-side before a session is created.

export interface LoginPersona {
    id: string;
    label: string;
    description: string;
    roles: string[];
    landing: string;
}

export const LOGIN_PERSONAS: LoginPersona[] = [
    {
        id: 'super-admin',
        label: 'Super Admin',
        description: 'Group-wide control and oversight',
        roles: ['SUPER_ADMIN'],
        landing: '/dashboard/super-admin',
    },
    {
        id: 'admin',
        label: 'Admin',
        description: 'Company administration',
        roles: ['ADMIN'],
        landing: '/dashboard',
    },
    {
        id: 'employee',
        label: 'Employee',
        description: 'Staff portal, tasks and performance',
        roles: [
            'MANAGER',
            'TEAM_LEADER',
            'EXECUTIVE',
            'EDITOR',
            'JOURNAL_MANAGER',
            'PLAGIARISM_CHECKER',
            'QUALITY_CHECKER',
            'EDITOR_IN_CHIEF',
            'SECTION_EDITOR',
            'REVIEWER',
            'IT_MANAGER',
            'IT_ADMIN',
        ],
        landing: '/dashboard/staff-portal',
    },
    {
        id: 'hr',
        label: 'HR',
        description: 'People, payroll and recruitment',
        roles: ['HR', 'HR_MANAGER'],
        landing: '/dashboard/hr-management',
    },
    {
        id: 'accounts',
        label: 'Accounts',
        description: 'Finance, invoices and payments',
        roles: ['FINANCE_ADMIN'],
        landing: '/dashboard/finance',
    },
    {
        id: 'customer',
        label: 'Customer / Partner',
        description: 'Customer and agency portal',
        roles: ['CUSTOMER', 'AGENCY'],
        landing: '/dashboard',
    },
];

export const getPersonaById = (id: string | null | undefined): LoginPersona | undefined =>
    LOGIN_PERSONAS.find((p) => p.id === id);

export const personaForRole = (role: string): LoginPersona | undefined =>
    LOGIN_PERSONAS.find((p) => p.roles.includes(role));
