
import SuperAdminOverhaulDashboard from "@/components/dashboard/super-admin/OverhaulDashboard";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasAnyRole } from '@/lib/constants/roles';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
    const user = await getAuthenticatedUser();

    if (!hasAnyRole(user, ['SUPER_ADMIN'])) {
        redirect('/dashboard');
    }

    return (
        <>
            <SuperAdminOverhaulDashboard />
        </>
    );
}
