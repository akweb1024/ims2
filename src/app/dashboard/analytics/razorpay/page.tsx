'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { CreditCard, Wallet, Globe, TrendingUp, DollarSign, Filter, Download, RefreshCw } from 'lucide-react';

export default function RazorpayTrackerPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [filterMethod, setFilterMethod] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

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

    if (loading && !data) return <div className="p-8 text-center text-secondary-500 font-bold animate-pulse">Loading payment gateway data...</div>;

    const chartData = data?.dailyRevenue?.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        revenue: d.revenue,   // Total (Blue)
        captured: d.captured, // Captured (Green)
        failed: d.failed      // Failed (Red)
    })).reverse() || [];

    const formatCurrency = (amount: number, currency: string = 'INR') => {
        // Goal 2: Code + Amount only (no symbol)
        const val = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
        return `${currency.toUpperCase()} ${val}`;
    };

    // Payment Method Distribution
    const methodStats = data?.payments?.reduce((acc: any, p: any) => {
        const method = p.method || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
    }, {}) || {};

    const methodChartData = Object.entries(methodStats).map(([name, value]) => ({ name, value }));
    const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#f59e0b', '#10b981'];

    // Filter payments
    const filteredPayments = data?.payments?.filter((p: any) => {
        if (filterMethod !== 'ALL' && p.method !== filterMethod) return false;
        if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
        return true;
    }) || [];

    const getPaymentIcon = (method: string) => {
        switch (method) {
            case 'card': return <CreditCard size={16} className="text-blue-500" />;
            case 'wallet': return <Wallet size={16} className="text-purple-500" />;
            case 'upi': return <span className="text-green-500 font-bold text-xs">UPI</span>;
            case 'netbanking': return <span className="text-orange-500 font-bold text-xs">NET</span>;
            default: return <DollarSign size={16} className="text-gray-500" />;
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter">Razorpay Revenue Analytics</h1>
                        <p className="text-secondary-500 font-medium">Multi-currency payment gateway insights with real-time conversion</p>
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
                            className={`btn ${isSyncing ? 'bg-secondary-200' : 'btn-primary'} flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg`}
                        >
                            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card-premium bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Total Revenue (INR)</h3>
                                <p className="text-3xl font-black mt-2">₹{Math.round(data?.stats?.totalRevenue || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-white/10 rounded-2xl">
                                <TrendingUp size={24} />
                            </div>
                        </div>
                        <div className="text-xs font-bold text-white/80">Multi-currency consolidated</div>
                    </div>

                    <div className="card-premium hover:border-primary-500 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">MTD Performance</h3>
                                <p className="text-3xl font-black text-secondary-900 mt-2">₹{data?.stats?.currentMonthRevenue?.toLocaleString()}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-black ${parseFloat(data?.stats?.momGrowth) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {parseFloat(data?.stats?.momGrowth) >= 0 ? '↗' : '↘'} {Math.abs(data?.stats?.momGrowth)}%
                            </div>
                        </div>
                        <div className="text-xs font-bold text-secondary-500">vs Last Month</div>
                    </div>

                    <div className="card-premium hover:border-primary-500 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Total Transactions</h3>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{data?.stats?.totalCount || 0}</p>
                            </div>
                            <div className="p-3 bg-secondary-50 rounded-2xl">
                                <DollarSign size={24} className="text-secondary-400" />
                            </div>
                        </div>
                        <div className="text-xs font-bold text-secondary-500">Payment events</div>
                    </div>

                    <div className="card-premium hover:border-primary-500 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">International</h3>
                                <p className="text-3xl font-black text-secondary-900 mt-2">
                                    {data?.payments?.filter((p: any) => p.international).length || 0}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-2xl">
                                <Globe size={24} className="text-purple-500" />
                            </div>
                        </div>
                        <div className="text-xs font-bold text-secondary-500">Cross-border payments</div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Trend */}
                    <div className="lg:col-span-2 card-premium p-6">
                        <h2 className="text-xl font-black text-secondary-900 mb-6">Revenue Trend (Last 30 Days)</h2>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                        formatter={(value: any, name: any) => [`${value.toLocaleString()}`, name ? name.charAt(0).toUpperCase() + name.slice(1) : '']}
                                    />
                                    {/* Goal 3: Multi-colored graph lines */}
                                    <Area type="monotone" dataKey="revenue" name="Total" stroke="#2563eb" strokeWidth={2} fill="url(#colorRevenue)" fillOpacity={0.1} />
                                    <Area type="monotone" dataKey="captured" name="Captured" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                                    <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Payment Method Distribution */}
                    <div className="card-premium p-6">
                        <h2 className="text-xl font-black text-secondary-900 mb-6">Payment Methods</h2>
                        <div className="h-80 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={methodChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {methodChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Currency Breakdown */}
                <div className="card-premium p-6">
                    <h2 className="text-xl font-black text-secondary-900 mb-6">Currency Breakdown</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {data?.stats?.revenueByCurrency?.map((c: any) => (
                            <div key={c.currency} className="p-4 bg-secondary-50 rounded-2xl border border-secondary-100">
                                <div className="text-xs font-black text-secondary-400 uppercase mb-1">{c.currency}</div>
                                <div className="text-lg font-black text-secondary-900">{formatCurrency(c.amount, c.currency)}</div>
                                <div className="text-[10px] font-bold text-secondary-500 mt-1">{c.count} txns</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transaction Table */}
                <div className="card-premium p-0 overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-black text-secondary-900">Transaction Ledger</h2>
                            <p className="text-xs text-secondary-500 font-bold">Detailed payment records</p>
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="select select-sm border-secondary-200 rounded-xl font-bold text-xs"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="ALL">All Status</option>
                                <option value="captured">Captured</option>
                                <option value="authorized">Authorized</option>
                                <option value="failed">Failed</option>
                            </select>
                            <button className="btn btn-sm bg-secondary-900 text-white rounded-xl px-4">
                                <Download size={14} /> Export
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary-50 text-[10px] font-black text-secondary-400 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left">Payment ID</th>
                                    <th className="px-6 py-4 text-left">Description</th>
                                    <th className="px-6 py-4 text-left">Customer Details</th>
                                    <th className="px-6 py-4 text-left">Created On</th>
                                    <th className="px-6 py-4 text-left">Amount</th>
                                    <th className="px-6 py-4 text-left">Status</th>
                                    <th className="px-6 py-4 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {filteredPayments.map((payment: any) => (
                                    <tr key={payment.id} className="hover:bg-primary-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs font-bold text-secondary-900">
                                                {payment.razorpayPaymentId || payment.id}
                                            </div>
                                            {payment.international && (
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black rounded-full">
                                                    <Globe size={10} className="inline mr-1" />INTL
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-secondary-900 max-w-xs truncate">
                                                {payment.description || 'No description'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-secondary-900">{payment.email || 'N/A'}</div>
                                            <div className="text-xs text-secondary-500">{payment.contact || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-secondary-700">
                                                {new Date(payment.created_at * 1000).toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                            <div className="text-[10px] text-secondary-500">
                                                {new Date(payment.created_at * 1000).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono font-bold text-secondary-900">
                                                {payment.currency} {formatCurrency(payment.amount, payment.currency)}
                                            </div>
                                            {payment.currency !== 'INR' && (
                                                <div className="text-[10px] text-secondary-500 mt-1">
                                                    ≈ ₹{formatCurrency(payment.base_amount || payment.amount, 'INR')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${payment.status === 'captured' ? 'bg-green-100 text-green-700' :
                                                payment.status === 'authorized' ? 'bg-yellow-100 text-yellow-700' :
                                                    payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedPayment(payment)}
                                                className="px-3 py-1 bg-secondary-100 hover:bg-secondary-900 hover:text-white text-secondary-900 rounded-lg text-xs font-bold transition-all"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPayments.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                                                <DollarSign size={48} className="text-secondary-300" />
                                                <p className="text-sm font-black text-secondary-400 uppercase tracking-widest">
                                                    No transactions found
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Payment Detail Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPayment(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 bg-secondary-900 text-white">
                            <h2 className="text-2xl font-black">Payment Details</h2>
                            <p className="text-white/60 text-sm mt-1">Transaction ID: {selectedPayment.id}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-black text-secondary-400 uppercase mb-1">Razorpay ID</div>
                                    <div className="font-mono text-sm font-bold">{selectedPayment.razorpayPaymentId || selectedPayment.id}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-secondary-400 uppercase mb-1">Status</div>
                                    <div className="font-bold capitalize">{selectedPayment.status}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-secondary-400 uppercase mb-1">Amount</div>
                                    <div className="font-bold">{selectedPayment.currency} {formatCurrency(selectedPayment.amount, selectedPayment.currency)}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-secondary-400 uppercase mb-1">Method</div>
                                    <div className="font-bold capitalize">{selectedPayment.method}</div>
                                </div>
                                {selectedPayment.email && (
                                    <div>
                                        <div className="text-xs font-black text-secondary-400 uppercase mb-1">Email</div>
                                        <div className="font-bold text-sm">{selectedPayment.email}</div>
                                    </div>
                                )}
                                {selectedPayment.contact && (
                                    <div>
                                        <div className="text-xs font-black text-secondary-400 uppercase mb-1">Contact</div>
                                        <div className="font-bold">{selectedPayment.contact}</div>
                                    </div>
                                )}
                                {selectedPayment.description && (
                                    <div className="col-span-2">
                                        <div className="text-xs font-black text-secondary-400 uppercase mb-1">Description</div>
                                        <div className="font-bold text-sm">{selectedPayment.description}</div>
                                    </div>
                                )}
                                {selectedPayment.card && (
                                    <div className="col-span-2 p-4 bg-blue-50 rounded-xl">
                                        <div className="text-xs font-black text-blue-900 uppercase mb-2">Card Details</div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div><span className="text-blue-600 font-bold">Network:</span> {selectedPayment.card.network}</div>
                                            <div><span className="text-blue-600 font-bold">Last 4:</span> {selectedPayment.card.last4}</div>
                                            <div><span className="text-blue-600 font-bold">Type:</span> {selectedPayment.card.type}</div>
                                            <div><span className="text-blue-600 font-bold">Name:</span> {selectedPayment.card.name}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedPayment.wallet && (
                                    <div className="col-span-2 p-4 bg-purple-50 rounded-xl">
                                        <div className="text-xs font-black text-purple-900 uppercase mb-1">Wallet</div>
                                        <div className="font-bold capitalize">{selectedPayment.wallet}</div>
                                    </div>
                                )}
                                {selectedPayment.acquirer_data && (
                                    <div className="col-span-2 p-4 bg-secondary-50 rounded-xl">
                                        <div className="text-xs font-black text-secondary-700 uppercase mb-2">Acquirer Data</div>
                                        <pre className="text-xs font-mono">{JSON.stringify(selectedPayment.acquirer_data, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="w-full btn btn-primary py-3 rounded-xl font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
