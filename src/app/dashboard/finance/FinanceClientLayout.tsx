'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    LayoutDashboard,
    BookOpen,
    BookText,
    FileText,
    PieChart,
    CreditCard
} from 'lucide-react';

interface FinanceClientLayoutProps {
    children: React.ReactNode;
}

export default function FinanceClientLayout({ children }: FinanceClientLayoutProps) {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', href: '/dashboard/finance', icon: LayoutDashboard },
        { name: 'Accounts', href: '/dashboard/finance/coa', icon: BookOpen },
        { name: 'Journal', href: '/dashboard/finance/journal', icon: BookText },
        { name: 'Ledger', href: '/dashboard/finance/ledger', icon: FileText },
        { name: 'Invoices', href: '/dashboard/crm/invoices', icon: FileText },
        { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
        { name: 'Reports', href: '/dashboard/finance/reports', icon: PieChart },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full">
                {/* Finance Sub-Navigation */}
                <div className="bg-white border-b border-secondary-200 sticky top-0 z-10 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 px-4 md:px-6">
                    <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard/finance' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${isActive
                                            ? 'border-primary-600 text-primary-600'
                                            : 'border-transparent text-secondary-500 hover:text-secondary-900 hover:border-secondary-300'
                                        }`}
                                >
                                    <item.icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-secondary-400'}`} />
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
