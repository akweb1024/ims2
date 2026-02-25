'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    BarChart3, TrendingUp, Users, Clock, Award, Target,
    ArrowUpRight, ArrowDownRight, Search, Zap,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area,
} from 'recharts';

interface PerformanceData {
    members: Array<{
        userId: string; name: string; email: string; designation: string;
        stats: { completedTasks: number; totalHours: number; billableHours: number; billablePercentage: number; revenueGenerated: number };
    }>;
    trends: Array<{ month: string; year: number; completedTasks: number; revenue: number; hours: number }>;
    servicePopularity: Array<{ name: string; count: number; revenue: number }>;
}

export default function PerformancePage() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState('6');

    const fetchPerformanceData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/it/analytics/performance?months=${timeRange}`);
            if (response.ok) setData(await response.json());
        } catch (error) { console.error('Failed to fetch performance data:', error); }
        finally { setLoading(false); }
    }, [timeRange]);

    useEffect(() => { fetchPerformanceData(); }, [fetchPerformanceData]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-secondary-500 text-sm">Loading performance analytics...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const filteredMembers = data?.members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.designation.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const totalRevenue = data?.trends.reduce((sum, t) => sum + t.revenue, 0) || 0;
    const totalTasks = data?.trends.reduce((sum, t) => sum + t.completedTasks, 0) || 0;
    const totalHours = data?.trends.reduce((sum, t) => sum + t.hours, 0) || 0;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-warning-50 flex items-center justify-center">
                                <Award className="h-5 w-5 text-warning-600" />
                            </span>
                            Performance Analytics
                        </h1>
                        <p className="text-secondary-500 mt-1 text-sm">Tracking productivity and efficiency of the IT department</p>
                    </div>
                    <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="input-premium w-auto text-sm font-semibold" title="Time Range">
                        <option value="3">Last 3 Months</option>
                        <option value="6">Last 6 Months</option>
                        <option value="12">Last 12 Months</option>
                    </select>
                </div>

                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                        { label: 'Tasks Completed', value: totalTasks, icon: <Target className="h-5 w-5 text-primary-600" />, bg: 'border-primary-500', trend: 12, up: true },
                        { label: 'Revenue Contribution', value: `₹${totalRevenue.toLocaleString()}`, icon: <TrendingUp className="h-5 w-5 text-success-600" />, bg: 'border-success-500', trend: 8, up: true },
                        { label: 'Hours Logged', value: `${totalHours.toLocaleString()}h`, icon: <Clock className="h-5 w-5 text-purple-600" />, bg: 'border-purple-500', trend: 3, up: false },
                    ].map((stat, i) => (
                        <div key={i} className={`card-premium border-b-4 ${stat.bg}`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="p-2 bg-secondary-100 rounded-xl">{stat.icon}</span>
                                <span className={`flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${stat.up ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}`}>
                                    {stat.up ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}{stat.trend}%
                                </span>
                            </div>
                            <p className="text-sm text-secondary-500 font-medium">{stat.label}</p>
                            <p className="text-3xl font-bold text-secondary-900 mt-1">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Trend Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card-premium">
                        <h3 className="text-base font-bold text-secondary-900 mb-5 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary-600" /> Performance Trends
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.trends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                    <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                                    <Bar yAxisId="left" dataKey="completedTasks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tasks" />
                                    <Bar yAxisId="right" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="card-premium">
                        <h3 className="text-base font-bold text-secondary-900 mb-5 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-purple-600" /> Hour Logging Trend
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.trends}>
                                    <defs>
                                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHours)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Service Popularity */}
                {data?.servicePopularity && data.servicePopularity.length > 0 && (
                    <div className="card-premium">
                        <h3 className="text-base font-bold text-secondary-900 mb-5 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-warning-500" /> Most Popular IT Services
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.servicePopularity} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" width={130} tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Bar dataKey="count" fill="#3b82f6" name="Requests" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {data.servicePopularity.slice(0, 4).map((service, idx) => (
                                    <div key={idx} className="p-4 bg-secondary-50 border border-secondary-100 rounded-xl">
                                        <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-2">{service.name}</p>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-2xl font-black text-secondary-900">{service.count}</p>
                                                <p className="text-xs text-secondary-400">Total Requests</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-base font-bold text-success-600">₹{service.revenue.toLocaleString()}</p>
                                                <p className="text-xs text-secondary-400">Revenue</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Team Ranking Table */}
                <div className="card-premium p-0 overflow-hidden">
                    <div className="p-5 border-b border-secondary-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-base font-bold text-secondary-900 flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary-600" /> Team Achievement Ranking
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                            <input type="text" placeholder="Search member..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-premium pl-9 w-full md:w-56 text-sm" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 text-secondary-400 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Member</th>
                                    <th className="px-6 py-4 text-center">Tasks Done</th>
                                    <th className="px-6 py-4 text-center">Hours</th>
                                    <th className="px-6 py-4 text-center">Billable %</th>
                                    <th className="px-6 py-4 text-right">Revenue Contrib.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {filteredMembers.map((member) => (
                                    <tr key={member.userId} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold text-sm">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-secondary-900 text-sm">{member.name}</p>
                                                    <p className="text-xs text-secondary-400">{member.designation}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-primary-100 text-primary-700 font-bold text-sm">
                                                {member.stats.completedTasks}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-semibold text-secondary-700">
                                            {member.stats.totalHours}h
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="w-28 mx-auto">
                                                <div className="flex justify-between mb-1 text-xs font-medium text-secondary-400">
                                                    <span>Billable</span><span>{member.stats.billablePercentage}%</span>
                                                </div>
                                                <div className="w-full bg-secondary-100 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${member.stats.billablePercentage > 80 ? 'bg-success-500' : member.stats.billablePercentage > 50 ? 'bg-primary-500' : 'bg-warning-500'}`}
                                                        style={{ width: `${member.stats.billablePercentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-success-600">
                                            ₹{member.stats.revenueGenerated.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {filteredMembers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-secondary-400">No members found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* KPI Insight Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative overflow-hidden rounded-2xl p-7 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold mb-2">High Efficiency Badge</h3>
                            <p className="text-indigo-100 opacity-90 text-sm max-w-xs">
                                Awarded to members with over 85% billable ratio and consistency in task delivery.
                            </p>
                        </div>
                        <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 shrink-0 ml-4">
                            <Award className="h-8 w-8 text-yellow-300" />
                        </div>
                    </div>
                    <div className="card-premium border-l-4 border-warning-400">
                        <h3 className="text-base font-bold text-secondary-900 mb-2">Insight of the Month</h3>
                        <p className="text-secondary-500 italic text-sm">
                            &ldquo;The department has seen a 15% increase in task completion efficiency
                            since implementing the new project management workflow. Keep it up!&rdquo;
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
