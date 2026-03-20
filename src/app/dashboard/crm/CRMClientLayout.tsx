'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/classnames';
import { 
    LayoutDashboard, Users, UserPlus, Briefcase, 
    FileText, CheckCircle2, Zap, ShieldCheck,
    Activity, Globe, Sparkles, Layers
} from 'lucide-react';

export default function CRMClientLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-950">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-white/5 border-t-primary-500 rounded-full animate-spin shadow-2xl shadow-primary-500/20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-400 animate-pulse italic">Loading CRM workspace</p>
                </div>
            </div>
        );
    }

    const userRole = (session?.user as any)?.role || 'CUSTOMER';

    const tabs = [
        { label: 'Overview', href: '/dashboard/crm', icon: <LayoutDashboard size={14} />, color: 'text-primary-500' },
        { label: 'Prospects', href: '/dashboard/crm/leads', icon: <UserPlus size={14} />, color: 'text-indigo-500' },
        { label: 'Opportunities', href: '/dashboard/crm/deals', icon: <Briefcase size={14} />, color: 'text-purple-500' },
        { label: 'Customers', href: '/dashboard/customers', icon: <Users size={14} />, color: 'text-emerald-500' },
        { label: 'Products', href: '/dashboard/crm/invoice-products', icon: <Layers size={14} />, color: 'text-amber-500' },
        { label: 'Subscriptions', href: '/dashboard/crm/subscriptions', icon: <Activity size={14} />, color: 'text-rose-500' },
    ];

    return (
        <DashboardLayout userRole={userRole}>
            {/* High-Fidelity CRM Intelligence Navigation */}
            <div className="sticky top-0 z-40 bg-white/60 backdrop-blur-2xl border-b border-secondary-100/50 px-8 py-4 flex flex-wrap items-center justify-between gap-6 shadow-2xl shadow-secondary-100/20">
                <div className="flex bg-secondary-100/30 p-1.5 rounded-[1.5rem] border border-secondary-200/40 backdrop-blur-md">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link 
                                key={tab.href}
                                href={tab.href} 
                                className={cn(
                                    'flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-500 group relative',
                                    isActive
                                        ? 'bg-white text-secondary-950 shadow-2xl shadow-secondary-200/50 scale-105 border border-secondary-100/50'
                                        : 'text-secondary-400 hover:text-secondary-900 hover:bg-white/40'
                                )}
                            >
                                <span className={cn(
                                    'transition-all duration-500 group-hover:scale-125 group-hover:rotate-6',
                                    isActive ? tab.color : 'text-secondary-300 group-hover:text-secondary-600'
                                )}>
                                    {tab.icon}
                                </span>
                                <span className="relative z-10 italic">{tab.label}</span>
                                {isActive && (
                                    <div className={cn(
                                        'absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full shadow-[0_0_8px_currentColor]',
                                        tab.color.replace('text', 'bg')
                                    )} />
                                )}
                            </Link>
                        );
                    })}
                </div>
                
                <div className="ml-auto flex items-center gap-10">
                     <div className="hidden xl:flex items-center gap-4 px-6 py-2 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 shadow-inner">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.8)]" />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-700 italic">Live updates on</span>
                     </div>
                     <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-secondary-950 text-white flex items-center justify-center hover:bg-primary-600 transition-all cursor-pointer shadow-xl shadow-secondary-950/20 active:scale-95 group">
                               <Sparkles size={18} className="group-hover:animate-spin" />
                          </div>
                     </div>
                </div>
            </div>

            <div className="relative">
                {/* Global Decor Nodes */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-100/20 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/10 blur-[100px] rounded-full pointer-events-none -z-10" />
                
                {children}
            </div>
        </DashboardLayout>
    );
}
