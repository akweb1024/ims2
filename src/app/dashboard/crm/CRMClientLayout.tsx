'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/classnames';
import { Users, TrendingUp, FileText, Phone, BarChart3 } from 'lucide-react';

// ─── CRM Navigation Tab definition ─────────────────────────────────────────────
const tabs = [
    {
        label: 'Customers',
        href: '/dashboard/crm/customers',
        icon: <Users size={14} />,
        color: 'text-emerald-500',
        matchPaths: ['/dashboard/crm/customers', '/dashboard/crm', '/dashboard/customers'],
    },
    {
        label: 'Pipeline',
        href: '/dashboard/crm/leads',
        icon: <TrendingUp size={14} />,
        color: 'text-indigo-500',
        matchPaths: ['/dashboard/crm/leads', '/dashboard/crm/deals'],
    },
    {
        label: 'Billing',
        href: '/dashboard/crm/billing',
        icon: <FileText size={14} />,
        color: 'text-amber-500',
        matchPaths: ['/dashboard/crm/billing', '/dashboard/crm/invoices', '/dashboard/crm/subscriptions'],
    },
    {
        label: 'Follow-ups',
        href: '/dashboard/follow-ups',
        icon: <Phone size={14} />,
        color: 'text-rose-500',
        matchPaths: ['/dashboard/follow-ups'],
    },
    {
        label: 'Insights',
        href: '/dashboard/crm/insights',
        icon: <BarChart3 size={14} />,
        color: 'text-primary-500',
        matchPaths: ['/dashboard/crm/insights'],
    },
];

export default function CRMClientLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-950">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-white/5 border-t-primary-500 rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-400 animate-pulse">Loading CRM</p>
                </div>
            </div>
        );
    }

    const userRole = (session?.user as any)?.role || 'CUSTOMER';

    const isTabActive = (tab: typeof tabs[0]) =>
        tab.matchPaths?.some(p => pathname === p || (p !== '/dashboard/crm' && pathname.startsWith(p))) ?? false;

    return (
        <DashboardLayout userRole={userRole}>
            {/* ── CRM Sub-Navigation ──────────────────────────────────────────── */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-secondary-100/60 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                {/* Tab strip */}
                <div className="flex bg-secondary-100/40 p-1 rounded-2xl border border-secondary-200/40 gap-0.5 overflow-x-auto">
                    {tabs.map((tab) => {
                        const active = isTabActive(tab);
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-200 whitespace-nowrap group',
                                    active
                                        ? 'bg-white text-secondary-950 shadow-md border border-secondary-100/50'
                                        : 'text-secondary-400 hover:text-secondary-800 hover:bg-white/50'
                                )}
                            >
                                <span className={cn(
                                    'transition-colors duration-200',
                                    active ? tab.color : 'text-secondary-300 group-hover:text-secondary-500'
                                )}>
                                    {tab.icon}
                                </span>
                                <span>{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Live indicator */}
                <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-700">Live</span>
                </div>
            </div>

            {/* Page content with ambient gradients */}
            <div className="relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-100/15 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-indigo-100/10 blur-[100px] rounded-full pointer-events-none -z-10" />
                {children}
            </div>
        </DashboardLayout>
    );
}
