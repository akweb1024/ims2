'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, DollarSign, PieChart as PieIcon, Building2, Users } from 'lucide-react';

interface SalaryData {
    byManager: Array<{ managerId: string; managerName: string; totalExpenditure: number }>;
    byDepartment: Array<{ name: string; total: number }>;
    breakdown?: { fixed: number; variable: number; incentive: number; fixedTarget?: number; reimbursements?: number };
    financials?: {
        revenue: number;
        cost: number;
        profit: number;
        profitMargin: number;
    };
}

interface SalaryAnalysisProps {
    data: SalaryData;
    companyStats?: any[]; // New prop for P&L data
}

export default function SalaryAnalysisSection({ data, companyStats = [] }: SalaryAnalysisProps) {
    const [viewMode, setViewMode] = useState<'GLOBAL' | 'COMPANY'>('GLOBAL');

    if (!data) return <div>Loading...</div>;

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(val);
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    const renderCompanyView = () => {
        // Transform Company Stats for Chart
        const companyPnLData = companyStats.map((c: any) => ({
            name: c.companyName,
            Revenue: c.totalRevenue,
            Burn: c.monthlyBurn * 12, // Annualized
            Profit: c.netProfit,
            Impact: c.projectedSalary - c.monthlyBurn
        })).sort((a, b) => b.Revenue - a.Revenue);

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* KPI Cards for Top Performers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-l-4 border-l-emerald-500">
                        <CardContent className="p-6">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Highest Profit Margin</p>
                            {(() => {
                                const top = [...companyStats].sort((a, b) => b.profitMargin - a.profitMargin)[0];
                                return top ? (
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-lg font-black text-gray-900">{top.companyName}</h4>
                                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold">
                                                {top.profitMargin.toFixed(1)}%
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2">Net Profit: {formatCurrency(top.netProfit)}</p>
                                    </div>
                                ) : <p className="text-sm text-gray-400">No data</p>;
                            })()}
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500">
                        <CardContent className="p-6">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Highest Increment Impact</p>
                            {(() => {
                                const top = [...companyStats].sort((a, b) => (b.projectedSalary - b.monthlyBurn) - (a.projectedSalary - a.monthlyBurn))[0];
                                const impact = top ? (top.projectedSalary - top.monthlyBurn) : 0;
                                return top ? (
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-lg font-black text-gray-900">{top.companyName}</h4>
                                            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">
                                                +{formatCurrency(impact)}/mo
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2">New Monthly Burn: {formatCurrency(top.projectedSalary)}</p>
                                    </div>
                                ) : <p className="text-sm text-gray-400">No data</p>;
                            })()}
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-indigo-500">
                        <CardContent className="p-6">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Highest Revenue</p>
                            {(() => {
                                const top = [...companyStats].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
                                return top ? (
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-lg font-black text-gray-900">{top.companyName}</h4>
                                            <TrendingUp size={16} className="text-indigo-600" />
                                        </div>
                                        <p className="text-2xl font-black text-indigo-600 mt-2">{formatCurrency(top.totalRevenue)}</p>
                                    </div>
                                ) : <p className="text-sm text-gray-400">No data</p>;
                            })()}
                        </CardContent>
                    </Card>
                </div>

                {/* P&L Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign size={16} className="text-green-600" />
                            Revenue vs Annualized Burn vs Profit
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={companyPnLData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => formatCurrency(Number(value) || 0)}
                                />
                                <Legend />
                                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Annual Rev" />
                                <Bar dataKey="Burn" fill="#ef4444" radius={[4, 4, 0, 0]} name="Annual Cost" />
                                <Bar dataKey="Profit" fill="#6366f1" radius={[4, 4, 0, 0]} name="Net Profit" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Detailed Comparison Table */}
                <Card className="overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <h4 className="font-bold text-gray-900 text-sm">Detailed Financial Impact</h4>
                        <span className="text-xs text-gray-500 font-medium">Sorted by Net Profit</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-gray-500 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Company</th>
                                    <th className="px-6 py-4 font-bold text-right">Revenue</th>
                                    <th className="px-6 py-4 font-bold text-right">Current Burn (Mo)</th>
                                    <th className="px-6 py-4 font-bold text-right text-amber-600">Pending Incr.</th>
                                    <th className="px-6 py-4 font-bold text-right text-indigo-600">Proj. Burn (Mo)</th>
                                    <th className="px-6 py-4 font-bold text-right">Net Profit (Yr)</th>
                                    <th className="px-6 py-4 font-bold text-right">Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {[...companyStats].sort((a, b) => b.netProfit - a.netProfit).map((comp: any) => {
                                    const impact = comp.projectedSalary - comp.monthlyBurn;
                                    return (
                                        <tr key={comp.companyId} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 font-black text-xs">
                                                    {comp.companyName.substring(0, 2).toUpperCase()}
                                                </div>
                                                {comp.companyName}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-emerald-600">
                                                {formatCurrency(comp.totalRevenue)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600">
                                                {formatCurrency(comp.monthlyBurn)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-amber-600">
                                                {impact > 0 ? '+' : ''}{formatCurrency(impact)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-indigo-600">
                                                {formatCurrency(comp.projectedSalary)}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black ${comp.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {formatCurrency(comp.netProfit)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${comp.profitMargin > 20 ? 'bg-emerald-100 text-emerald-800' :
                                                    comp.profitMargin > 0 ? 'bg-blue-100 text-blue-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    {comp.profitMargin.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    const renderGlobalView = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Department Wise */}
            <Card>
                <CardHeader>
                    <CardTitle>Expenditure by Department</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.byDepartment} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Manager Wise */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Spenders (Managers)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                        {data.byManager.map((manager, idx) => (
                            <div key={manager.managerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{manager.managerName}</p>
                                        <p className="text-xs text-gray-500">Manager</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">
                                        {formatCurrency(manager.totalExpenditure)}
                                    </p>
                                    <p className="text-xs text-gray-500">Total Team CTC</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Component Breakdown */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Global Component Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    {data.breakdown ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'CTC', value: data.breakdown.fixed },
                                        { name: 'Variable Pay', value: data.breakdown.variable },
                                        { name: 'Incentives', value: data.breakdown.incentive },
                                        { name: 'Reimbursements', value: (data.breakdown as any).reimbursements || 0 }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {COLORS.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div>No breakdown data</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Salary Analysis</h2>
                    <p className="text-sm text-gray-500">
                        {viewMode === 'GLOBAL' ? 'Consolidated view across all companies' : 'Company-wise performance breakdown'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {data.financials && (
                        <div className={`px-4 py-2 rounded-lg border hidden md:block ${data.financials.profit >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                            <span className="text-xs font-semibold uppercase tracking-wider block mb-1">Global Net Profit</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black">{formatCurrency(data.financials.profit)}</span>
                                <span className="text-sm font-medium">({data.financials.profitMargin.toFixed(1)}%)</span>
                            </div>
                        </div>
                    )}

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('GLOBAL')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'GLOBAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Global
                        </button>
                        <button
                            onClick={() => setViewMode('COMPANY')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'COMPANY' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Compare
                        </button>
                    </div>
                </div>
            </div>

            {data.financials && (
                <Card>
                    <CardHeader>
                        <CardTitle>Global Profitability Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Progress Bar Visual */}
                            <div className="relative h-12 bg-gray-100 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-blue-500 h-full flex items-center justify-center text-white font-bold text-xs"
                                    style={{ width: `${Math.min((data.financials.revenue / (data.financials.revenue + data.financials.cost)) * 100, 100)}%` }}
                                >
                                    Revenue
                                </div>
                                <div
                                    className="bg-rose-500 h-full flex items-center justify-center text-white font-bold text-xs"
                                    style={{ width: `${Math.min((data.financials.cost / (data.financials.revenue + data.financials.cost)) * 100, 100)}%` }}
                                >
                                    Cost (Burn)
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-xs text-blue-600 uppercase font-bold">Total Revenue</p>
                                    <p className="text-lg font-black text-blue-900">{formatCurrency(data.financials.revenue)}</p>
                                </div>
                                <div className="p-4 bg-rose-50 rounded-lg border border-rose-100 text-right">
                                    <p className="text-xs text-rose-600 uppercase font-bold">Annualized Burn</p>
                                    <p className="text-lg font-black text-rose-900">{formatCurrency(data.financials.cost)}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {viewMode === 'COMPANY' ? renderCompanyView() : renderGlobalView()}
        </div>
    );
}
