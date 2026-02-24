'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';

export default function SubscriptionDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('CUSTOMER');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchSubscription = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/subscriptions/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setSubscription(data);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to fetch subscription');
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Failed to fetch subscription');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchSubscription();
    }, [fetchSubscription]);

    const handleStatusChange = async (newStatus: string) => {
        if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/subscriptions/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                fetchSubscription();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to update status');
            }
        } catch (error) {
            alert('A network error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRenew = async () => {
        if (!confirm('This will create a new subscription starting after the current one expires. Continue?')) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/subscriptions/${id}/renew`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const newSubscription = await res.json();
                router.push(`/dashboard/crm/subscriptions/${newSubscription.id}`);
                alert('Renewal created successfully as a new pending subscription!');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create renewal');
            }
        } catch (error) {
            alert('A network error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !subscription) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="card-premium p-8 text-center">
                    <div className="text-danger-600 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-secondary-900">Error</h2>
                    <p className="text-secondary-600 mt-2">{error || 'Subscription not found'}</p>
                    <Link href="/dashboard/crm/subscriptions" className="btn btn-secondary mt-6">
                        Back to Subscriptions
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'REQUESTED': return 'bg-blue-100 text-blue-700';
            case 'ACTIVE': return 'badge-success';
            case 'PENDING_PAYMENT': return 'badge-warning';
            case 'EXPIRED': return 'badge-danger';
            case 'CANCELLED': return 'badge-secondary';
            case 'SUSPENDED': return 'badge-danger';
            default: return 'badge-secondary';
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard/crm/subscriptions" className="p-2 hover:bg-secondary-100 rounded-full text-secondary-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <h1 className="text-3xl font-bold text-secondary-900">Subscription Details</h1>
                        </div>
                        <p className="text-secondary-500 mt-1 ml-11">ID: {subscription.id}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {userRole !== 'CUSTOMER' && subscription.status === 'REQUESTED' && (
                            <button
                                onClick={() => handleStatusChange('PENDING_PAYMENT')}
                                disabled={actionLoading}
                                className="btn btn-primary px-4 bg-blue-600 hover:bg-blue-700"
                            >
                                Approve Request
                            </button>
                        )}
                        {userRole !== 'CUSTOMER' && subscription.status === 'ACTIVE' && (
                            <button
                                onClick={() => handleStatusChange('CANCELLED')}
                                disabled={actionLoading}
                                className="btn border border-danger-200 text-danger-600 hover:bg-danger-50 px-4"
                            >
                                Cancel Subscription
                            </button>
                        )}
                        {userRole !== 'CUSTOMER' && subscription.status === 'PENDING_PAYMENT' && (
                            <button
                                onClick={() => handleStatusChange('ACTIVE')}
                                disabled={actionLoading}
                                className="btn btn-success px-4"
                            >
                                Mark as Active
                            </button>
                        )}
                        {subscription.status !== 'REQUESTED' && (
                            <button
                                className="btn btn-primary px-6"
                                onClick={handleRenew}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Processing...' : 'Renew Subscription'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Card */}
                        <div className="card-premium p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-secondary-900 border-l-4 border-primary-500 pl-3">Overview</h3>
                                <span className={`badge ${getStatusBadgeClass(subscription.status)} py-1 px-4 text-sm font-bold uppercase tracking-wider`}>
                                    {subscription.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-secondary-400 uppercase">Start Date</p>
                                        <p className="text-lg font-semibold text-secondary-800">
                                            <FormattedDate date={subscription.startDate} />
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-secondary-400 uppercase">End Date</p>
                                        <p className="text-lg font-semibold text-secondary-800">
                                            <FormattedDate date={subscription.endDate} />
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-secondary-400 uppercase">Sales Channel</p>
                                        <p className="text-lg font-semibold text-secondary-800">{subscription.salesChannel}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-secondary-400 uppercase">Auto Renew</p>
                                        <p className="text-lg font-semibold text-secondary-800">{subscription.autoRenew ? 'Enabled' : 'Disabled'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Card */}
                        <div className="card-premium overflow-hidden">
                            <div className="p-6 border-b border-secondary-100">
                                <h3 className="text-lg font-bold text-secondary-900 border-l-4 border-primary-500 pl-3">Subscription Items</h3>
                            </div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Journal / Package</th>
                                        <th>Format</th>
                                        <th>Quantity</th>
                                        <th className="text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscription.items.map((item: any) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="font-bold text-secondary-900">{item.journal.name}</div>
                                                <div className="text-xs text-secondary-500">{item.plan.planType} Plan</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-primary">{item.plan.format}</span>
                                            </td>
                                            <td>{item.quantity}</td>
                                            <td className="text-right font-semibold">${item.price.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-secondary-50">
                                        <td colSpan={3} className="text-right font-bold text-secondary-700">Subtotal</td>
                                        <td className="text-right font-bold text-secondary-900">${subscription.subtotal.toLocaleString()}</td>
                                    </tr>
                                    {subscription.discount > 0 && (
                                        <tr className="bg-white">
                                            <td colSpan={3} className="text-right font-bold text-secondary-700">Discount</td>
                                            <td className="text-right font-bold text-danger-600">-${subscription.discount.toLocaleString()}</td>
                                        </tr>
                                    )}
                                    <tr className="bg-primary-50">
                                        <td colSpan={3} className="text-right font-bold text-primary-900 text-lg">Total</td>
                                        <td className="text-right font-bold text-primary-600 text-xl">${subscription.total.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        {/* Customer Card */}
                        <div className="card-premium p-6">
                            <h3 className="text-lg font-bold text-secondary-900 border-l-4 border-secondary-400 pl-3 mb-4">Customer Info</h3>
                            <div className="flex items-center mb-4">
                                <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold mr-3 text-xl">
                                    {subscription.customerProfile.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-secondary-900">{subscription.customerProfile.name}</div>
                                    <div className="text-xs text-secondary-500">{subscription.customerProfile.primaryEmail}</div>
                                </div>
                            </div>
                            <div className="space-y-3 pt-3 border-t border-secondary-100">
                                <div>
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Organization</p>
                                    <p className="text-sm text-secondary-700">{subscription.customerProfile.organizationName || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Country</p>
                                    <p className="text-sm text-secondary-700">{subscription.customerProfile.country || 'N/A'}</p>
                                </div>
                                <Link
                                    href={`/dashboard/customers/${subscription.customerProfile.id}`}
                                    className="block text-center w-full btn btn-secondary mt-2 text-sm"
                                >
                                    View Customer Profile
                                </Link>
                            </div>
                        </div>

                        {/* Invoices Card */}
                        <div className="card-premium p-6">
                            <h3 className="text-lg font-bold text-secondary-900 border-l-4 border-secondary-400 pl-3 mb-4">Recent Invoices</h3>
                            <div className="space-y-4">
                                {subscription.invoices.map((invoice: any) => (
                                    <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-secondary-100 hover:border-primary-200 transition-colors">
                                        <div>
                                            <div className="text-sm font-bold text-secondary-800">{invoice.invoiceNumber}</div>
                                            <div className="text-xs text-secondary-500">
                                                <FormattedDate date={invoice.createdAt} />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-secondary-900">${invoice.total.toLocaleString()}</div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${invoice.status === 'PAID' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                                                {invoice.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {subscription.invoices.length === 0 && (
                                    <p className="text-sm text-secondary-500 text-center py-4">No invoices found</p>
                                )}
                                <Link
                                    href="/dashboard/crm/invoices"
                                    className="block text-center text-sm text-primary-600 font-bold hover:underline"
                                >
                                    View All Invoices
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
