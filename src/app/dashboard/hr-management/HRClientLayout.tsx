'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Clock,
    TrendingUp,
    ShieldCheck,
    UserCheck,
    Settings
} from 'lucide-react';

interface HRClientLayoutProps {
    children: React.ReactNode;
}

export default function HRClientLayout({ children }: HRClientLayoutProps) {
    const pathname = usePathname();

    const navItems = [
        { name: 'Command Center', href: '/dashboard/hr-management', icon: LayoutDashboard },
        { name: 'Recruitment Hub', href: '/dashboard/recruitment', icon: Briefcase },
        { name: 'Attendance', href: '/dashboard/staff-management?tab=attendance', icon: Clock },
        { name: 'Performance', href: '/dashboard/hr/performance', icon: TrendingUp },
        { name: 'Staff Management', href: '/dashboard/staff-management', icon: UserCheck },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full">
                {/* HR Sub-Navigation */}
                <div className="bg-white border-b border-secondary-200 sticky top-0 z-10 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 px-4 md:px-6">
                    <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                            // Use startsWith for sub-pages but exactly for main dashboard if needed
                            const isCurrent = pathname === item.href || (item.href !== '/dashboard/hr-management' && pathname.startsWith(item.href));

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
