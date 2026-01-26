import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProductionHubSkeleton from './ProductionHubSkeleton';

export default function Loading() {
    return (
        <DashboardLayout>
            <ProductionHubSkeleton />
        </DashboardLayout>
    );
}
