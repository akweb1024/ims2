'use client';

import { useSession } from 'next-auth/react';
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
            {children}
        </DashboardLayout>
    );
}
