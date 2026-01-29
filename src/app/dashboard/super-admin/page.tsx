
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SuperAdminView from "@/components/dashboard/super-admin/SuperAdminView";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== 'SUPER_ADMIN') {
        redirect('/dashboard');
    }

    return (
        <DashboardLayout>
            <SuperAdminView />
        </DashboardLayout>
    );
}
