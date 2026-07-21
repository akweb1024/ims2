import type { LucideIcon } from "lucide-react";
import {
    LineChart,
    AlertTriangle,
    Award,
    Banknote,
    BarChart3,
    BookOpen,
    Bot,
    Briefcase,
    Building2,
    Calendar,
    CalendarDays,
    CheckSquare,
    ClipboardList,
    Clock,
    Compass,
    Contact,
    CreditCard,
    Factory,
    File,
    FileText,
    Folder,
    FolderOpen,
    Folders,
    Globe,
    GraduationCap,
    Home,
    Inbox,
    KeyRound,
    Landmark,
    Laptop,
    Layers,
    Lightbulb,
    Lock,
    MessageSquare,
    Mic,
    Newspaper,
    Package,
    Palette,
    Palmtree,
    PenLine,
    Phone,
    Plug,
    Plus,
    Presentation,
    Puzzle,
    Receipt,
    Rocket,
    Scale,
    Search,
    Settings,
    Shield,
    Sparkles,
    Store,
    Target,
    Ticket,
    TicketPercent,
    TrendingDown,
    TrendingUp,
    Truck,
    User,
    UserCog,
    Users,
    Video,
    Wallet,
    Wrench,
    Zap
} from "lucide-react";

export interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    roles: string[];
    /**
     * Per-tenant feature licence. When set, the item renders only if the user's
     * allowedModules contains this id (or '*', or the user is SUPER_ADMIN).
     * This is what makes a feature sellable per-tenant without giving it its
     * own sidebar module. Matches the server-side checks (e.g. the monitoring
     * APIs require allowedModules to contain WEB_MONITOR).
     */
    licence?: string;
}

export interface NavCategory {
    title: string;
    items: NavItem[];
}

export interface NavModule {
    id: string;
    name: string;
    icon: LucideIcon;
    categories: NavCategory[];
}

// Every staff role. Used for internal work surfaces that external accounts
// (CUSTOMER, AGENCY, REVIEWER) must not see. Items marked ['*'] instead are
// genuinely universal — they render for external accounts too.
const INTERNAL = [
    'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'EMPLOYEE',
    'FINANCE_ADMIN', 'HR_MANAGER', 'HR', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT',
    'EDITOR', 'EDITOR_IN_CHIEF', 'SECTION_EDITOR', 'JOURNAL_MANAGER',
    'PLAGIARISM_CHECKER', 'QUALITY_CHECKER',
];

