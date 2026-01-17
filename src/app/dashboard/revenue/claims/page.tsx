'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Award, CheckCircle2, XCircle, Clock, AlertTriangle,
    User, DollarSign, Calendar, FileText, Filter,
    ArrowRight, BadgeCheck, ShieldAlert, Split, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function RevenueClaimsPage() {
    const [user, setUser] = useState<any>(null);
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('PENDING');

    const fetchClaims = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/revenue/claims?status=${filterStatus === 'ALL' ? '' : filterStatus}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setClaims(data);
            }
        } catch (error) {
            console.error('Fetch claims error:', error);
            toast.error('Failed to load claims');
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
        fetchClaims();
    }, [fetchClaims]);

    const updateClaimStatus = async (id: string, status: string, notes: string = '') => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/revenue/claims', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, status, reviewNotes: notes })
            });

            if (res.ok) {
                toast.success(`Claim ${status.toLowerCase()}`);
                fetchClaims();
            }
        } catch (error) {
            toast.error('Failed to update claim');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-warning-500 to-warning-600 rounded-2xl shadow-lg">
                            <Award className="w-8 h-8 text-white" />
                        </div>
                        Revenue Claims Approval
                    </h1>
                    <p className="text-secondary-500 mt-2">Review and approve revenue claims from employees</p>
                </div>

                {/* Filters */}
                <div className="flex gap-4 items-center overflow-x-auto pb-2">
                    {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-6 py-2 rounded-xl text-sm font-black transition-all border-2 ${filterStatus === status
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                    : 'bg-white text-secondary-600 border-secondary-100 hover:border-indigo-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Claims List */}
                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        </div>
                    ) : claims.length === 0 ? (
                        <div className="card-premium p-20 text-center">
                            <Clock className="w-16 h-16 text-secondary-200 mx-auto mb-4" />
                            <p className="text-secondary-500 font-bold">No revenue claims found in this category</p>
                        </div>
                    ) : (
                        claims.map((claim: any) => (
                            <div key={claim.id} className="card-premium p-0 overflow-hidden hover:shadow-xl transition-all border-l-4 border-indigo-500">
                                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                                    {/* Employee Info */}
                                    <div className="col-span-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                                                {claim.employee.user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-secondary-900">{claim.employee.user.name}</h3>
                                                <p className="text-xs text-secondary-500">Claimed {new Date(claim.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Transaction Details */}
                                    <div className="col-span-2 bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Linked Transaction</span>
                                            <span className="text-[10px] font-black text-indigo-600">{claim.revenueTransaction.transactionNumber}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-bold text-secondary-800">{claim.revenueTransaction.customerName}</p>
                                                <p className="text-xs text-secondary-500">{claim.revenueTransaction.paymentMethod} - {claim.revenueTransaction.referenceNumber || 'No Ref'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-success-600">{formatCurrency(claim.claimAmount)}</p>
                                                <p className="text-[10px] text-secondary-400">Verified: {claim.revenueTransaction.verificationStatus}</p>
                                            </div>
                                        </div>
                                        {claim.claimReason && (
                                            <p className="mt-2 text-xs text-secondary-600 bg-white p-2 rounded-lg border border-secondary-100 italic">
                                                "{claim.claimReason}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex flex-col gap-2">
                                        {claim.status === 'PENDING' ? (
                                            <>
                                                <button
                                                    onClick={() => updateClaimStatus(claim.id, 'APPROVED')}
                                                    className="btn btn-primary w-full flex items-center justify-center gap-2 bg-success-600 hover:bg-success-700 border-none px-4"
                                                >
                                                    <CheckCircle2 size={18} />
                                                    Approve Claim
                                                </button>
                                                <button
                                                    onClick={() => updateClaimStatus(claim.id, 'REJECTED')}
                                                    className="btn btn-secondary w-full flex items-center justify-center gap-2 text-danger-600 hover:bg-danger-50 border-danger-100 px-4"
                                                >
                                                    <XCircle size={18} />
                                                    Reject / Duplicate
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-black w-full justify-center ${claim.status === 'APPROVED' ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                                                    }`}>
                                                    {claim.status === 'APPROVED' ? <BadgeCheck size={16} /> : <ShieldAlert size={16} />}
                                                    {claim.status}
                                                </span>
                                                {claim.reviewedAt && (
                                                    <span className="text-[10px] text-secondary-400">By Admin on {new Date(claim.reviewedAt).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
