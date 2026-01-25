'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#d3324c', '#8b5cf6', '#06b6d4'];

export default function FinancePage() {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState<any>(null);

    const [formData, setFormData] = useState({
        type: 'EXPENSE',
        category: 'BILLS',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'BANK_TRANSFER'
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [analyticsRes, recordsRes] = await Promise.all([
                fetch('/api/finance/analytics', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/finance', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
            if (recordsRes.ok) setRecords(await recordsRes.json());
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = isEditing ? `/api/finance/${isEditing.id}` : '/api/finance';
        const method = isEditing ? 'PATCH' : 'POST';

        const token = localStorage.getItem('token');
        const res = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            setShowAddModal(false);
            setIsEditing(null);
            setFormData({
                type: 'EXPENSE',
                category: 'BILLS',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                paymentMethod: 'BANK_TRANSFER'
            });
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/finance/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) fetchData();
    };

    const handleExport = () => {
        window.open('/api/finance/export', '_blank');
    };

    const handleImport = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event: any) => {
            const text = event.target.result;
            const rows = text.split('\n');
            const headers = rows[0].split(',');
            const data = rows.slice(1).map((row: string) => {
                const values = row.split(',');
                const obj: any = {};
                headers.forEach((h: string, i: number) => obj[h.trim()] = values[i]?.trim());
                return obj;
            }).filter((d: any) => d.Type || d.type);

            const token = localStorage.getItem('token');
            const res = await fetch('/api/finance/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data })
            });

            if (res.ok) {
                const result = await res.json();
                alert(result.message);
                fetchData();
            }
        };
        reader.readAsText(file);
    };

    // Combine Actuals and Forecast for the chart
    const combinedChartData = analytics ? [
        ...analytics.actuals.map((d: any) => ({ ...d, type: 'Actual' })),
        ...analytics.forecast.map((d: any) => ({
            month: d.month,
            revenue: d.projectedRevenue,
            expense: d.projectedExpense,
            type: 'Forecast'
        }))
    ] : [];

    if (loading && !analytics) return (
        <DashboardLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        </DashboardLayout>
    );

    const stats = analytics ? {
        totalRevenue: analytics.actuals.reduce((a: number, b: any) => a + b.revenue, 0),
        totalExpense: analytics.actuals.reduce((a: number, b: any) => a + b.expense, 0),
        netProfit: analytics.actuals.reduce((a: number, b: any) => a + (b.revenue - b.expense), 0),
        forecastProfit: analytics.forecast.reduce((a: number, b: any) => a + (b.projectedRevenue - b.projectedExpense), 0)
    } : { totalRevenue: 0, totalExpense: 0, netProfit: 0, forecastProfit: 0 };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900">Financial Management</h1>
                        <p className="text-secondary-500">Track revenue, expenses, and growth projections</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            className="px-4 py-2 text-sm font-semibold text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all flex items-center gap-2"
                        >
                            <span>📤</span> Export
                        </button>
                        <label className="px-4 py-2 text-sm font-semibold text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all cursor-pointer flex items-center gap-2">
                            <span>📥</span> Import
                            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                        </label>
                        <button
                            onClick={() => { setIsEditing(null); setShowAddModal(true); }}
                            className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all shadow-md flex items-center gap-2"
                        >
                            <span>➕</span> Add Record
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm">
                        <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Total Revenue (12m)</p>
                        <p className="text-2xl font-black text-primary-600 mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
                        <p className="text-[10px] text-secondary-400 mt-2">Actual captured payments</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm">
                        <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Total Expenses (12m)</p>
                        <p className="text-2xl font-black text-danger-600 mt-1">₹{stats.totalExpense.toLocaleString()}</p>
                        <p className="text-[10px] text-secondary-400 mt-2">Salaries, bills, operations</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm">
                        <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Net Profit (12m)</p>
                        <p className={`text-2xl font-black mt-1 ${stats.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            ₹{stats.netProfit.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-secondary-400 mt-2">Current fiscal performance</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm bg-gradient-to-br from-primary-50 to-white">
                        <p className="text-xs font-bold text-primary-600 uppercase tracking-wider">Forecasted (3m)</p>
                        <p className="text-2xl font-black text-primary-700 mt-1">₹{stats.forecastProfit.toLocaleString()}</p>
                        <p className="text-[10px] text-primary-400 mt-2 line-clamp-1">Based on growth trends (AI)</p>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue & Expense Trend */}
                    <div className="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm min-h-[400px]">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 flex items-center justify-between">
                            Financial Trend & Forecast
                            <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-bold">ACTUAL + 3M PROJECTED</span>
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={combinedChartData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#d3324c" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#d3324c" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#d3324c" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm min-h-[400px]">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6">Expense Distribution</h3>
                        <div className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics?.categories?.filter((c: any) => c.type === 'EXPENSE') || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {analytics?.categories?.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions Table */}
                <div className="bg-white rounded-2xl border border-secondary-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-secondary-900">Recent Transactions</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 text-secondary-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {records.slice(0, 10).map((rec) => (
                                    <tr key={rec.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-semibold text-secondary-700">
                                            {new Date(rec.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rec.type === 'REVENUE' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
                                                {rec.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-secondary-600 uppercase font-black tracking-tighter">
                                            {rec.category}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-bold ${rec.type === 'REVENUE' ? 'text-success-600' : 'text-secondary-900'}`}>
                                            ₹{rec.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold text-secondary-400 capitalize">{rec.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setIsEditing(rec); setFormData({ ...rec, date: rec.date.split('T')[0] }); setShowAddModal(true); }}
                                                    className="p-1.5 hover:bg-secondary-100 rounded-lg text-secondary-400 hover:text-primary-600"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rec.id)}
                                                    className="p-1.5 hover:bg-danger-50 rounded-lg text-secondary-400 hover:text-danger-600"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-secondary-100">
                            <h3 className="text-xl font-bold text-secondary-900">{isEditing ? 'Edit Record' : 'Add Financial Record'}</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Type</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="REVENUE">Revenue</option>
                                        <option value="EXPENSE">Expense</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Category</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="SALARY">Salary</option>
                                        <option value="RENT">Rent</option>
                                        <option value="BILLS">Bills / Utilities</option>
                                        <option value="SALE">Product Sale</option>
                                        <option value="SUBSCRIPTION">Subscription</option>
                                        <option value="MARKETING">Marketing</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Amount (INR)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                    value={formData.amount}
                                    placeholder="0.00"
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Description</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-secondary-500 hover:bg-secondary-50 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-lg"
                                >
                                    {isEditing ? 'Save Changes' : 'Create Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
