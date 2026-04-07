'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import CommunicationForm from '@/components/dashboard/CommunicationForm';
import { useCustomer, useCustomerMutations } from '@/hooks/useCRM';
import AgencyPerformanceDashboard from '@/components/dashboard/AgencyPerformanceDashboard';

export default function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: customer, isLoading: loading, refetch: fetchCustomer } = useCustomer(id);
    const { updateCustomer, updateCommunicationLog } = useCustomerMutations();

    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [editingLog, setEditingLog] = useState<any>(null);
    const [activeFollowUpId, setActiveFollowUpId] = useState<string | null>(null);
    const [selectedCommunicationPreset, setSelectedCommunicationPreset] = useState('relationship');
    const [historyFilter, setHistoryFilter] = useState<'all' | 'open' | 'completed'>('all');

    const formRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();

    // Handle incoming follow-up from query params
    useEffect(() => {
        const fId = searchParams.get('followUpId');
        if (fId) {
            setActiveFollowUpId(fId);
            setActiveTab('communication');
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }, [customer, searchParams]);

    if (loading) {
        return (
            <DashboardLayout userRole="ADMIN">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!customer) return null;

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '📋' },
        { id: 'performance', name: 'Performance', icon: '📈' },
        { id: 'subscriptions', name: 'Subscriptions', icon: '📚' },
        { id: 'institutions', name: 'Assigned Institutions', icon: '🏫' },
        { id: 'communication', name: 'Communication', icon: '💬' },
        { id: 'billing', name: 'Invoices & Billing', icon: '💰' },
    ];

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const formData = new FormData(e.currentTarget);

        // Construct payload for Agency Update
        // Note: The main updateCustomer API expects generic profile fields. 
        // Agency specific fields might need a specific endpoint or mapped correctly if PATCH supports it.
        // For now, we update the base profile and let the user use the dedicated Edit page for deeper changes if needed,
        // OR we map the form back to the structure expected by PATCH /api/customers/[id]

        const payload: any = {
            id: customer.id,
            name: formData.get('name'),
            organizationName: formData.get('organizationName'),
            primaryPhone: formData.get('primaryPhone'),
            secondaryEmail: formData.get('secondaryEmail'),
            website: formData.get('website'),
            billingAddress: formData.get('billingAddress'),
            shippingAddress: formData.get('shippingAddress'),
            // Agency specific fields nested in agencyDetails? 
            // The existing PATCH API handles basic profile. 
            // If we want to update discountRate etc, we need to pass them.
            // The API implementation at step 1622 shows it handling: institutionDetails, assignedToUserId...
            // It uses ...profileData for the update.
            // If agencyDetails is not destructured in the API, it might not be updated.
            // Let's stick to basic contact info here and provide a link to full "Edit Settings".
        };

        try {
            await updateCustomer.mutateAsync(payload);
            setShowEditModal(false);
        } catch (err) {
            alert('Error updating profile');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateLog = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const formData = new FormData(e.currentTarget);
        const payload = {
            id: editingLog.id,
            nextFollowUpDate: formData.get('nextFollowUpDate') || null,
            outcome: formData.get('outcome'),
            notes: formData.get('notes')
        };

        try {
            await updateCommunicationLog.mutateAsync(payload);
            setEditingLog(null);
        } catch (error) {
            console.error('Update error:', error);
            alert('Error updating log');
        } finally {
            setActionLoading(false);
        }
    };

    // Calculate Stats
    const totalSales = customer.agencyDetails?.subscriptions?.reduce((acc: number, sub: any) => acc + sub.total, 0) || 0;
    const activeSubs = customer.agencyDetails?.subscriptions?.filter((s: any) => s.status === 'ACTIVE').length || 0;
    const communications = customer.communications || [];
    const openFollowUps = communications.filter((log: any) => log.nextFollowUpDate && !log.isFollowUpCompleted);
    const completedFollowUps = communications.filter((log: any) => log.isFollowUpCompleted);
    const nextFollowUp = [...openFollowUps]
        .sort((a: any, b: any) => new Date(a.nextFollowUpDate).getTime() - new Date(b.nextFollowUpDate).getTime())[0];
    const communicationPresets = [
        {
            id: 'relationship',
            title: 'Relationship Update',
            helper: 'Use this to capture check-ins, negotiation notes, and important context from the agency.',
            defaults: {
                type: 'COMMENT',
                channel: 'Phone',
                subject: 'Agency relationship check-in',
                outcome: 'Follow-up required',
            }
        },
        {
            id: 'invoice',
            title: 'Invoice Follow-up',
            helper: 'Use this after a quotation, proforma, or invoice is shared with the agency.',
            defaults: {
                type: 'INVOICE_SENT',
                channel: 'Email',
                subject: 'Invoice follow-up and payment readiness',
                outcome: 'Interested',
            }
        },
        {
            id: 'meeting',
            title: 'Meeting Note',
            helper: 'Capture meeting outcomes, expectations, and the next promised action.',
            defaults: {
                type: 'MEETING',
                channel: 'In-Person',
                subject: 'Agency meeting summary',
                outcome: 'Responded',
            }
        },
        {
            id: 'renewal',
            title: 'Renewal Push',
            helper: 'Use this when the conversation is about renewals, validity, or contract continuation.',
            defaults: {
                type: 'CALL',
                channel: 'Phone',
                subject: 'Renewal planning discussion',
                outcome: 'Renewal confirmed',
            }
        }
    ];
    const activePreset = communicationPresets.find((preset) => preset.id === selectedCommunicationPreset) || communicationPresets[0];
    const filteredHistory = communications.filter((log: any) => {
        if (historyFilter === 'open') return Boolean(log.nextFollowUpDate) && !log.isFollowUpCompleted;
        if (historyFilter === 'completed') return Boolean(log.isFollowUpCompleted);
        return true;
    });

    return (
        <DashboardLayout userRole="ADMIN">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white rounded-full transition-colors text-secondary-500"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-secondary-900">{customer.name}</h1>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-black rounded uppercase tracking-wider">
                                    AGENCY
                                </span>
                            </div>
                            <div className="flex items-center mt-1 space-x-3 text-secondary-500">
                                <span>{customer.organizationName}</span>
                                <span>•</span>
                                <span>{customer.primaryEmail}</span>
                                <span>•</span>
                                <span className="font-mono text-xs bg-secondary-100 px-2 py-0.5 rounded">
                                    Discount: {customer.agencyDetails?.discountRate}%
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="btn btn-secondary bg-white"
                        >
                            Edit Profile
                        </button>
                        <Link
                            href={`/dashboard/crm/invoices/new?customerId=${customer.id}&context=agency`}
                            className="btn btn-primary"
                        >
                            Create Invoice
                        </Link>
                    </div>
                </div>

                {/* Edit Profile Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                            <h2 className="text-2xl font-bold text-secondary-900 mb-6">Edit Agency Profile</h2>
                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div>
                                    <label className="label">Primary Contact Name</label>
                                    <input name="name" className="input" defaultValue={customer.name} required />
                                </div>
                                <div>
                                    <label className="label">Organization Name</label>
                                    <input name="organizationName" className="input" defaultValue={customer.organizationName} />
                                </div>
                                <div>
                                    <label className="label">Primary Phone</label>
                                    <input name="primaryPhone" className="input" defaultValue={customer.primaryPhone} />
                                </div>
                                <div>
                                    <label className="label">Secondary Email</label>
                                    <input name="secondaryEmail" className="input" defaultValue={customer.secondaryEmail} />
                                </div>
                                <div>
                                    <label className="label">Website</label>
                                    <input name="website" className="input" defaultValue={customer.website} placeholder="https://" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Billing Address</label>
                                        <textarea name="billingAddress" className="input h-20" defaultValue={customer.billingAddress} placeholder="Company Billing Address" />
                                    </div>
                                    <div>
                                        <label className="label">Shipping / Dispatch Address</label>
                                        <textarea name="shippingAddress" className="input h-20" defaultValue={customer.shippingAddress} placeholder="Shipping or Dispatch Address" />
                                    </div>
                                </div>

                                <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
                                    To update Commercial Terms (Discount, Commission, etc.), please contact Super Admin directly or use the database tools.
                                </div>

                                <div className="flex justify-end space-x-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="btn btn-primary"
                                    >
                                        {actionLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Log Modal */}
                {editingLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-secondary-900 mb-4">Update Communication</h3>
                            <form onSubmit={handleUpdateLog} className="space-y-4">
                                <div>
                                    <label className="label">Next Follow-up Date</label>
                                    <input
                                        type="date"
                                        name="nextFollowUpDate"
                                        className="input"
                                        defaultValue={editingLog.nextFollowUpDate ? editingLog.nextFollowUpDate.split('T')[0] : ''}
                                    />
                                </div>
                                <div>
                                    <label className="label">Outcome</label>
                                    <select
                                        name="outcome"
                                        className="input"
                                        defaultValue={editingLog.outcome || ''}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Interested">Interested</option>
                                        <option value="Follow-up required">Follow-up required</option>
                                        <option value="Resolved">Resolved / Completed</option>
                                        <option value="No Answer">No Answer</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Update Notes</label>
                                    <textarea
                                        name="notes"
                                        className="input h-20"
                                        defaultValue={editingLog.notes}
                                    ></textarea>
                                </div>
                                <div className="flex justify-end space-x-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingLog(null)}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="btn btn-primary"
                                    >
                                        {actionLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="border-b border-secondary-200">
                    <nav className="flex space-x-8 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all flex items-center space-x-2 whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="card-premium">
                                    <h3 className="text-lg font-bold text-secondary-900 mb-4">Agency Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-sm text-secondary-500">Contact Person</label>
                                            <p className="font-medium text-secondary-900">{customer.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-secondary-500">Organization</label>
                                            <p className="font-medium text-secondary-900">{customer.organizationName || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-secondary-500">Phone</label>
                                            <p className="font-medium text-secondary-900">{customer.primaryPhone}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-secondary-500">Email</label>
                                            <p className="font-medium text-secondary-900">{customer.primaryEmail}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-secondary-500">Territory</label>
                                            <p className="font-medium text-secondary-900">{customer.agencyDetails?.territory || 'Not Specified'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-secondary-500">Commission Terms</label>
                                            <p className="font-medium text-secondary-900">{customer.agencyDetails?.commissionTerms || 'Standard'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PERFORMANCE TAB */}
                        {activeTab === 'performance' && (
                            <AgencyPerformanceDashboard details={customer.agencyDetails} />
                        )}

                        {/* SUBSCRIPTIONS TAB */}
                        {activeTab === 'subscriptions' && (
                            <div className="space-y-4">
                                {(customer.agencyDetails?.subscriptions || []).length === 0 ? (
                                    <div className="card-premium text-center py-12">
                                        <p className="text-secondary-500">No subscriptions sold by this agency yet.</p>
                                        <Link
                                            href={`/dashboard/crm/invoices/new?customerId=${customer.id}&context=agency`}
                                            className="btn btn-primary mt-4"
                                        >
                                            Create First Invoice
                                        </Link>
                                    </div>
                                ) : (
                                    (customer.agencyDetails?.subscriptions || []).map((sub: any) => (
                                        <div key={sub.id} className="card-premium border-l-4 border-primary-500 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-secondary-900 text-lg">
                                                        {sub.items[0]?.journal?.name || 'Subscription Package'}
                                                        {sub.items.length > 1 && ` (+${sub.items.length - 1} more)`}
                                                    </h4>
                                                    <p className="text-sm text-secondary-500">
                                                        <FormattedDate date={sub.startDate} /> - <FormattedDate date={sub.endDate} />
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`badge ${sub.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                                                        {sub.status.replace('_', ' ')}
                                                    </span>
                                                    <Link
                                                        href={`/dashboard/crm/subscriptions/${sub.id}`}
                                                        className="text-xs text-primary-600 font-bold hover:underline"
                                                    >
                                                        View Details →
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm bg-secondary-50 p-3 rounded-lg border border-secondary-100">
                                                <div>
                                                    <p className="text-xs text-secondary-500 uppercase font-bold tracking-tighter">Total Price</p>
                                                    <p className="font-bold text-secondary-900">
                                                        {sub.currency === 'INR' ? '₹' : '$'}{sub.total.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-secondary-500 uppercase font-bold tracking-tighter">Discount</p>
                                                    <p className="font-medium text-green-600">
                                                        {sub.currency === 'INR' ? '₹' : '$'}{sub.discount.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-secondary-500 uppercase font-bold tracking-tighter">Net Value</p>
                                                    <p className="font-medium text-secondary-800">
                                                        {sub.currency === 'INR' ? '₹' : '$'}{(sub.subtotal - sub.discount).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* INSTITUTIONS TAB */}
                        {activeTab === 'institutions' && (
                            <div className="space-y-4">
                                {(customer.agencyInstitutions || []).length === 0 ? (
                                    <div className="card-premium text-center py-12">
                                        <p className="text-secondary-500">No institutions assigned to this agency yet.</p>
                                    </div>
                                ) : (
                                    (customer.agencyInstitutions || []).map((inst: any) => (
                                        <div key={inst.id} className="card-premium flex justify-between items-center hover:shadow-md transition-shadow">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-secondary-900">{inst.name}</h4>
                                                    {!inst.isActive && <span className="badge badge-warning text-[10px]">Inactive</span>}
                                                </div>
                                                <p className="text-sm text-secondary-500">{inst.city}, {inst.state}</p>
                                                <span className="text-[10px] font-mono bg-secondary-100 px-1.5 py-0.5 rounded text-secondary-600 mt-1 inline-block">
                                                    {inst.code} • {inst.type}
                                                </span>
                                            </div>
                                            <Link
                                                href={`/dashboard/crm/partners?tab=institutions`}
                                                className="text-primary-600 font-bold text-sm hover:underline"
                                            >
                                                View in List →
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* COMMUNICATION TAB */}
                        {activeTab === 'communication' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="card-premium">
                                        <div className="text-xs font-black uppercase tracking-widest text-secondary-400">Total Logged</div>
                                        <div className="mt-2 text-3xl font-black text-secondary-900">{communications.length}</div>
                                        <div className="text-sm text-secondary-500">All relationship and billing conversations</div>
                                    </div>
                                    <div className="card-premium">
                                        <div className="text-xs font-black uppercase tracking-widest text-warning-500">Open Follow-ups</div>
                                        <div className="mt-2 text-3xl font-black text-warning-700">{openFollowUps.length}</div>
                                        <div className="text-sm text-secondary-500">
                                            {nextFollowUp ? (
                                                <>Next due on <FormattedDate date={nextFollowUp.nextFollowUpDate} /></>
                                            ) : (
                                                'No pending follow-up date is scheduled'
                                            )}
                                        </div>
                                    </div>
                                    <div className="card-premium">
                                        <div className="text-xs font-black uppercase tracking-widest text-success-500">Completed</div>
                                        <div className="mt-2 text-3xl font-black text-success-700">{completedFollowUps.length}</div>
                                        <div className="text-sm text-secondary-500">Finished follow-up loops and resolved items</div>
                                    </div>
                                </div>

                                <div className="card-premium">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-secondary-900 mb-1 border-l-4 border-primary-500 pl-3">Communication Playbooks</h3>
                                            <p className="text-sm text-secondary-500">
                                                Choose a preset to prefill the communication form with the most common agency workflows.
                                            </p>
                                        </div>
                                        <Link
                                            href={`/dashboard/crm/invoices/new?customerId=${customer.id}&context=agency`}
                                            className="btn btn-secondary bg-white"
                                        >
                                            Create Invoice From Agency
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
                                        {communicationPresets.map((preset) => (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => setSelectedCommunicationPreset(preset.id)}
                                                className={`rounded-2xl border p-4 text-left transition-all ${
                                                    preset.id === selectedCommunicationPreset
                                                        ? 'border-primary-300 bg-primary-50 shadow-sm'
                                                        : 'border-secondary-200 bg-white hover:border-primary-200'
                                                }`}
                                            >
                                                <div className="text-xs font-black uppercase tracking-widest text-primary-600">{preset.title}</div>
                                                <div className="mt-2 text-sm text-secondary-600">{preset.helper}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="card-premium" ref={formRef}>
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-secondary-900 border-l-4 border-primary-500 pl-3">Log New Communication</h3>
                                            <p className="text-sm text-secondary-500 mt-2">
                                                Current preset: <span className="font-bold text-secondary-800">{activePreset.title}</span>
                                            </p>
                                        </div>
                                        {activeFollowUpId && (
                                            <span className="badge badge-warning">Replying to pending follow-up</span>
                                        )}
                                    </div>
                                    <CommunicationForm
                                        key={`${selectedCommunicationPreset}-${activeFollowUpId || 'fresh'}`}
                                        customerId={customer.id}
                                        previousFollowUpId={activeFollowUpId}
                                        defaults={activePreset.defaults}
                                        helperText={activePreset.helper}
                                        submitLabel="Save Agency Communication"
                                        onSuccess={() => setActiveFollowUpId(null)}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <h3 className="text-lg font-bold text-secondary-900 border-l-4 border-secondary-400 pl-3">History</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { id: 'all', label: 'All' },
                                                { id: 'open', label: 'Open Follow-ups' },
                                                { id: 'completed', label: 'Completed' },
                                            ].map((filter) => (
                                                <button
                                                    key={filter.id}
                                                    type="button"
                                                    onClick={() => setHistoryFilter(filter.id as any)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                                                        historyFilter === filter.id
                                                            ? 'bg-secondary-900 text-white'
                                                            : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                                                    }`}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {filteredHistory.length === 0 ? (
                                        <p className="text-secondary-500 text-center py-8">No communication logs found.</p>
                                    ) : (
                                        filteredHistory.map((log: any) => (
                                            <div key={log.id} className="card-premium">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-2xl">{log.channel === 'Email' ? '📧' : log.channel === 'Phone' ? '📞' : '💬'}</span>
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <h4 className="font-bold text-secondary-900">{log.subject}</h4>
                                                                <button
                                                                    onClick={() => setEditingLog(log)}
                                                                    className="text-[10px] text-primary-600 font-bold hover:underline"
                                                                >
                                                                    (Edit)
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-secondary-500">
                                                                <FormattedDate date={log.date} />
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        {log.outcome && (
                                                            <span className="badge badge-secondary text-[10px] uppercase">{log.outcome}</span>
                                                        )}
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-secondary-400">
                                                            {log.type?.replace('_', ' ')} via {log.channel}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-secondary-700 bg-secondary-50 p-3 rounded-lg border border-secondary-100 italic">
                                                    &quot;{log.notes}&quot;
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {log.nextFollowUpDate && (
                                                        <span className={`badge text-[10px] ${log.isFollowUpCompleted ? 'badge-success' : 'badge-warning'}`}>
                                                            Next Follow-up: <FormattedDate date={log.nextFollowUpDate} />
                                                        </span>
                                                    )}
                                                    {log.referenceId && (
                                                        <span className="badge badge-secondary text-[10px] uppercase">Ref: {log.referenceId}</span>
                                                    )}
                                                    {log.checklist?.customerHealth && (
                                                        <span className="badge badge-secondary text-[10px] uppercase">
                                                            Health: {log.checklist.customerHealth}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* BILLING TAB */}
                        {activeTab === 'billing' && (
                            <div className="space-y-6">
                                <div className="card-premium overflow-hidden">
                                    <h3 className="text-lg font-bold text-secondary-900 p-6 border-b border-secondary-100">Invoices & Billing History</h3>
                                    <div className="overflow-x-auto">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Invoice #</th>
                                                    <th>Date</th>
                                                    <th>Due Date</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
                                                    <th className="text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(!customer.invoices || customer.invoices.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={6} className="text-center py-8 text-secondary-500">
                                                            <div className="flex flex-col items-center gap-3">
                                                                <span>No invoices found for this agency.</span>
                                                                <Link
                                                                    href={`/dashboard/crm/invoices/new?customerId=${customer.id}&context=agency`}
                                                                    className="btn btn-primary"
                                                                >
                                                                    Create Agency Invoice
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    customer.invoices
                                                        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                        .map((invoice: any) => (
                                                            <tr key={invoice.id} className="hover:bg-secondary-50">
                                                                <td className="font-bold text-secondary-900">{invoice.invoiceNumber}</td>
                                                                <td className="text-sm text-secondary-600">
                                                                    <FormattedDate date={invoice.createdAt} />
                                                                </td>
                                                                <td className="text-sm text-secondary-600">
                                                                    <FormattedDate date={invoice.dueDate} />
                                                                </td>
                                                                <td className="font-bold text-secondary-900">
                                                                    {invoice.currency === 'INR' ? '₹' : '$'}{invoice.total.toLocaleString()}
                                                                </td>
                                                                <td>
                                                                    <span className={`badge ${invoice.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                                                                        {invoice.status}
                                                                    </span>
                                                                </td>
                                                                <td className="text-right">
                                                                    <Link
                                                                        href={`/dashboard/crm/invoices/${invoice.id}`}
                                                                        className="btn btn-secondary py-1 text-xs"
                                                                    >
                                                                        View Invoice
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        <div className="card-premium">
                            <h3 className="text-lg font-bold text-secondary-900 mb-4">Quick Stats</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-secondary-100">
                                    <span className="text-secondary-600">Total Revenue Generated</span>
                                    <span className="font-bold text-primary-600">₹{totalSales.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-secondary-100">
                                    <span className="text-secondary-600">Active Subscriptions</span>
                                    <span className="font-bold text-secondary-900">{activeSubs}</span>
                                </div>
                            </div>
                        </div>

                        {/* Helper Box */}
                        <div className="card-premium bg-gradient-to-br from-primary-900 to-secondary-900 text-white">
                            <h3 className="font-bold text-lg mb-2">Agency Support</h3>
                            <p className="text-sm text-gray-300 mb-4">
                                Need to update discount rates or territory? Contact the Super Admin.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
