'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { registerPush } from '@/lib/push-register';
import GlobalSearch from './GlobalSearch';
import { useSession, signOut, signIn } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

interface DashboardLayoutProps {
    children: React.ReactNode;
    userRole?: string;
}

export default function DashboardLayout({ children, userRole: propUserRole = 'CUSTOMER' }: DashboardLayoutProps) {
    const { data: session, status, update } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
    const pathname = usePathname();
    const router = useRouter();

    const fetchNotifications = useCallback(async () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (err) {
            console.error('Fetch notifications error:', err);
        }
    }, []);

    const fetchUserContext = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setAvailableCompanies(data.availableCompanies || []);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('availableCompanies', JSON.stringify(data.availableCompanies));
            }
        } catch (err) {
            console.error('Fetch user context error:', err);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        if (status === 'authenticated') {
            fetchNotifications();
            fetchUserContext();
            registerPush();
        }

        if (status === 'unauthenticated') {
            router.push('/login');
        }

        if (typeof window !== 'undefined') {
            setIsImpersonating(!!localStorage.getItem('adminToken'));
        }

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible' && status === 'authenticated') {
                fetchNotifications();
                // Auto-trigger web monitoring checks
                fetch('/api/it/monitoring/check', { method: 'POST' }).catch(() => { });
            }
        }, 60000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && status === 'authenticated') {
                fetchNotifications();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchNotifications, fetchUserContext, status, router]);

    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications', { method: 'PATCH' });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Mark read error:', err);
        }
    };

    const handleNotificationClick = async (notification: any) => {
        try {
            if (!notification.isRead) {
                await fetch(`/api/notifications/${notification.id}`, { method: 'PATCH' });
                setNotifications(prev => prev.map(n =>
                    n.id === notification.id ? { ...n, isRead: true } : n
                ));
            }
            if (notification.link) {
                router.push(notification.link);
            }
        } catch (err) {
            console.error('Notification click error:', err);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        signOut({ callbackUrl: '/login' });
    };

    const handleRevertAdmin = async () => {
        const adminToken = localStorage.getItem('adminToken');
        const adminUser = localStorage.getItem('adminUser');

        if (adminToken && adminUser) {
            // Restore session via NextAuth
            const result = await signIn('credentials', {
                token: adminToken,
                redirect: false
            });

            if (result?.ok) {
                localStorage.setItem('token', adminToken);
                localStorage.setItem('user', adminUser);
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/dashboard';
            } else {
                console.error("Failed to revert session");
                // Fallback attempt with hard reload in case cookie was somehow set
                window.location.href = '/dashboard';
            }
        }
    };

    const user = session?.user as any;
    const finalRole = user?.role || propUserRole;

    const displayRole = mounted && user?.company?.name ? user.company.name : finalRole.replace('_', ' ');
    const displayEmail = mounted && user?.email ? user.email.split('@')[0] : 'User';
    const displayFullEmail = mounted && user?.email ? user.email : 'user@example.com';

    // Module state
    const [activeModule, setActiveModule] = useState<string>('CORE');

    // Navigation items based on role and module
    const navigationModules = useMemo(() => {
        const modules = [
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
                            { name: 'Payroll', href: '/dashboard/hr-management/payroll', icon: '💵', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'] },
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
                            { name: 'All Customers', href: '/dashboard/customers', icon: '👥', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
                            { name: 'Add Customer', href: '/dashboard/customers/new', icon: '➕', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'] },
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
                        title: 'Academy',
                        items: [
                            { name: 'My Learning', href: '/dashboard/my-learning', icon: '📖', roles: ['*'] },
                            { name: 'Courses', href: '/dashboard/courses', icon: '🎓', roles: ['*'] },
                            { name: 'Knowledge Article', href: '/dashboard/knowledge-base', icon: '📚', roles: ['*'] },
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
                            { name: 'Asset Inventory', href: '/dashboard/it/assets', icon: '💻', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                            { name: 'Service Desk', href: '/dashboard/it/tickets', icon: '🛠️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
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
                            { name: 'Income Registry', href: '/dashboard/revenue/transactions', icon: '🏦', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'] },
                            { name: 'Verify Claims', href: '/dashboard/revenue/claims', icon: '⚖️', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'FINANCE_ADMIN'] },
                        ]
                    }
                ]
            }
        ];

        // Filter modules based on user's allowedModules
        const isSuperAdmin = finalRole === 'SUPER_ADMIN';
        const userAllowedModules = user?.allowedModules || ['CORE'];

        return modules
            .filter(mod => isSuperAdmin || userAllowedModules.includes(mod.id))
            .map(mod => ({
                ...mod,
                categories: mod.categories
                    .map(cat => ({
                        ...cat,
                        items: cat.items.filter(item => item.roles.includes('*') || item.roles.includes(finalRole))
                    }))
                    .filter(cat => cat.items.length > 0)
            }))
            .filter(mod => mod.categories.length > 0);
    }, [finalRole, user]);

    // Sync active module with current path
    useEffect(() => {
        if (!pathname || !navigationModules.length) return;

        let bestMatchModule = '';
        let longestMatchLen = 0;

        navigationModules.forEach(mod => {
            mod.categories.forEach(cat => {
                cat.items.forEach(item => {
                    // Ensure robust matching: exact match OR directory child match
                    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
                        if (item.href.length > longestMatchLen) {
                            longestMatchLen = item.href.length;
                            bestMatchModule = mod.id;
                        }
                    }
                });
            });
        });

        // Special case: root dashboard is CORE
        if (pathname === '/dashboard' && !bestMatchModule) {
            bestMatchModule = 'CORE';
        }

        if (bestMatchModule && bestMatchModule !== activeModule) {
            setActiveModule(bestMatchModule);
        }
    }, [pathname, navigationModules, activeModule]);

    // Active Category filtered for the sidebar
    const sideNavigation = useMemo(() => {
        const activeMod = navigationModules.find(m => m.id === activeModule) || navigationModules[0];
        return activeMod?.categories || [];
    }, [activeModule, navigationModules]);

    return (
        <div className="min-h-screen bg-secondary-50">
            {/* Impersonation Warning Bar */}
            <Toaster position="top-right" />
            {isImpersonating && (
                <div className="bg-primary-600 text-white px-4 py-2 flex items-center justify-between fixed w-full z-50 top-0 shadow-lg animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="text-xl">👤</span>
                        <span>Impersonation Mode Active: Viewing as {mounted && user ? user.email : 'User'}</span>
                    </div>
                    <button
                        onClick={handleRevertAdmin}
                        className="bg-white text-primary-600 px-4 py-1 rounded-full text-xs font-black uppercase hover:bg-secondary-50 transition-all shadow-sm"
                    >
                        Back to Admin Identity
                    </button>
                </div>
            )}

            {/* Top Navigation Bar */}
            <nav className={`bg-white border-b border-secondary-200 fixed w-full z-30 transition-all ${isImpersonating ? 'top-10' : 'top-0'}`}>
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            {/* Sidebar Toggle */}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="text-secondary-500 hover:text-secondary-700 focus:outline-none lg:hidden"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            {/* Logo */}
                            <Link href="/dashboard" className="flex items-center ml-4 lg:ml-0">
                                <h1 className="text-xl font-bold text-gradient">STM Customer</h1>
                            </Link>

                            {/* Global Search */}
                            <div className="ml-8 hidden xl:block">
                                <GlobalSearch />
                            </div>

                            {/* Module Switcher - Horizontal */}
                            <div className="hidden lg:flex items-center ml-8 space-x-1 bg-secondary-100/50 p-1 rounded-2xl border border-secondary-200">
                                {navigationModules.map((mod) => (
                                    <button
                                        key={mod.id}
                                        onClick={() => {
                                            setActiveModule(mod.id);
                                            // Auto-navigate to first link
                                            const firstLink = mod.categories[0]?.items[0]?.href;
                                            if (firstLink) router.push(firstLink);
                                        }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeModule === mod.id
                                            ? 'bg-white text-primary-600 shadow-md ring-1 ring-primary-100'
                                            : 'text-secondary-500 hover:text-secondary-700 hover:bg-white/50'
                                            }`}
                                    >
                                        <span className="mr-2">{mod.icon}</span>
                                        {mod.name.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right side - User menu */}
                        <div className="flex items-center space-x-4">
                            {/* Notifications */}
                            <div className="relative group">
                                <button className="text-secondary-500 hover:text-secondary-700 relative p-2 rounded-xl hover:bg-secondary-100 transition-colors">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {notifications.filter(n => !n.isRead).length > 0 && (
                                        <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-danger-500 ring-2 ring-white"></span>
                                    )}
                                </button>

                                {/* Notifications Dropdown */}
                                <div className="hidden group-hover:block absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-secondary-200 py-2 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                                        <h3 className="text-sm font-bold text-secondary-900">Notifications</h3>
                                        {notifications.some(n => !n.isRead) && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-[10px] font-bold text-primary-600 uppercase hover:text-primary-700"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-secondary-500 italic text-sm">
                                                No notifications yet.
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`px-4 py-3 hover:bg-secondary-50 cursor-pointer transition-colors border-b border-secondary-50 last:border-0 ${!n.isRead ? 'bg-primary-50/30' : ''}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <p className={`text-xs ${!n.isRead ? 'font-bold text-secondary-900' : 'text-secondary-700'}`}>{n.title}</p>
                                                        <span className="text-[10px] text-secondary-400">
                                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-secondary-500 mt-1 line-clamp-2">{n.message}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* User Dropdown */}
                            <div className="relative group">
                                <button className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-secondary-100 transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                                        {finalRole.charAt(0)}
                                    </div>
                                    <div className="hidden md:block text-left">
                                        <p className="text-sm font-semibold text-secondary-900 leading-tight">
                                            {displayRole}
                                        </p>
                                        <p className="text-xs text-secondary-500">
                                            {displayEmail}
                                        </p>
                                    </div>
                                    <svg className="h-4 w-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu - Enhanced */}
                                <div className="hidden group-hover:block absolute right-0 top-full pt-2 w-64 z-50">
                                    <div className="bg-white rounded-2xl shadow-2xl border border-secondary-200 py-2 overflow-hidden">
                                        {/* User Info Header */}
                                        <div className="px-4 py-3 border-b border-secondary-100">
                                            <p className="text-sm font-bold text-secondary-900">
                                                {displayFullEmail}
                                            </p>
                                            <p className="text-xs text-secondary-500 mt-1">
                                                Role: <span className="font-semibold text-primary-600">{finalRole.replace('_', ' ')}</span>
                                            </p>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-2">
                                            <Link
                                                href="/dashboard/profile"
                                                className="flex items-center px-4 py-2.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                                            >
                                                <svg className="h-5 w-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                Profile Settings
                                            </Link>

                                            <Link
                                                href="/dashboard"
                                                className="flex items-center px-4 py-2.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                                            >
                                                <svg className="h-5 w-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                Preferences
                                            </Link>
                                        </div>

                                        {/* Switch Company Section */}
                                        {availableCompanies.length > 1 && (
                                            <div className="border-t border-secondary-100 py-2">
                                                <p className="px-4 py-1 text-[10px] font-bold text-secondary-400 uppercase">Switch Company</p>
                                                <div className="max-h-40 overflow-y-auto">
                                                    {availableCompanies.map((comp) => (
                                                        <button
                                                            key={comp.id}
                                                            onClick={async () => {
                                                                const res = await fetch('/api/auth/select-company', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ companyId: comp.id })
                                                                });
                                                                if (res.ok) {
                                                                    const data = await res.json();
                                                                    if (data.token) localStorage.setItem('token', data.token);
                                                                    // Update NextAuth session
                                                                    await update({ companyId: comp.id });
                                                                    window.location.reload();
                                                                }
                                                            }}
                                                            className={`w-full text-left px-4 py-2 text-xs flex justify-between items-center transition-colors ${comp.id === user?.companyId ? 'bg-primary-50 text-primary-700 font-bold' : 'text-secondary-600 hover:bg-secondary-50'}`}
                                                        >
                                                            <span className="truncate">{comp.name}</span>
                                                            {comp.id === user?.companyId && <span className="text-primary-500">✓</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Logout Button - Prominent */}
                                        <div className="border-t border-secondary-100 pt-2 px-2 pb-2">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 rounded-lg transition-all shadow-md hover:shadow-lg"
                                            >
                                                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Sidebar */}
            <aside
                className={`fixed left-0 h-full bg-white border-r border-secondary-200 transition-all duration-300 z-20 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'} ${isImpersonating ? 'top-[calc(4rem+2.5rem)]' : 'top-16'}
                    }`}
            >
                <nav className="p-4 space-y-2 h-full flex flex-col overflow-y-auto custom-scrollbar">
                    {/* Mobile Module Selector */}
                    <div className="lg:hidden mb-6 space-y-2">
                        <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Switch Module</label>
                        <select
                            className="input-premium py-2 text-xs"
                            value={activeModule}
                            onChange={(e) => {
                                const newModId = e.target.value;
                                setActiveModule(newModId);
                                const mod = navigationModules.find(m => m.id === newModId);
                                const firstLink = mod?.categories[0]?.items[0]?.href;
                                if (firstLink) router.push(firstLink);
                            }}
                        >
                            {navigationModules.map(mod => (
                                <option key={mod.id} value={mod.id}>{mod.icon} {mod.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 space-y-4">
                        {sideNavigation.map((category: any, idx: number) => (
                            <div key={category.title || idx} className="group/category">
                                {/* Category Header - Only show when open */}
                                {sidebarOpen && category.title && (
                                    <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-secondary-400">
                                        <span>{category.title}</span>
                                    </div>
                                )}

                                {idx > 0 && !category.title && sidebarOpen && (
                                    <div className="my-2 mx-3 border-t border-secondary-100" />
                                )}

                                <div className="space-y-1">
                                    {category.items.map((item: any) => {
                                        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`relative flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
                                                    ? 'bg-secondary-900 text-white shadow-lg shadow-secondary-200'
                                                    : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                                                    }`}
                                                title={!sidebarOpen ? item.name : ''}
                                            >
                                                {/* Active Indicator Line */}
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 bg-primary-500 rounded-r-full"></div>
                                                )}

                                                <span className={`text-lg transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'}`}>
                                                    {item.icon}
                                                </span>
                                                <span className={`text-xs font-bold tracking-wide ${sidebarOpen ? 'block opacity-100 translate-x-0' : 'hidden opacity-0 -translate-x-4'} transition-all duration-300`}>
                                                    {item.name}
                                                </span>

                                                {/* Hover Chevron */}
                                                {sidebarOpen && !isActive && (
                                                    <svg className="ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Logout Button in Sidebar */}
                    <div className={`border-t border-secondary-200 pt-4 ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-danger-600 hover:bg-danger-50 transition-colors font-bold text-xs uppercase tracking-wider group"
                        >
                            <svg className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Logout</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main
                className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'} ${isImpersonating ? 'pt-[calc(4rem+2.5rem)]' : 'pt-16'}
                    }`}
            >
                <div className="p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
