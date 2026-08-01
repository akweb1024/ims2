import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import MDControlCenter from '@/components/dashboard/overview/MDControlCenter';
import { hasAnyRole } from '@/lib/constants/roles';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
    const user = await getAuthenticatedUser();

    if (!hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN'])) {
        redirect('/dashboard');
    }

    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <MDControlCenter />
        </Suspense>
    );
}
