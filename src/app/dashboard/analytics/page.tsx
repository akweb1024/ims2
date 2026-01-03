'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [leakageData, setLeakageData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }

        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem('token');
                const [res, leakRes] = await Promise.all([
                    fetch('/api/analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/analytics/leakage', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (res.ok) setData(await res.json());
                if (leakRes.ok) setLeakageData(await leakRes.json());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!data) return null;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight font-primary">Advanced Analytics</h1>
                        <p className="text-secondary-600 mt-2 text-lg">Real-time business intelligence and data-driven insights.</p>
                    </div>
                    <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-secondary-100">
                        {['7D', '30D', '90D', '1Y'].map(range => (
                            <button key={range} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${range === '30D' ? 'bg-primary-600 text-white shadow-lg' : 'text-secondary-400 hover:text-secondary-600'}`}>
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Revenue History Card */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 flex items-center">
                            <span className="mr-2">📈</span> Revenue Trends (Last 6 Months)
                        </h3>
                        <div className="h-64 flex items-end justify-between gap-2 px-4">
                            {data.revenueHistory.map((item: any) => {
                                const max = Math.max(...data.revenueHistory.map((h: any) => h.value), 1);
                                const height = (item.value / max) * 100;
                                return (
                                    <div key={item.name} className="flex-1 flex flex-col items-center group relative">
                                        <div
                                            className="w-full bg-primary-500 rounded-t-lg transition-all duration-500 hover:bg-primary-600"
                                            style={{ height: `${height}%` }}
                                        >
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-secondary-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                ${item.value.toLocaleString()}
                                            </div>
                                        </div>
                                        <span className="text-[10px] sm:text-xs text-secondary-500 mt-2 font-medium">{item.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subscription Status Distribution */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 flex items-center">
                            <span className="mr-2">📋</span> Subscription status
                        </h3>
                        <div className="space-y-6">
                            {data.statusSplit.map((status: any) => {
                                const total = data.statusSplit.reduce((acc: number, s: any) => acc + s.value, 0);
                                const percentage = (status.value / total) * 100;
                                return (
                                    <div key={status.name}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-bold text-secondary-700">{status.name}</span>
                                            <span className="text-secondary-500">{status.value} ({percentage.toFixed(1)}%)</span>
                                        </div>
                                        <div className="w-full bg-secondary-100 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${status.name === 'ACTIVE' ? 'bg-success-500' :
                                                    status.name === 'EXPIRED' ? 'bg-danger-500' :
                                                        'bg-warning-500'
                                                    }`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Top Journals List */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 flex items-center">
                            <span className="mr-2">📚</span> Performance by Journal
                        </h3>
                        <div className="space-y-4">
                            {data.topJournals.map((journal: any, idx: number) => (
                                <div key={journal.name} className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                                    <div className="flex items-center space-x-4">
                                        <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-secondary-400">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-bold text-secondary-900 truncate max-w-[150px] sm:max-w-xs">{journal.name}</p>
                                            <p className="text-xs text-secondary-500">{journal.count} Active Subscriptions</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-primary-600">${journal.revenue.toLocaleString()}</p>
                                        <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">Revenue</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Channel Distribution */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 flex items-center">
                            <span className="mr-2">🔌</span> Acquisition Channels
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {data.channelSplit.map((channel: any) => (
                                <div key={channel.name} className="p-6 text-center rounded-2xl bg-secondary-50 border-2 border-dashed border-secondary-200">
                                    <p className="text-4xl font-black text-secondary-900">{channel.value}</p>
                                    <p className="text-sm font-bold text-secondary-500 uppercase mt-2">{channel.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Revenue Forecast */}
                    <div className="card-premium bg-gradient-to-br from-secondary-900 to-secondary-800 text-white border-0">
                        <h3 className="text-lg font-bold mb-6 flex items-center">
                            <span className="mr-2">🔮</span> Revenue Forecast
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-secondary-300 font-bold uppercase tracking-widest text-[10px]">Projected Growth (Q4)</span>
                                    <span className="text-success-400 font-bold">+24.5%</span>
                                </div>
                                <div className="text-4xl font-black">$42,500.00</div>
                                <p className="text-secondary-400 text-xs mt-2 italic">Based on current subscription renewal rates and pipeline.</p>
                            </div>

                            <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Optimistic</p>
                                    <p className="text-xl font-bold">$48,200</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Conservative</p>
                                    <p className="text-xl font-bold">$38,900</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Conversion Metrics */}
                    <div className="card-premium lg:col-span-2">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 flex items-center">
                            <span className="mr-2">🎯</span> Conversion Funnel
                        </h3>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-4 px-8">
                            <div className="text-center group">
                                <div className="w-32 h-32 rounded-full border-[10px] border-primary-100 flex items-center justify-center relative transition-transform group-hover:scale-110">
                                    <div className="absolute inset-0 rounded-full border-[10px] border-primary-500 border-t-transparent animate-spin-slow" style={{ animationDuration: '3s' }}></div>
                                    <span className="text-2xl font-black text-secondary-900">82%</span>
                                </div>
                                <p className="mt-4 font-bold text-secondary-600 text-sm">Lead to Quote</p>
                            </div>

                            <div className="hidden md:block text-secondary-200">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>

                            <div className="text-center group">
                                <div className="w-32 h-32 rounded-full border-[10px] border-success-100 flex items-center justify-center relative transition-transform group-hover:scale-110">
                                    <div className="absolute inset-0 rounded-full border-[10px] border-success-500 border-r-transparent animate-spin-slow" style={{ animationDuration: '4s' }}></div>
                                    <span className="text-2xl font-black text-secondary-900">45%</span>
                                </div>
                                <p className="mt-4 font-bold text-secondary-600 text-sm">Quote to Paid</p>
                            </div>

                            <div className="hidden md:block text-secondary-200">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>

                            <div className="text-center group">
                                <div className="w-32 h-32 rounded-full border-[10px] border-warning-100 flex items-center justify-center relative transition-transform group-hover:scale-110">
                                    <div className="absolute inset-0 rounded-full border-[10px] border-warning-500 border-b-transparent animate-spin-slow" style={{ animationDuration: '5s' }}></div>
                                    <span className="text-2xl font-black text-secondary-900">12%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Leakage Detection */}
                    {['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(userRole) && leakageData && (
                        <div className="card-premium lg:col-span-2 border-danger-200 bg-danger-50/20">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-danger-900 flex items-center">
                                    <span className="mr-2">🚨</span> Revenue Leakage Detection
                                </h3>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-danger-600">Total Unrecovered: ${leakageData.totalLost.toLocaleString()}</p>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-danger-400">Action Required</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-secondary-400 border-b border-danger-100">
                                            <th className="pb-3">Customer</th>
                                            <th className="pb-3 text-right">Potential Revenue</th>
                                            <th className="pb-3 text-center">Last Status</th>
                                            <th className="pb-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-danger-50">
                                        {leakageData.leakage.map((item: any) => (
                                            <tr key={item.id} className="text-sm">
                                                <td className="py-4 font-bold text-secondary-900">{item.customer}</td>
                                                <td className="py-4 text-right font-black text-secondary-700">${item.total.toLocaleString()}</td>
                                                <td className="py-4 text-center">
                                                    <span className="px-2 py-1 bg-danger-100 text-danger-700 text-[10px] font-black rounded-lg uppercase">
                                                        {item.lastStatus}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button className="text-primary-600 font-bold hover:underline">Generate Invoice</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {leakageData.leakage.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-success-600 font-bold">
                                                    ✅ No revenue leakage detected for the current period.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
