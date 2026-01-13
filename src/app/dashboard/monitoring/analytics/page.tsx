'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

export default function AnalyticsPage() {
    const [stats, setStats] = useState<any>({
        totalChecks: 0,
        avgResponseTime: 0,
        uptimePercentage: 100,
        hourlyData: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // Fetch last 500 logs to calculate recent trends
                const res = await fetch('/api/it/monitoring/logs?limit=500');
                if (res.ok) {
                    const logs = await res.json();

                    if (logs.length === 0) {
                        setLoading(false);
                        return;
                    }

                    const totalChecks = logs.length;
                    const avgResponseTime = logs.reduce((acc: number, log: any) => acc + (log.responseTime || 0), 0) / totalChecks;
                    const upCount = logs.filter((l: any) => l.status === 'UP').length;
                    const uptimePercentage = (upCount / totalChecks) * 100;

                    // Group by hour for chart
                    const hourlyGroups: any = {};
                    logs.forEach((log: any) => {
                        const date = new Date(log.checkedAt);
                        const hourKey = `${date.getHours()}:00`;
                        if (!hourlyGroups[hourKey]) {
                            hourlyGroups[hourKey] = { time: hourKey, avgResponse: 0, count: 0, failures: 0 };
                        }
                        hourlyGroups[hourKey].avgResponse += (log.responseTime || 0);
                        hourlyGroups[hourKey].count += 1;
                        if (log.status !== 'UP') hourlyGroups[hourKey].failures += 1;
                    });

                    const hourlyData = Object.values(hourlyGroups)
                        .map((g: any) => ({
                            time: g.time,
                            response: Math.round(g.avgResponse / g.count),
                            failures: g.failures
                        }))
                        .reverse(); // Show oldest to newest if API returns desc, wait logs API returns desc. So reverse is good? No, charts ideally left-to-right is time ascending. API returns DESC (newest first). So if we reverse, we get Oldest -> Newest. Correct.

                    setStats({
                        totalChecks,
                        avgResponseTime: Math.round(avgResponseTime),
                        uptimePercentage: parseFloat(uptimePercentage.toFixed(2)),
                        hourlyData
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <DashboardLayout>
            <div className="p-6 space-y-8 pb-20">
                <h1 className="text-2xl font-black text-secondary-900">Monitoring Analytics</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card-premium p-6 flex flex-col items-center justify-center bg-indigo-50/50 border-indigo-100">
                        <span className="text-4xl font-black text-indigo-600">{stats.uptimePercentage}%</span>
                        <span className="text-xs font-bold text-indigo-600 uppercase">Recent Uptime</span>
                    </div>
                    <div className="card-premium p-6 flex flex-col items-center justify-center bg-amber-50/50 border-amber-100">
                        <span className="text-4xl font-black text-amber-600">{stats.avgResponseTime}ms</span>
                        <span className="text-xs font-bold text-amber-600 uppercase">Avg Response Time</span>
                    </div>
                    <div className="card-premium p-6 flex flex-col items-center justify-center bg-blue-50/50 border-blue-100">
                        <span className="text-4xl font-black text-blue-600">{stats.totalChecks}</span>
                        <span className="text-xs font-bold text-blue-600 uppercase">Checks Performed</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6">Response Time Trend (Last 24h)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.hourlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} unit="ms" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line type="monotone" dataKey="response" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card-premium p-6">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6">Failures by Hour</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.hourlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f1f5f9' }}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="failures" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
