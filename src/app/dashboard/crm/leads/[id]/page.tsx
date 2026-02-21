
'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CRMClientLayout from '../../CRMClientLayout';
import FormattedDate from '@/components/common/FormattedDate';
import CommunicationForm from '@/components/dashboard/CommunicationForm';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: session } = useSession();

    const [lead, setLead] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchLead = useCallback(async () => {
        try {
            const res = await fetch(`/api/crm/leads/${id}`);
            if (res.ok) {
                const data = await res.json();
                setLead(data);
            } else {
                router.push('/dashboard/crm/leads');
            }
        } catch (error) {
            console.error('Error fetching lead:', error);
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchLead();
    }, [fetchLead]);

    const handleConvert = async () => {
        if (!confirm('Are you sure you want to convert this lead to a customer?')) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/crm/leads/${id}/convert`, { method: 'POST' });
            if (res.ok) {
                alert('Lead converted successfully!');
                fetchLead();
            } else {
                alert('Failed to convert lead');
            }
        } catch (error) {
            console.error('Conversion error:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
            if (res.ok) {
                router.push('/dashboard/crm/leads');
            } else {
                alert('Failed to delete lead');
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <CRMClientLayout>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        </CRMClientLayout>
    );

    if (!lead) return null;

    return (
        <CRMClientLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.push('/dashboard/crm/leads')}
                            className="p-2 hover:bg-white rounded-full transition-colors text-secondary-500"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-secondary-900">{lead.name}</h1>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${lead.leadStatus === 'CONVERTED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {lead.leadStatus?.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex items-center mt-1 space-x-3 text-secondary-500">
                                <span>{lead.organizationName || 'Individual'}</span>
                                {lead.primaryEmail && (
                                    <>
                                        <span>•</span>
                                        <span>{lead.primaryEmail}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        {lead.leadStatus !== 'CONVERTED' && (
                            <button
                                onClick={handleConvert}
                                disabled={actionLoading}
                                className="btn btn-primary"
                            >
                                Convert to Customer
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="btn btn-secondary text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-secondary-200">
                    <nav className="flex space-x-8">
                        {['overview', 'communication', 'deals'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-all ${activeTab === tab
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === 'overview' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Lead Information</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-sm text-secondary-500">Contact Name</label>
                                        <p className="font-medium">{lead.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-secondary-500">Lead Score</label>
                                        <p className="font-medium text-primary-600">{lead.leadScore || 0}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-secondary-500">Source</label>
                                        <p className="font-medium uppercase">{lead.source}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-secondary-500">Assigned To</label>
                                        <p className="font-medium">{lead.assignedTo?.name || 'Unassigned'}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm text-secondary-500">Notes</label>
                                        <p className="mt-1 text-secondary-700 whitespace-pre-wrap">{lead.notes || 'No notes available'}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === 'communication' && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Log Communication</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CommunicationForm
                                            customerId={lead.id}
                                            onSuccess={fetchLead}
                                        />
                                    </CardContent>
                                </Card>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-secondary-900 border-l-4 border-primary-500 pl-3">Timeline</h3>
                                    {lead.communications?.length === 0 ? (
                                        <div className="text-center py-12 card-premium text-secondary-500">
                                            No communication history found.
                                        </div>
                                    ) : (
                                        lead.communications.map((log: any) => (
                                            <div key={log.id} className="card-premium">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">
                                                            {log.channel === 'Email' ? '📧' : log.channel === 'Phone' ? '📞' : '💬'}
                                                        </span>
                                                        <div>
                                                            <h4 className="font-bold">{log.subject}</h4>
                                                            <p className="text-xs text-secondary-500">
                                                                <FormattedDate date={log.date} /> • By {log.user?.name || 'System'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {log.outcome && (
                                                        <span className="px-2 py-0.5 bg-secondary-100 rounded text-[10px] font-bold uppercase tracking-tighter">
                                                            {log.outcome}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-secondary-700 bg-secondary-50 p-3 rounded-lg border border-secondary-100 italic">
                                                    &quot;{log.notes}&quot;
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'deals' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg">Associated Deals</h3>
                                    <Link href="/dashboard/crm/deals" className="btn btn-secondary py-1 text-xs">
                                        Pipeline View
                                    </Link>
                                </div>
                                {lead.deals?.length === 0 ? (
                                    <div className="text-center py-12 card-premium text-secondary-500">
                                        No deals started with this lead.
                                    </div>
                                ) : (
                                    lead.deals.map((deal: any) => (
                                        <div key={deal.id} className="card-premium flex justify-between items-center hover:shadow-md transition-shadow">
                                            <div>
                                                <h4 className="font-bold">{deal.title}</h4>
                                                <p className="text-sm text-secondary-500 capitalize">{deal.stage.toLowerCase()}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary-600">₹{deal.value?.toLocaleString()}</div>
                                                <Link href={`/dashboard/crm/deals/${deal.id}`} className="text-xs text-primary-600 font-bold hover:underline">
                                                    View Details →
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Contact Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-600">
                                        📧
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs text-secondary-500">Email</p>
                                        <p className="font-medium truncate">{lead.primaryEmail}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-600">
                                        📞
                                    </div>
                                    <div>
                                        <p className="text-xs text-secondary-500">Phone</p>
                                        <p className="font-medium">{lead.primaryPhone || 'No phone'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </CRMClientLayout>
    );
}
