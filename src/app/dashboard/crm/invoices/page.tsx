'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import FinanceClientLayout from '../../finance/FinanceClientLayout';
import FormattedDate from '@/components/common/FormattedDate';

import CreateInvoiceModal from '@/components/dashboard/CreateInvoiceModal';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: '10',
                status: statusFilter,
                search: searchTerm
            });

            const res = await fetch(`/api/invoices?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setInvoices(data.data);
                setPagination(prev => ({ ...prev, totalPages: data.pagination.totalPages }));
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to fetch invoices');
            }
        } catch (err) {
            setError('An error occurred while fetching invoices');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, statusFilter, searchTerm]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchInvoices();
    }, [fetchInvoices]);

    // Handle debounce for search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (pagination.page !== 1) {
                setPagination(prev => ({ ...prev, page: 1 }));
            } else {
                fetchInvoices();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, pagination.page, fetchInvoices]);

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'PAID': return 'badge-success';
            case 'PARTIALLY_PAID': return 'badge-warning';
            case 'UNPAID': return 'badge-danger';
            case 'OVERDUE': return 'bg-red-600 text-white';
            case 'VOID': return 'bg-gray-400 text-white';
            case 'CANCELLED': return 'bg-gray-400 text-white';
            default: return 'badge-secondary';
        }
    };

    return (
        <FinanceClientLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Billing & Invoices</h1>
                        <p className="text-secondary-600 mt-1">Manage your payments, view invoices, and track billing history</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole) && (
                            <>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    Create Invoice
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const token = localStorage.getItem('token');
                                            const res = await fetch('/api/exports/invoices', {
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            if (res.ok) {
                                                const blob = await res.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                            } else {
                                                alert('Failed to export invoices');
                                            }
                                        } catch (err) {
                                            alert('Export failed');
                                        }
                                    }}
                                    className="btn btn-secondary flex items-center gap-2 bg-white"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Export CSV
                                </button>
                            </>
                        )}
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
                                placeholder="Search by invoice number or customer..."
                                className="input pl-10 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="input w-full md:w-48"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            title="Filter Invoices by Status"
                        >
                            <option value="">All Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="UNPAID">Unpaid</option>
                            <option value="PARTIALLY_PAID">Partially Paid</option>
                            <option value="OVERDUE">Overdue</option>
                            <option value="VOID">Void</option>
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary-50 border-b border-secondary-100">
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Invoice #</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Customer / Organization</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Due Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Total Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Brand</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100 min-h-[400px]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                            <p className="text-secondary-500">Loading invoices...</p>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <p className="text-danger-600">{error}</p>
                                            <button onClick={fetchInvoices} className="btn btn-secondary mt-4">Try Again</button>
                                        </td>
                                    </tr>
                                ) : !loading && invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-secondary-500">
                                            No billing records found
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-secondary-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-sm font-bold text-secondary-900">{inv.invoiceNumber}</span>
                                                    {inv.description && <span className="text-[10px] text-secondary-400 max-w-[150px] truncate">{inv.description}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-secondary-900">
                                                        {inv.customerProfile?.name || inv.subscription?.customerProfile?.name || 'Unknown'}
                                                    </span>
                                                    <span className="text-xs text-secondary-500">
                                                        {inv.customerProfile?.organizationName || inv.subscription?.customerProfile?.organizationName || 'Individual'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                                                <FormattedDate date={inv.dueDate} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-primary-700">
                                                    {inv.currency === 'INR' || !inv.currency ? '₹' : inv.currency + ' '}
                                                    {inv.total.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`badge ${getStatusBadgeClass(inv.status)}`}>
                                                    {inv.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {inv.brand ? (
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                                                        {inv.brand.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Link
                                                    href={`/dashboard/crm/invoices/${inv.id}`}
                                                    className="btn btn-secondary py-1 text-xs"
                                                >
                                                    View Details
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && pagination.totalPages > 1 && (
                        <div className="bg-secondary-50 px-6 py-4 flex items-center justify-between border-t border-secondary-100">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                className="btn btn-secondary py-1 px-3 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-secondary-600">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                className="btn btn-secondary py-1 px-3 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <CreateInvoiceModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchInvoices();
                    // Optional: Show success toast
                }}
            />
        </FinanceClientLayout>
    );
}

