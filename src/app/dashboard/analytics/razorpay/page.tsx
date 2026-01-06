'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import PaymentDetailModal from '@/components/dashboard/PaymentDetailModal';

export default function RazorpayTrackerPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/payments/razorpay', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setData(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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

    if (loading && !data) return <div className="p-8 text-center text-secondary-500 font-bold animate-pulse">Initializing global finance tracker...</div>;

    const chartData = data?.dailyRevenue?.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        revenue: d.revenue
    })).reverse() || [];

    const formatCurrency = (amount: number, currency: string = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency.toUpperCase() === 'PAISE' ? 'INR' : currency.toUpperCase(),
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter">Razorpay Global Tracker</h1>
                        <p className="text-secondary-500 font-medium">Trace digital payments across multiple currencies with real-time INR conversion.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Global Sync Status</p>
                            <p className="text-xs font-bold text-secondary-600">
                                {data?.lastSync ? new Date(data.lastSync.lastSyncAt).toLocaleString() : 'Never'}
                            </p>
                        </div>
                        <button
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className={`btn ${isSyncing ? 'bg-secondary-200' : 'btn-primary'} flex items-center gap-2 h-12 px-6 rounded-2xl shadow-lg ring-offset-2 hover:ring-2 transition-all`}
                        >
                            {isSyncing ? '🔄 Syncing Gateway...' : 'Gateway Sync'}
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium bg-secondary-900 text-white border-0 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.39 2.1-1.39 1.47 0 2.01.59 2.05 1.44h1.45c-.05-1.53-1.1-2.61-2.59-2.91V5h-1.31v1.64c-1.3.28-2.35 1.14-2.35 2.51 0 1.59 1.32 2.38 3.22 2.82 1.9.44 2.48 1.09 2.48 1.81 0 .68-.66 1.39-2.13 1.39-1.66 0-2.34-.73-2.42-1.69H9.37c.08 1.6 1.18 2.62 2.63 2.9v1.6h1.31v-1.63c1.37-.25 2.44-1.03 2.44-2.45 0-1.81-1.42-2.3-3.23-2.76z" /></svg>
                        </div>
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Total Revenue (INR)</h3>
                        <p className="text-3xl font-black">₹{Math.round(data?.stats?.totalRevenue).toLocaleString()}</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-white/60">
                            <span className="bg-white/10 px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-tighter">Includes Multi-Currency</span>
                        </div>
                    </div>

                    <div className="card-premium group hover:border-primary-500 transition-all border-secondary-100 border-2">
                        <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] mb-1">MTD Performance</h3>
                        <p className="text-3xl font-black text-secondary-900 font-mono tracking-tighter">₹{data?.stats?.currentMonthRevenue?.toLocaleString()}</p>
                        <div className={`mt-4 flex items-center gap-1 text-[10px] font-black ${parseFloat(data?.stats?.momGrowth) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            <span className="bg-current/10 px-2 py-0.5 rounded-full">{parseFloat(data?.stats?.momGrowth) >= 0 ? '↗' : '↘'} {Math.abs(data?.stats?.momGrowth)}%</span>
                            <span className="text-secondary-400 font-bold">VS LAST PERIOD</span>
                        </div>
                    </div>

                    <div className="card-premium border-secondary-100 border-2">
                        <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] mb-1">Currency Split</h3>
                        <div className="space-y-1 mt-2">
                            {data?.stats?.revenueByCurrency?.slice(0, 3).map((c: any) => (
                                <div key={c.currency} className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-secondary-600 uppercase">{c.currency}</span>
                                    <span className="text-xs font-bold text-secondary-900">{formatCurrency(c.amount, c.currency)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card-premium border-secondary-100 border-2">
                        <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] mb-1">Captured Load</h3>
                        <p className="text-3xl font-black text-secondary-900 tracking-tighter">{data?.stats?.totalCount} <span className="text-sm font-bold text-secondary-400">Txns</span></p>
                        <div className="mt-4 flex gap-1 h-1.5 w-full bg-secondary-100 rounded-full overflow-hidden">
                            <div className="bg-primary-500 w-3/4 h-full" />
                            <div className="bg-success-500 w-1/4 h-full" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Trend Chart */}
                    <div className={`card-premium p-8 ${userRole === 'SUPER_ADMIN' ? 'lg:col-span-2' : 'lg:col-span-3'} border-secondary-100 border-2 shadow-xl shadow-secondary-100`}>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-black text-secondary-900 tracking-tight">Revenue Velocity</h2>
                                <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest italic">Consolidated daily value (INR)</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1 text-[8px] font-black text-secondary-400 uppercase"><span className="w-2 h-2 rounded-full bg-primary-500"></span> Captured</span>
                            </div>
                        </div>

                        <div className="h-80 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 800 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 800 }}
                                        tickFormatter={(val) => `₹${val / 1000}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                                        labelStyle={{ fontWeight: 900, color: '#1e293b', marginBottom: '8px', fontSize: '12px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#2563eb"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Company Comparison (Super Admin Only) */}
                    {userRole === 'SUPER_ADMIN' && data?.companyComparison?.length > 0 && (
                        <div className="card-premium p-8 border-secondary-100 border-2 shadow-xl shadow-secondary-100">
                            <div className="mb-8">
                                <h2 className="text-xl font-black text-secondary-900 tracking-tight">Portfolio Split</h2>
                                <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest">Equity by brand value (INR)</p>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={data.companyComparison.map((c: any) => ({
                                            name: c.companyName,
                                            amount: c.inrValue,
                                            currency: c.currency
                                        }))}
                                        margin={{ left: -20 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: 900, fill: '#1e293b' }}
                                            width={110}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Value']}
                                        />
                                        <Bar dataKey="amount" fill="#2563eb" radius={[0, 12, 12, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed Tracker Table */}
                <div className="card-premium p-0 overflow-hidden border-secondary-100 border-2 shadow-2xl shadow-secondary-200/50">
                    <div className="p-8 border-b border-secondary-100 flex justify-between items-center bg-white">
                        <div>
                            <h2 className="text-xl font-black text-secondary-900 tracking-tight">Transaction Ledger</h2>
                            <p className="text-xs text-secondary-400 font-bold uppercase">Consolidated Digital Footprint</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn btn-secondary text-[10px] font-black uppercase flex items-center gap-2 h-10 px-5 rounded-xl border-secondary-200">
                                📑 Raw CSV
                            </button>
                            <button className="btn btn-primary text-[10px] font-black uppercase flex items-center gap-2 h-10 px-5 rounded-xl bg-secondary-900 border-0">
                                📊 Export JSON
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-secondary-600">
                            <thead className="bg-secondary-50 text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] border-b border-secondary-100">
                                <tr>
                                    <th className="px-8 py-5">Global Trace ID</th>
                                    <th className="px-8 py-5">Asset / Entity</th>
                                    <th className="px-8 py-5">Captured Original</th>
                                    <th className="px-8 py-5">Conversion (INR)</th>
                                    <th className="px-8 py-5">Timeline</th>
                                    <th className="px-8 py-5">Outcome</th>
                                    <th className="px-8 py-5">Global Detail</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100 bg-white">
                                {data?.payments?.map((payment: any) => (
                                    <tr key={payment.id} className="hover:bg-primary-50/30 transition-all group">
                                        <td className="px-8 py-6">
                                            <p className="font-black text-secondary-900 uppercase text-xs tracking-tighter group-hover:text-primary-600 transition-colors">{payment.razorpayPaymentId}</p>
                                            <p className="text-[9px] text-secondary-400 font-black uppercase tracking-wider">{payment.paymentMethod}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="font-black text-secondary-800 text-xs tracking-tight">
                                                {payment.invoice?.subscription?.customerProfile?.name || 'Manual Capture'}
                                            </p>
                                            <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-tight">{payment.company?.name || 'Direct Link'}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-secondary-900 font-mono">
                                                {payment.currency?.toUpperCase() || 'INR'} {payment.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-primary-600 font-mono">
                                                ₹{((payment.amount || 0) * (
                                                    payment.currency === 'USD' ? 83.5 :
                                                        payment.currency === 'EUR' ? 90.2 :
                                                            payment.currency === 'GBP' ? 105.8 : 1
                                                )).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            {payment.currency !== 'INR' && (
                                                <span className="block text-[8px] font-black text-secondary-400 uppercase mt-1">Real-time Est.</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-xs font-bold text-secondary-800">
                                            {new Date(payment.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            <span className="block text-[10px] text-secondary-400 font-medium">
                                                {new Date(payment.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase border-2 ${payment.status === 'captured' ? 'bg-success-50 text-success-700 border-success-200' :
                                                payment.status === 'failed' ? 'bg-danger-50 text-danger-700 border-danger-200' :
                                                    'bg-warning-50 text-warning-700 border-warning-200'
                                                }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <button
                                                onClick={() => setSelectedPayment(payment)}
                                                className="h-9 px-4 bg-secondary-50 text-secondary-900 font-black text-[10px] uppercase rounded-xl border border-secondary-200 hover:bg-secondary-900 hover:text-white hover:border-secondary-900 transition-all shadow-sm"
                                            >
                                                Audit Trace
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.payments || data.payments.length === 0) && (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                                                <svg className="w-12 h-12 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <p className="text-sm font-black text-secondary-400 uppercase tracking-widest italic">Gateway synchronization pending...</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data?.total > 50 && (
                        <div className="p-6 bg-secondary-50 border-t border-secondary-100 text-center">
                            <button className="text-secondary-500 font-black text-[10px] uppercase hover:text-secondary-900 transition-all flex items-center justify-center gap-2 mx-auto">
                                <span className="w-8 h-px bg-secondary-200"></span>
                                Load Historical Archive
                                <span className="w-8 h-px bg-secondary-200"></span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {selectedPayment && (
                <PaymentDetailModal
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}
        </DashboardLayout>
    );
}
