'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function CRMClientLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    // Default to EXECUTIVE if loading, to show most menus just in case, 
    // or undefined to let DashboardLayout handle it.
    // DashboardLayout defaults to 'CUSTOMER', which might hide CRM.
    // Let's try to get it from session, fallback to Executive for internal dashboard feel.
    const userRole = (session?.user as any)?.role || 'EXECUTIVE';

    return (
        <DashboardLayout userRole={userRole}>
            <div className="mb-6 flex space-x-4 border-b border-secondary-200 pb-2">
                <Link href="/dashboard/crm" className="text-sm font-medium text-secondary-600 hover:text-primary-600 px-3 py-2">Dashboard</Link>
                <Link href="/dashboard/crm/leads" className="text-sm font-medium text-secondary-600 hover:text-primary-600 px-3 py-2">Leads</Link>
                <Link href="/dashboard/crm/deals" className="text-sm font-medium text-secondary-600 hover:text-primary-600 px-3 py-2">Deals</Link>
                <Link href="/dashboard/customers" className="text-sm font-medium text-secondary-600 hover:text-primary-600 px-3 py-2">Customers</Link>
            </div>
            {children}
        </DashboardLayout>
    );
}
