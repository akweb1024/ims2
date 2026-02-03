'use client';

import { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, Globe, Search, ArrowRight, DollarSign, Calendar, Filter } from 'lucide-react';

export default function EmployeeTransactions() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/payments/razorpay', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch transactions', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                <IndianRupee size={48} className="text-primary-200 animate-bounce" />
                <p className="text-secondary-400 font-bold animate-pulse">Synchronizing Ledger Data...</p>
            </div>
        );
    }

    const handleClaim = async (paymentId: string) => {
        if (!confirm('Are you sure the payment is manually claimed by you? This will generate a revenue claim request.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/revenue/claims', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paymentId: paymentId
                })
            });

            if (res.ok) {
                alert('Claim submitted successfully!');
                fetchTransactions();
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    };

    const filteredPayments = data?.payments?.filter((p: any) => {
        const matchesSearch =
            (p.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.razorpayPaymentId?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

        return matchesSearch && matchesStatus;
    }) || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium p-8 bg-gradient-to-br from-secondary-900 to-black text-white border-0 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:rotate-12 transition-transform">
                        <TrendingUp size={100} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">Company Gross Revenue</p>
                        <h3 className="text-4xl font-black tracking-tighter">₹{Math.round(data?.stats?.totalRevenue || 0).toLocaleString()}</h3>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-primary-400">
                            <span className="bg-primary-500/20 px-2 py-0.5 rounded uppercase tracking-widest">Live Metric</span>
                        </div>
                    </div>
                </div>

                <div className="card-premium p-8 border-t-4 border-primary-500">
                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2">Total Transactions</p>
                    <h3 className="text-4xl font-black text-secondary-900 tracking-tighter">{data?.stats?.totalCount || 0}</h3>
                    <p className="text-xs text-secondary-500 mt-4 font-medium italic">High volume settlement protocol</p>
                </div>

                <div className="card-premium p-8 border-t-4 border-success-500">
                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2">Current Month</p>
                    <h3 className="text-4xl font-black text-secondary-900 tracking-tighter">₹{data?.stats?.currentMonthRevenue?.toLocaleString()}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-success-600">
                        <span>↗ {typeof data?.stats?.momGrowth === 'number' ? data.stats.momGrowth.toFixed(1) : (data?.stats?.momGrowth || 0)}% Growth</span>
                    </div>
                </div>
            </div>

            {/* Ledger View */}
            <div className="card-premium p-0 overflow-hidden shadow-xl border border-secondary-100">
                <div className="p-8 border-b border-secondary-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-secondary-50/20">
                    <div>
                        <h2 className="text-2xl font-black text-secondary-900 tracking-tight uppercase">Company Ledger</h2>
                        <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest mt-1">Real-time payment transparency</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                        <div className="relative flex-1 lg:min-w-[300px]">
                            <Search size={16} className="absolute left-4 top-3.5 text-secondary-400" />
                            <input
                                type="text"
                                placeholder="Search by ID, name or service..."
                                className="input h-12 pl-12 text-xs font-bold rounded-2xl border-secondary-200 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Filter size={14} className="absolute left-4 top-3.5 text-secondary-400" />
                            <select
                                className="select h-12 pl-12 pr-8 text-[10px] font-black uppercase tracking-widest rounded-2xl border-secondary-200"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All Status</option>
                                <option value="captured">Captured</option>
                                <option value="authorized">Authorized</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#fcfdff] text-[10px] font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100">
                            <tr>
                                <th className="px-8 py-5 text-left">Transaction ID</th>
                                <th className="px-8 py-5 text-left">Customer / Service</th>
                                <th className="px-8 py-5 text-left">Created At</th>
                                <th className="px-8 py-5 text-right">Amount</th>
                                <th className="px-8 py-5 text-center">Status</th>
                                <th className="px-8 py-5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 bg-white">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center text-secondary-300">
                                        <div className="flex flex-col items-center gap-4 opacity-50">
                                            <Search size={64} />
                                            <p className="font-black uppercase tracking-[0.3em]">No matching transactions</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-primary-50/20 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="font-mono text-xs font-black text-secondary-900 group-hover:text-primary-600">
                                                #{p.razorpayPaymentId || p.id.slice(0, 12)}
                                            </div>
                                            {p.international && (
                                                <span className="inline-flex mt-2 px-2 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-black rounded uppercase tracking-tighter">
                                                    <Globe size={10} className="mr-1" /> Int&apos;l
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-sm font-black text-secondary-900">{p.name || 'External Customer'}</div>
                                            <div className="text-[10px] text-secondary-400 font-bold uppercase truncate max-w-[200px] mt-0.5">
                                                {p.description || 'System Subscription'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-xs font-black text-secondary-700">
                                                {new Date(p.created_at * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div className="text-[9px] text-secondary-400 font-bold mt-1">
                                                {new Date(p.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="font-mono text-sm font-black text-secondary-900">
                                                {p.currency} {p.amount.toLocaleString()}
                                            </div>
                                            {p.currency !== 'INR' && (
                                                <div className="text-[9px] text-primary-500 font-bold mt-1 uppercase">
                                                    ≈ ₹{Math.round(p.base_amount || p.amount).toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${p.status === 'captured' ? 'bg-green-500' : p.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${p.status === 'captured' ? 'text-green-700' : p.status === 'failed' ? 'text-red-700' : 'text-yellow-700'}`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {p.status === 'captured' && !p.revenueTransaction && (
                                                <button
                                                    onClick={() => handleClaim(p.id)}
                                                    className="btn hover:bg-primary-50 text-primary-600 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-primary-200 hover:border-primary-500 transition-all"
                                                >
                                                    Claim
                                                </button>
                                            )}
                                            {p.revenueTransaction && (
                                                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest flex items-center justify-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-400"></span> Claimed
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 bg-secondary-50/50 border-t border-secondary-50">
                    <div className="flex items-start gap-4 p-4 bg-white rounded-[1.5rem] border border-secondary-100 shadow-sm">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-900">Strategic Revenue Dashboard</p>
                            <p className="text-[10px] text-secondary-500 italic mt-1 leading-relaxed">
                                This dashboard provides transparency into company revenue streams processed via our primary payment gateway.
                                Data is automatically synced and represents gross settlements.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
