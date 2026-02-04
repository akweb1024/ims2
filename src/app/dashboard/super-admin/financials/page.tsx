
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FinancialAnalyticsView from "@/components/dashboard/super-admin/FinancialAnalyticsView";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function SuperAdminFinancialsPage() {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== 'SUPER_ADMIN') {
        redirect('/dashboard');
    }

    return (
        <DashboardLayout>
            <div className="p-8">
                <FinancialAnalyticsView />
            </div>
        </DashboardLayout>
    );
}
