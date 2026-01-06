'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';

export default function RazorpayTrackerPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [userRole, setUserRole] = useState('');

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

    if (loading && !data) return <div className="p-8 text-center text-secondary-500">Initializing revenue tracker...</div>;

    const chartData = data?.dailyRevenue?.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        revenue: d.revenue
    })).reverse() || [];

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter">Razorpay Revenue Tracker</h1>
                        <p className="text-secondary-500 font-medium">Trace digital payments and monitor financial health in real-time.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Last Synced</p>
                            <p className="text-xs font-bold text-secondary-600">
                                {data?.lastSync ? new Date(data.lastSync.lastSyncAt).toLocaleString() : 'Never'}
                            </p>
                        </div>
                        <button
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className={`btn ${isSyncing ? 'bg-secondary-200' : 'btn-primary'} flex items-center gap-2`}
                        >
                            {isSyncing ? '🔄 Syncing...' : 'Sync Now'}
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium bg-gradient-to-br from-primary-600 to-primary-800 text-white border-0 shadow-xl shadow-primary-900/20">
                        <h3 className="text-xs font-black text-white/60 uppercase tracking-widest mb-1">Total Digital Revenue</h3>
                        <p className="text-3xl font-black">₹{data?.stats?.totalRevenue?.toLocaleString()}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/80">
                            <span className="bg-white/20 px-2 py-0.5 rounded-full">All Time</span>
                            <span>{data?.stats?.totalCount} txns</span>
                        </div>
                    </div>

                    <div className="card-premium">
                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-1">MTD Performance</h3>
                        <p className="text-3xl font-black text-secondary-900">₹{data?.stats?.currentMonthRevenue?.toLocaleString()}</p>
                        <div className={`mt-4 flex items-center gap-1 text-xs font-bold ${parseFloat(data?.stats?.momGrowth) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            <span>{parseFloat(data?.stats?.momGrowth) >= 0 ? '↗' : '↘'} {Math.abs(data?.stats?.momGrowth)}%</span>
                            <span className="text-secondary-400 font-medium">vs Last Month</span>
                        </div>
                    </div>

                    <div className="card-premium">
                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-1">Last Month</h3>
                        <p className="text-3xl font-black text-secondary-900">₹{data?.stats?.lastMonthRevenue?.toLocaleString()}</p>
                        <p className="text-[10px] text-secondary-500 mt-4 font-black uppercase tracking-widest">Closed Period</p>
                    </div>

                    <div className="card-premium">
                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-1">Avg Ticket</h3>
                        <p className="text-3xl font-black text-secondary-900">
                            ₹{data?.stats?.totalCount > 0 ? (data.stats.totalRevenue / data.stats.totalCount).toFixed(0) : 0}
                        </p>
                        <p className="text-xs text-secondary-500 mt-4 font-medium">Capture average</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Trend Chart */}
                    <div className={`card-premium p-8 ${userRole === 'SUPER_ADMIN' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-black text-secondary-900">Revenue Velocity</h2>
                                <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest">Last 30 Days trend</p>
                            </div>
                        </div>

                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                        tickFormatter={(val) => `₹${val / 1000}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#2563eb"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Company Comparison (Super Admin Only) */}
                    {userRole === 'SUPER_ADMIN' && data?.companyComparison?.length > 0 && (
                        <div className="card-premium p-8">
                            <div className="mb-8">
                                <h2 className="text-xl font-black text-secondary-900">Market Share</h2>
                                <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest">By Company revenue</p>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={data.companyComparison.map((c: any) => ({
                                            name: c.companyName,
                                            amount: c._sum.amount
                                        }))}
                                        margin={{ left: -20 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fontWeight: 800, fill: '#1e293b' }}
                                            width={100}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="amount" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed Tracker Table */}
                <div className="card-premium p-0 overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                        <h2 className="text-lg font-black text-secondary-900">Transaction Logs</h2>
                        <button className="text-xs font-black text-primary-600 uppercase hover:underline">Download Report</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-secondary-600">
                            <thead className="bg-secondary-50 text-[10px] font-black text-secondary-400 uppercase tracking-[0.1em]">
                                <tr>
                                    <th className="px-6 py-4">Transaction Details</th>
                                    <th className="px-6 py-4">Customer / Context</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {data?.payments?.map((payment: any) => (
                                    <tr key={payment.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-secondary-900 uppercase text-xs">{payment.razorpayPaymentId}</p>
                                            <p className="text-[10px] text-secondary-400 font-medium">Method: {payment.paymentMethod}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-secondary-800 text-xs">
                                                {payment.invoice?.subscription?.customerProfile?.name || 'Manual Payment'}
                                            </p>
                                            <p className="text-[10px] text-secondary-400">{payment.company?.name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-black text-secondary-900">₹{payment.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium">
                                            {new Date(payment.paymentDate).toLocaleDateString()}
                                            <span className="block text-[10px] text-secondary-400">
                                                {new Date(payment.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${payment.status === 'captured' ? 'bg-success-100 text-success-700' :
                                                payment.status === 'failed' ? 'bg-danger-100 text-danger-700' :
                                                    'bg-warning-100 text-warning-700'
                                                }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-primary-600 font-bold text-[10px] uppercase hover:underline">Details</button>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.payments || data.payments.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-secondary-400 italic font-medium">
                                            No Razorpay transactions found for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data?.total > 50 && (
                        <div className="p-4 bg-secondary-50 border-t border-secondary-100 text-center">
                            <button className="text-secondary-500 font-black text-[10px] uppercase hover:text-secondary-900 transition-colors">Load More History</button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
