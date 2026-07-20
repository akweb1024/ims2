import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import MDControlCenter from '@/components/dashboard/overview/MDControlCenter';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
    const user = await getAuthenticatedUser();

    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
        redirect('/dashboard');
    }

    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <MDControlCenter />
        </Suspense>
    );
}
