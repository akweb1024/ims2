'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

export default function PaymentsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [userRole, setUserRole] = useState('');
    const [lastSync, setLastSync] = useState<any>(null);

    const fetchPayments = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                period,
                start: dateRange.start,
                end: dateRange.end
            });
            const res = await fetch(`/api/payments?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments || []);
                setHistory(data.history || []);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }, [period, dateRange]);

    const fetchLastSync = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/payments/razorpay/sync', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLastSync(data.lastSync);
            }
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchPayments();
        fetchLastSync();
    }, [fetchPayments, fetchLastSync]);



    const handleSync = async () => {
        setSyncing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/payments/razorpay/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchPayments();
                fetchLastSync();
            } else { alert('Sync failed: ' + data.error); }
        } catch (error) { console.error(error); }
        finally { setSyncing(false); }
    };

    const getProjection = () => {
        if (history.length < 2) return 0;
        const lastMonth = Number(history[history.length - 1].total);
        const prevMonth = Number(history[history.length - 2].total);
        const growth = prevMonth > 0 ? (lastMonth - prevMonth) / prevMonth : 0;
        return lastMonth * (1 + growth);
    };

    const canSync = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TL'].includes(userRole);

    const filteredPayments = payments.filter(p =>
        p.razorpayPaymentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-secondary-500">Processing financial data...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter">Finance & Reconciliation</h1>
                        <p className="text-secondary-500 font-medium italic">Tracing Razorpay settlements against subscription invoices.</p>
                    </div>
                    {canSync && (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Gateway Health</p>
                                <p className="text-[10px] font-bold text-success-600 flex items-center gap-1 justify-end">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse"></span> Connected
                                </p>
                            </div>
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className={`btn btn-primary px-6 rounded-2xl flex items-center gap-3 shadow-lg shadow-primary-100 ${syncing ? 'opacity-50' : ''}`}
                            >
                                <span className={syncing ? 'animate-spin' : ''}>🔄</span>
                                <span className="text-xs font-black uppercase tracking-widest">{syncing ? 'Tracing...' : 'Sync Gateway'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Filters Row */}
                <div className="card-premium flex flex-wrap items-center justify-between gap-6 p-6">
                    <div className="flex gap-2 p-1 bg-secondary-100 rounded-xl">
                        {(['all', 'day', 'week', 'month', 'year'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 flex-1 max-w-2xl">
                        <div className="flex items-center gap-2 bg-secondary-50 p-2 rounded-xl border border-secondary-100">
                            <input
                                type="date"
                                className="bg-transparent border-0 text-[10px] font-black uppercase text-secondary-600 focus:ring-0"
                                value={dateRange.start}
                                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                            <span className="text-secondary-300 font-black">→</span>
                            <input
                                type="date"
                                className="bg-transparent border-0 text-[10px] font-black uppercase text-secondary-600 focus:ring-0"
                                value={dateRange.end}
                                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Payment ID or Client..."
                            className="input h-10 flex-1 rounded-xl text-xs font-bold"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Financial KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Mtd Revenue</p>
                        <p className="text-3xl font-black text-secondary-900">₹{history[history.length - 1]?.total?.toLocaleString() || 0}</p>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-[10px] font-black text-success-600 bg-success-50 px-2 py-0.5 rounded-full">+12% Growth</span>
                        </div>
                    </div>
                    <div className="card-premium">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Projected Next Month</p>
                        <p className="text-3xl font-black text-primary-600">₹{Math.round(getProjection()).toLocaleString()}</p>
                        <p className="text-[10px] text-secondary-400 mt-4 font-medium italic">Based on linear velocity</p>
                    </div>
                    <div className="card-premium">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Total Reconciliation</p>
                        <p className="text-3xl font-black text-secondary-900">₹{payments.reduce((acc, p) => acc + (p.status === 'captured' ? p.amount : 0), 0).toLocaleString()}</p>
                        <p className="text-[10px] text-secondary-400 mt-4 font-medium uppercase tracking-widest">Across {new Set(payments.map(p => p.companyId)).size} units</p>
                    </div>
                    <div className="card-premium bg-secondary-900 text-white border-0 shadow-2xl shadow-secondary-900/20">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Success Rate</p>
                        <p className="text-3xl font-black">
                            {payments.length > 0 ? Math.round((payments.filter(p => p.status === 'captured').length / payments.length) * 100) : 100}%
                        </p>
                        <div className="mt-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-400" style={{ width: `${payments.length > 0 ? (payments.filter(p => p.status === 'captured').length / payments.length) * 100 : 100}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Trend Chart */}
                    <div className="lg:col-span-2 card-premium p-8">
                        <h3 className="text-lg font-black text-secondary-900 mb-8 uppercase tracking-tighter">Revenue Trajectory</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Method Distribution */}
                    <div className="card-premium p-8">
                        <h3 className="text-lg font-black text-secondary-900 mb-8 uppercase tracking-tighter">Gateway Performance</h3>
                        <div className="space-y-6">
                            {Array.from(new Set(payments.map(p => p.paymentMethod || 'Unknown'))).slice(0, 5).map(method => {
                                const count = payments.filter(p => p.paymentMethod === method).length;
                                const percentage = Math.round((count / payments.length) * 100);
                                return (
                                    <div key={method} className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-secondary-600">{method}</span>
                                            <span className="text-secondary-400">{percentage}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary-600 rounded-full" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Detailed Records */}
                <div className="card-premium p-0 overflow-hidden">
                    <div className="px-8 py-6 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/30">
                        <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest">Transaction Ledger</h3>
                        <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">Showing Last 100 Movements</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-secondary-600">
                            <thead className="bg-secondary-50/50 text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-4">Verification ID</th>
                                    <th className="px-8 py-4">Settlement Entity</th>
                                    <th className="px-8 py-4">Valuation</th>
                                    <th className="px-8 py-4">Gateway</th>
                                    <th className="px-8 py-4">Timeline</th>
                                    <th className="px-8 py-4">Closure</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {filteredPayments.length === 0 ? (
                                    <tr><td colSpan={6} className="px-8 py-20 text-center text-secondary-400 italic font-black">No transactions found for the selected criteria.</td></tr>
                                ) : filteredPayments.map(p => (
                                    <tr key={p.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="font-black text-secondary-900 text-xs">{p.razorpayPaymentId || p.transactionId}</p>
                                            <p className="text-[9px] text-primary-600 font-black tracking-widest uppercase mt-1">{p.invoice?.invoiceNumber || 'Manual Reconcile'}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-secondary-800 text-xs">{p.company?.name || 'Central Account'}</p>
                                            <p className="text-[9px] text-secondary-400 font-medium uppercase tracking-[0.2em] mt-1">Tenant ID: {p.companyId?.slice(0, 8)}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="font-black text-secondary-900 text-sm">₹{p.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-2 py-0.5 bg-secondary-100 rounded text-[9px] font-black uppercase tracking-widest text-secondary-600">
                                                {p.paymentMethod || 'Razorpay'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-secondary-900 text-[10px]">{new Date(p.paymentDate).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}</p>
                                            <p className="text-[9px] text-secondary-400 font-medium uppercase mt-0.5">{new Date(p.paymentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight 
                                                ${p.status === 'captured' ? 'bg-success-100 text-success-700' :
                                                    p.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                        'bg-secondary-200 text-secondary-600'}`}>
                                                {p.status || 'unknown'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
