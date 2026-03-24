'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import toast from 'react-hot-toast';

type CommissionPayout = {
    id: string;
    requestedAt?: string;
    paidAt?: string | null;
    amount: number;
    status: string;
    method?: string | null;
    paymentReference?: string | null;
};

export default function CommissionPage() {
    const [userRole, setUserRole] = useState('AGENCY');
    const [stats, setStats] = useState({
        totalEarned: 0,
        pendingPayout: 0,
        rate: 10,
        totalPaid: 0,
        committedPayouts: 0,
    });
    const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestAmount, setRequestAmount] = useState('');
    const [requestNotes, setRequestNotes] = useState('');
    const [submittingRequest, setSubmittingRequest] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/commissions/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats({
                        totalEarned: data.totalEarned,
                        pendingPayout: data.pendingPayout,
                        rate: data.rate,
                        totalPaid: data.totalPaid || 0,
                        committedPayouts: data.committedPayouts || 0,
                    });
                    setPayouts(data.recentPayouts || []);
                }
            } catch (err) {
                console.error('Failed to fetch commission stats', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const handleRequestPayout = async () => {
        const token = localStorage.getItem('token');
        const amount = Number(requestAmount);

        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Enter a valid payout amount');
            return;
        }

        setSubmittingRequest(true);
        try {
            const res = await fetch('/api/commissions/payouts', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    notes: requestNotes,
                    method: 'Bank Transfer',
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to request payout');
            }

            setPayouts((prev) => [data, ...prev]);
            setStats((prev) => ({
                ...prev,
                pendingPayout: Math.max(prev.pendingPayout - amount, 0),
                committedPayouts: prev.committedPayouts + amount,
            }));
            setRequestAmount('');
            setRequestNotes('');
            toast.success('Payout request submitted');
        } catch (error: any) {
            toast.error(error.message || 'Failed to request payout');
        } finally {
            setSubmittingRequest(false);
        }
    };

    const payoutBadgeTone = (status: string) => {
        if (status === 'PAID') return 'badge-success';
        if (status === 'REQUESTED' || status === 'APPROVED') return 'badge-warning';
        if (status === 'REJECTED' || status === 'CANCELLED') return 'badge-danger';
        return 'badge-secondary';
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Commission Earnings</h1>
                        <p className="text-secondary-600">Track and manage your agency partner rewards</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card-premium">
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Commission Rate</p>
                        <p className="text-3xl font-black text-primary-600">{stats.rate}%</p>
                        <p className="text-xs text-secondary-500 mt-2">Per successful subscription</p>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Total Earnings</p>
                        <p className="text-3xl font-black text-secondary-900">₹{stats.totalEarned.toLocaleString()}</p>
                        <p className="text-xs text-secondary-500 mt-2">Total earned across active agency subscriptions</p>
                    </div>
                    <div className="card-premium border-primary-100 bg-primary-50">
                        <p className="text-xs font-black text-primary-600 uppercase tracking-widest mb-2">Available for Payout</p>
                        <p className="text-3xl font-black text-secondary-900">₹{stats.pendingPayout.toLocaleString()}</p>
                        <p className="text-xs text-secondary-500 mt-2">Paid: ₹{stats.totalPaid.toLocaleString()} • In queue: ₹{stats.committedPayouts.toLocaleString()}</p>
                    </div>
                </div>

                <div className="card-premium">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1">
                            <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Request Payout</p>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={requestAmount}
                                onChange={(e) => setRequestAmount(e.target.value)}
                                className="input"
                                placeholder="Enter amount in INR"
                            />
                        </div>
                        <div className="flex-[1.4]">
                            <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Notes</p>
                            <input
                                value={requestNotes}
                                onChange={(e) => setRequestNotes(e.target.value)}
                                className="input"
                                placeholder="Bank transfer notes or remarks..."
                            />
                        </div>
                        <button
                            onClick={handleRequestPayout}
                            disabled={submittingRequest || loading || stats.pendingPayout <= 0}
                            className="btn btn-primary py-3 px-6"
                        >
                            {submittingRequest ? 'Submitting...' : 'Request Payout'}
                        </button>
                    </div>
                </div>

                <div className="card-premium overflow-hidden">
                    <h3 className="text-lg font-bold text-secondary-900 mb-6 p-6 pb-0">Recent Payouts</h3>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Payout Date</th>
                                    <th>Method</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th className="text-right">Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-12 animate-pulse">Loading payouts...</td></tr>
                                ) : payouts.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-secondary-500">No payout requests yet.</td></tr>
                                ) : payouts.map(p => (
                                    <tr key={p.id}>
                                        <td><FormattedDate date={p.paidAt || p.requestedAt || new Date().toISOString()} /></td>
                                        <td>{p.method || 'Bank Transfer'}</td>
                                        <td className="font-bold text-secondary-900">₹{p.amount.toLocaleString()}</td>
                                        <td><span className={`badge ${payoutBadgeTone(p.status)}`}>{p.status}</span></td>
                                        <td className="text-right">
                                            <span className="text-secondary-500 font-bold text-xs uppercase">
                                                {p.paymentReference || 'Pending'}
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
