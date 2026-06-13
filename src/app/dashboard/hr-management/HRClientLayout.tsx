'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    LayoutDashboard,
    Briefcase,
    Clock,
    TrendingUp,
    UserCheck,
    BookOpen,
} from 'lucide-react';

interface HRClientLayoutProps {
    children: React.ReactNode;
}

export default function HRClientLayout({ children }: HRClientLayoutProps) {
    const pathname = usePathname();
    const [activeTab, setActiveTab] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        setActiveTab(params.get('tab'));
    }, [pathname]);

    const navItems = [
        { name: 'Command Center', href: '/dashboard/hr-management', icon: LayoutDashboard, tab: null },
        { name: 'Recruitment Hub', href: '/dashboard/recruitment', icon: Briefcase },
        { name: 'Attendance', href: '/dashboard/hr-management?tab=attendance', icon: Clock, tab: 'attendance' },
        { name: 'Performance', href: '/dashboard/hr-management/performance/monthly', icon: TrendingUp },
        { name: 'Performance 360', href: '/dashboard/hr-management/performance/employee-360', icon: TrendingUp },
        { name: 'Onboarding SOP', href: '/dashboard/hr-management/onboarding/help', icon: BookOpen },
        { name: 'Staff Management', href: '/dashboard/staff-management', icon: UserCheck },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full">
                {/* HR Sub-Navigation */}
                <div className="bg-white border-b border-secondary-200 sticky top-0 z-10 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 px-4 md:px-6">
                    <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                        {navItems.map((item) => {
                            const itemPath = item.href.split('?')[0];
                            const isHrRootTab = itemPath === '/dashboard/hr-management' && item.tab !== undefined;
                            const isCurrent = isHrRootTab
                                ? pathname === '/dashboard/hr-management' && activeTab === item.tab
                                : pathname === itemPath || (itemPath !== '/dashboard/hr-management' && pathname.startsWith(itemPath));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${isCurrent
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-secondary-500 hover:text-secondary-900 hover:border-secondary-300'
                                        }`}
                                >
                                    <item.icon className={`w-4 h-4 ${isCurrent ? 'text-primary-600' : 'text-secondary-400'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1">
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
