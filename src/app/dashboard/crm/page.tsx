import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import CRMMetrics from './CRMMetrics';
import RecentActivities from './RecentActivities';
import CustomerGrowthChart from './CustomerGrowthChart';
import AlertsPanel from './AlertsPanel';
import CRMClientLayout from './CRMClientLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default async function CRMDashboardPage() {
    const user = await getAuthenticatedUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <CRMClientLayout>
            <div className="space-y-8 max-w-7xl mx-auto p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight">CRM Dashboard</h1>
                        <p className="text-secondary-500 text-lg">Overview of customer relationships and sales pipeline.</p>
                    </div>
                </div>

                <Suspense fallback={<div className="h-32 bg-secondary-100 rounded animate-pulse" />}>
                    <CRMMetrics user={user} />
                </Suspense>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Analytics</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <CustomerGrowthChart user={user} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        <Suspense fallback={<div className="h-32 bg-secondary-100 rounded animate-pulse" />}>
                            <AlertsPanel user={user} />
                        </Suspense>

                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Suspense fallback={<div className="h-64 bg-secondary-100 rounded animate-pulse" />}>
                                    <RecentActivities user={user} />
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </CRMClientLayout>
    );
}
