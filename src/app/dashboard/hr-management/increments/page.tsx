import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import IncrementList from './IncrementList';
import IncrementDashboardSkeleton from './IncrementDashboardSkeleton';

async function getIncrements() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hr/increments`, {
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch increments');
    }

    return res.json();
}

async function IncrementData() {
    const increments = await getIncrements();
    return <IncrementList initialIncrements={increments} />;
}

export default async function IncrementManagementPage() {
    return (
        <DashboardLayout>
            <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">
                            Salary Increments
                        </h1>
                        <p className="text-secondary-600 mt-1">
                            Manage employee salary increments with dual authentication
                        </p>
                    </div>
                    <Link href="/dashboard/hr-management/increments/new" className="btn btn-primary">
                        <Plus size={20} />
                        New Increment
                    </Link>
                </div>

                {/* Increment Data with Suspense */}
                <Suspense fallback={<IncrementDashboardSkeleton />}>
                    <IncrementData />
                </Suspense>
            </div>
        </DashboardLayout>
    );
}
