'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import { SubscriptionStatus } from '@/types';
import Link from 'next/link';

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('CUSTOMER');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
    }, []);

    const fetchSubscriptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                search,
                ...(statusFilter && { status: statusFilter })
            });

            const res = await fetch(`/api/subscriptions?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const result = await res.json();
                setSubscriptions(result.data);
                setPagination(result.pagination);
            } else {
                const err = await res.json();
                setError(err.message || err.error || 'Failed to fetch subscriptions');
            }
        } catch (error) {
            console.error('Failed to fetch subscriptions:', error);
            setError('A network error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSubscriptions();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter, pagination.page]);

    const getStatusBadgeClass = (status: SubscriptionStatus) => {
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
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Subscriptions</h1>
                        <p className="text-secondary-600 mt-1">
                            {userRole === 'CUSTOMER' ? 'Manage your active and past subscriptions' : 'Manage global journal subscriptions and renewals'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole) && (
                            <>
                                <button
                                    onClick={() => setStatusFilter('REQUESTED')}
                                    className="btn btn-outline flex items-center gap-2 mr-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    View Requests
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const token = localStorage.getItem('token');
                                            const res = await fetch('/api/exports/subscriptions', {
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            if (res.ok) {
                                                const blob = await res.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                            } else {
                                                alert('Failed to export data');
                                            }
                                        } catch (err) {
                                            alert('Export failed');
                                        }
                                    }}
                                    className="btn btn-secondary flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export CSV
                                </button>
                            </>
                        )}
                        <Link href="/dashboard/subscriptions/new" className="btn btn-primary px-6">
                            {userRole === 'CUSTOMER' ? 'Request Subscription' : 'New Subscription'}
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="card-premium p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search by customer, organization or ID..."
                                className="input pl-10 w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <select
                                className="input w-full"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="REQUESTED">Requested</option>
                                <option value="ACTIVE">Active</option>
                                <option value="PENDING_PAYMENT">Pending Payment</option>
                                <option value="EXPIRED">Expired</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="SUSPENDED">Suspended</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Subscription Details</th>
                                    <th>Customer</th>
                                    <th>Period</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                            <p className="text-secondary-500">Loading subscriptions...</p>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <div className="text-danger-600 mb-2">⚠️ Error</div>
                                            <p className="text-secondary-500">{error}</p>
                                            <button
                                                onClick={() => fetchSubscriptions()}
                                                className="btn btn-secondary mt-4 text-xs"
                                            >
                                                Try Again
                                            </button>
                                        </td>
                                    </tr>
                                ) : subscriptions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <p className="text-secondary-500">No subscriptions found matching your criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    subscriptions.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-secondary-50 transition-colors">
                                            <td className="max-w-xs">
                                                <div className="font-bold text-secondary-900 truncate">
                                                    {sub.items.length > 0 ? sub.items[0].journal.name : 'Subscription Package'}
                                                    {sub.items.length > 1 && ` (+${sub.items.length - 1} more)`}
                                                </div>
                                                <div className="text-xs text-secondary-500 mt-1">ID: {sub.id.substring(0, 8)}...</div>
                                            </td>
                                            <td>
                                                <div className="text-sm font-medium text-secondary-900">{sub.customerProfile.name}</div>
                                                <div className="text-xs text-secondary-500">{sub.customerProfile.organizationName}</div>
                                            </td>
                                            <td>
                                                <div className="text-sm text-secondary-700">
                                                    <FormattedDate date={sub.startDate} /> - <FormattedDate date={sub.endDate} />
                                                </div>
                                                <div className="text-xs text-secondary-400 mt-1">{sub.salesChannel} channel</div>
                                            </td>
                                            <td>
                                                <div className="text-sm font-bold text-secondary-900">${sub.total.toLocaleString()}</div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getStatusBadgeClass(sub.status)}`}>
                                                    {sub.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <Link
                                                        href={`/dashboard/subscriptions/${sub.id}`}
                                                        className="p-2 hover:bg-secondary-100 rounded-full text-secondary-600 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && subscriptions.length > 0 && (
                        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-100 flex items-center justify-between">
                            <div className="text-sm text-secondary-500">
                                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> subscriptions
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    className="px-3 py-1 bg-white border border-secondary-200 rounded-md text-sm disabled:opacity-50"
                                    disabled={pagination.page === 1}
                                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                >
                                    Previous
                                </button>
                                <button
                                    className="px-3 py-1 bg-white border border-secondary-200 rounded-md text-sm disabled:opacity-50"
                                    disabled={pagination.page === pagination.totalPages}
                                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
