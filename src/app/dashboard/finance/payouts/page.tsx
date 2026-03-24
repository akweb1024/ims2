'use client';

import { useEffect, useMemo, useState } from 'react';
import FinanceClientLayout from '../FinanceClientLayout';
import FormattedDate from '@/components/common/FormattedDate';
import toast from 'react-hot-toast';

type Payout = {
    id: string;
    requestedAt: string;
    reviewedAt?: string | null;
    paidAt?: string | null;
    amount: number;
    currency: string;
    status: string;
    method?: string | null;
    notes?: string | null;
    paymentReference?: string | null;
    agencyProfile?: {
        id: string;
        name: string;
        organizationName?: string | null;
        primaryEmail?: string | null;
    };
    requestedBy?: {
        id: string;
        name?: string | null;
        email: string;
    };
    reviewedBy?: {
        id: string;
        name?: string | null;
        email: string;
    };
};

export default function FinancePayoutsPage() {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState<'ALL' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID'>('REQUESTED');
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
    const [actionStatus, setActionStatus] = useState<'APPROVED' | 'REJECTED' | 'PAID'>('APPROVED');
    const [notes, setNotes] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchPayouts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (activeStatus !== 'ALL') params.set('status', activeStatus);

            const res = await fetch(`/api/commissions/payouts?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            if (!res.ok) {
                throw new Error('Failed to load payout queue');
            }

            const data = await res.json();
            setPayouts(data);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to load payout queue');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, [activeStatus]);

    const summary = useMemo(() => ({
        requested: payouts.filter((item) => item.status === 'REQUESTED').length,
        approved: payouts.filter((item) => item.status === 'APPROVED').length,
        rejected: payouts.filter((item) => item.status === 'REJECTED').length,
        paid: payouts.filter((item) => item.status === 'PAID').length,
    }), [payouts]);

    const openAction = (payout: Payout, nextStatus: 'APPROVED' | 'REJECTED' | 'PAID') => {
        setSelectedPayout(payout);
        setActionStatus(nextStatus);
        setNotes(payout.notes || '');
        setPaymentReference(nextStatus === 'PAID' ? payout.paymentReference || '' : '');
    };

    const closeAction = () => {
        setSelectedPayout(null);
        setNotes('');
        setPaymentReference('');
    };

    const submitAction = async () => {
        if (!selectedPayout) return;
        if (actionStatus === 'PAID' && !paymentReference.trim()) {
            toast.error('Payment reference is required to mark a payout as paid');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/commissions/payouts/${selectedPayout.id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: actionStatus,
                    notes,
                    paymentReference: paymentReference || null,
                    method: selectedPayout.method || 'Bank Transfer',
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update payout');
            }

            setPayouts((prev) => prev.map((item) => item.id === data.id ? data : item));
            toast.success(`Payout ${actionStatus.toLowerCase()} successfully`);
            closeAction();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update payout');
        } finally {
            setSubmitting(false);
        }
    };

    const badgeTone = (status: string) => {
        if (status === 'PAID') return 'badge-success';
        if (status === 'REQUESTED' || status === 'APPROVED') return 'badge-warning';
        if (status === 'REJECTED' || status === 'CANCELLED') return 'badge-danger';
        return 'badge-secondary';
    };

    return (
        <FinanceClientLayout>
            <div className="space-y-6 page-animate">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-secondary-900 tracking-tight">Commission Payout Queue</h1>
                        <p className="text-secondary-500 font-medium mt-1">Review agency payout requests, approve them, and record final transfer references.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card-premium">
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Requested</p>
                        <p className="text-3xl font-black text-warning-600">{summary.requested}</p>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Approved</p>
                        <p className="text-3xl font-black text-primary-600">{summary.approved}</p>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Rejected</p>
                        <p className="text-3xl font-black text-danger-500">{summary.rejected}</p>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Paid</p>
                        <p className="text-3xl font-black text-success-600">{summary.paid}</p>
                    </div>
                </div>

                <div className="card-premium">
                    <div className="flex flex-wrap gap-2">
                        {['ALL', 'REQUESTED', 'APPROVED', 'REJECTED', 'PAID'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setActiveStatus(status as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    activeStatus === status
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                        : 'bg-white border border-secondary-200 text-secondary-500 hover:bg-secondary-50'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Agency</th>
                                    <th>Requested On</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Notes</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-12 animate-pulse">Loading payout queue...</td></tr>
                                ) : payouts.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-secondary-500">No payout requests found.</td></tr>
                                ) : payouts.map((payout) => (
                                    <tr key={payout.id}>
                                        <td>
                                            <div className="space-y-1">
                                                <p className="font-bold text-secondary-900">{payout.agencyProfile?.name || 'Unknown Agency'}</p>
                                                <p className="text-xs text-secondary-500">{payout.agencyProfile?.organizationName || payout.agencyProfile?.primaryEmail || 'No organization'}</p>
                                            </div>
                                        </td>
                                        <td className="text-sm text-secondary-600">
                                            <FormattedDate date={payout.requestedAt} />
                                        </td>
                                        <td className="font-bold text-secondary-900">
                                            {payout.currency === 'INR' ? '₹' : '$'}{payout.amount.toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${badgeTone(payout.status)}`}>{payout.status}</span>
                                        </td>
                                        <td className="text-sm text-secondary-500 max-w-[260px]">
                                            <div className="line-clamp-2">{payout.notes || '—'}</div>
                                            {payout.paymentReference && (
                                                <div className="text-[10px] uppercase font-black tracking-widest text-secondary-400 mt-1">
                                                    Ref: {payout.paymentReference}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                {payout.status === 'REQUESTED' && (
                                                    <>
                                                        <button onClick={() => openAction(payout, 'APPROVED')} className="btn btn-secondary py-1.5 text-xs">Approve</button>
                                                        <button onClick={() => openAction(payout, 'REJECTED')} className="btn btn-danger py-1.5 text-xs">Reject</button>
                                                    </>
                                                )}
                                                {payout.status === 'APPROVED' && (
                                                    <button onClick={() => openAction(payout, 'PAID')} className="btn btn-primary py-1.5 text-xs">Mark Paid</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {selectedPayout && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full space-y-5">
                            <div>
                                <h2 className="text-2xl font-bold text-secondary-900">
                                    {actionStatus === 'APPROVED' ? 'Approve payout request' : actionStatus === 'REJECTED' ? 'Reject payout request' : 'Mark payout as paid'}
                                </h2>
                                <p className="text-sm text-secondary-500 mt-1">
                                    {selectedPayout.agencyProfile?.name} • {selectedPayout.currency === 'INR' ? '₹' : '$'}{selectedPayout.amount.toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <label className="label">Review notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="input h-28"
                                    placeholder="Add finance remarks, rejection reason, or approval context..."
                                />
                            </div>

                            {actionStatus === 'PAID' && (
                                <div>
                                    <label className="label">Payment reference</label>
                                    <input
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        className="input"
                                        placeholder="UTR / transaction ID / bank reference"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button onClick={closeAction} className="btn btn-secondary">Cancel</button>
                                <button
                                    onClick={submitAction}
                                    disabled={submitting}
                                    className={`btn ${actionStatus === 'REJECTED' ? 'btn-danger' : 'btn-primary'}`}
                                >
                                    {submitting ? 'Saving...' : actionStatus === 'APPROVED' ? 'Approve' : actionStatus === 'REJECTED' ? 'Reject' : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FinanceClientLayout>
    );
}
