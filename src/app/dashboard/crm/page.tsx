import { Suspense } from 'react';
import CRMMetrics from './CRMMetrics';
import RecentActivities from './RecentActivities';
import CustomerGrowthChart from './CustomerGrowthChart';
import CRMClientLayout from './CRMClientLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default async function CRMDashboardPage() {
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
                    <CRMMetrics />
                </Suspense>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Analytics</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <CustomerGrowthChart />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<div className="h-64 bg-secondary-100 rounded animate-pulse" />}>
                                <RecentActivities />
                            </Suspense>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </CRMClientLayout>
    );
}
