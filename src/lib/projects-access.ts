/**
 * Who may see and change Company Projects (the business `Project` model — not
 * `ITProject`, which is the separate IT service-delivery system under /it-management).
 *
 * Read is open to every internal role: an employee should be able to find what their
 * company is working on, and Think Tank converts approved ideas straight into these, so
 * the participants need somewhere to look afterwards. External accounts (CUSTOMER,
 * AGENCY, REVIEWER) are deliberately absent — internal work is not theirs to see.
 *
 * Keep in step with the "Company Projects" entry in src/config/navigation.ts; a role that
 * can see the link but not call the API gets an empty page and files a bug.
 */
export const PROJECT_VIEWER_ROLES = [
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
    'EDITOR',
    'EDITOR_IN_CHIEF',
    'JOURNAL_MANAGER',
];

/** Create / edit / delete a project. Reading is open; changing is not. */
export const PROJECT_EDITOR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
