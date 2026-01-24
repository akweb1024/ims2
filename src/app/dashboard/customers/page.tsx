'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomerType } from '@/types';
import { TableSkeleton } from '@/components/ui/skeletons';

export default function CustomersPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('CUSTOMER');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [stateFilter, setStateFilter] = useState<string>('');
    const [countryFilter, setCountryFilter] = useState<string>('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [executives, setExecutives] = useState<any[]>([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [assignTargetId, setAssignTargetId] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);

            // Fetch executives if eligible
            if (['SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
                fetch('/api/users?limit=100', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        const users = Array.isArray(data) ? data : (data.data || []);
                        setExecutives(users.filter((u: any) => ['EXECUTIVE', 'MANAGER', 'TEAM_LEADER'].includes(u.role)));
                    })
                    .catch(err => console.error('Failed to fetch staff', err));
            }
        }
    }, []);

    const [error, setError] = useState<string | null>(null);

    const fetchCustomers = async () => {
        setLoading(true);
        setError(null);
        // Clear selection on refetch/page change to avoid issues
        setSelectedIds(new Set());

        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                search,
                ...(typeFilter && { type: typeFilter }),
                ...(stateFilter && { state: stateFilter }),
                ...(countryFilter && { country: countryFilter })
            });

            const res = await fetch(`/api/customers?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const result = await res.json();
                setCustomers(result.data);
                setPagination(result.pagination);
            } else {
                const err = await res.json();
                setError(err.message || err.error || 'Failed to fetch customers');
            }
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            setError('A network error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, typeFilter, stateFilter, countryFilter, pagination.page]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = customers.map(c => c.id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkAssign = async () => {
        if (!assignTargetId) return alert('Please select a user to assign');

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/customers/bulk-assign', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerIds: selectedIds.size > 0 ? Array.from(selectedIds) : null,
                    filters: selectedIds.size === 0 ? {
                        country: countryFilter,
                        state: stateFilter,
                        customerType: typeFilter,
                        organizationName: search
                    } : null,
                    assignedToUserId: assignTargetId
                })
            });

            if (res.ok) {
                alert('Customers assigned successfully');
                setShowBulkModal(false);
                setAssignTargetId('');
                fetchCustomers(); // Refresh list
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to assign customers');
            }
        } catch (error) {
            alert('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartChat = async (targetUserId: string) => {
        if (!targetUserId) {
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
                    participantIds: [targetUserId],
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

    const getBadgeClass = (type: CustomerType) => {
        switch (type) {
            case 'INDIVIDUAL': return 'badge-primary';
            case 'INSTITUTION': return 'badge-success';
            case 'AGENCY': return 'badge-warning';
            default: return 'badge-secondary';
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6 relative">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Customers</h1>
                        <p className="text-secondary-600 mt-1">Manage all your customer accounts and profiles</p>
                    </div>
                    <Link href="/dashboard/customers/new" className="btn btn-primary px-6">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Customer
                    </Link>
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && ['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                    <div className="bg-primary-50 border border-primary-200 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
                        <div className="flex items-center space-x-3">
                            <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                {selectedIds.size}
                            </span>
                            <span className="font-medium text-primary-900">Customers Selected</span>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="btn btn-secondary bg-white text-secondary-600 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="btn btn-primary text-sm"
                            >
                                Assign to Executive
                            </button>
                        </div>
                    </div>
                )}

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
                                placeholder="Search by name, email or organization..."
                                className="input pl-10 w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-40">
                            <input
                                type="text"
                                placeholder="Country..."
                                className="input w-full"
                                value={countryFilter}
                                onChange={(e) => setCountryFilter(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-40">
                            <input
                                type="text"
                                placeholder="State..."
                                className="input w-full"
                                value={stateFilter}
                                onChange={(e) => setStateFilter(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-40">
                            <select
                                className="input w-full"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="">All Types</option>
                                <option value="INDIVIDUAL">Individual</option>
                                <option value="INSTITUTION">Institution</option>
                                <option value="AGENCY">Agency</option>
                            </select>
                        </div>
                        {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="btn btn-secondary border-dashed border-2 hover:border-primary-500 hover:text-primary-600 font-bold"
                                title="Assign all customers matching the current filters"
                            >
                                🎯 Bulk Assign
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                                        <th className="w-8">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                onChange={handleSelectAll}
                                                checked={customers.length > 0 && selectedIds.size === customers.length}
                                            />
                                        </th>
                                    )}
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Institution</th>
                                    <th>Assigned To</th>
                                    <th>Subscriptions</th>
                                    <th>Last Activity</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-0">
                                            <TableSkeleton rows={5} columns={7} showHeader={false} />
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-12">
                                            <div className="text-danger-600 mb-2">⚠️ Error</div>
                                            <p className="text-secondary-500">{error}</p>
                                            <button
                                                onClick={() => fetchCustomers()}
                                                className="btn btn-secondary mt-4 text-xs"
                                            >
                                                Try Again
                                            </button>
                                        </td>
                                    </tr>
                                ) : customers.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-12">
                                            <p className="text-secondary-500">No customers found matching your criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map((customer) => (
                                        <tr key={customer.id} className={`hover:bg-secondary-50 transition-colors ${selectedIds.has(customer.id) ? 'bg-primary-50/50' : ''}`}>
                                            {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                        checked={selectedIds.has(customer.id)}
                                                        onChange={() => handleSelect(customer.id)}
                                                    />
                                                </td>
                                            )}
                                            <td>
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold mr-3">
                                                        {customer.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-bold text-secondary-900">{customer.name}</div>
                                                            {customer.designation && (
                                                                <span className="px-1.5 py-0.5 bg-secondary-100 text-secondary-600 text-[10px] font-black rounded uppercase letter-spacing-wider">
                                                                    {customer.designation.replace('_', ' ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-secondary-500">{customer.primaryEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getBadgeClass(customer.customerType)}`}>
                                                    {customer.customerType.toLowerCase()}
                                                </span>
                                            </td>
                                            <td className="text-sm text-secondary-600">
                                                {customer.institution ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-secondary-900">{customer.institution.name}</span>
                                                        <span className="text-[10px] font-bold text-primary-600">{customer.institution.code}</span>
                                                    </div>
                                                ) : customer.organizationName ? (
                                                    <span className="text-secondary-500 italic">{customer.organizationName}</span>
                                                ) : (
                                                    <span className="text-secondary-400">Individual</span>
                                                )}
                                            </td>
                                            <td className="text-sm text-secondary-600">
                                                <div className="flex flex-col">
                                                    {customer.assignedTo?.email
                                                        ? <span className="font-medium">{(customer.assignedTo.customerProfile?.name || customer.assignedTo.email.split('@')[0])}</span>
                                                        : <span className="text-secondary-400 italic">Unassigned</span>
                                                    }
                                                    {customer.assignments?.length > 1 && (
                                                        <span className="text-[10px] text-success-600 font-bold">+{customer.assignments.length - 1} more shared</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-sm font-medium text-secondary-900">
                                                    {customer._count?.subscriptions || 0}
                                                </span>
                                            </td>
                                            <td className="text-sm text-secondary-500">
                                                <FormattedDate date={customer.user?.lastLogin} fallback="Never" />
                                            </td>
                                            <td className="text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleStartChat(customer.userId)}
                                                        disabled={actionLoading || !customer.userId}
                                                        className="p-2 hover:bg-primary-50 rounded-full text-primary-600 transition-colors disabled:opacity-30"
                                                        title="Chat with Customer"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                    </button>
                                                    <Link
                                                        href={`/dashboard/customers/${customer.id}`}
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
                    {!loading && customers.length > 0 && (
                        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-100 flex items-center justify-between">
                            <div className="text-sm text-secondary-500">
                                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> customers
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

                {/* Bulk Assign Modal */}
                {showBulkModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">Bulk Assign Customers</h3>
                            <p className="text-secondary-500 mb-4 font-medium text-sm">
                                {selectedIds.size > 0
                                    ? `Reassigning ${selectedIds.size} manually selected customers.`
                                    : "Reassigning ALL customers matching current filters (search, type, country, state)."}
                            </p>

                            {selectedIds.size === 0 && (
                                <div className="bg-warning-50 border border-warning-200 p-3 rounded-xl mb-4 flex items-start gap-2">
                                    <span className="text-lg">⚠️</span>
                                    <div>
                                        <p className="text-xs font-bold text-warning-900 leading-none mb-1">High Impact Action</p>
                                        <p className="text-[10px] text-warning-700 leading-tight">
                                            This will affect every customer that fits your current search results.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="label">Select Executive</label>
                                <select
                                    className="input w-full"
                                    value={assignTargetId}
                                    onChange={(e) => setAssignTargetId(e.target.value)}
                                >
                                    <option value="">-- Select --</option>
                                    {executives.map(ex => (
                                        <option key={ex.id} value={ex.id}>
                                            {ex.email} ({ex.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowBulkModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkAssign}
                                    disabled={actionLoading || !assignTargetId}
                                    className="btn btn-primary px-8"
                                >
                                    {actionLoading ? 'Assigning...' : 'Assign'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
