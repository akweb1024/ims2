
'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CRMClientLayout from '../../CRMClientLayout';
import FormattedDate from '@/components/common/FormattedDate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [deal, setDeal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDeal = useCallback(async () => {
        try {
            const res = await fetch(`/api/crm/deals/${id}`);
            if (res.ok) {
                const data = await res.json();
                setDeal(data);
            } else {
                router.push('/dashboard/crm/deals');
            }
        } catch (error) {
            console.error('Error fetching deal:', error);
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchDeal();
    }, [fetchDeal]);

    const handleStageUpdate = async (stage: string) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/crm/deals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage })
            });
            if (res.ok) {
                fetchDeal();
            } else {
                alert('Failed to update stage');
            }
        } catch (error) {
            console.error('Update error:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this deal?')) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/crm/deals/${id}`, { method: 'DELETE' });
            if (res.ok) {
                router.push('/dashboard/crm/deals');
            } else {
                alert('Failed to delete deal');
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <CRMClientLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </CRMClientLayout>
        );
    }

    if (!deal) return null;

    const stages = [
        { id: 'DISCOVERY', label: 'Discovery' },
        { id: 'PROPOSAL', label: 'Proposal' },
        { id: 'NEGOTIATION', label: 'Negotiation' },
        { id: 'CLOSED_WON', label: 'Won' },
        { id: 'CLOSED_LOST', label: 'Lost' }
    ];

    return (
        <CRMClientLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.push('/dashboard/crm/deals')}
                            className="p-2 hover:bg-white rounded-full transition-colors text-secondary-500"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-secondary-900">{deal.title}</h1>
                            <p className="text-secondary-500">{deal.customer?.organizationName || deal.customer?.name}</p>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                        >
                            Delete Deal
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <Card className="bg-white overflow-hidden">
                    <div className="flex divide-x divide-secondary-100">
                        {stages.map((s, idx) => (
                            <button
                                key={s.id}
                                disabled={actionLoading}
                                onClick={() => handleStageUpdate(s.id)}
                                className={`flex-1 px-4 py-4 text-sm font-bold transition-all relative ${deal.stage === s.id
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white text-secondary-500 hover:bg-secondary-50'
                                    }`}
                            >
                                <span className="relative z-10">{idx + 1}. {s.label}</span>
                                {deal.stage === s.id && (
                                    <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[20px] border-t-transparent border-l-[10px] border-l-primary-600 border-b-[20px] border-b-transparent z-20 hidden md:block" />
                                )}
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Deal Details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm text-secondary-500">Value</label>
                                    <p className="text-2xl font-black text-primary-600">₹{deal.value?.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-secondary-500">Expected Close</label>
                                    <p className="font-medium">
                                        {deal.expectedCloseDate ? <FormattedDate date={deal.expectedCloseDate} /> : 'Not set'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-secondary-500">Account Owner</label>
                                    <p className="font-medium">{deal.owner?.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-secondary-500">Currency</label>
                                    <p className="font-medium uppercase">{deal.currency}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-secondary-500">Notes / Scope</label>
                                    <p className="mt-1 text-secondary-700 whitespace-pre-wrap">{deal.notes || 'No description provided'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Customer Contact</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs text-secondary-500">Organization / Name</p>
                                    <p className="font-bold">{deal.customer?.organizationName || deal.customer?.name}</p>
                                </div>
                                <Link
                                    href={`/dashboard/crm/${deal.customer?.leadStatus ? 'leads' : 'customers'}/${deal.customerId}`}
                                    className="btn btn-secondary w-full text-center"
                                >
                                    View Full Profile
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </CRMClientLayout>
    );
}
