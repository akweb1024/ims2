'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Building2,
    LayoutGrid,
    Settings,
    Globe,
    Shield,
    Users
} from 'lucide-react';

interface CompanyClientLayoutProps {
    children: React.ReactNode;
}

export default function CompanyClientLayout({ children }: CompanyClientLayoutProps) {
    const pathname = usePathname();

    const navItems = [
        { name: 'Organization List', href: '/dashboard/companies', icon: Building2 },
        { name: 'Strategic Dashboard', href: '/dashboard/company', icon: LayoutGrid },
        { name: 'Global Setup', href: '/dashboard/companies/global-setup', icon: Globe },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full">
                {/* Company Sub-Navigation */}
                <div className="bg-white border-b border-secondary-200 sticky top-0 z-10 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 px-4 md:px-6">
                    <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname === item.href);
                            // Exact match for most, but allow subpaths if we add them later
                            const isCurrent = pathname === item.href;

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
