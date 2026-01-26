import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IncrementDashboardSkeleton from './IncrementDashboardSkeleton';

export default function Loading() {
    return (
        <DashboardLayout>
            <IncrementDashboardSkeleton />
        </DashboardLayout>
    );
}
