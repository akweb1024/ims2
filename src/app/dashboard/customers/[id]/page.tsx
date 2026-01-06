'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import CommunicationForm from '@/components/dashboard/CommunicationForm';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('CUSTOMER');
    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [editingLog, setEditingLog] = useState<any>(null);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [activeFollowUpId, setActiveFollowUpId] = useState<string | null>(null);

    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showEditModal && ['SUPER_ADMIN', 'MANAGER'].includes(userRole)) {
            const fetchStaff = async () => {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    setStaffList(data.filter((u: any) => ['SALES_EXECUTIVE', 'MANAGER'].includes(u.role)));
                }
            };
            fetchStaff();
        }
    }, [showEditModal, userRole]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }

        const fetchCustomer = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/customers/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setCustomer(data);
                } else {
                    router.push('/dashboard/customers');
                }
            } catch (error) {
                console.error('Error fetching customer:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCustomer();
    }, [id, router]);

    // Handle incoming follow-up from query params
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const fId = searchParams.get('followUpId');
        if (fId) {
            setActiveFollowUpId(fId);
            setActiveTab('communication');
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }, [customer]); // Run when customer data is loaded and tabs are ready

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!customer) return null;

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '📋' },
        { id: 'subscriptions', name: 'Subscriptions', icon: '📚' },
        { id: 'communication', name: 'Communication', icon: '💬' },
        { id: 'billing', name: 'Billing & History', icon: '💰' },
    ];

    const handleStartChat = async () => {
        if (!customer.userId) {
            alert("This customer does not have a linked user account for chat.");
            return;
        }
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/chat/rooms', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    participantIds: [customer.userId],
                    isGroup: false
                })
            });

            if (res.ok) {
                const room = await res.json();
                router.push(`/dashboard/chat?roomId=${room.id}`);
            } else {
                alert('Failed to start chat');
            }
        } catch (err) {
            console.error('Chat error:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const formData = new FormData(e.currentTarget);
        const payload: any = {
            name: formData.get('name'),
            organizationName: formData.get('organizationName'),
            primaryPhone: formData.get('primaryPhone'),
            secondaryEmail: formData.get('secondaryEmail'),
            website: formData.get('website'),
            assignedToUserId: formData.get('assignedToUserId') || null,
            assignedToUserIds: formData.getAll('assignedToUserIds'),
        };

        if (customer.customerType === 'INSTITUTION') {
            payload.institutionDetails = {
                vspName: formData.get('vspName'),
                ipRanges: formData.get('ipRanges'),
                totalSeats: parseInt(formData.get('totalSeats') as string) || 0,
            };
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/customers/${customer.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updated = await res.json();
                setCustomer({ ...customer, ...updated });
                setShowEditModal(false);
            } else {
                alert('Failed to update profile');
            }
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
            nextFollowUpDate: formData.get('nextFollowUpDate') || null,
            outcome: formData.get('outcome'),
            notes: formData.get('notes')
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/communications/${editingLog.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Update local state instead of full reload
                const updatedLog = await res.json();
                setCustomer({
                    ...customer,
                    communications: customer.communications.map((c: any) => c.id === updatedLog.id ? { ...c, ...updatedLog } : c)
                });
                setEditingLog(null);
            } else {
                alert('Failed to update log');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('Error updating log');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
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
                            <h1 className="text-3xl font-bold text-secondary-900">{customer.name}</h1>
                            <div className="flex items-center mt-1 space-x-3 text-secondary-500">
                                <span>{customer.primaryEmail}</span>
                                <span>•</span>
                                <span className={`badge ${customer.customerType === 'INSTITUTION' ? 'badge-success' : 'badge-primary'}`}>
                                    {customer.customerType}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={handleStartChat}
                            disabled={actionLoading}
                            className="btn btn-secondary bg-white text-primary-600 border-primary-100 font-bold"
                        >
                            💬 Chat
                        </button>
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="btn btn-secondary bg-white"
                        >
                            Edit Profile
                        </button>
                        <Link
                            href={`/dashboard/subscriptions/new?customerId=${customer.id}`}
                            className="btn btn-primary"
                        >
                            New Subscription
                        </Link>
                    </div>
                </div>

                {/* Edit Profile Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold text-secondary-900 mb-6">Edit Customer Profile</h2>
                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <div className="md:col-span-2">
                                        <label className="label">Website</label>
                                        <input name="website" className="input" defaultValue={customer.website} placeholder="https://" />
                                    </div>

                                    {/* Assignment - Only for Admins/Managers */}
                                    {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                                        <div className="md:col-span-2 pt-4 border-t border-secondary-100">
                                            <h4 className="font-bold text-secondary-900 mb-2">Customer Assignment</h4>
                                            <label className="label">Assign to Sales Executives (Ctrl+Click to multi-select)</label>
                                            <select
                                                name="assignedToUserIds"
                                                multiple
                                                className="input h-32"
                                                defaultValue={customer.assignedExecutives?.map((ex: any) => ex.id) || []}
                                            >
                                                {/* We need to fetch staff list. For now, populating on click if possible or pre-fetch */}
                                                {staffList.map((staff: any) => (
                                                    <option key={staff.id} value={staff.id}>
                                                        {staff.email} ({staff.role})
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-secondary-500 mt-1 italic">
                                                Selected executives will have full visibility of this customer.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {customer.customerType === 'INSTITUTION' && (
                                    <div className="pt-4 border-t border-secondary-100">
                                        <h4 className="font-bold text-secondary-900 mb-4">Institutional Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">VSP Name</label>
                                                <input name="vspName" className="input" defaultValue={customer.institutionDetails?.vspName} />
                                            </div>
                                            <div>
                                                <label className="label">Total Seats</label>
                                                <input name="totalSeats" type="number" className="input" defaultValue={customer.institutionDetails?.totalSeats} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="label">IP Ranges (Comma separated)</label>
                                                <textarea name="ipRanges" className="input h-20" defaultValue={customer.institutionDetails?.ipRanges}></textarea>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                        className="btn btn-primary px-10"
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
                                    <p className="text-xs text-secondary-500 mt-1">Clear to mark as completed</p>
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
                    <nav className="flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all flex items-center space-x-2 ${activeTab === tab.id
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
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Profile Info */}
                                <div className="card-premium">
                                    <h3 className="text-lg font-bold text-secondary-900 mb-4">Profile Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-sm text-secondary-500">Organization</label>
                                            <p className="font-medium text-secondary-900">{customer.organizationName || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-secondary-500">Country / Region</label>
                                            <p className="font-medium text-secondary-900">{customer.country || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-secondary-500">Phone</label>
                                            <p className="font-medium text-secondary-900">{customer.primaryPhone}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-secondary-500">Billing Address</label>
                                            <p className="font-medium text-secondary-900">{customer.billingAddress || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-secondary-500">Account Manager(s)</label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {customer.assignedExecutives?.length > 0 ? (
                                                    customer.assignedExecutives.map((exec: any) => (
                                                        <span key={exec.id} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-bold border border-primary-100">
                                                            {exec.email.split('@')[0]}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <p className="font-medium text-secondary-400 italic">Unassigned</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Type Specific Info */}
                                {customer.customerType === 'INSTITUTION' && customer.institutionDetails && (
                                    <div className="card-premium">
                                        <h3 className="text-lg font-bold text-secondary-900 mb-4">Institutional Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="text-sm text-secondary-500">Category</label>
                                                <p className="font-medium text-secondary-900">{customer.institutionDetails.category}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm text-secondary-500">Estimated Users</label>
                                                <p className="font-medium text-secondary-900">{customer.institutionDetails.numberOfUsers || 0}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm text-secondary-500">IP Range</label>
                                                <p className="font-medium text-secondary-900">{customer.institutionDetails.ipRange || 'Not Provided'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'subscriptions' && (
                            <div className="space-y-4">
                                {customer.subscriptions.length === 0 ? (
                                    <div className="card-premium text-center py-12">
                                        <p className="text-secondary-500">No active subscriptions found.</p>
                                        <Link
                                            href={`/dashboard/subscriptions/new?customerId=${customer.id}`}
                                            className="btn btn-primary mt-4"
                                        >
                                            Create First Subscription
                                        </Link>
                                    </div>
                                ) : (
                                    customer.subscriptions.map((sub: any) => (
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
                                                        href={`/dashboard/subscriptions/${sub.id}`}
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
                                                    <p className="text-xs text-secondary-500 uppercase font-bold tracking-tighter">Channel</p>
                                                    <p className="font-medium text-secondary-800">{sub.salesChannel}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-secondary-500 uppercase font-bold tracking-tighter">Auto-Renew</p>
                                                    <p className="font-medium text-secondary-800">{sub.autoRenew ? 'Yes' : 'No'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'communication' && (
                            <div className="space-y-6">
                                {/* Log New Communication */}
                                <div className="card-premium" ref={formRef}>
                                    <h3 className="text-lg font-bold text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Log New Communication</h3>
                                    <CommunicationForm
                                        customerId={customer.id}
                                        previousFollowUpId={activeFollowUpId}
                                        onSuccess={() => {
                                            setActiveFollowUpId(null);
                                            window.location.reload();
                                        }}
                                    />
                                </div>

                                {/* Communication History */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-secondary-900 border-l-4 border-secondary-400 pl-3">Communication History</h3>
                                    {customer.communications?.length === 0 ? (
                                        <p className="text-secondary-500 text-center py-8">No communication logs found.</p>
                                    ) : (
                                        customer.communications?.map((log: any) => (
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
                                                                <FormattedDate date={log.date} /> • Logged by {log.user?.customerProfile?.name || 'Staff member'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {log.outcome && (
                                                        <span className="badge badge-secondary text-[10px] uppercase">{log.outcome}</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-secondary-700 bg-secondary-50 p-3 rounded-lg border border-secondary-100 italic">
                                                    &quot;{log.notes}&quot;
                                                </div>
                                                {log.nextFollowUpDate && (
                                                    <div className="mt-3 text-xs font-bold text-primary-600 flex items-center">
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Follow-up scheduled for: <FormattedDate date={log.nextFollowUpDate} />
                                                        {!log.isFollowUpCompleted && (
                                                            <button
                                                                onClick={() => {
                                                                    setActiveFollowUpId(log.id);
                                                                    formRef.current?.scrollIntoView({ behavior: 'smooth' });
                                                                }}
                                                                className="ml-4 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded hover:bg-primary-200 transition-colors"
                                                            >
                                                                Complete Follow-up
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-6">
                                <div className="card-premium overflow-hidden">
                                    <h3 className="text-lg font-bold text-secondary-900 p-6 border-b border-secondary-100">Billing History</h3>
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
                                                {customer.subscriptions.flatMap((s: any) => s.invoices).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="text-center py-8 text-secondary-500">No invoices found for this customer.</td>
                                                    </tr>
                                                ) : (
                                                    customer.subscriptions.flatMap((s: any) => s.invoices)
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
                                                                        href={`/dashboard/invoices/${invoice.id}`}
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
                                <div className="flex justify-between items-center py-2 border-b border-secondary-100 italic">
                                    <span className="text-secondary-600">Total Lifetime Value</span>
                                    <span className="font-bold text-primary-600">${customer.subscriptions.reduce((acc: number, s: any) => acc + s.total, 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-secondary-100">
                                    <span className="text-secondary-600">Active Licenses</span>
                                    <span className="font-bold">{customer.subscriptions.filter((s: any) => s.status === 'ACTIVE').length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-secondary-600">Account status</span>
                                    <span className="text-success-600 font-medium">Active</span>
                                </div>
                            </div>
                        </div>

                        <div className="card-premium">
                            <h3 className="text-lg font-bold text-secondary-900 mb-4">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {customer.tags ? customer.tags.split(',').map((tag: string) => (
                                    <span key={tag} className="px-2 py-1 bg-secondary-100 rounded text-xs text-secondary-600">
                                        {tag}
                                    </span>
                                )) : <span className="text-xs text-secondary-400">No tags added</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
