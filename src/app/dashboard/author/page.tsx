import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import AuthorStats from './AuthorStats';
import AuthorDashboardSkeleton from './AuthorDashboardSkeleton';

export default async function AuthorDashboard() {
    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 pb-20">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-secondary-900">Author Dashboard</h1>
                        <p className="text-sm text-secondary-600 mt-1">Manage your manuscript submissions</p>
                    </div>
                    <Link
                        href="/dashboard/author/submit"
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Submission
                    </Link>
                </div>

                {/* Stats and Manuscripts with Suspense */}
                <Suspense fallback={<AuthorDashboardSkeleton />}>
                    <AuthorStats />
                </Suspense>
            </div>
        </DashboardLayout>
    );
}
