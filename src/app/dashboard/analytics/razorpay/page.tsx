'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Globe, TrendingUp, DollarSign, Download, RefreshCw, Calendar, Search, User, Mail } from 'lucide-react';
import { downloadCSV } from '@/lib/csv-utils';

export default function RazorpayTrackerPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [filterMethod, setFilterMethod] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'LEDGER' | 'MONTHLY' | 'YEARLY'>('LEDGER');
    const [summarySearch, setSummarySearch] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = '/api/payments/razorpay?';
            if (startDate) url += `startDate=${startDate}&`;
            if (endDate) url += `endDate=${endDate}&`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setData(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchData();
    }, [fetchData]);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/cron/razorpay-sync?force=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (res.ok) {
                alert(`Sync completed. Found ${result.syncedCount} new transactions.`);
                fetchData();
            } else {
                alert(`Sync failed: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('A network error occurred during sync.');
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading && !data) return <div className="p-8 text-center text-secondary-500 font-bold animate-pulse">Loading payment gateway data...</div>;

    const chartData = data?.dailyRevenue?.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        revenue: d.revenue,
        captured: d.captured,
        failed: d.failed
    })).reverse() || [];

    const formatCurrency = (amount: number, currency: string = 'INR') => {
        const val = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
        return `${currency.toUpperCase()} ${val}`;
    };

    const methodStats = data?.payments?.reduce((acc: any, p: any) => {
        const method = p.method || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
    }, {}) || {};

    const methodChartData = Object.entries(methodStats).map(([name, value]) => ({ name, value }));
    const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#f59e0b', '#10b981'];

    const filteredPayments = data?.payments?.filter((p: any) => {
        if (filterMethod !== 'ALL' && p.method !== filterMethod) return false;
        if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
        return true;
    }) || [];

    const handleClaim = async (paymentId: string) => {
        const reason = prompt("Enter reason for claim (optional):") || 'Razorpay Manual Claim';
        if (reason === null) return; // Cancelled

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/revenue/claims', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paymentId,
                    claimAmount: selectedPayment?.amount, // Assuming full amount claim
                    claimReason: reason
                })
            });

            if (res.ok) {
                alert('Claim submitted successfully!');
                fetchData(); // Refresh list to show claimed status
                setSelectedPayment(null);
            } else {
                const err = await res.json();
                alert(`Claim failed: ${err.error}`);
            }
        } catch (error) {
            console.error(error);
            alert('Error submitting claim');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data?.payments || data.payments.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = ['Protocol ID', 'Customer', 'Email', 'Description', 'Date', 'Amount', 'Currency', 'Method', 'Status'];
        const rows = filteredPayments.map((p: any) => [
            p.razorpayPaymentId || p.id,
            p.name || 'Anonymous',
            p.email || '',
            (p.description || '').replace(/,/g, ';'),
            new Date(p.created_at * 1000).toISOString(),
            p.amount,
            p.currency,
            p.method,
            p.status
        ]);

        const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
        downloadCSV(csvContent, `razorpay-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6 animate-fade-in pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter uppercase">Razorpay Analytics</h1>
                        <p className="text-secondary-500 font-medium tracking-tight">Financial tracing, day-wise metrics and currency conversion</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Last Sync</p>
                            <p className="text-xs font-bold text-secondary-600">
                                {data?.lastSync ? new Date(data.lastSync.lastSyncAt).toLocaleString() : 'Never'}
                            </p>
                        </div>
                        <button
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className={`btn ${isSyncing ? 'bg-secondary-200' : 'btn-primary'} flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg transition-transform active:scale-95`}
                        >
                            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    </div>
                </div>

                {/* Filters & Actions Bar */}
                <div className="card-premium p-4 flex flex-wrap items-center gap-6 bg-white shadow-sm border-secondary-100">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <label className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1">Start Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="input h-10 w-44 text-xs pl-9 pr-3 rounded-xl border-secondary-200 focus:ring-2 focus:ring-primary-500/20 transition-all font-bold"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <Calendar size={14} className="absolute left-3 top-3 text-secondary-400" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1">End Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="input h-10 w-44 text-xs pl-9 pr-3 rounded-xl border-secondary-200 focus:ring-2 focus:ring-primary-500/20 transition-all font-bold"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                                <Calendar size={14} className="absolute left-3 top-3 text-secondary-400" />
                            </div>
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="mt-5 text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="ml-auto flex bg-secondary-100 p-1.5 rounded-2xl">
                        {['LEDGER', 'MONTHLY', 'YEARLY'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-secondary-900 shadow-md transform scale-105' : 'text-secondary-400 hover:text-secondary-600'}`}
                            >
                                {tab === 'LEDGER' ? 'Transactions' : tab === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card-premium bg-gradient-to-br from-secondary-900 to-black text-white border-0 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:rotate-12 transition-transform duration-500">
                            <TrendingUp size={120} />
                        </div>
                        <div className="relative z-10 flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-[10px] font-black text-white/50 uppercase tracking-widest">Global Revenue (INR)</h3>
                                <p className="text-3xl font-black mt-2 tracking-tighter">₹{Math.round(data?.stats?.totalRevenue || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                <TrendingUp size={24} />
                            </div>
                        </div>
                        <div className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Multi-currency consolidated</div>
                    </div>

                    <div className="card-premium hover:border-primary-500 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Current Month</h3>
                                <p className="text-3xl font-black text-secondary-900 mt-2 tracking-tighter">₹{data?.stats?.currentMonthRevenue?.toLocaleString()}</p>
                            </div>
                            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 ${parseFloat(data?.stats?.momGrowth) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {parseFloat(data?.stats?.momGrowth) >= 0 ? '↗' : '↘'} {Math.abs(data?.stats?.momGrowth)}%
                            </div>
                        </div>
                        <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">v/s Previous Month</div>
                    </div>

                    <div className="card-premium hover:border-primary-500 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Payment Events</h3>
                                <p className="text-3xl font-black text-secondary-900 mt-2 tracking-tighter">{data?.stats?.totalCount || 0}</p>
                            </div>
                            <div className="p-3 bg-secondary-50 rounded-2xl">
                                <DollarSign size={24} className="text-secondary-400" />
                            </div>
                        </div>
                        <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Transaction Volume</div>
                    </div>

                    <div className="card-premium hover:border-primary-500 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Cross-Border</h3>
                                <p className="text-3xl font-black text-secondary-900 mt-2 tracking-tighter">
                                    {data?.payments?.filter((p: any) => p.international).length || 0}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-2xl">
                                <Globe size={24} className="text-purple-500" />
                            </div>
                        </div>
                        <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Non-Domestic Traffic</div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 card-premium p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black text-secondary-900 uppercase">Day-wise Trajectory</h2>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-primary-600"></div>
                                    <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Forecast</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Captured</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCaptured" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                        tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '24px',
                                            border: 'none',
                                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                            padding: '16px'
                                        }}
                                        labelStyle={{ fontWeight: 'black', color: '#1e293b', marginBottom: '8px', fontSize: '12px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#2563eb"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="captured"
                                        stroke="#10b981"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorCaptured)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card-premium p-8">
                        <h2 className="text-xl font-black text-secondary-900 uppercase mb-8">Asset Methodology</h2>
                        <div className="h-64 mb-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={methodChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {methodChartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4">
                            {methodChartData.map((m: any, i: number) => (
                                <div key={m.name} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    <span className="text-[10px] font-black text-secondary-600 uppercase tracking-widest truncate">{m.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content View Switching */}
                {activeTab === 'LEDGER' ? (
                    <div className="card-premium p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700 shadow-xl border-secondary-100">
                        <div className="p-8 border-b border-secondary-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-secondary-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-secondary-900 tracking-tighter uppercase">Transaction Ledger</h2>
                                <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest mt-1">Granular payment auditing</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    className="select h-12 border-secondary-200 rounded-2xl font-black text-[10px] uppercase tracking-widest px-6 focus:ring-2 focus:ring-primary-500/20"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="captured">Captured</option>
                                    <option value="authorized">Authorized</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <button
                                    onClick={handleExport}
                                    className="btn h-12 bg-secondary-900 text-white rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-black transition-all active:scale-95"
                                >
                                    <Download size={14} /> Export CSV
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#fcfdff] text-[10px] font-black text-secondary-400 uppercase tracking-[0.15em] border-b border-secondary-100">
                                    <tr>
                                        <th className="px-8 py-5 text-left">Internal Trace</th>
                                        <th className="px-8 py-5 text-left">Recipient / Product</th>
                                        <th className="px-8 py-5 text-left">Timestamp</th>
                                        <th className="px-8 py-5 text-right">Value (INR)</th>
                                        <th className="px-8 py-5 text-center">Protocol</th>
                                        <th className="px-8 py-5 text-left">Status</th>
                                        <th className="px-8 py-5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100 bg-white">
                                    {filteredPayments.map((payment: any) => {
                                        const isClaimed = payment.claims && payment.claims.some((c: any) => c.status !== 'REJECTED');
                                        const claimedBy = isClaimed ? payment.claims.find((c: any) => c.status !== 'REJECTED')?.employeeName : null;

                                        return (
                                            <tr key={payment.id} className="hover:bg-primary-50/20 transition-all group cursor-default">
                                                <td className="px-8 py-6">
                                                    <div className="font-mono text-xs font-black text-secondary-900 group-hover:text-primary-600 transition-colors">
                                                        #{payment.razorpayPaymentId || payment.id.substring(0, 12)}
                                                    </div>
                                                    {payment.international && (
                                                        <span className="inline-flex mt-2 px-2.5 py-1 bg-purple-100 text-purple-700 text-[8px] font-black rounded-lg uppercase tracking-widest">
                                                            <Globe size={10} className="mr-1.5" />International
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-sm font-black text-secondary-900 truncate max-w-[200px]" title={payment.name}>
                                                        {payment.name || 'Anonymous Customer'}
                                                    </div>
                                                    <div className="text-[10px] text-secondary-500 font-bold mt-1 uppercase tracking-tighter truncate max-w-[200px]">{payment.description || 'Service Subscription'}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-xs font-black text-secondary-700 uppercase tracking-tighter">
                                                        {new Date(payment.created_at * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <div className="text-[10px] text-secondary-400 font-bold mt-1">
                                                        {new Date(payment.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="font-mono text-sm font-black text-secondary-900">
                                                        {formatCurrency(payment.amount, payment.currency)}
                                                    </div>
                                                    {payment.currency !== 'INR' && (
                                                        <div className="text-[10px] text-primary-500 font-bold mt-1 uppercase tracking-tighter">
                                                            ≈ ₹{Math.round(payment.base_amount || payment.amount).toLocaleString()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="px-3 py-1 bg-secondary-100 text-secondary-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                                                        {payment.method}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${payment.status === 'captured' ? 'bg-green-500' : payment.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${payment.status === 'captured' ? 'text-green-700' : payment.status === 'failed' ? 'text-red-700' : 'text-yellow-700'}`}>
                                                            {payment.status}
                                                        </span>
                                                    </div>
                                                    {isClaimed && (
                                                        <div className="mt-1 text-[9px] font-bold text-primary-600 uppercase tracking-tight">
                                                            Claimed by {claimedBy}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedPayment(payment)}
                                                            className="p-2.5 bg-secondary-50 hover:bg-secondary-900 group/btn rounded-xl transition-all"
                                                        >
                                                            <Search size={16} className="text-secondary-400 group-hover/btn:text-white transition-colors" />
                                                        </button>
                                                        {payment.status === 'captured' && !isClaimed && (
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('Do you want to claim this transaction as your sale?')) {
                                                                        handleClaim(payment.id);
                                                                    }
                                                                }}
                                                                className="px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                            >
                                                                Claim
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredPayments.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-8 py-32 text-center bg-secondary-50/20">
                                                <div className="flex flex-col items-center justify-center space-y-4 opacity-20">
                                                    <DollarSign size={80} className="text-secondary-900" />
                                                    <p className="text-lg font-black text-secondary-900 uppercase tracking-[0.3em]">
                                                        Empty Result Set
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="card-premium p-0 overflow-hidden animate-in slide-in-from-bottom-10 duration-700 shadow-2xl border-secondary-100">
                        <div className="p-8 border-b border-secondary-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-secondary-50/30">
                            <div>
                                <h2 className="text-2xl font-black text-secondary-900 tracking-tighter uppercase">
                                    {activeTab === 'MONTHLY' ? 'Monthly RecurrenceAudit' : 'Annual Economic Review'}
                                </h2>
                                <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest mt-1">Strategic financial aggregation</p>
                            </div>
                            <div className="relative">
                                <Search size={16} className="absolute left-5 top-4 text-secondary-400" />
                                <input
                                    type="text"
                                    placeholder="SEARCH PERIOD..."
                                    className="input h-14 w-80 pl-14 text-[10px] font-black tracking-widest rounded-2xl border-secondary-200 focus:ring-2 focus:ring-primary-500/20 uppercase"
                                    value={summarySearch}
                                    onChange={(e) => setSummarySearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#fcfdff] text-[10px] font-black text-secondary-400 uppercase tracking-[0.15em] border-b border-secondary-100">
                                    <tr>
                                        <th className="px-8 py-6 text-left">Fiscal Interval</th>
                                        <th className="px-8 py-6 text-center">Batch Count</th>
                                        <th className="px-8 py-6 text-right">Gross Value (INR)</th>
                                        <th className="px-8 py-6 text-right">Succesful Capture</th>
                                        <th className="px-8 py-6 text-right">Conversion Success</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100 bg-white">
                                    {(activeTab === 'MONTHLY' ? data?.monthlySummaries : data?.yearlySummaries)
                                        ?.filter((s: any) => s.period.toLowerCase().includes(summarySearch.toLowerCase()))
                                        .map((summary: any, i: number) => (
                                            <tr key={i} className="hover:bg-primary-50/10 transition-all cursor-default">
                                                <td className="px-8 py-8">
                                                    <div className="text-base font-black text-secondary-900 tracking-tighter uppercase">
                                                        {activeTab === 'MONTHLY'
                                                            ? new Date(summary.period + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                                                            : `FY ${summary.period}`
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-8 py-8 text-center font-black text-secondary-400 text-xs">
                                                    <span className="px-4 py-1.5 bg-secondary-100 rounded-xl">{summary.count} ACTIONS</span>
                                                </td>
                                                <td className="px-8 py-8 text-right font-mono font-black text-secondary-900 text-lg tracking-tighter">
                                                    ₹{Number(summary.total).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-8 text-right font-mono font-black text-green-600 text-lg tracking-tighter">
                                                    ₹{Number(summary.captured).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-8 text-right">
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className="text-xs font-black text-secondary-900 tracking-tighter">
                                                            {((Number(summary.captured) / Number(summary.total)) * 100).toFixed(1)}% EFFICIENCY
                                                        </span>
                                                        <div className="w-32 h-2.5 bg-secondary-100 rounded-full overflow-hidden shadow-inner border border-secondary-200/50">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-1000 shadow-lg"
                                                                style={{ width: `${(Number(summary.captured) / Number(summary.total)) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Detail Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 bg-secondary-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300" onClick={() => setSelectedPayment(null)}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20" onClick={(e) => e.stopPropagation()}>
                        <div className="p-10 bg-gradient-to-br from-secondary-900 to-black text-white relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-3xl -mr-10 -mt-10"></div>
                            <h2 className="text-4xl font-black tracking-tighter uppercase">Audit Brief</h2>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Source Trace: {selectedPayment.id}</p>
                        </div>
                        <div className="p-10 grid grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Protocol ID</div>
                                <div className="font-mono text-sm font-black text-secondary-900">{selectedPayment.razorpayPaymentId || selectedPayment.id}</div>
                            </div>
                            <div className="space-y-1 text-right">
                                <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Execution State</div>
                                <div className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedPayment.status === 'captured' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedPayment.status}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Settlement Value</div>
                                <div className="text-xl font-black text-secondary-900">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</div>
                            </div>
                            <div className="space-y-1 text-right">
                                <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Methodology</div>
                                <div className="text-base font-black text-secondary-700 uppercase">{selectedPayment.method}</div>
                            </div>
                            {selectedPayment.email && (
                                <div className="col-span-2 py-4 border-t border-b border-secondary-50">
                                    <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2">Subject Trace</div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-secondary-400" />
                                            <span className="text-sm font-bold text-secondary-900">{selectedPayment.name || 'Anonymous'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-secondary-400" />
                                            <span className="text-sm font-medium text-secondary-600">{selectedPayment.email}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 bg-secondary-50 flex justify-between items-center">
                            <button onClick={() => setSelectedPayment(null)} className="px-8 py-4 bg-white border border-secondary-200 text-secondary-900 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-secondary-900 hover:text-white transition-all">Close Trace</button>
                            {selectedPayment.status === 'captured' && (
                                <button
                                    onClick={() => handleClaim(selectedPayment.id)}
                                    className="px-8 py-4 bg-primary-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all"
                                >
                                    Initiate Claim
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
