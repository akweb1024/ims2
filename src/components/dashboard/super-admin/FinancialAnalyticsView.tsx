
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, ComposedChart, Cell, PieChart, Pie
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, Target, Activity,
    Building2, BarChart3, PieChart as PieChartIcon, ArrowUpRight,
    ArrowDownRight, RefreshCw, Landmark, Wallet
} from 'lucide-react';
import { formatCurrency } from '@/lib/exchange-rates';
import { Loader2 } from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface FinancialsData {
    summary: {
        totalIncrementImpact: number;
        totalRevenue: number;
        totalLedgerExpenses: number;
        totalOverallExpenses: number;
        activeIncrements: number;
        revenueCount: number;
        avgIncrementPercentage: number;
        groupRoi: string;
    };
    trends: any[];
    companyBreakdown: any[];
    fiscalYear: string;
}

export default function FinancialAnalyticsView() {
    const [data, setData] = useState<FinancialsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await fetch('/api/super-admin/financials/analytics');
            if (!res.ok) throw new Error("Failed to fetch financial data");
            const json = await res.json();
            setData(json);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
                    <p className="text-secondary-500 font-medium animate-pulse">Analyzing Global Financials...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-10 text-center">
                <div className="bg-danger-50 text-danger-600 p-6 rounded-2xl border border-danger-100 max-w-md mx-auto">
                    <p className="font-bold text-lg mb-2">Analysis Error</p>
                    <p className="text-sm mb-4">{error || "No data available"}</p>
                    <button onClick={() => fetchData()} className="btn-danger py-2 px-6">Retry Analysis</button>
                </div>
            </div>
        );
    }

    const StatCard = ({ title, value, subValue, trend, icon: Icon, color }: any) => (
        <div className="card-premium p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-all duration-500`}></div>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-secondary-500 font-bold text-xs uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-3xl font-black text-secondary-900 mb-1">{value}</h3>
                    {subValue && <p className="text-secondary-600 text-sm font-medium">{subValue}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 font-bold text-sm ${parseFloat(trend) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {parseFloat(trend) >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            {trend}%
                        </div>
                    )}
                </div>
                <div className={`p-4 bg-${color}-100 text-${color}-600 rounded-2xl shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-secondary-900 tracking-tight tracking-tighter">Global Financial Analysis</h2>
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-xl text-sm font-black ring-1 ring-primary-200">
                            MD Report • {data.fiscalYear}
                        </span>
                    </div>
                    <p className="text-secondary-600 mt-1 font-medium italic">
                        Integrated view of Salary Increments vs Revenue Transactions.
                    </p>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-colors disabled:opacity-50 text-sm font-bold text-secondary-700"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Refresh Stats
                </button>
            </div>

            {/* Key Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(data.summary.totalRevenue)}
                    subValue={`${data.summary.revenueCount} Recorded Transactions`}
                    icon={Landmark}
                    color="indigo"
                />
                <StatCard
                    title="Increment Impact"
                    value={formatCurrency(data.summary.totalIncrementImpact)}
                    subValue={`${data.summary.activeIncrements} Approved Records`}
                    icon={TrendingUp}
                    color="rose"
                />
                <StatCard
                    title="Group ROI"
                    value={`${data.summary.groupRoi}x`}
                    subValue="Revenue / Increment Cost"
                    icon={Activity}
                    color="emerald"
                />
                <StatCard
                    title="Avg Increment"
                    value={`${data.summary.avgIncrementPercentage.toFixed(1)}%`}
                    subValue="Across all entities"
                    icon={Wallet}
                    color="amber"
                />
                <StatCard
                    title="Ledger Expenses"
                    value={formatCurrency(data.summary.totalLedgerExpenses || 0)}
                    subValue="Non-salary outgoing"
                    icon={Target}
                    color="rose"
                />
            </div>

            {/* Main Trend Chart */}
            <div className="card-premium p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                            <BarChart3 className="text-primary-500" size={24} />
                            Revenue vs Increment Trend
                        </h3>
                        <p className="text-sm text-secondary-500 font-bold uppercase mt-1">Monthly financial performance comparison</p>
                    </div>
                </div>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '16px' }}
                                formatter={(value: any, name: any) => [formatCurrency(value), name]}
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" />
                            <Area yAxisId="left" type="monotone" dataKey="revenue" fill="#4f46e520" stroke="#4f46e5" strokeWidth={3} name="Revenue" />
                            <Bar yAxisId="left" dataKey="totalExpense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} name="Total Expenses" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Company Breakdown Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 card-premium p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                                <Building2 className="text-indigo-500" size={24} />
                                Entity Performance Breakdown
                            </h3>
                            <p className="text-sm text-secondary-500 font-bold uppercase mt-1">Financial health by company</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-secondary-100">
                                    <th className="pb-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Company Name</th>
                                    <th className="pb-4 text-xs font-black text-secondary-400 uppercase tracking-widest text-right">Revenue</th>
                                    <th className="pb-4 text-xs font-black text-secondary-400 uppercase tracking-widest text-right">Inc. Impact</th>
                                    <th className="pb-4 text-xs font-black text-secondary-400 uppercase tracking-widest text-right">ROI Rank</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {data.companyBreakdown.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi)).map((comp, idx) => (
                                    <tr key={comp.id} className="group hover:bg-secondary-50/50 transition-colors">
                                        <td className="py-4 font-bold text-secondary-900">{comp.name}</td>
                                        <td className="py-4 text-right font-black text-indigo-600">{formatCurrency(comp.revenueTotal)}</td>
                                        <td className="py-4 text-right font-black text-rose-500">{formatCurrency(comp.incrementImpact)}</td>
                                        <td className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-black ${parseFloat(comp.roi) > 5 ? 'bg-success-100 text-success-700' : parseFloat(comp.roi) > 2 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {comp.roi}x
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Growth Distribution Pie */}
                <div className="card-premium p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                                <PieChartIcon className="text-orange-500" size={24} />
                                Revenue Share
                            </h3>
                            <p className="text-sm text-secondary-500 font-bold uppercase mt-1">Contribution by entity</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.companyBreakdown.filter(c => c.revenueTotal > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={8}
                                    dataKey="revenueTotal"
                                    nameKey="name"
                                >
                                    {data.companyBreakdown.filter(c => c.revenueTotal > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-secondary-900 italic">Global</span>
                            <span className="text-xs text-secondary-500 font-black uppercase">Revenue</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        {data.companyBreakdown.filter(c => c.revenueTotal > 0).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                <span className="text-[10px] font-black text-secondary-500 truncate uppercase tracking-tighter">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

