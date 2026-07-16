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
    FlaskConical,
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
    Timer,
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

export const ALL_MODULES: NavModule[] = [
    {
        id: 'CORE',
        name: 'Core Workspace',
        icon: Home,
        categories: [
            {
                title: 'Workspace',
                items: [
                    { name: 'Dashboard', href: '/dashboard', icon: BarChart3, roles: ['*'] },
                    { name: 'Digital Twin', href: '/dashboard/digital-twin', icon: Globe, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'My HR Portal', href: '/dashboard/staff-portal', icon: Building2, roles: ['*'] },
                    { name: 'Think Tank', href: '/dashboard/think-tank', icon: Lightbulb, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'HR_MANAGER', 'HR', 'FINANCE_ADMIN', 'IT_MANAGER', 'IT_ADMIN'] },
                    { name: 'Problems', href: '/dashboard/problems', icon: AlertTriangle, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'HR_MANAGER', 'HR', 'FINANCE_ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'EDITOR', 'EDITOR_IN_CHIEF', 'JOURNAL_MANAGER'] },
                    // Every internal role, so any employee can find the company's projects.
                    // Excludes external accounts (CUSTOMER/AGENCY/REVIEWER), who must not see
                    // internal work. Lives in CORE because that is the only module EMPLOYEE
                    // is granted (see defaultModulesByRole).
                    { name: 'Company Projects', href: '/dashboard/projects', icon: Folder, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'EMPLOYEE', 'HR_MANAGER', 'HR', 'FINANCE_ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'EDITOR', 'EDITOR_IN_CHIEF', 'JOURNAL_MANAGER'] },
                    { name: 'Direct Chat', href: '/dashboard/chat', icon: MessageSquare, roles: ['*'] },
                    { name: 'File Manager', href: '/dashboard/files', icon: Folders, roles: ['*'] },
                    { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen, roles: ['*'] },
                    { name: 'Scheduled Jobs', href: '/dashboard/automation', icon: Zap, roles: ['SUPER_ADMIN'] },
                    { name: 'Form Automation', href: '/dashboard/automation/forms', icon: Puzzle, roles: ['SUPER_ADMIN'] },
                    { name: 'Sentinel Rules', href: '/dashboard/sentinel/automation', icon: Shield, roles: ['SUPER_ADMIN', 'ADMIN'] },
                ]
            },
            {
                title: 'Personal',
                items: [
                    { name: 'My Profile', href: '/dashboard/profile', icon: User, roles: ['*'] },
                    { name: 'Password Vault', href: '/dashboard/vault', icon: Lock, roles: ['*'] },
                    { name: 'App Theme', href: '/dashboard/settings/theme', icon: Palette, roles: ['*'] },
                ]
            }
        ]
    },
    {
        id: 'MANAGEMENT',
        name: 'Management Portal',
        icon: Briefcase,
        categories: [
            {
                title: 'Team Overview',
                items: [
                    { name: 'Review Inbox', href: '/dashboard/review-inbox', icon: Inbox, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'] },
                    { name: 'My Team', href: '/dashboard/manager/team', icon: Users, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Team Work Report History', href: '/dashboard/manager/team/work-reports', icon: FileText, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Team KPI Overview', href: '/dashboard/manager/team/performance', icon: BarChart3, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Performance Workspace', href: '/dashboard/performance/workspace', icon: Target, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'My Performance', href: '/dashboard/my-performance', icon: TrendingUp, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Goal Verification', href: '/dashboard/performance/verify', icon: Shield, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'] },
                    { name: 'Team KRA Analytics', href: '/dashboard/performance/team', icon: BarChart3, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'] },
                    { name: 'Assign KRA', href: '/dashboard/performance/assign', icon: Target, roles: ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'] },
                    { name: 'Salary & Increments', href: '/dashboard/manager/team/salary', icon: Wallet, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                ]
            },
            {
                title: 'Advanced Reports',
                items: [
                    { name: 'Increment Report', href: '/dashboard/reports/increments', icon: TrendingUp, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Revenue by Category', href: '/dashboard/reports/revenue', icon: Landmark, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Target Achievement', href: '/dashboard/reports/targets', icon: Target, roles: ['MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
                ]
            }
        ]
    },
    {
        id: 'HR',
        name: 'HR Management',
        icon: UserCog,
        categories: [
            {
                title: 'Operations',
                items: [
                    { name: 'HR Dashboard', href: '/dashboard/hr-management', icon: UserCog, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'] },
                    { name: 'Recruitment', href: '/dashboard/recruitment', icon: Target, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'] },
                    { name: 'User Accounts', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER'] },
                    { name: 'Payroll', href: '/dashboard/hr-management/payroll', icon: Banknote, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN', 'HR_MANAGER'] },
                    { name: 'Reimbursements', href: '/dashboard/hr-management?tab=reimbursements', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'FINANCE_ADMIN'] },
                ]
            },
            {
                title: 'Team Management',
                items: [
                    // Duplicated in MANAGEMENT. Kept until module visibility is derived from
                    // item roles: HR/HR_MANAGER cannot see MANAGEMENT, so dropping this twin
                    // would remove their only route to the Review Inbox.
                    { name: 'Review Inbox', href: '/dashboard/review-inbox', icon: Inbox, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'] },
                    { name: 'Work Reports (Company)', href: '/dashboard/hr-management?tab=reports', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'] },
                    { name: 'Leave Requests', href: '/dashboard/hr-management?tab=leaves', icon: Palmtree, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'] },
                    { name: 'Attendance', icon: Clock, href: '/dashboard/hr-management?tab=attendance', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'] },
                    { name: 'Productivity', icon: Zap, href: '/dashboard/hr-management?tab=productivity', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'] },
                    // Same page as MANAGEMENT's Performance Workspace, landing on its review
                    // tab. Kept for the same reason as the Review Inbox twin above; the label
                    // says which tab so it doesn't collide with the MANAGEMENT entry.
                    { name: 'Performance Workspace (Review)', icon: BarChart3, href: '/dashboard/performance/workspace?tab=review', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'TEAM_LEADER'] },
                    { name: 'Employee Performance 360', icon: Compass, href: '/dashboard/hr-management/performance/employee-360', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'TEAM_LEADER'] },
                    { name: 'KRA Admin Console', icon: Target, href: '/dashboard/hr-management/kra', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'TEAM_LEADER'] },
                    { name: 'Job Grades', icon: Layers, href: '/dashboard/hr-management/grades', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Grade Mapping', icon: Folders, href: '/dashboard/hr-management/grade-mapping', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                    { name: 'Salary Fitment', icon: Scale, href: '/dashboard/hr-management/fitment', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'] },
                    { name: 'Salary Increments', icon: Wallet, href: '/dashboard/hr-management/increments', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Increment Advisor', icon: TrendingUp, href: '/dashboard/hr-management/increments/recommend', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER'] },
                    { name: 'Increment Analytics (HR)', icon: TrendingDown, href: '/dashboard/hr-management/increments/analytics', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'FINANCE',
        name: 'Finance & Accounts',
        icon: Wallet,
        categories: [
            {
                title: 'Treasury',
                items: [
                    { name: 'Finance Control Tower', href: '/dashboard/finance', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Bank Reconciliation', href: '/dashboard/finance/reconciliation', icon: Zap, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Payment Ledger (All)', href: '/dashboard/payments', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Razorpay Tracker', href: '/dashboard/analytics/razorpay', icon: CreditCard, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                    { name: 'Company Transactions', href: '/dashboard/payments/by-company', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'EMPLOYEE'] },
                    { name: 'Cashflow Forecast', href: '/dashboard/finance/forecasting', icon: Sparkles, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                ]
            },
            {
                title: 'Billing',
                items: [
                    { name: 'Salary Budget 360', href: '/dashboard/finance/increments/analytics', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'] },
                ]
            }
        ]
    },
    {
        id: 'CRM',
        name: 'CRM / Customers',
        icon: Users,
        categories: [
            {
                title: 'Customer Management',
                items: [
                    { name: 'Customers', href: '/dashboard/customers', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Agencies', href: '/dashboard/crm/partners?tab=agencies', icon: Landmark, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                    { name: 'Institutions', href: '/dashboard/crm/partners?tab=institutions', icon: GraduationCap, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                    { name: 'Add Customer', href: '/dashboard/customers/new', icon: Plus, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Customer Invoices', href: '/dashboard/crm/invoices', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'AGENCY', 'CUSTOMER'] },
                    { name: 'Subscriptions', href: '/dashboard/crm/subscriptions', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'AGENCY', 'CUSTOMER'] },
                    { name: 'Invoice Products', href: '/dashboard/crm/invoice-products', icon: Folders, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'] },
                    { name: 'Coupons', href: '/dashboard/coupons', icon: TicketPercent, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'Engagement & Marketing',
                items: [
                    { name: 'Communications', href: '/dashboard/communications', icon: Phone, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                    { name: 'Active Campaigns', href: '/dashboard/crm/campaigns', icon: Rocket, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Follow-ups', href: '/dashboard/follow-ups', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                ]
            }
        ]
    },
    {
        id: 'COMPANY',
        name: 'Company',
        icon: Building2,
        categories: [
            {
                title: 'Organization',
                items: [
                    { name: 'Company Overview', href: '/dashboard/company', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Super Admin Dashboard', href: '/dashboard/super-admin', icon: Rocket, roles: ['SUPER_ADMIN'] },
                    { name: 'Manage Companies', href: '/dashboard/companies', icon: Globe, roles: ['SUPER_ADMIN'] },
                    { name: 'Global Setup', href: '/dashboard/companies/global-setup', icon: Globe, roles: ['SUPER_ADMIN'] },
                    { name: 'Departments', href: '/dashboard/hr-management/departments', icon: Landmark, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Designations', href: '/dashboard/hr-management/designations', icon: Target, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'Analytics',
                items: [
                    { name: 'Workforce Insights', href: '/dashboard/company?tab=workforce', icon: UserCog, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'PUBLICATION',
        name: 'Publication',
        icon: Newspaper,
        categories: [
            {
                title: 'Author Services',
                items: [
                    { name: 'Author Dashboard', href: '/dashboard/author', icon: User, roles: ['*'] },
                    { name: 'Submit Manuscript', href: '/dashboard/author/submit', icon: PenLine, roles: ['*'] },
                ]
            },
            {
                title: 'Editorial',
                items: [
                    { name: 'Production Hub', href: '/dashboard/production', icon: Factory, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                    { name: 'Journals', href: '/dashboard/journals', icon: Newspaper, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR', 'CUSTOMER', 'AGENCY', 'EXECUTIVE'] },
                    { name: 'Assign Journal Managers', href: '/dashboard/journals/manage', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Editorial Workflow', href: '/dashboard/editorial', icon: PenLine, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                ]
            },
            {
                title: 'Manuscript Workflow',
                items: [
                    { name: 'Production Stages', href: '/dashboard/journal-manager', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF'] },
                    { name: 'Plagiarism Check', href: '/dashboard/plagiarism', icon: Search, roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'PLAGIARISM_CHECKER'] },
                    { name: 'Quality Check', href: '/dashboard/quality', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'QUALITY_CHECKER'] },
                ]
            },
            {
                title: 'Content',
                items: [
                    { name: 'Articles', href: '/dashboard/articles', icon: File, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR', 'CUSTOMER', 'AGENCY', 'EXECUTIVE'] },
                    { name: 'Indexing Report', href: '/dashboard/reports/indexing', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                ]
            },
            {
                title: 'Reviewing',
                items: [
                    { name: 'Validate Reports', href: '/dashboard/reviews/validate', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'] },
                    { name: 'Reviewer Hub', href: '/dashboard/reviewer', icon: Shield, roles: ['*'] },
                    { name: 'My Certificates', href: '/dashboard/reviewer/certificates', icon: Award, roles: ['*'] },
                ]
            }
        ]
    },
    {
        id: 'LMS',
        name: 'LMS / Learning',
        icon: GraduationCap,
        categories: [
            {
                title: 'Management',
                items: [
                    { name: 'LMS Dashboard', href: '/dashboard/lms', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Course Library', href: '/dashboard/courses', icon: GraduationCap, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Participants', href: '/dashboard/lms/participants', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'LMS Invoices', href: '/dashboard/lms/invoice', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Mentors', href: '/dashboard/lms/mentors', icon: Presentation, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'LMS Financials', href: '/dashboard/lms/financials', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Workshops', href: '/dashboard/lms/workshops', icon: Video, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                    { name: 'Internships', href: '/dashboard/lms/internships', icon: Briefcase, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'CONFERENCE',
        name: 'Conference',
        icon: Mic,
        categories: [
            {
                title: 'Events',
                items: [
                    { name: 'Conference Hub', href: '/dashboard/conferences', icon: Mic, roles: ['*'] },
                ]
            }
        ]
    },
    {
        id: 'LOGISTIC',
        name: 'Supply Chain',
        icon: Truck,
        categories: [
            {
                title: 'Procurement',
                items: [
                    { name: 'Vendors', href: '/dashboard/supply-chain/vendors', icon: Store, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Purchase Orders', href: '/dashboard/supply-chain/purchase-orders', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'] },
                ]
            },
            {
                title: 'Inventory',
                items: [
                    { name: 'Inventory Ledger', href: '/dashboard/logistics/inventory', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                ]
            },
            {
                title: 'Logistics Hub',
                items: [
                    { name: 'Shipment Hub', href: '/dashboard/logistics', icon: Truck, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
                ]
            }
        ]
    },
    {
        id: 'IT',
        name: 'IT Services',
        icon: Wrench,
        categories: [
            {
                title: 'IT Management',
                items: [
                    { name: 'IT Dashboard', href: '/dashboard/it-management', icon: BarChart3, roles: ['*'] },
                    { name: 'IT Projects', href: '/dashboard/it-management/projects', icon: Folder, roles: ['*'] },
                    { name: 'IT Task Board', href: '/dashboard/it-management/tasks', icon: CheckSquare, roles: ['*'] },
                    { name: 'IT Revenue', href: '/dashboard/it-management/revenue', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN'] },
                ]
            },
            {
                title: 'Assets',
                items: [
                    { name: 'Asset Inventory', href: '/dashboard/it-management/assets', icon: Laptop, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Service Desk (Admin)', href: '/dashboard/it-management/tickets', icon: Wrench, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            },
            {
                title: 'User Services',
                items: [
                    { name: 'My IT Tasks', href: '/dashboard/my-tasks', icon: ClipboardList, roles: ['*'] },
                    { name: 'IT Support Portal', href: '/dashboard/service-desk', icon: Ticket, roles: ['*'] },
                ]
            },
            {
                title: 'System',
                items: [
                    { name: 'Data Hub', href: '/dashboard/data-hub', icon: FolderOpen, roles: ['SUPER_ADMIN'] },
                    { name: 'Configurations', href: '/dashboard/settings/configurations', icon: KeyRound, roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'Integrations', href: '/dashboard/settings/integrations', icon: Plug, roles: ['SUPER_ADMIN', 'ADMIN'] },
                    { name: 'System Settings', href: '/dashboard/settings', icon: Settings, roles: ['SUPER_ADMIN'] },
                    { name: 'Access Policy', href: '/dashboard/super-admin/access-policy', icon: Shield, roles: ['SUPER_ADMIN'] },
                    { name: 'Audit Logs', href: '/dashboard/super-admin/audit-logs', icon: FileText, roles: ['SUPER_ADMIN'] },
                ]
            }
        ]
    },
    {
        id: 'WEB_MONITOR',
        name: 'Web Monitor',
        icon: Globe,
        categories: [
            {
                title: 'Monitoring',
                items: [
                    { name: 'Monitor Status', href: '/dashboard/monitoring', icon: BarChart3, roles: ['*'] },
                    { name: 'Uptime Analytics', href: '/dashboard/monitoring/analytics', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'Monitor Configuration', href: '/dashboard/monitoring/manage', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                ]
            }
        ]
    },
    {
        id: 'QUALITY',
        name: 'Analytics & Revenue',
        icon: LineChart,
        categories: [
            {
                title: 'Insights',
                items: [
                    { name: 'Revenue Attribution', href: '/dashboard/analytics/revenue', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER'] },
                    { name: 'Business Analytics', href: '/dashboard/analytics', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                    { name: 'AI Predictions', href: '/dashboard/ai-insights', icon: Bot, roles: ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'AGENCY'] },
                    { name: 'Performance Observatory', href: '/dashboard/performance-observability', icon: Compass, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_ADMIN'] },
                    { name: 'Support Tickets', href: '/dashboard/tickets', icon: Ticket, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'CUSTOMER'] },
                ]
            },
            {
                title: 'Revenue Management',
                items: [
                    { name: 'Income Registry', href: '/dashboard/revenue/transactions', icon: Landmark, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN', 'TEAM_LEADER', 'EXECUTIVE', 'HR', 'IT_MANAGER', 'IT_ADMIN'] },
                    { name: 'Verify Claims', href: '/dashboard/revenue/claims', icon: Scale, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'FINANCE_ADMIN'] },
                ]
            }
        ]
    }
];

export function getNavigationModules(role: string, allowedModules: string[] = ['CORE']) {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isAdmin = role === 'ADMIN';
    const isManager = role === 'MANAGER' || role === 'TEAM_LEADER';
    const isFinance = role === 'FINANCE_ADMIN';

    // Core list of modules that should be visible based on role, even if not explicitly in allowedModules
    const defaultModulesByRole: Record<string, string[]> = {
        'SUPER_ADMIN': ['*'],
        'ADMIN': ['CORE', 'MANAGEMENT', 'HR', 'FINANCE', 'CRM', 'COMPANY', 'PUBLICATION', 'LMS', 'IT', 'WEB_MONITOR', 'QUALITY'],
        'MANAGER': ['CORE', 'MANAGEMENT', 'CRM', 'HR', 'FINANCE', 'PUBLICATION', 'IT', 'QUALITY'],
        'TEAM_LEADER': ['CORE', 'MANAGEMENT', 'CRM', 'HR', 'IT', 'QUALITY'],
        // FINANCE is granted only so the company-scoped "Company Transactions" item
        // surfaces; every other Finance item stays role-gated to admins, so employees
        // see a Finance module containing just that one link.
        'EMPLOYEE': ['CORE', 'FINANCE'],
        'FINANCE_ADMIN': ['CORE', 'FINANCE', 'QUALITY', 'HR'],
        'HR_MANAGER': ['CORE', 'HR', 'LMS', 'QUALITY'],
        'HR': ['CORE', 'HR', 'QUALITY'],
        'EXECUTIVE': ['CORE', 'CRM', 'PUBLICATION', 'QUALITY', 'LOGISTIC'],
        'IT_MANAGER': ['CORE', 'IT', 'QUALITY'],
        'IT_ADMIN': ['CORE', 'IT', 'QUALITY'],
        'EDITOR': ['CORE', 'PUBLICATION'],
        'EDITOR_IN_CHIEF': ['CORE', 'PUBLICATION'],
        'SECTION_EDITOR': ['CORE', 'PUBLICATION'],
        'JOURNAL_MANAGER': ['CORE', 'PUBLICATION'],
        'PLAGIARISM_CHECKER': ['CORE', 'PUBLICATION'],
        'QUALITY_CHECKER': ['CORE', 'PUBLICATION'],
        'REVIEWER': ['CORE', 'PUBLICATION'],
        'CUSTOMER': ['CORE', 'CRM', 'PUBLICATION', 'QUALITY'],
        'AGENCY': ['CORE', 'CRM', 'PUBLICATION', 'QUALITY'],
    };

    const rawMods = defaultModulesByRole[role] || ['CORE'];
    const defaultMods = [...rawMods];

    // Ensure IT (service desk) is in the list for internal roles only —
    // external accounts (customers, agencies, reviewers) don't get IT tooling.
    const externalRoles = ['CUSTOMER', 'AGENCY', 'REVIEWER'];
    if (!externalRoles.includes(role) && !defaultMods.includes('IT') && !defaultMods.includes('*')) {
        defaultMods.push('IT');
    }

    return ALL_MODULES
        .filter(mod => {
            if (isSuperAdmin) return true;
            // If module is explicitly allowed in DB
            if (allowedModules.includes(mod.id)) return true;
            // If module is in default list for this role
            if (defaultMods.includes('*') || defaultMods.includes(mod.id)) return true;
            return false;
        })
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

// Style guide accessibility compliance helper comment: aria-label placeholder label
