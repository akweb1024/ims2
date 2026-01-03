'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function ExecutiveDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExecutiveData();
    }, []);

    const fetchExecutiveData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/ai-insights?type=executive', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setStats(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div className="flex items-center justify-center h-[80vh]">
                <div className="animate-spin text-4xl">🌕</div>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
                    <div className="relative z-10">
                        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Command Center</h1>
                        <p className="text-slate-400 font-medium">Enterprise Health & AI Directives</p>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Revenue Card */}
                        <div className="card-premium bg-white p-8 border-l-8 border-emerald-500 relative overflow-hidden group hover:shadow-xl transition-all">
                            <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="text-9xl">💰</span>
                            </div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Monthly Revenue</h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-black text-slate-900">₹{stats.metrics.revenue.current.toLocaleString()}</span>
                            </div>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${parseFloat(stats.metrics.revenue.growth) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {parseFloat(stats.metrics.revenue.growth) >= 0 ? '↑' : '↓'} {Math.abs(stats.metrics.revenue.growth)}% vs Last Month
                            </div>
                        </div>

                        {/* Workforce Pulse */}
                        <div className="card-premium bg-white p-8 border-l-8 border-indigo-500 relative overflow-hidden group hover:shadow-xl transition-all">
                            <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="text-9xl">👥</span>
                            </div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Operational Pulse</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-3xl font-black text-slate-900">{stats.metrics.workforce.headcount}</div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Active Staff</p>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-indigo-600">{stats.metrics.workforce.productivityIndex}</div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Avg Productivity</p>
                                </div>
                            </div>
                        </div>

                        {/* Market Reach */}
                        <div className="card-premium bg-white p-8 border-l-8 border-amber-500 relative overflow-hidden group hover:shadow-xl transition-all">
                            <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="text-9xl">🚀</span>
                            </div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Market Reach</h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-black text-slate-900">{stats.metrics.market.activeClients}</span>
                            </div>
                            <p className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">Active Subscribers</p>
                        </div>
                    </div>
                )}

                {/* AI Decision Feed */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>

                            <div className="flex justify-between items-center mb-8 relative z-10">
                                <h3 className="text-xl font-bold flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    AI Decision Stream
                                </h3>
                                <div className="text-xs font-mono text-slate-400 border border-slate-700 px-3 py-1 rounded-full bg-slate-800">
                                    LIVE FEED
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {stats?.decisionFeed.length === 0 ? (
                                    <div className="p-10 text-center border border-dashed border-slate-700 rounded-2xl text-slate-500 font-mono">
                                        No critical anomalies detected. Systems nominal.
                                    </div>
                                ) : stats?.decisionFeed.map((item: any, i: number) => (
                                    <div key={i} className="bg-slate-800/50 hover:bg-slate-800 p-6 rounded-2xl border border-slate-700/50 transition-all flex items-start gap-5">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${item.type === 'HR_ALERT' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                            {item.type === 'HR_ALERT' ? '📉' : '⚠️'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-lg">{item.title}</h4>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                                                    }`}>
                                                    {item.severity}
                                                </span>
                                            </div>
                                            <p className="text-slate-400 text-sm mb-3 font-medium">{item.description}</p>

                                            <div className="bg-slate-900/50 p-3 rounded-lg border-l-2 border-indigo-400">
                                                <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Recommended Action</p>
                                                <p className="text-sm font-bold">{item.action}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">System Growth</h3>
                        {/* Placeholder Chart Visualization */}
                        <div className="h-64 flex items-end justify-between px-4 pb-4 border-b border-slate-200 mb-4 gap-2">
                            {[40, 65, 45, 70, 55, 80, 60].map((h, i) => (
                                <div key={i} className="w-full bg-slate-100 hover:bg-indigo-500 transition-colors rounded-t-lg relative group" style={{ height: `${h}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {h}%
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span>Sat</span>
                            <span>Sun</span>
                        </div>
                        <div className="mt-8 p-4 bg-indigo-50 rounded-xl">
                            <p className="text-indigo-900 font-bold text-sm mb-1">Insight</p>
                            <p className="text-indigo-700 text-xs leading-relaxed">System activity peaks on Thursdays. Recommend scheduling maintenance on Sundays.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
