import { auth } from '@/lib/nextauth';
import { getUnifiedPerformance } from '@/lib/team-service';
import { format } from 'date-fns';

import PerformanceCharts from './PerformanceCharts';

export default async function UnifiedPerformancePage({
    searchParams,
}: {
    searchParams: Promise<{ userId?: string; period?: string }>;
}) {
    const params = await searchParams;
    const session = await auth();
    if (!session?.user?.id) return <div>Unauthorized</div>;

    const performanceData = await getUnifiedPerformance(session.user.id, {
        userId: params.userId,
        period: params.period,
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Performance Overview</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Monitor KPIs and performance reviews across your team
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {performanceData.map((user) => (
                    <div key={user.userId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 font-bold">
                                    {user.userName?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">{user.userName}</h3>
                                    <p className="text-xs text-gray-500">{user.companyName}</p>
                                </div>
                            </div>
                            <div className="text-sm text-gray-500">
                                {user.kpis.length} KPIs Assigned
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Performance Trend Chart */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Performance Trend (Last 30 Reports)</h4>
                                <PerformanceCharts data={user.reportHistory} />
                            </div>

                            {/* KPI List */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Current Period KPIs</h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-100">
                                        <thead>
                                            <tr className="text-left text-xs text-gray-500">
                                                <th className="pb-2">Title</th>
                                                <th className="pb-2">Target</th>
                                                <th className="pb-2">Current</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {user.kpis.map((kpi) => (
                                                <tr key={kpi.id}>
                                                    <td className="py-2 text-sm text-gray-900">{kpi.title}</td>
                                                    <td className="py-2 text-sm text-gray-600">{kpi.target}</td>
                                                    <td className="py-2 text-sm text-gray-600">{kpi.current}</td>
                                                </tr>
                                            ))}
                                            {user.kpis.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="py-4 text-center text-sm text-gray-400 italic">
                                                        No active KPIs found for this period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {performanceData.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                        No team members found with performance data.
                    </div>
                )}
            </div>
        </div>
    );
}

