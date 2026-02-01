import { UserRole } from "@prisma/client"; // Assuming UserRole is available, or use string

export interface NavItem {
    name: string;
    href: string;
    icon: string;
    roles: string[];
}

export interface NavCategory {
    title: string;
    items: NavItem[];
}

export interface NavModule {
    id: string;
    name: string;
    icon: string;
    categories: NavCategory[];
}

export const ALL_MODULES: NavModule[] = [
    {
        id: 'CORE',
        name: 'Core Workspace',
        icon: '🏠',
        categories: [
            {
                title: 'Workspace',
                items: [
                    { name: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['*'] },
                    { name: 'Staff Portal', href: '/dashboard/staff-portal', icon: '🏢', roles: ['*'] },
                    { name: 'Direct Chat', href: '/dashboard/chat', icon: '💬', roles: ['*'] },
                    { name: 'Automation', href: '/dashboard/automation', icon: '⚡', roles: ['SUPER_ADMIN'] },
                ]
            },
            {
                title: 'Personal',
                items: [
                    { name: 'My Profile', href: '/dashboard/profile', icon: '👤', roles: ['*'] },
                    { name: 'App Theme', href: '/dashboard/settings/theme', icon: '🎨', roles: ['*'] },
                ]
            }
        ]
    },
    {
        id: 'HR',
        name: 'HR Management',
        icon: '👨‍💼',
        categories: [
            {
                title: 'Operations',
                items: [
                    { name: 'HR Dashboard', href: '/dashboard/hr-management', icon: '👨‍💼', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Recruitment', href: '/dashboard/recruitment', icon: '🎯', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'User Directory', href: '/dashboard/users', icon: '👥', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'] },
                    { name: 'Payroll', href: '/dashboard/hr-management/payroll', icon: '💵', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'] },
                ]
            },
            {
                title: 'Team Management',
                items: [
                    { name: 'Work Reports', href: '/dashboard/hr-management?tab=reports', icon: '📝', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'] },
                    { name: 'Leave Requests', href: '/dashboard/hr-management?tab=leaves', icon: '🏖️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'] },
                    { name: 'Attendance', icon: '🕒', href: '/dashboard/hr-management?tab=attendance', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'] },
                    { name: 'Productivity', icon: '⚡', href: '/dashboard/hr-management?tab=productivity', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'] },
                    { name: 'Monthly Performance', icon: '📊', href: '/dashboard/hr-management/performance/monthly', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Salary Increments', icon: '💰', href: '/dashboard/hr-management/increments', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Increment 360 Analysis', icon: '📉', href: '/dashboard/hr-management/increments/analytics', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Manage Team', icon: '👥', href: '/dashboard/team', roles: ['MANAGER', 'TEAM_LEADER'] },
                ]
            }
        ]
    },
    {
        id: 'STAFF_MANAGEMENT',
        name: 'Staff Management',
        icon: '👥',
        categories: [
            {
                title: 'Staff Operations',
                items: [
                    { name: 'Staff Dashboard', href: '/dashboard/staff-management', icon: '📊', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Employees', href: '/dashboard/staff-management?tab=employees', icon: '👥', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Attendance', href: '/dashboard/staff-management?tab=attendance', icon: '🕒', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Punch In/Out', href: '/dashboard/staff-management?tab=punch', icon: '⏱️', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                ]
            },
            {
                title: 'Leave & Salary',
                items: [
                    { name: 'Leave Management', href: '/dashboard/staff-management?tab=leave', icon: '🏖️', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Balance Leave', href: '/dashboard/staff-management?tab=balance-leave', icon: '📋', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Salary Management', href: '/dashboard/staff-management?tab=salary', icon: '💰', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Work Reports', href: '/dashboard/staff-management?tab=work-reports', icon: '📝', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                ]
            },
            {
                title: 'Analytics',
                items: [
                    { name: 'Staff Analytics', href: '/dashboard/staff-management?tab=analytics', icon: '📈', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'FINANCE',
        name: 'Finance & Accounts',
        icon: '💰',
        categories: [
            {
                title: 'Treasury',
                items: [
                    { name: 'Financials', href: '/dashboard/finance', icon: '📈', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Reconciliation', href: '/dashboard/finance/reconciliation', icon: '⚡', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Payments', href: '/dashboard/payments', icon: '💰', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Razorpay Rev', href: '/dashboard/analytics/razorpay', icon: '💳', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Cashflow AI', href: '/dashboard/finance/forecasting', icon: '🔮', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                ]
            },
            {
                title: 'Billing',
                items: [
                    { name: 'Increment Analysis', href: '/dashboard/finance/increments/analytics', icon: '📊', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Invoices', href: '/dashboard/invoices', icon: '🧾', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'AGENCY', 'CUSTOMER'] },
                    { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: '📋', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'AGENCY', 'CUSTOMER'] },
                ]
            }
        ]
    },
    {
        id: 'CRM',
        name: 'CRM / Customers',
        icon: '👥',
        categories: [
            {
                title: 'Customer Management',
                items: [
                    { name: 'CRM Dashboard', href: '/dashboard/crm', icon: '📊', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'All Customers', href: '/dashboard/customers', icon: '👥', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Add Customer', href: '/dashboard/customers/new', icon: '➕', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Agencies', href: '/dashboard/crm/agencies', icon: '🤝', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                    { name: 'Institutions', href: '/dashboard/institutions', icon: '🏛️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                ]
            },
            {
                title: 'Engagement',
                items: [
                    { name: 'Communications', href: '/dashboard/communications', icon: '📞', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Follow-ups', href: '/dashboard/follow-ups', icon: '📅', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                ]
            }
        ]
    },
    {
        id: 'COMPANY',
        name: 'Company',
        icon: '🏢',
        categories: [
            {
                title: 'Organization',
                items: [
                    { name: 'Company Overview', href: '/dashboard/company', icon: '🏢', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Super Admin Dashboard', href: '/dashboard/super-admin', icon: '🚀', roles: ['SUPER_ADMIN'] },
                    { name: 'Manage Companies', href: '/dashboard/companies', icon: '🌐', roles: ['SUPER_ADMIN'] },
                    { name: 'Global Setup', href: '/dashboard/companies/global-setup', icon: '🌍', roles: ['SUPER_ADMIN'] },
                    { name: 'Departments', href: '/dashboard/hr-management/departments', icon: '🏛️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Designations', href: '/dashboard/hr-management/designations', icon: '🎯', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'Analytics',
                items: [
                    { name: 'Growth Analytics', href: '/dashboard/company?tab=analytics', icon: '📊', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Workforce Insights', href: '/dashboard/company?tab=workforce', icon: '👨‍💼', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'PUBLICATION',
        name: 'Publication',
        icon: '📰',
        categories: [
            {
                title: 'Author Services',
                items: [
                    { name: 'Author Dashboard', href: '/dashboard/author', icon: '👤', roles: ['*'] },
                    { name: 'Submit Manuscript', href: '/dashboard/author/submit', icon: '✍️', roles: ['*'] },
                ]
            },
            {
                title: 'Editorial',
                items: [
                    { name: 'Production Hub', href: '/dashboard/production', icon: '🏭', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                    { name: 'Journals', href: '/dashboard/journals', icon: '📰', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR', 'CUSTOMER', 'AGENCY', 'EXECUTIVE'] },
                    { name: 'Manage Journals', href: '/dashboard/journals/manage', icon: '⚙️', roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Editorial Workflow', href: '/dashboard/editorial', icon: '✍️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                ]
            },
            {
                title: 'Manuscript Workflow',
                items: [
                    { name: 'Journal Manager', href: '/dashboard/journal-manager', icon: '📊', roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF'] },
                    { name: 'Plagiarism Check', href: '/dashboard/plagiarism', icon: '🔍', roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'PLAGIARISM_CHECKER'] },
                    { name: 'Quality Check', href: '/dashboard/quality', icon: '✅', roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'QUALITY_CHECKER'] },
                ]
            },
            {
                title: 'Content',
                items: [
                    { name: 'Articles', href: '/dashboard/articles', icon: '📄', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR', 'CUSTOMER', 'AGENCY', 'EXECUTIVE'] },
                    { name: 'Volumes & Issues', href: '/dashboard/volumes', icon: '📚', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                    { name: 'Indexing Report', href: '/dashboard/reports/indexing', icon: '📈', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                ]
            },
            {
                title: 'Reviewing',
                items: [
                    { name: 'Validate Reports', href: '/dashboard/reviews/validate', icon: '📋', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                    { name: 'Reviewer Hub', href: '/dashboard/reviewer', icon: '🛡️', roles: ['*'] },
                    { name: 'Certificates', href: '/dashboard/reviewer/certificates', icon: '🏅', roles: ['*'] },
                ]
            }
        ]
    },
    {
        id: 'LMS',
        name: 'LMS / Learning',
        icon: '🎓',
        categories: [
            {
                title: 'Management',
                items: [
                    { name: 'LMS Dashboard', href: '/dashboard/lms', icon: '📊', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Course Library', href: '/dashboard/courses', icon: '🎓', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Mentors', href: '/dashboard/lms/mentors', icon: '👨‍🏫', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Financial Report', href: '/dashboard/lms/financials', icon: '💰', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Workshops', href: '/dashboard/lms/workshops', icon: '📹', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Internships', href: '/dashboard/lms/internships', icon: '💼', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'CONFERENCE',
        name: 'Conference',
        icon: '🎤',
        categories: [
            {
                title: 'Events',
                items: [
                    { name: 'Total Conferences', href: '/dashboard/conferences', icon: '🎤', roles: ['*'] },
                ]
            }
        ]
    },
    {
        id: 'LOGISTIC',
        name: 'Logistics',
        icon: '🚚',
        categories: [
            {
                title: 'Supply Chain',
                items: [
                    { name: 'Logistics Hub', href: '/dashboard/logistics', icon: '🚚', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                    { name: 'Track Orders', href: '/dashboard/follow-ups', icon: '🗓️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                ]
            }
        ]
    },
    {
        id: 'IT',
        name: 'IT Services',
        icon: '🛠️',
        categories: [
            {
                title: 'IT Management',
                items: [
                    { name: 'IT Dashboard', href: '/dashboard/it-management', icon: '📊', roles: ['*'] },
                    { name: 'Projects', href: '/dashboard/it-management/projects', icon: '📁', roles: ['*'] },
                    { name: 'Task Board', href: '/dashboard/it-management/tasks', icon: '✅', roles: ['*'] },
                    { name: 'Revenue Analytics', href: '/dashboard/it-management/revenue', icon: '💰', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN'] },
                ]
            },
            {
                title: 'Assets',
                items: [
                    { name: 'Asset Inventory', href: '/dashboard/it-management/assets', icon: '💻', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Service Desk (Admin)', href: '/dashboard/it-management/tickets', icon: '🛠️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'User Services',
                items: [
                    { name: 'IT Support Portal', href: '/dashboard/service-desk', icon: '🎫', roles: ['*'] },
                ]
            },
            {
                title: 'System',
                items: [
                    { name: 'Data Hub', href: '/dashboard/data-hub', icon: '📂', roles: ['SUPER_ADMIN'] },
                    { name: 'Configurations', href: '/dashboard/settings/configurations', icon: '🔐', roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'System Settings', href: '/dashboard/settings', icon: '⚙️', roles: ['SUPER_ADMIN'] },
                    { name: 'System Logs', href: '/dashboard/admin/logs', icon: '📜', roles: ['SUPER_ADMIN'] },
                ]
            }
        ]
    },
    {
        id: 'WEB_MONITOR',
        name: 'Web Monitor',
        icon: '🌐',
        categories: [
            {
                title: 'Monitoring',
                items: [
                    { name: 'Overview', href: '/dashboard/monitoring', icon: '📊', roles: ['*'] },
                    { name: 'Analytics', href: '/dashboard/monitoring/analytics', icon: '📈', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Configuration', href: '/dashboard/monitoring/manage', icon: '⚙️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'QUALITY',
        name: 'Quality Control',
        icon: '🧪',
        categories: [
            {
                title: 'Insights',
                items: [
                    { name: 'Revenue Analytics', href: '/dashboard/analytics/revenue', icon: '💰', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER'] },
                    { name: 'Analytics', href: '/dashboard/analytics', icon: '📈', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'AI Predictions', href: '/dashboard/ai-insights', icon: '🤖', roles: ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'AGENCY'] },
                    { name: 'Support Tickets', href: '/dashboard/tickets', icon: '🎫', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'CUSTOMER'] },
                    { name: 'Institutions', href: '/dashboard/institutions', icon: '🏛️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Customers', href: '/dashboard/customers', icon: '🙍‍♂️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                ]
            },
            {
                title: 'Revenue Management',
                items: [
                    { name: 'Income Registry', href: '/dashboard/revenue/transactions', icon: '🏦', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN', 'TEAM_LEADER', 'EXECUTIVE', 'HR', 'IT_MANAGER', 'IT_ADMIN'] },
                    { name: 'Verify Claims', href: '/dashboard/revenue/claims', icon: '⚖️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'FINANCE_ADMIN'] },
                ]
            }
        ]
    }
];

export function getNavigationModules(role: string, allowedModules: string[] = ['CORE']) {
    const isSuperAdmin = role === 'SUPER_ADMIN';

    return ALL_MODULES
        .filter(mod => isSuperAdmin || allowedModules.includes(mod.id))
        .map(mod => ({
            ...mod,
            categories: mod.categories
                .map(cat => ({
                    ...cat,
                    items: cat.items.filter(item => item.roles.includes('*') || item.roles.includes(role))
                }))
                .filter(cat => cat.items.length > 0)
        }))
        .filter(mod => mod.categories.length > 0);
}
