'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import TransactionTable from '@/components/dashboard/finance/TransactionTable';
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
        type: 'REVENUE',
        category: 'SALE',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'BANK_TRANSFER',
        // Extended fields
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        referenceNumber: '',
        bankName: '',
        // Tax & Currency fields
        tax: '',
        originalAmount: '',
        currency: 'INR',
        inrAmount: ''
    });

    const [tableLoading, setTableLoading] = useState(false);
    const [filters, setFilters] = useState({ type: '', category: '', date: '' });
    const [searchQuery, setSearchQuery] = useState('');

    const fetchAnalytics = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/finance/analytics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAnalytics(await res.json());
        } catch (error) {
            console.error('Analytics Fetch Error:', error);
        }
    }, []);

    const fetchTransactions = useCallback(async () => {
        setTableLoading(true);
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            if (filters.type) queryParams.append('type', filters.type);
            if (filters.category) queryParams.append('category', filters.category);
            if (searchQuery) queryParams.append('search', searchQuery);

            const res = await fetch(`/api/finance?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setRecords(await res.json());
        } catch (error) {
            console.error('Transactions Fetch Error:', error);
        } finally {
            setTableLoading(false);
        }
    }, [filters, searchQuery]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchAnalytics(), fetchTransactions()]);
        setLoading(false);
    }, [fetchAnalytics, fetchTransactions]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleFilter = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

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
                type: 'REVENUE',
                category: 'SALE',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                paymentMethod: 'BANK_TRANSFER',
                customerName: '',
                customerEmail: '',
                customerPhone: '',
                referenceNumber: '',
                bankName: '',
                tax: '',
                originalAmount: '',
                currency: 'INR',
                inrAmount: ''
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
                            <span>➕</span> Record New Transaction
                        </button>
                    </div>
                </div>

                {/* New Feature Navigation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/dashboard/finance/coa" className="bg-white p-6 rounded-xl border border-secondary-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                                📊
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Chart of Accounts</h3>
                                <p className="text-xs text-gray-500 mt-1">Manage account hierarchy</p>
                            </div>
                        </div>
                    </Link>
                    <Link href="/dashboard/finance/journal" className="bg-white p-6 rounded-xl border border-secondary-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                📒
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Journal Entries</h3>
                                <p className="text-xs text-gray-500 mt-1">Record double-entry transactions</p>
                            </div>
                        </div>
                    </Link>
                    <Link href="/dashboard/finance/ledger" className="bg-white p-6 rounded-xl border border-secondary-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
                                📈
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">General Ledger</h3>
                                <p className="text-xs text-gray-500 mt-1">View account transactions</p>
                            </div>
                        </div>
                    </Link>
                    <Link href="/dashboard/finance/reports" className="bg-white p-6 rounded-xl border border-secondary-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors">
                                📑
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Reports</h3>
                                <p className="text-xs text-gray-500 mt-1">Balance Sheet & P&L</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Legacy Stats Grid (To be migrated) */}
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
                <TransactionTable
                    transactions={records}
                    loading={tableLoading} // Use separate loading state for table
                    onEdit={(rec) => { setIsEditing(rec); setFormData({ ...rec, date: rec.date.split('T')[0] }); setShowAddModal(true); }}
                    onDelete={handleDelete}
                    onSearch={handleSearch}
                    onFilter={handleFilter}
                    filters={filters}
                />
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleSubmit}>
                            <div className={`p-6 border-b border-secondary-100 flex justify-between items-center ${formData.type === 'REVENUE' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                <h3 className={`text-xl font-black ${formData.type === 'REVENUE' ? 'text-emerald-900' : 'text-rose-900'}`}>
                                    {isEditing ? 'Edit Transaction' : 'Record New Transaction'}
                                </h3>
                                <button type="button" onClick={() => setShowAddModal(false)} className="text-secondary-400 hover:text-secondary-600" title="Close Modal">
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                                {/* Transaction Type Toggle */}
                                <div className="col-span-2 flex p-1 bg-secondary-100 rounded-xl mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'REVENUE', category: 'SALE' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'REVENUE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                                    >
                                        ⬇️ Income (Revenue)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: 'RENT' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                                    >
                                        ⬆️ Expense (Cost)
                                    </button>
                                </div>

                                {/* Amount & Payment Method */}
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Amount (₹)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none font-black text-lg"
                                        placeholder="50000"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Payment Method</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        value={formData.paymentMethod}
                                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        title="Select Payment Method"
                                    >
                                        <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                                        <option value="UPI">UPI / PhonePe / GPay</option>
                                        <option value="RAZORPAY">Razorpay</option>
                                        <option value="CASH">Cash Payment</option>
                                        <option value="CHEQUE">Cheque Payment</option>
                                        <option value="DD">Demand Draft (DD)</option>
                                        <option value="OTHER">Other Method</option>
                                    </select>
                                </div>

                                {/* Date & Reference */}
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Transaction Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        title="Transaction Date"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Reference # (Cheque/UTR) {formData.type === 'REVENUE' ? '*' : ''}</label>
                                    <input
                                        type="text"
                                        required={formData.type === 'REVENUE'}
                                        className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none font-mono"
                                        placeholder={formData.type === 'REVENUE' ? 'Required for Revenue' : 'Optional for Expense'}
                                        value={formData.referenceNumber}
                                        onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                    />
                                </div>

                                {/* Customer/Vendor Info (Contextual) */}
                                <div className="col-span-2 grid grid-cols-3 gap-3 p-4 bg-secondary-50 rounded-2xl border border-secondary-200">
                                    <div className="col-span-3 pb-2 border-b border-secondary-200">
                                        <span className="text-xs font-black text-secondary-500 uppercase">
                                            {formData.type === 'REVENUE' ? 'Customer Information' : 'Vendor / Recipient Information'}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">{formData.type === 'REVENUE' ? 'Customer Name' : 'Vendor/Payee Name'}</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            value={formData.customerName}
                                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                            placeholder={formData.type === 'REVENUE' ? 'Customer Name' : 'Vendor Name'}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Bank Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                            placeholder="Bank Name"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            value={formData.customerEmail}
                                            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                            placeholder="Email Address"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Phone</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            value={formData.customerPhone}
                                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                            placeholder="Phone Number"
                                        />
                                    </div>
                                </div>

                                {/* Tax & Currency Section (Optional) */}
                                <div className="col-span-2 grid grid-cols-4 gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                                    <div className="col-span-4 pb-2 border-b border-amber-200">
                                        <span className="text-xs font-black text-amber-700 uppercase">Tax & Currency (Optional)</span>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Tax (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full px-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                            value={formData.tax}
                                            onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                                            placeholder="18"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Currency</label>
                                        <select
                                            className="w-full px-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        >
                                            <option value="INR">INR (₹)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="GBP">GBP (£)</option>
                                            <option value="AED">AED</option>
                                            <option value="SGD">SGD</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Original Amt</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full px-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                            value={formData.originalAmount}
                                            onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                                            placeholder="1000"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">INR Amount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full px-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                            value={formData.inrAmount}
                                            onChange={(e) => setFormData({ ...formData, inrAmount: e.target.value })}
                                            placeholder="85000"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Category */}
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Category</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {formData.type === 'REVENUE' ? (
                                            <>
                                                <option value="SALE">Product Sale</option>
                                                <option value="SUBSCRIPTION">Subscription</option>
                                                <option value="SERVICE">Service Revenue</option>
                                                <option value="OTHER">Other Income</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="RENT">Office Rent</option>
                                                <option value="SALARIES">Salaries & Wages</option>
                                                <option value="SOFTWARE">Software & Tools</option>
                                                <option value="OFFICE_SUPPLIES">Office Supplies</option>
                                                <option value="MARKETING">Marketing & Ads</option>
                                                <option value="UTILITIES">Utilities (Internet/Electricity)</option>
                                                <option value="TRAVEL">Travel & Logistics</option>
                                                <option value="OTHER">Other Expense</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                {/* Notes / Description */}
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Notes / Description</label>
                                    <textarea
                                        className="w-full px-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Notes or description"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 text-sm font-bold text-secondary-500 hover:bg-secondary-100 rounded-xl transition-all">Cancel</button>
                                <button type="submit" className={`px-8 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-lg ${formData.type === 'REVENUE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                                    {isEditing ? 'Save Changes' : `Record ${formData.type === 'REVENUE' ? 'Revenue' : 'Expense'}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
