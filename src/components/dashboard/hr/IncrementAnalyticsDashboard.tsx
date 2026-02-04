'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import {
    TrendingUp, TrendingDown, Users, DollarSign, Target, Award, ArrowUpRight,
    ArrowDownRight, Building2, BarChart3, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/exchange-rates';

interface IncrementAnalyticsProps {
    data: any;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function IncrementAnalyticsDashboard({ data }: IncrementAnalyticsProps) {
    const [view, setView] = useState<'CURRENT' | 'FORECAST'>('CURRENT');
    const { stats, trends, departments, distribution, topAdjustments, forecast, quarterlyBreakdown, fiscalYear } = data;

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="p-8 text-center animate-pulse text-secondary-500 font-bold">Initializing Dashboard...</div>;

    const StatCard = ({ title, value, subValue, trend, icon: Icon, color }: any) => (
        <div className={`card-premium p-6 relative overflow-hidden group border-${view === 'FORECAST' ? 'purple-200' : 'transparent'}`}>
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-all duration-500`}></div>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-secondary-500 font-bold text-xs uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-3xl font-black text-secondary-900 mb-1">{value}</h3>
                    {subValue && <p className="text-secondary-600 text-sm font-medium">{subValue}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-${view === 'FORECAST' ? 'purple' : (trend.startsWith('+') ? 'success' : 'danger')}-600 font-bold text-sm`}>
                            {['+', '-'].includes(trend[0]) ? (trend.startsWith('+') ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />) : <Activity size={16} />}
                            {trend}
                        </div>
                    )}
                </div>
                <div className={`p-3 bg-${color}-100 text-${color}-600 rounded-2xl shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );

    const currentStats = [
        { title: "Total Budget Impact", value: formatCurrency(stats.totalApprovedBudgetImpact), sub: `${stats.approvedCount} approved increments`, trend: `+${stats.averagePercentage.toFixed(1)}% Avg.`, icon: DollarSign, color: "primary" },
        { title: "Perks Impact", value: formatCurrency(stats.totalApprovedPerksImpact), sub: "Sec-10 Exemp changes", trend: stats.totalApprovedPerksImpact >= 0 ? "+Perks Added" : "Perks Reduced", icon: TrendingUp, color: "success" },
        { title: "Pending Cycle Impact", value: formatCurrency(stats.totalPendingBudgetImpact), sub: `${stats.pendingCount} approvals required`, trend: "Needs Review", icon: Activity, color: "orange" },
        { title: "Effective ROI Multiplier", value: `${stats.roiMultiplier.toFixed(1)}x`, sub: "Revenue vs Payroll cost", trend: "+0.4x improve", icon: TrendingUp, color: "indigo" }
    ];

    const forecastStats = forecast ? [
        { title: "Projected Budget (FY)", value: formatCurrency(forecast.projectedBudget), sub: "Based on current run rate", trend: "Artificial Intelligence", icon: BarChart3, color: "purple" },
        { title: "Confidence Score", value: `${(forecast.confidenceScore * 100).toFixed(0)}%`, sub: "Algorithm reliability", trend: "High Confidence", icon: Target, color: "emerald" },
        { title: "Future Liabilities", value: formatCurrency(forecast.projectedBudget * 0.12), sub: "Estimated statutory overhead", trend: "+12% projected", icon: TrendingDown, color: "rose" },
        { title: "Recruitment Budget", value: formatCurrency(stats.totalApprovedBudgetImpact * 0.3), sub: "30% of increment budget", trend: "Allocation", icon: Users, color: "blue" }
    ] : [];

    const displayStats = view === 'FORECAST' ? forecastStats : currentStats;
    const chartData = view === 'FORECAST' ? forecast?.trends || [] : trends;

    return (
        <div className="space-y-8 pb-12">
            {/* Header Context */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Salary Increment 360° Analysis</h2>
                        {fiscalYear && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-xl text-sm font-black ring-1 ring-amber-200">
                                FY {fiscalYear}
                            </span>
                        )}
                    </div>
                    <p className="text-secondary-600 mt-1 font-medium italic">
                        {view === 'FORECAST' ? 'Predictive modeling of future salary expenditures.' : 'Strategic visualization of organizational budget impact and growth targets.'}
                    </p>
                </div>
                <div className="flex gap-2 bg-secondary-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setView('CURRENT')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'CURRENT' ? 'bg-white shadow-sm text-secondary-900 border border-secondary-200' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        Current Year
                    </button>
                    <button
                        onClick={() => setView('FORECAST')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'FORECAST' ? 'bg-purple-600 shadow-sm text-white shadow-purple-200' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        Forecasting
                    </button>
                </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayStats.map((s: any, i: number) => (
                    <StatCard
                        key={i}
                        title={s.title}
                        value={s.value}
                        subValue={s.sub}
                        trend={s.trend}
                        icon={s.icon}
                        color={s.color}
                    />
                ))}
            </div>

            {/* NEW: Quarterly Aggregate Targets */}
            <div className="card-premium p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                            <Target className="text-teal-500" size={20} />
                            Quarterly Target Aggregates (FY {fiscalYear})
                        </h3>
                        <p className="text-xs text-secondary-500 font-bold uppercase mt-1">Total combined revenue commitment</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
                        const val = quarterlyBreakdown?.[q.toLowerCase()] || 0;
                        return (
                            <div key={q} className="p-4 bg-secondary-50 rounded-2xl border border-secondary-100/50">
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{q} Total Target</p>
                                <p className="text-xl font-black text-secondary-900 mt-1">{formatCurrency(val)}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Budget Impact & Revenue Target Trend */}
                <div className={`card-premium p-6 ${view === 'FORECAST' ? 'border-purple-100 bg-purple-50/10' : ''}`}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                <Activity className={view === 'FORECAST' ? "text-purple-500" : "text-primary-500"} size={20} />
                                {view === 'FORECAST' ? 'Projected Spending' : 'Impact vs Revenue Commitment'}
                            </h3>
                            <p className="text-xs text-secondary-500 font-bold uppercase mt-1">
                                {view === 'FORECAST' ? 'AI-driven cost prediction (Next 6 Mo)' : 'Salary increase relative to new revenue targets'}
                            </p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} tickFormatter={(value) => `\u20b9${value / 1000}k`} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#10b981', fontSize: 12, fontWeight: 600 }} tickFormatter={(value) => `\u20b9${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                                    formatter={(value: any, name: any) => [formatCurrency(value), name === 'amount' ? 'Budget Impact' : 'Revenue Target']}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="amount"
                                    stroke={view === 'FORECAST' ? "#9333ea" : "#4f46e5"}
                                    strokeWidth={3}
                                    fill={view === 'FORECAST' ? "#9333ea20" : "#4f46e520"}
                                    name="Budget Impact"
                                />
                                {view !== 'FORECAST' && (
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="revenueTarget"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#10b981' }}
                                        name="Revenue Target"
                                    />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Budget Impact Breakdown (Salaray Components) */}
                <div className="card-premium p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                <DollarSign className="text-indigo-500" size={20} />
                                Salary Component Impact
                            </h3>
                            <p className="text-xs text-secondary-500 font-bold uppercase mt-1">Breakdown of monthly costs</p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Fixed Pay', amount: stats.breakdown?.fixed || 0, color: '#4f46e5' },
                                { name: 'Variable Pay', amount: stats.breakdown?.variable || 0, color: '#10b981' },
                                { name: 'Incentives', amount: stats.breakdown?.incentive || 0, color: '#f59e0b' },
                                { name: 'Perks', amount: stats.breakdown?.perks || 0, color: '#ef4444' }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} tickFormatter={(value) => `\u20b9${(value / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                                    formatter={(value: any) => [formatCurrency(value), 'Impact']}
                                />
                                <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={45}>
                                    {[0, 1, 2, 3].map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444'][index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Target Split Analysis */}
                <div className="card-premium p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                <Target className="text-rose-500" size={20} />
                                Revenue Target Split
                            </h3>
                            <p className="text-xs text-secondary-500 font-bold uppercase mt-1">Fixed vs Variable targets</p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Fixed Revenue', value: stats.targetBreakdown?.fixed || 0 },
                                        { name: 'Variable Revenue', value: stats.targetBreakdown?.variable || 0 }
                                    ]}
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={10}
                                    dataKey="value"
                                >
                                    <Cell fill="#6366f1" />
                                    <Cell fill="#10b981" />
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any) => [formatCurrency(value), 'Total']}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Departmental ROI Comparison */}
                <div className="card-premium p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                <Building2 className="text-blue-500" size={20} />
                                Dept. Efficiency (Target vs Cost)
                            </h3>
                            <p className="text-xs text-secondary-500 font-bold uppercase mt-1">Commitment vs Investment by department</p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departments} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                                />
                                <Legend />
                                <Bar dataKey="impact" name="Cost Impact" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={15} />
                                <Bar dataKey="target" name="Revenue Target" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Distribution Analysis */}
                <div className="card-premium p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                <PieChartIcon className="text-orange-500" size={20} />
                                Percentage Tiers
                            </h3>
                            <p className="text-xs text-secondary-500 font-bold uppercase mt-1">Increment range distribution</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={8}
                                    dataKey="count"
                                >
                                    {distribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-secondary-900">{stats.approvedCount}</span>
                            <span className="text-xs text-secondary-500 font-bold uppercase">Total Applied</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        {distribution.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                <span className="text-[11px] font-bold text-secondary-600 truncate">{item.range}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Adjustments Table */}
                <div className="card-premium p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                <Users className="text-indigo-500" size={20} />
                                High Impact Adjustments
                            </h3>
                            <p className="text-xs text-secondary-500 font-bold uppercase mt-1">Latest significant salary changes</p>
                        </div>
                        <button className="px-4 py-2 text-xs font-black text-primary-600 hover:bg-primary-50 rounded-xl transition-colors">View All Details</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-secondary-100">
                                    <th className="pb-4 text-xs font-black text-secondary-400 uppercase tracking-wider">Employee</th>
                                    <th className="pb-4 text-xs font-black text-secondary-400 uppercase tracking-wider">Department</th>
                                    <th className="pb-4 text-xs font-black text-secondary-400 uppercase tracking-wider text-right">Adjustment</th>
                                    <th className="pb-4 text-xs font-black text-secondary-400 uppercase tracking-wider text-right">Growth %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {topAdjustments.map((inc: any, idx: number) => (
                                    <tr key={idx} className="group hover:bg-secondary-50/50 transition-colors">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-primary-100 flex items-center justify-center text-primary-600 font-black shadow-sm group-hover:scale-110 transition-transform">
                                                    {inc.employee.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-secondary-900">{inc.employee.name}</p>
                                                    <p className="text-xs text-secondary-500 font-medium">Applied: {new Date(inc.effectiveDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className="px-3 py-1 bg-secondary-100 rounded-lg text-xs font-bold text-secondary-700">{inc.department}</span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <p className="font-black text-secondary-900">+{formatCurrency(inc.amount)}</p>
                                            <p className="text-[10px] text-secondary-500 font-bold uppercase">Monthly Impact</p>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5 font-black text-success-600">
                                                <ArrowUpRight size={14} />
                                                {inc.percentage.toFixed(1)}%
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
