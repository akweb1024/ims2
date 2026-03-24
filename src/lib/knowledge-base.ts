export const KNOWLEDGE_BASE_CATEGORIES = [
    { value: 'FAQ', label: 'FAQ' },
    { value: 'SOP', label: 'SOP' },
    { value: 'Product Guide', label: 'Product Guide' },
    { value: 'Internal Policy', label: 'Internal Policy' },
    { value: 'PRODUCT_CATALOGUE', label: 'Product Catalogue' },
] as const;

export const KNOWLEDGE_BASE_LIBRARY_TABS = [
    { value: 'MY WORK', label: 'MY WORK' },
    { value: 'ALL', label: 'ALL' },
    ...KNOWLEDGE_BASE_CATEGORIES,
] as const;

export const getKnowledgeCategoryLabel = (category?: string | null) => {
    if (!category) return 'Uncategorized';
    return KNOWLEDGE_BASE_CATEGORIES.find((item) => item.value === category)?.label || category;
};

type RoleGuideDefinition = {
    title: string;
    subtitle: string;
    sections: { title: string; content: string }[];
};

export const ROLE_GUIDE_ARTICLE_CATEGORY = 'ROLE_GUIDE';

export const ROLE_GUIDE_ARTICLES: Record<string, RoleGuideDefinition> = {
    SUPER_ADMIN: {
        title: 'Super Admin Dashboard Guide',
        subtitle: 'Full control over the entire multi-tenant system.',
        sections: [
            { title: 'Managing Companies', content: 'Navigate to Operations > Companies to onboard new client organizations, manage subscription limits, and oversee admin users.' },
            { title: 'User Management', content: 'Use the user directory to invite staff, assign roles, and troubleshoot access issues when needed.' },
            { title: 'System Logs and Data', content: 'Monitor system logs for issues and use the data hub for controlled import and export work.' },
        ],
    },
    ADMIN: {
        title: 'Company Admin Guide',
        subtitle: "Manage your organization's resources and operations.",
        sections: [
            { title: 'Staff Management', content: 'Invite managers and team leaders through the user directory and keep reporting lines accurate.' },
            { title: 'Financial Oversight', content: 'Track invoices and revenue dashboards regularly so payment reconciliation stays current.' },
            { title: 'HR Configuration', content: 'Keep holidays, designations, and jobs configured properly under HR Management.' },
        ],
    },
    MANAGER: {
        title: 'Manager Operational Guide',
        subtitle: 'Oversee team performance and approval workflows.',
        sections: [
            { title: 'HR Approvals', content: 'Review leave requests and attendance corrections daily so staff workflows do not get blocked.' },
            { title: 'Performance Monitoring', content: 'Validate work reports and use productivity views to spot wins and issues early.' },
            { title: 'Recruitment', content: 'Manage hiring pipelines, active job posts, and interview coordination from Recruitment.' },
        ],
    },
    TEAM_LEADER: {
        title: 'Team Leader Guide',
        subtitle: 'Guide your team efficiently and keep work moving.',
        sections: [
            { title: 'Task Distribution', content: 'Keep an eye on team work reports and make sure delivery stays aligned with expectations.' },
            { title: 'Customer Assignment', content: 'Track customer and follow-up ownership so no active lead is left without attention.' },
        ],
    },
    EXECUTIVE: {
        title: 'Executive Handbook',
        subtitle: 'Manage customers and drive subscriptions.',
        sections: [
            { title: 'Customer Management', content: 'Add and maintain agencies, institutions, and customer records with accurate contact details.' },
            { title: 'Follow Ups', content: 'Review your daily follow-up queue and close the loop on pending calls and emails.' },
            { title: 'Creating Subscriptions', content: 'Open the customer profile, create a subscription, and generate the invoice or payment link from there.' },
        ],
    },
    AGENCY: {
        title: 'Agency Portal Guide',
        subtitle: 'Manage your subscriptions, invoices, and claims.',
        sections: [
            { title: 'Track Orders', content: 'Use subscriptions and logistics views to monitor active orders and dispatch status.' },
            { title: 'Payments', content: 'Check invoices and payment history regularly to stay ahead of outstanding balances.' },
        ],
    },
    INSTITUTION: {
        title: 'Institution Portal Guide',
        subtitle: 'Access your subscriptions and support from one place.',
        sections: [
            { title: 'Journal Access', content: 'Open the journals area to see subscribed content and the related dispatch information.' },
            { title: 'Support', content: 'Raise support tickets whenever you hit delivery, access, or service issues.' },
        ],
    },
    CUSTOMER: {
        title: 'Customer Dashboard Guide',
        subtitle: 'Welcome to your personal dashboard.',
        sections: [
            { title: 'My Subscriptions', content: 'Review your active subscriptions and keep track of upcoming validity dates.' },
            { title: 'Invoices', content: 'Download tax invoices directly from the invoices area whenever needed.' },
            { title: 'Tracking', content: 'Follow physical shipment status from the logistics view.' },
        ],
    },
};

export const buildRoleGuideMarkdown = (role: string) => {
    const guide = ROLE_GUIDE_ARTICLES[role] || ROLE_GUIDE_ARTICLES.CUSTOMER;
    const sections = guide.sections
        .map((section, index) => `## ${index + 1}. ${section.title}\n\n${section.content}`)
        .join('\n\n');

    return `${guide.subtitle}\n\n${sections}\n\n> Need specific help? Contact the system administrator or raise a support ticket.`;
};
