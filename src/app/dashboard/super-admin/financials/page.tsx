
import FinancialAnalyticsView from "@/components/dashboard/super-admin/FinancialAnalyticsView";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasAnyRole } from '@/lib/constants/roles';

export const dynamic = 'force-dynamic';

export default async function SuperAdminFinancialsPage() {
    const user = await getAuthenticatedUser();

    if (!hasAnyRole(user, ['SUPER_ADMIN'])) {
        redirect('/dashboard');
    }

    return (
        <>
            <div className="p-8">
                <FinancialAnalyticsView />
            </div>
        </>
    );
}
