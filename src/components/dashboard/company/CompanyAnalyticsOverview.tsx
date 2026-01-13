'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';

interface AnalyticsData {
    chartData: any[];
    stats: {
        totalRevenue: number;
        totalExpense: number;
        netProfit: number;
        growthRate: string;
        forecastNextMonth: number;
    };
}

export default function CompanyAnalyticsOverview({ companyId }: { companyId?: string }) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const url = companyId
                ? `/api/analytics/company/growth?companyId=${companyId}`
                : '/api/analytics/company/growth';

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <div className="h-64 flex items-center justify-center">Loading Analytics...</div>;
    if (!data) return <div className="h-64 flex items-center justify-center text-gray-500">No Data Available</div>;

    const { stats, chartData } = data;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-premium p-4 border-l-4 border-primary-500">
                    <p className="text-sm text-secondary-500 font-bold uppercase">Total Revenue</p>
                    <p className="text-2xl font-bold text-secondary-900">₹{stats.totalRevenue.toLocaleString()}</p>
                    <span className={`text-xs font-bold ${parseFloat(stats.growthRate) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {parseFloat(stats.growthRate) >= 0 ? '↑' : '↓'} {stats.growthRate}% Growth
                    </span>
                </div>
                <div className="card-premium p-4 border-l-4 border-red-500">
                    <p className="text-sm text-secondary-500 font-bold uppercase">Total Expenses</p>
                    <p className="text-2xl font-bold text-secondary-900">₹{stats.totalExpense.toLocaleString()}</p>
                    <p className="text-xs text-secondary-400">Payroll & Operations</p>
                </div>
                <div className="card-premium p-4 border-l-4 border-success-500">
                    <p className="text-sm text-secondary-500 font-bold uppercase">Net Profit</p>
                    <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                        ₹{stats.netProfit.toLocaleString()}
                    </p>
                    <p className="text-xs text-secondary-400">Margin: {stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="card-premium p-4 border-l-4 border-purple-500 bg-purple-50">
                    <p className="text-sm text-purple-700 font-bold uppercase">Forecast (Next Mo)</p>
                    <p className="text-2xl font-bold text-purple-900">₹{stats.forecastNextMonth.toLocaleString()}</p>
                    <p className="text-xs text-purple-600">AI Projection based on trend</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Growth Chart */}
                <div className="card-premium p-6 lg:col-span-2">
                    <h3 className="font-bold text-lg text-secondary-900 mb-4">Financial Growth Trend</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                                <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExp)" name="Expenses" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Profit Bar Chart */}
                <div className="card-premium p-6">
                    <h3 className="font-bold text-lg text-secondary-900 mb-4">Net Profit Analysis</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" hide />
                                <Tooltip />
                                <Bar dataKey="profit" name="Net Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-sm text-secondary-500">12-Month Consistency</p>
                        <p className="font-bold text-success-600 text-lg">
                            {chartData.filter(d => d.profit > 0).length} / 12 Profitable Months
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
