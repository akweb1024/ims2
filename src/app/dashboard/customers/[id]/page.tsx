'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import CommunicationForm from '@/components/dashboard/CommunicationForm';
import CustomerAssignmentManager from '@/components/dashboard/CustomerAssignmentManager';
import { useCustomer, useCustomerMutations } from '@/hooks/useCRM';
import { getHealthBadgeColor, getScoreColor } from '@/lib/predictions';
import AgencyPerformanceDashboard from '@/components/dashboard/AgencyPerformanceDashboard';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: customer, isLoading: loading, refetch: fetchCustomer } = useCustomer(id);
    const { updateCustomer, updateCommunicationLog } = useCustomerMutations();

    const [userRole, setUserRole] = useState<string>('CUSTOMER');
    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [editingLog, setEditingLog] = useState<any>(null);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [activeFollowUpId, setActiveFollowUpId] = useState<string | null>(null);

    const formRef = useRef<HTMLDivElement>(null);

    const searchParams = useSearchParams();

    useEffect(() => {
        if (showEditModal) {
            const token = localStorage.getItem('token');

            fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(response => {
                    const data = Array.isArray(response) ? response : (response.data || []);
                    setStaffList(data.filter((u: any) => ['EXECUTIVE', 'MANAGER'].includes(u.role)));
                });

            fetch('/api/institutions', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => setInstitutions(Array.isArray(data) ? data : (data.data || [])));
        }
    }, [showEditModal, userRole]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
    }, [id, router]); // id and router are stable enough, or router changes only on nav.

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
        ...(customer.customerType === 'AGENCY' ? [{ id: 'performance', name: 'Performance', icon: '📈' }] : []),
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
            id: customer.id,
            name: formData.get('name'),
            organizationName: formData.get('organizationName'),
            primaryPhone: formData.get('primaryPhone'),
            secondaryEmail: formData.get('secondaryEmail'),
            website: formData.get('website'),
            institutionId: formData.get('institutionId') || null,
            designation: formData.get('designation') || null,
            assignedToUserId: formData.get('assignedToUserId') || null,
            assignedToUserIds: formData.getAll('assignedToUserIds'),
            
            // Structured Fields
            billingAddress: formData.get('billingAddress'),
            billingCity: formData.get('billingCity'),
            billingState: formData.get('billingState'),
            billingStateCode: formData.get('billingStateCode'),
            billingPincode: formData.get('billingPincode'),
            billingCountry: formData.get('billingCountry') || 'India',

            shippingAddress: formData.get('shippingAddress'),
            shippingCity: formData.get('shippingCity'),
            shippingState: formData.get('shippingState'),
            shippingStateCode: formData.get('shippingStateCode'),
            shippingPincode: formData.get('shippingPincode'),
            shippingCountry: formData.get('shippingCountry') || 'India',

            gstVatTaxId: formData.get('gstVatTaxId'),
        };

        if (customer.customerType === 'INSTITUTION') {
            payload.institutionDetails = {
                vspName: formData.get('vspName'),
                ipRanges: formData.get('ipRanges'),
                totalSeats: parseInt(formData.get('totalSeats') as string) || 0,
            };
        }


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
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-secondary-900">{customer.name}</h1>
                                {customer.designation && (
                                    <span className="px-2 py-0.5 bg-secondary-100 text-secondary-600 text-xs font-black rounded uppercase tracking-wider">
                                        {customer.designation.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center mt-1 space-x-3 text-secondary-500">
                                <span>{customer.primaryEmail}</span>
                                <span>•</span>
                                <span className={`badge ${customer.customerType === 'INSTITUTION' ? 'badge-success' : 'badge-primary'}`}>
                                    {customer.customerType}
                                </span>
                                {customer.institution && (
                                    <>
                                        <span>•</span>
                                        <Link
                                            href={`/dashboard/institutions/${customer.institution.id}`}
                                            className="text-primary-600 font-bold hover:underline flex items-center gap-1"
                                        >
                                            🏛️ {customer.institution.name}
                                        </Link>
                                    </>
                                )}
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
                            href={`/dashboard/crm/subscriptions/new?customerId=${customer.id}`}
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
                                    
                                    <div className="md:col-span-2 pt-4 border-t border-secondary-100">
                                        <h4 className="font-bold text-secondary-900 mb-2">Detailed Address (Indian Law / Shipping)</h4>
                                    </div>

                                    <div>
                                        <label className="label">GSTIN / VAT ID</label>
                                        <input name="gstVatTaxId" className="input" defaultValue={customer.gstVatTaxId} placeholder="Optional" />
                                    </div>

                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary-50/50 p-4 rounded-2xl border border-secondary-100">
                                        <div className="md:col-span-2 font-bold text-sm text-secondary-700">Billing Address</div>
                                        <div className="md:col-span-2">
                                            <label className="label">Street / Building</label>
                                            <textarea name="billingAddress" className="input h-20" defaultValue={customer.billingAddress}></textarea>
                                        </div>
                                        <div>
                                            <label className="label">Billing City</label>
                                            <input name="billingCity" className="input" defaultValue={customer.billingCity} />
                                        </div>
                                        <div>
                                            <label className="label">Billing State</label>
                                            <input name="billingState" className="input" defaultValue={customer.billingState} />
                                        </div>
                                        <div>
                                            <label className="label">State Code</label>
                                            <input name="billingStateCode" className="input" defaultValue={customer.billingStateCode} />
                                        </div>
                                        <div>
                                            <label className="label">Billing Pincode</label>
                                            <input name="billingPincode" className="input" defaultValue={customer.billingPincode} />
                                        </div>
                                        <div>
                                            <label className="label">Billing Country</label>
                                            <input name="billingCountry" className="input" defaultValue={customer.billingCountry || 'India'} />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary-50/10 p-4 rounded-2xl border border-primary-100/20">
                                        <div className="md:col-span-2 font-bold text-sm text-primary-700">Shipping Address</div>
                                        <div className="md:col-span-2">
                                            <label className="label">Street / Building</label>
                                            <textarea name="shippingAddress" className="input h-20" defaultValue={customer.shippingAddress || customer.billingAddress}></textarea>
                                        </div>
                                        <div>
                                            <label className="label">Shipping City</label>
                                            <input name="shippingCity" className="input" defaultValue={customer.shippingCity || customer.billingCity} />
                                        </div>
                                        <div>
                                            <label className="label">Shipping State</label>
                                            <input name="shippingState" className="input" defaultValue={customer.shippingState || customer.billingState} />
                                        </div>
                                        <div>
                                            <label className="label">State Code</label>
                                            <input name="shippingStateCode" className="input" defaultValue={customer.shippingStateCode || customer.billingStateCode} />
                                        </div>
                                        <div>
                                            <label className="label">Shipping Pincode</label>
                                            <input name="shippingPincode" className="input" defaultValue={customer.shippingPincode || customer.billingPincode} />
                                        </div>
                                        <div>
                                            <label className="label">Shipping Country</label>
                                            <input name="shippingCountry" className="input" defaultValue={customer.shippingCountry || customer.billingCountry || 'India'} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label">Link to Institution</label>
                                        <select name="institutionId" className="input" defaultValue={customer.institutionId || ''}>
                                            <option value="">-- None / Individual --</option>
                                            {institutions.map(inst => (
                                                <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="label">Designation</label>
                                        <select name="designation" className="input" defaultValue={customer.designation || ''}>
                                            <option value="">-- Select Designation --</option>
                                            {[
                                                'STUDENT', 'TEACHER', 'FACULTY', 'HOD', 'PRINCIPAL', 'DEAN',
                                                'RESEARCHER', 'LIBRARIAN', 'ACCOUNTANT', 'DIRECTOR', 'REGISTRAR',
                                                'VICE_CHANCELLOR', 'CHANCELLOR', 'STAFF', 'OTHER'
                                            ].map(d => (
                                                <option key={d} value={d}>{d.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Assignment - Only for Admins/Managers */}
                                    {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                                        <div className="md:col-span-2 pt-4 border-t border-secondary-100">
                                            <h4 className="font-bold text-secondary-900 mb-2">Customer Assignment</h4>
                                            <label className="label">Assign to Executives (Ctrl+Click to multi-select)</label>
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
                                            <label className="text-sm text-secondary-500">GSTIN / Tax ID</label>
                                            <p className="font-bold text-primary-600">{customer.gstVatTaxId || 'N/A'}</p>
                                        </div>
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-secondary-50 p-3 rounded-xl border border-secondary-100">
                                                <label className="text-[10px] font-black uppercase text-secondary-400">Billing Address</label>
                                                <p className="text-sm font-medium text-secondary-900 mt-1 whitespace-pre-line">
                                                    {customer.billingAddress || 'N/A'}
                                                    {customer.billingCity && `\n${customer.billingCity}, ${customer.billingState} - ${customer.billingPincode}`}
                                                    {customer.billingCountry && `\n${customer.billingCountry}`}
                                                </p>
                                            </div>
                                            <div className="bg-primary-50/50 p-3 rounded-xl border border-primary-100/50">
                                                <label className="text-[10px] font-black uppercase text-primary-400">Shipping Address</label>
                                                <p className="text-sm font-medium text-secondary-900 mt-1 whitespace-pre-line">
                                                    {customer.shippingAddress || customer.billingAddress || 'N/A'}
                                                    {(customer.shippingCity || customer.billingCity) && `\n${customer.shippingCity || customer.billingCity}, ${customer.shippingState || customer.billingState} - ${customer.shippingPincode || customer.billingPincode}`}
                                                    {(customer.shippingCountry || customer.billingCountry) && `\n${customer.shippingCountry || customer.billingCountry}`}
                                                </p>
                                            </div>
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

                        {activeTab === 'performance' && customer.customerType === 'AGENCY' && customer.agencyDetails && (
                            <AgencyPerformanceDashboard details={customer.agencyDetails} />
                        )}

                        {activeTab === 'subscriptions' && (
                            <div className="space-y-4">
                                {customer.subscriptions.length === 0 ? (
                                    <div className="card-premium text-center py-12">
                                        <p className="text-secondary-500">No active subscriptions found.</p>
                                        <Link
                                            href={`/dashboard/crm/subscriptions/new?customerId=${customer.id}`}
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

                                                {log.checklist && (
                                                    <div className="mt-3 p-3 bg-white border border-secondary-100 rounded-xl shadow-sm">
                                                        <div className="flex items-center gap-2 mb-2 border-b border-secondary-50 pb-2">
                                                            <span className="text-sm font-black text-secondary-900 flex items-center gap-1">
                                                                🎯 Prediction Analysis
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getHealthBadgeColor(log.checklist.customerHealth)}`}>
                                                                {log.checklist.customerHealth.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                                            <div className="text-center">
                                                                <p className="text-[10px] text-secondary-400 font-bold uppercase leading-tight">Renewal</p>
                                                                <p className={`text-sm font-black ${getScoreColor(log.checklist.renewalLikelihood)}`}>{log.checklist.renewalLikelihood}%</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-[10px] text-secondary-400 font-bold uppercase leading-tight">Upsell</p>
                                                                <p className={`text-sm font-black ${getScoreColor(log.checklist.upsellPotential)}`}>{log.checklist.upsellPotential}%</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-[10px] text-secondary-400 font-bold uppercase leading-tight">Churn Risk</p>
                                                                <p className={`text-sm font-black ${getScoreColor(log.checklist.churnRisk, true)}`}>{log.checklist.churnRisk}%</p>
                                                            </div>
                                                        </div>
                                                        {log.checklist.insights?.length > 0 && (
                                                            <div className="space-y-1">
                                                                {log.checklist.insights.slice(0, 2).map((insight: string, idx: number) => (
                                                                    <p key={idx} className="text-[11px] text-secondary-600 flex items-start gap-1">
                                                                        <span className="text-primary-500">•</span> {insight}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
                        {/* Assignment Manager */}
                        <div className="card-premium">
                            <CustomerAssignmentManager
                                customerId={customer.id}
                                customerName={customer.name}
                                currentAssignments={customer.assignments || []}
                                onUpdate={fetchCustomer}
                            />
                        </div>

                        {customer.communications?.find((c: any) => c.checklist) && (
                            <div className="card-premium bg-gradient-to-br from-indigo-50/50 to-white border-primary-100 shadow-lg shadow-indigo-100/20">
                                <h3 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                                    <span className="text-xl">🧬</span> Customer Health
                                </h3>
                                {(() => {
                                    const latestChecklist = customer.communications.find((c: any) => c.checklist)?.checklist;
                                    if (!latestChecklist) return null;
                                    return (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-secondary-50">
                                                <span className="text-xs text-secondary-500 font-bold uppercase tracking-tighter">Current Status</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border shadow-sm ${getHealthBadgeColor(latestChecklist.customerHealth)}`}>
                                                    {latestChecklist.customerHealth.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-secondary-600 font-bold uppercase tracking-tighter">Renewal Likelihood</span>
                                                    <span className={`font-black ${getScoreColor(latestChecklist.renewalLikelihood)}`}>{latestChecklist.renewalLikelihood}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-200/50 rounded-full overflow-hidden border border-gray-100">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-1000 shadow-[0_0_8px_rgba(79,70,229,0.3)]"
                                                        style={{ width: `${latestChecklist.renewalLikelihood}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-indigo-100">
                                                <p className="text-[10px] text-indigo-600 font-black uppercase mb-1 flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-indigo-600"></span> Latest Insight
                                                </p>
                                                <p className="text-xs text-secondary-700 italic font-medium leading-relaxed">
                                                    &quot;{latestChecklist.insights?.[0] || 'Relationship stable based on latest interaction.'}&quot;
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="card-premium">
                            <h3 className="text-lg font-bold text-secondary-900 mb-4">Quick Stats</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-secondary-100 italic">
                                    <span className="text-secondary-600">Total Lifetime Value</span>
                                    <span className="font-bold text-primary-600">₹{customer.subscriptions.reduce((acc: number, s: any) => acc + s.total, 0).toLocaleString()}</span>
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
