import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AuthorDashboardSkeleton from './AuthorDashboardSkeleton';

export default function Loading() {
    return (
        <DashboardLayout>
            <AuthorDashboardSkeleton />
        </DashboardLayout>
    );
}