export const ALL_MODULES: NavModule[] = [
    {
        id: 'CORE',
        name: 'My Work',
        icon: Home,
        categories: [
            {
                title: 'Today',
                items: [
                    { name: 'Dashboard', href: '/dashboard', icon: BarChart3, roles: ['*'] },
                    { name: 'Submit Daily Report', href: '/dashboard/staff-portal/submit-report', icon: PenLine, roles: INTERNAL },
                    { name: 'My IT Tasks', href: '/dashboard/my-tasks', icon: ClipboardList, roles: INTERNAL },
                    { name: 'My To-Dos', href: '/dashboard/tasks', icon: CheckSquare, roles: INTERNAL },
                    { name: 'My Performance', href: '/dashboard/my-performance', icon: TrendingUp, roles: INTERNAL },
                    { name: 'My Publication Workload', href: '/dashboard/my-publication-workload', icon: Newspaper, roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF'] },
                    { name: 'Get IT Help', href: '/dashboard/service-desk', icon: Ticket, roles: INTERNAL },
                ]
            },
            {
                title: 'Me',
                items: [
                    { name: 'My HR Portal', href: '/dashboard/staff-portal', icon: Building2, roles: ['*'] },
                    { name: 'My Profile', href: '/dashboard/profile', icon: User, roles: ['*'] },
                    { name: 'My Learning', href: '/dashboard/my-learning', icon: GraduationCap, roles: INTERNAL },
                    { name: 'My Commission', href: '/dashboard/commission', icon: Wallet, roles: ['AGENCY'] },
                    { name: 'Password Vault', href: '/dashboard/vault', icon: Lock, roles: ['*'] },
                    { name: 'App Theme', href: '/dashboard/settings/theme', icon: Palette, roles: ['*'] },
                ]
            },
            {
                title: 'Shared',
                items: [
                    { name: 'Direct Chat', href: '/dashboard/chat', icon: MessageSquare, roles: ['*'] },
                    { name: 'File Manager', href: '/dashboard/files', icon: Folders, roles: ['*'] },
                    { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen, roles: ['*'] },
                    { name: 'Company Projects', href: '/dashboard/projects', icon: Folder, roles: INTERNAL },
                    { name: 'Think Tank', href: '/dashboard/think-tank', icon: Lightbulb, roles: INTERNAL },
                    { name: 'Problems', href: '/dashboard/problems', icon: AlertTriangle, roles: INTERNAL },
                ]
            }
        ]
    },
    {
        id: 'TEAM',
        name: 'Team & Performance',
        icon: Briefcase,
        categories: [
            {
                title: 'Review',
                items: [
                    { name: 'Review Inbox', href: '/dashboard/review-inbox', icon: Inbox, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'] },
                ]
            },
            {
                title: 'My Team',
                items: [
                    { name: 'Team Members', href: '/dashboard/manager/team', icon: Users, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Team Attendance', href: '/dashboard/manager/team/attendance', icon: Clock, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Team Leave Requests', href: '/dashboard/manager/team/leaves', icon: Palmtree, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Team Work Report History', href: '/dashboard/manager/team/work-reports', icon: FileText, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Team Salary & Increments', href: '/dashboard/manager/team/salary', icon: Wallet, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                ]
            },
            {
                title: 'Performance',
                items: [
                    { name: 'Performance Workspace', href: '/dashboard/performance/workspace', icon: Target, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Assign KRA', href: '/dashboard/performance/assign', icon: Target, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'] },
                    { name: 'Team KRA Analytics', href: '/dashboard/performance/team', icon: BarChart3, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'] },
                    { name: 'Team KPI Overview', href: '/dashboard/manager/team/performance', icon: BarChart3, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Goal Appraisals', href: '/dashboard/performance/goals', icon: Award, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Performance Observatory', href: '/dashboard/performance-observability', icon: Compass, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_ADMIN'] },
                    { name: 'Workspace Guide', href: '/dashboard/performance/workspace/help', icon: BookOpen, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'TEAM_LEADER'] },
                ]
            },
            {
                title: 'Reports',
                items: [
                    { name: 'Increment Report', href: '/dashboard/reports/increments', icon: TrendingUp, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Target Achievement', href: '/dashboard/reports/targets', icon: Target, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Top Performers', href: '/dashboard/reports/performance', icon: Award, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                ]
            }
        ]
    },
    {
        id: 'HR',
        name: 'People',
        icon: UserCog,
        categories: [
            {
                title: 'Employees',
                items: [
                    { name: 'HR Command Center', href: '/dashboard/hr-management', icon: UserCog, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'] },
                    { name: 'Add Employee', href: '/dashboard/hr-management/employees/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'] },
                    { name: 'Onboarding Workflow', href: '/dashboard/hr-management/employees/workflow', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'] },
                    { name: 'Onboarding Guide', href: '/dashboard/hr-management/onboarding/help', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'] },
                    { name: 'User Accounts', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER'] },
                    { name: 'Transfer Employee', href: '/dashboard/users/transfer', icon: Contact, roles: ['SUPER_ADMIN', 'ADMIN'] },
                ]
            },
            {
                title: 'Attendance & Leave',
                items: [
                    { name: 'Attendance (Company)', href: '/dashboard/hr-management?tab=attendance', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'] },
                    { name: 'Leave Administration', href: '/dashboard/hr-management?tab=leaves', icon: Palmtree, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'] },
                    { name: 'Work Reports (Company)', href: '/dashboard/hr-management?tab=reports', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'] },
                ]
            },
            {
                title: 'Pay & Grades',
                items: [
                    { name: 'Payroll', href: '/dashboard/hr-management/payroll', icon: Banknote, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN', 'HR_MANAGER'] },
                    { name: 'Reimbursements', href: '/dashboard/hr-management?tab=reimbursements', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'FINANCE_ADMIN'] },
                    { name: 'Salary Increments', href: '/dashboard/hr-management/increments', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'New Increment', href: '/dashboard/hr-management/increments/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Increment Advisor', href: '/dashboard/hr-management/increments/recommend', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER'] },
                    { name: 'Increment Analytics (HR)', href: '/dashboard/hr-management/increments/analytics', icon: TrendingDown, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Increment Guide', href: '/dashboard/hr-management/increments/help', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER'] },
                    { name: 'Job Grades', href: '/dashboard/hr-management/grades', icon: Layers, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Grade Mapping', href: '/dashboard/hr-management/grade-mapping', icon: Folders, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Salary Fitment', href: '/dashboard/hr-management/fitment', icon: Scale, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'] },
                ]
            },
            {
                title: 'Hiring',
                items: [
                    { name: 'Recruitment Hub', href: '/dashboard/recruitment', icon: Target, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'] },
                ]
            },
            {
                title: 'HR Analytics',
                items: [
                    { name: 'Productivity Snapshot', href: '/dashboard/hr-management?tab=productivity', icon: Zap, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'] },
                    { name: 'Productivity Deep Dive', href: '/dashboard/hr-management/productivity', icon: LineChart, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Employee Performance 360', href: '/dashboard/hr-management/performance/employee-360', icon: Compass, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'TEAM_LEADER'] },
                    { name: 'Monthly Snapshots', href: '/dashboard/hr-management/performance/monthly', icon: CalendarDays, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER'] },
                    { name: 'KRA Admin Console', href: '/dashboard/hr-management/kra', icon: Target, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'TEAM_LEADER'] },
                ]
            }
        ]
    },
    {
        id: 'CRM',
        name: 'Customers',
        icon: Users,
        categories: [
            {
                title: 'Accounts',
                items: [
                    { name: 'Customers', href: '/dashboard/customers', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Add Customer', href: '/dashboard/customers/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Agencies', href: '/dashboard/crm/partners?tab=agencies', icon: Landmark, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                    { name: 'Add Agency', href: '/dashboard/crm/agencies/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                    { name: 'Institutions', href: '/dashboard/crm/partners?tab=institutions', icon: GraduationCap, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                    { name: 'Add Institution', href: '/dashboard/institutions/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                    { name: 'Customer Job Titles', href: '/dashboard/crm/designations', icon: Contact, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'Pipeline',
                items: [
                    { name: 'Leads', href: '/dashboard/crm/leads', icon: Rocket, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Deals', href: '/dashboard/crm/deals', icon: Briefcase, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Customer Health & Churn', href: '/dashboard/crm/insights', icon: LineChart, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'Engagement',
                items: [
                    { name: 'Communications Log', href: '/dashboard/communications', icon: Phone, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Bulk Broadcast', href: '/dashboard/communications/bulk', icon: Mic, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Follow-ups', href: '/dashboard/follow-ups', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Campaigns', href: '/dashboard/crm/campaigns', icon: Rocket, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'Billing',
                items: [
                    { name: 'Customer Invoices', href: '/dashboard/crm/invoices', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'AGENCY', 'CUSTOMER'] },
                    { name: 'New Invoice', href: '/dashboard/crm/invoices/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'] },
                    { name: 'Subscriptions', href: '/dashboard/crm/subscriptions', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'AGENCY', 'CUSTOMER'] },
                    { name: 'New Subscription', href: '/dashboard/crm/subscriptions/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'] },
                    { name: 'Product Catalogue', href: '/dashboard/crm/invoice-products', icon: Folders, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'] },
                    { name: 'Product Attributes', href: '/dashboard/crm/invoice-products/attributes', icon: Layers, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Coupons', href: '/dashboard/coupons', icon: TicketPercent, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'Support',
                items: [
                    { name: 'Support Tickets', href: '/dashboard/tickets', icon: Ticket, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'CUSTOMER'] },
                    { name: 'New Ticket', href: '/dashboard/tickets/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                ]
            }
        ]
    },
    {
        id: 'FINANCE',
        name: 'Money',
        icon: Wallet,
        categories: [
            {
                title: 'Overview',
                items: [
                    { name: 'Finance Control Tower', href: '/dashboard/finance', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Business Analytics', href: '/dashboard/analytics', icon: LineChart, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'AI Predictions', href: '/dashboard/ai-insights', icon: Bot, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'AGENCY'] },
                    { name: 'AI Strategy Consultant', href: '/dashboard/ai-consultant', icon: Sparkles, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Cashflow Forecast', href: '/dashboard/finance/forecasting', icon: Sparkles, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Bank Reconciliation', href: '/dashboard/finance/reconciliation', icon: Scale, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                ]
            },
            {
                title: 'Accounting',
                items: [
                    { name: 'Chart of Accounts', href: '/dashboard/finance/coa', icon: Layers, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Journal Entries', href: '/dashboard/finance/journal', icon: PenLine, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'New Journal Entry', href: '/dashboard/finance/journal/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'General Ledger', href: '/dashboard/finance/ledger', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'P&L / Balance Sheet', href: '/dashboard/finance/reports', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'Payments',
                items: [
                    { name: 'Payment Ledger (All)', href: '/dashboard/payments', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Razorpay Tracker', href: '/dashboard/analytics/razorpay', icon: CreditCard, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Company Transactions', href: '/dashboard/payments/by-company', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'EMPLOYEE'] },
                ]
            },
            {
                title: 'Revenue',
                items: [
                    { name: 'Income Registry', href: '/dashboard/revenue/transactions', icon: Landmark, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN', 'TEAM_LEADER', 'EXECUTIVE', 'HR', 'IT_MANAGER', 'IT_ADMIN'] },
                    { name: 'Verify Claims', href: '/dashboard/revenue/claims', icon: Scale, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'FINANCE_ADMIN'] },
                    { name: 'Revenue Attribution', href: '/dashboard/analytics/revenue', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER'] },
                    { name: 'Revenue by Category', href: '/dashboard/reports/revenue', icon: Landmark, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Commission Payouts', href: '/dashboard/finance/payouts', icon: Banknote, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Revenue Share Rules', href: '/dashboard/settings/revenue-share', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                ]
            },
            {
                title: 'Payroll Cost',
                items: [
                    { name: 'Salary Budget 360', href: '/dashboard/finance/increments/analytics', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                ]
            }
        ]
    },
    {
        id: 'PUBLISHING',
        name: 'Publishing',
        icon: Newspaper,
        categories: [
            {
                title: 'Author',
                items: [
                    { name: 'Author Dashboard', href: '/dashboard/author', icon: User, roles: ['*'] },
                    { name: 'Submit Manuscript', href: '/dashboard/author/submit', icon: PenLine, roles: ['*'] },
                ]
            },
            {
                title: 'Editorial',
                items: [
                    { name: 'Editorial Workflow', href: '/dashboard/editorial', icon: PenLine, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                    { name: 'Production Hub', href: '/dashboard/production', icon: Factory, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                    { name: 'Production Stages', href: '/dashboard/journal-manager', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF'] },
                    { name: 'Plagiarism Check', href: '/dashboard/plagiarism', icon: Search, roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'PLAGIARISM_CHECKER'] },
                    { name: 'Quality Check', href: '/dashboard/quality', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'QUALITY_CHECKER'] },
                ]
            },
            {
                title: 'Journals',
                items: [
                    { name: 'Journal Catalog', href: '/dashboard/journals', icon: Newspaper, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR', 'CUSTOMER', 'AGENCY', 'EXECUTIVE'] },
                    { name: 'New Journal', href: '/dashboard/journals/new', icon: Plus, roles: ['SUPER_ADMIN'] },
                    { name: 'Assign Journal Managers', href: '/dashboard/journals/manage', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Articles Repository', href: '/dashboard/articles', icon: File, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR', 'CUSTOMER', 'AGENCY', 'EXECUTIVE'] },
                    { name: 'Indexing Report', href: '/dashboard/reports/indexing', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                ]
            },
            {
                title: 'Peer Review',
                items: [
                    { name: 'Reviewer Hub', href: '/dashboard/reviewer', icon: Shield, roles: ['*'] },
                    { name: 'Validate Reports', href: '/dashboard/reviews/validate', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                    { name: 'My Certificates', href: '/dashboard/reviewer/certificates', icon: Award, roles: ['*'] },
                ]
            },
            {
                title: 'Conferences',
                items: [
                    { name: 'Conference Hub', href: '/dashboard/conferences', icon: Mic, roles: ['*'], licence: 'CONFERENCE' },
                    { name: 'All Conferences', href: '/dashboard/conferences/all', icon: CalendarDays, roles: ['*'], licence: 'CONFERENCE' },
                    { name: 'Conference Follow-ups', href: '/dashboard/conferences/followups', icon: Calendar, roles: ['*'], licence: 'CONFERENCE' },
                ]
            }
        ]
    },
    {
        id: 'LMS',
        name: 'Learning',
        icon: GraduationCap,
        categories: [
            {
                title: 'Programs',
                items: [
                    { name: 'LMS Dashboard', href: '/dashboard/lms', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Course Library', href: '/dashboard/courses', icon: GraduationCap, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Workshops', href: '/dashboard/lms/workshops', icon: Video, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Internships', href: '/dashboard/lms/internships', icon: Briefcase, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Mentors', href: '/dashboard/lms/mentors', icon: Presentation, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Participants', href: '/dashboard/lms/participants', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                ]
            },
            {
                title: 'LMS Money',
                items: [
                    { name: 'LMS Invoices', href: '/dashboard/lms/invoice', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'LMS Financials', href: '/dashboard/lms/financials', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'OPS',
        name: 'Operations',
        icon: Wrench,
        categories: [
            {
                title: 'IT Delivery',
                items: [
                    { name: 'IT Dashboard', href: '/dashboard/it-management', icon: BarChart3, roles: INTERNAL },
                    { name: 'IT Projects', href: '/dashboard/it-management/projects', icon: Folder, roles: INTERNAL },
                    { name: 'IT Task Board', href: '/dashboard/it-management/tasks', icon: CheckSquare, roles: INTERNAL },
                    { name: 'Task Guidelines', href: '/dashboard/it-management/tasks/guidelines', icon: BookOpen, roles: INTERNAL },
                    { name: 'IT Revenue', href: '/dashboard/it-management/revenue', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN'] },
                    { name: 'IT Team Performance', href: '/dashboard/it-management/performance', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN'] },
                ]
            },
            {
                title: 'IT Support',
                items: [
                    { name: 'Service Desk (Admin)', href: '/dashboard/it-management/tickets', icon: Wrench, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Service Catalog', href: '/dashboard/it-management/services', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'] },
                    { name: 'Asset Inventory', href: '/dashboard/it-management/assets', icon: Laptop, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'Web Monitoring',
                items: [
                    // The monitoring APIs 403 anyone whose allowedModules lacks WEB_MONITOR
                    // (see /api/it/monitoring/*), so the licence mirrors real enforcement.
                    { name: 'Monitor Status', href: '/dashboard/monitoring', icon: BarChart3, roles: ['*'], licence: 'WEB_MONITOR' },
                    { name: 'Uptime Analytics', href: '/dashboard/monitoring/analytics', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'], licence: 'WEB_MONITOR' },
                    { name: 'Monitor Configuration', href: '/dashboard/monitoring/manage', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'], licence: 'WEB_MONITOR' },
                    { name: 'Check Logs', href: '/dashboard/monitoring/logs', icon: FileText, roles: ['*'], licence: 'WEB_MONITOR' },
                ]
            },
            {
                title: 'Supply Chain',
                items: [
                    { name: 'Vendors', href: '/dashboard/supply-chain/vendors', icon: Store, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Purchase Orders', href: '/dashboard/supply-chain/purchase-orders', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'] },
                    { name: 'Inventory Ledger', href: '/dashboard/logistics/inventory', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                    { name: 'Shipment Hub', href: '/dashboard/logistics', icon: Truck, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                ]
            },
            {
                title: 'Live Ops',
                items: [
                    { name: 'Digital Twin', href: '/dashboard/digital-twin', icon: Globe, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'ADMIN',
        name: 'Admin',
        icon: Building2,
        categories: [
            {
                title: 'Organization',
                items: [
                    { name: 'MD Control Center', href: '/dashboard/overview', icon: Compass, roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Company Overview', href: '/dashboard/company', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Workforce Insights', href: '/dashboard/company?tab=workforce', icon: UserCog, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Departments', href: '/dashboard/hr-management/departments', icon: Landmark, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Designations', href: '/dashboard/hr-management/designations', icon: Target, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Manage Companies', href: '/dashboard/companies', icon: Globe, roles: ['SUPER_ADMIN'] },
                    { name: 'Global Setup', href: '/dashboard/companies/global-setup', icon: Globe, roles: ['SUPER_ADMIN'] },
                ]
            },
            {
                title: 'System',
                items: [
                    { name: 'System Settings', href: '/dashboard/settings', icon: Settings, roles: ['SUPER_ADMIN'] },
                    { name: 'Configurations', href: '/dashboard/settings/configurations', icon: KeyRound, roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Integrations', href: '/dashboard/settings/integrations', icon: Plug, roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Email Logs', href: '/dashboard/settings/email-logs', icon: Inbox, roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Data Hub', href: '/dashboard/data-hub', icon: FolderOpen, roles: ['SUPER_ADMIN'] },
                ]
            },
            {
                title: 'Automation',
                items: [
                    { name: 'Scheduled Jobs', href: '/dashboard/automation', icon: Zap, roles: ['SUPER_ADMIN'] },
                    { name: 'Form Automation', href: '/dashboard/automation/forms', icon: Puzzle, roles: ['SUPER_ADMIN'] },
                    { name: 'Sentinel Rules', href: '/dashboard/sentinel/automation', icon: Shield, roles: ['SUPER_ADMIN', 'ADMIN'] },
                ]
            },
            {
                title: 'Super Admin',
                items: [
                    { name: 'Super Admin Dashboard', href: '/dashboard/super-admin', icon: Rocket, roles: ['SUPER_ADMIN'] },
                    { name: 'Group Financials', href: '/dashboard/super-admin/financials', icon: Landmark, roles: ['SUPER_ADMIN'] },
                    { name: 'Access Policy', href: '/dashboard/super-admin/access-policy', icon: Shield, roles: ['SUPER_ADMIN'] },
                    { name: 'Audit Logs', href: '/dashboard/super-admin/audit-logs', icon: FileText, roles: ['SUPER_ADMIN'] },
                    { name: 'Invoicing Reset', href: '/dashboard/super-admin/invoicing-reset', icon: AlertTriangle, roles: ['SUPER_ADMIN'] },
                ]
            }
        ]
    }
];

/**
 * Module visibility is derived from item roles: a module renders iff at least
 * one of its items is visible to the user. There is no separate module grant —
 * `item.roles` is the single source of truth for the sidebar, so adding a link
 * can never leak a whole module and granting a module can never leak a link.
 *
 * `allowedModules` matters only for per-item `licence` gates (WEB_MONITOR,
 * CONFERENCE). API authorization is separate and stays deny-by-default in
 * src/lib/module-access.ts.
 */
export function getNavigationModules(role: string, allowedModules: string[] = []) {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const licensed = (l?: string) =>
        !l || isSuperAdmin || allowedModules.includes('*') || allowedModules.includes(l);

    return ALL_MODULES
        .map(mod => ({
            ...mod,
            categories: mod.categories
                .map(cat => ({
                    ...cat,
                    items: cat.items.filter(item =>
                        (isSuperAdmin || item.roles.includes('*') || item.roles.includes(role))
                        && licensed(item.licence)
                    )
                }))
                .filter(cat => cat.items.length > 0)
        }))
        .filter(mod => mod.categories.length > 0);
}
