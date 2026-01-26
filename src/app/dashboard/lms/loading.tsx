import DashboardLayout from '@/components/dashboard/DashboardLayout';
import LMSLoadingSkeleton from './LMSLoadingSkeleton';

export default function Loading() {
    return (
        <DashboardLayout>
            <LMSLoadingSkeleton />
        </DashboardLayout>
    );
}
