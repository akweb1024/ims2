'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

export default function ProductivityAnalysisPage() {
    const [analysis, setAnalysis] = useState<any>(null);
    const [aiInsights, setAiInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [userRole, setUserRole] = useState('');

    const fetchAnalysis = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [prodRes, aiRes] = await Promise.all([
                fetch(`/api/hr/productivity?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/ai-insights?type=productivity&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (prodRes.ok) setAnalysis(await prodRes.json());
            if (aiRes.ok) setAiInsights(await aiRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [dateRange.startDate, dateRange.endDate]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchAnalysis();
    }, [fetchAnalysis]);

    if (loading && !analysis) return <div className="p-8 text-center">Crunching productivity data...</div>;

    const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a'];

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter">Productivity & Efficiency Intelligence</h1>
                        <p className="text-secondary-500 font-medium italic">Heuristic analysis of output across tasks, revenue, and support.</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            className="input text-xs"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            title="Start Date"
                        />
                        <input
                            type="date"
                            className="input text-xs"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            title="End Date"
                        />
                    </div>
                </div>

                {/* AI Insights block will follow here inside the same space-y-6 container */}

                {aiInsights && aiInsights.summaries && (
                    <div className="bg-primary-50 border border-primary-100 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">✨</span>
                            <h3 className="text-sm font-black text-primary-900 uppercase tracking-widest">AI Performance Narrative</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {aiInsights.summaries.map((summary: string, idx: number) => (
                                <div key={idx} className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/50 text-xs text-secondary-700 leading-relaxed shadow-sm hover:shadow-md transition-shadow">
                                    {summary.split('**').map((part, i) => i % 2 === 1 ? <b key={i} className="text-secondary-900 font-black">{part}</b> : part)}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-primary-400 uppercase tracking-widest">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse"></span>
                            Analyzing real-time operational artifacts...
                        </div>
                    </div>
                )}

                {aiInsights && aiInsights.warnings && aiInsights.warnings.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">⚠️</span>
                            <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Early Warning Radar</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {aiInsights.warnings.map((alert: any, idx: number) => (
                                <div key={idx} className={`p-4 rounded-2xl border bg-white/60 backdrop-blur-sm transition-all hover:shadow-lg ${alert.severity === 'critical' ? 'border-rose-200 ring-2 ring-rose-500/10' : 'border-warning-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <b className="text-secondary-900 text-xs font-black uppercase">{alert.name}</b>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${alert.severity === 'critical' ? 'bg-rose-500 text-white animate-pulse' : 'bg-warning-500 text-white'}`}>
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-secondary-600 font-medium leading-relaxed">{alert.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {analysis && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="card-premium">
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Team Efficiency</p>
                                <p className="text-3xl font-black text-secondary-900">{analysis.teamSummary.avgProductivity.toFixed(2)}</p>
                                <p className="text-[10px] text-secondary-400 mt-2">Pts per hour index</p>
                            </div>
                            <div className="card-premium">
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Total Revenue Generated</p>
                                <p className="text-3xl font-black text-success-600">₹{analysis.individualAnalysis.reduce((acc: any, curr: any) => acc + curr.metrics.totalRevenue, 0).toLocaleString()}</p>
                                <p className="text-[10px] text-secondary-400 mt-2">By all contributors</p>
                            </div>
                            <div className="card-premium">
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Tasks Completed</p>
                                <p className="text-3xl font-black text-primary-600">{analysis.individualAnalysis.reduce((acc: any, curr: any) => acc + curr.metrics.totalTasks, 0)}</p>
                                <p className="text-[10px] text-secondary-400 mt-2">Across selected timeframe</p>
                            </div>
                            <div className="card-premium bg-secondary-900 text-white border-0">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Top Performer</p>
                                <p className="text-2xl font-black truncate">{analysis.teamSummary.topPerformers[0]?.name || 'N/A'}</p>
                                <p className="text-[10px] text-white/60 mt-2">Score: {analysis.teamSummary.topPerformers[0]?.score}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Performance Chart */}
                            <div className="card-premium p-8">
                                <h3 className="text-lg font-black text-secondary-900 mb-8 uppercase tracking-tighter">Output Leaderboard (Normalized)</h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analysis.individualAnalysis} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800 }} width={100} />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                                {analysis.individualAnalysis.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Productivity Index Chart */}
                            <div className="card-premium p-8">
                                <h3 className="text-lg font-black text-secondary-900 mb-8 uppercase tracking-tighter">Efficiency Index (Score/Hour)</h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analysis.individualAnalysis}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800 }} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="productivityIndex" stroke="#7c3aed" strokeWidth={3} fill="#7c3aed" fillOpacity={0.1} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Analysis Table */}
                        <div className="card-premium p-0 overflow-hidden">
                            <div className="px-8 py-6 border-b border-secondary-50 bg-secondary-50/30 flex justify-between items-center">
                                <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest">Granular Productivity Matrix</h3>
                                <span className="text-[10px] text-secondary-400 font-bold uppercase">Weighted Output Metrics</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-secondary-600">
                                    <thead className="bg-secondary-50/50 text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-8 py-4">Employee</th>
                                            <th className="px-8 py-4">Workload</th>
                                            <th className="px-8 py-4">Service Metrics</th>
                                            <th className="px-8 py-4">Revenue</th>
                                            <th className="px-8 py-4">Quality Index</th>
                                            <th className="px-8 py-4 text-center">Efficiency</th>
                                            <th className="px-8 py-4">Aggregate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary-50">
                                        {analysis.individualAnalysis.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-secondary-900 text-xs">{item.name}</p>
                                                    <p className="text-[9px] text-secondary-400 font-bold uppercase mt-1">{item.role}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold text-secondary-700">{item.metrics.totalTasks} Tasks</span>
                                                        <span className="text-[10px] text-secondary-400">{item.metrics.totalHours.toFixed(1)} Hours Logged</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded text-[9px] font-black uppercase">{item.metrics.totalTickets} Tickets</span>
                                                        <span className="px-2 py-0.5 bg-warning-50 text-warning-600 rounded text-[9px] font-black uppercase">{item.metrics.totalChats} Chats</span>
                                                        <span className="px-2 py-0.5 bg-success-50 text-success-600 rounded text-[9px] font-black uppercase">{item.metrics.totalFollowUps} Follow-ups</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-secondary-900 text-xs">₹{item.metrics.totalRevenue.toLocaleString()}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-yellow-500">★</span>
                                                            <span className="text-xs font-black text-secondary-900">{item.metrics.avgManagerRating}</span>
                                                            <span className="text-[9px] text-secondary-400 font-bold uppercase">Mgr</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-primary-500">🎯</span>
                                                            <span className="text-xs font-bold text-secondary-700">{item.metrics.avgSelfRating}</span>
                                                            <span className="text-[9px] text-secondary-400 font-bold uppercase">Self</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className={`text-xs font-black p-2 rounded-xl inline-block ${item.productivityIndex > analysis.teamSummary.avgProductivity ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-600'}`}>
                                                        {item.productivityIndex}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1 h-1.5 w-24 bg-secondary-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary-600" style={{ width: `${Math.min(100, (item.score / analysis.teamSummary.topPerformers[0]?.score) * 100)}%` }}></div>
                                                        </div>
                                                        <span className="font-black text-secondary-900 text-xs">{item.score}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout >
    );
}
