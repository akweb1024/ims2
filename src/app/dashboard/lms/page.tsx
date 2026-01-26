import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import LMSStats from './LMSStats';
import LMSCharts from './LMSCharts';
import TopMentors from './TopMentors';

export default async function LMSDashboard() {
    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">LMS Management</h1>
                        <p className="text-secondary-500">Manage Course Metadata & Analytics (Content delivery is external)</p>
                    </div>
                    <div className="flex gap-4">
                        <a href="https://content-portal.example.com" target="_blank" rel="noreferrer" className="btn btn-primary flex gap-2 items-center bg-indigo-600 hover:bg-indigo-700 border-indigo-600">
                            <span>🚀</span> Go to Content Portal ↗
                        </a>
                        <Link href="/dashboard/courses" className="btn btn-secondary flex gap-2">
                            <BookOpen size={18} /> Library
                        </Link>
                    </div>
                </div>

                {/* Stats Grid with Suspense */}
                <Suspense fallback={<div className="h-32 bg-secondary-100 rounded animate-pulse" />}>
                    <LMSStats />
                </Suspense>

                {/* Charts & Leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <LMSCharts />

                    <Suspense fallback={<div className="h-64 bg-secondary-100 rounded animate-pulse" />}>
                        <TopMentors />
                    </Suspense>
                </div>
            </div>
        </DashboardLayout>
    );
}
