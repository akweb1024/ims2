'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import {
    CRMPageShell,
    CRMSearchInput,
    CRMFilterBar,
    CRMTable,
    CRMTableLoading,
    CRMTableEmpty,
    CRMTableError,
    CRMPagination,
    CRMBadge,
    CRMRowAction,
} from '@/components/crm/CRMPageShell';
import { getCustomerDisplayType } from '@/lib/customer-display';
import { 
    FileText, Plus, Download, Search, Filter, 
    MoreHorizontal, Eye, CreditCard, Clock, CheckCircle2,
    XCircle, AlertCircle, IndianRupee
} from 'lucide-react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'secondary' | 'info';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const searchParams = useSearchParams();
    const openedFromQuery = useRef(false);

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

    useEffect(() => {
        if (openedFromQuery.current) return;
        const shouldOpen = searchParams.get('create');
        if (shouldOpen === '1' || shouldOpen === 'true') {
            openedFromQuery.current = true;
            window.location.href = '/dashboard/crm/invoices/new';
        }
    }, [searchParams]);

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

    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status) {
            case 'PAID': return 'success';
            case 'PARTIALLY_PAID': return 'warning';
            case 'UNPAID': return 'danger';
            case 'OVERDUE': return 'danger';
            case 'VOID': return 'secondary';
            case 'CANCELLED': return 'secondary';
            default: return 'secondary';
        }
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/exports/invoices', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `billing-intelligence-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a); a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else alert('Export failed');
        } catch { alert('Export failed'); }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="Billing & Invoices"
                subtitle="High-level financial overview and transaction lifecycle management."
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Invoices' }]}
                icon={<FileText className="w-5 h-5" />}
                actions={
                    <div className="flex items-center gap-3">
                        {['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole) && (
                            <>
                                <button
                                    onClick={handleExport}
                                    className="btn btn-secondary py-2 px-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-secondary-200"
                                >
                                    <Download size={16} />
                                    Export CSV
                                </button>
                                <Link
                                    href="/dashboard/crm/invoices/new"
                                    className="btn btn-primary py-2 px-5 text-xs font-black uppercase tracking-[0.15em] flex items-center gap-2 shadow-lg shadow-primary-200 group grow-0"
                                >
                                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                                    Create Invoice
                                </Link>
                            </>
                        )}
                    </div>
                }
            >
                {/* Filters */}
                <CRMFilterBar>
                    <CRMSearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search IDs or profiles..."
                    />
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-secondary-200/60 shadow-sm md:w-auto w-full">
                        <div className="pl-3 text-secondary-400">
                             <Filter size={14} />
                        </div>
                        <select
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer pr-10 py-1"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="">Status: All</option>
                            <option value="PAID">Paid</option>
                            <option value="UNPAID">Unpaid</option>
                            <option value="PARTIALLY_PAID">Partially Paid</option>
                            <option value="OVERDUE">Overdue</option>
                            <option value="VOID">Void</option>
                        </select>
                    </div>
                </CRMFilterBar>

                {/* Invoices */}
                <div className="crm-card overflow-hidden">
                    <CRMTable>
                        <thead>
                            <tr className="bg-secondary-50/50">
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Invoice ID</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Account</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Due Date</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Amount</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Status</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Company</th>
                                <th className="text-right text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5 px-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {loading ? (
                                <CRMTableLoading rows={6} colSpan={7} />
                            ) : error ? (
                                <CRMTableError message={error} onRetry={fetchInvoices} colSpan={7} />
                            ) : invoices.length === 0 ? (
                                <CRMTableEmpty icon={<FileText size={48} />} message="No invoices found for the current filters" colSpan={7} />
                            ) : (
                                invoices.map(inv => (
                                    <tr key={inv.id} className="group hover:bg-secondary-50/30 transition-all border-l-4 border-transparent hover:border-primary-500">
                                        <td className="py-5">
                                            <div className="flex flex-col">
                                                <span className="font-mono font-black text-secondary-900 text-sm">{inv.invoiceNumber}</span>
                                                {inv.description && (
                                                    <p className="text-[10px] text-secondary-400 max-w-[150px] truncate mt-1 italic font-medium">&quot;{inv.description}&quot;</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-5">
                                            <div className="flex flex-col">
                                                <p className="font-bold text-secondary-900 text-xs uppercase tracking-tight">
                                                    {inv.customerProfile?.name || inv.subscription?.customerProfile?.name || 'Unmapped'}
                                                </p>
                                                <p className="text-[10px] font-black uppercase tracking-widest mt-0.5 text-primary-600">
                                                    {getCustomerDisplayType(inv.customerProfile || inv.subscription?.customerProfile)}
                                                </p>
                                                <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest mt-0.5 opacity-60">
                                                    {inv.customerProfile?.organizationName || inv.subscription?.customerProfile?.organizationName || 'N/A'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-5">
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-secondary-600">
                                                <Clock size={12} className="text-secondary-300" />
                                                <FormattedDate date={inv.dueDate} />
                                            </div>
                                        </td>
                                        <td className="py-5">
                                             <span className="font-black text-primary-700 text-sm whitespace-nowrap">
                                                 {(() => {
                                                     const c = (inv.currency || 'INR').toUpperCase();
                                                     return c === 'INR' ? '₹' : (c === 'USD' ? '$' : (c === 'EUR' ? '€' : (c === 'GBP' ? '£' : `${inv.currency} `)));
                                                 })()}{inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                             </span>
                                         </td>
                                        <td className="py-5">
                                            <CRMBadge variant={getStatusVariant(inv.status)} dot>
                                                {inv.status.replace(/_/g, ' ')}
                                            </CRMBadge>
                                        </td>
                                        <td className="py-5">
                                            {inv.brand ? (
                                                <div className="flex items-center gap-2 bg-secondary-100/50 px-2 py-1 rounded-lg border border-secondary-200/40 w-fit">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-secondary-600 truncate max-w-[80px]">
                                                        {inv.brand.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-secondary-300 text-[10px] font-black uppercase tracking-widest">Global</span>
                                            )}
                                        </td>
                                        <td className="text-right py-5 px-6">
                                            <CRMRowAction href={`/dashboard/crm/invoices/${inv.id}`} variant="primary" title="Access Ledger Detail">
                                                <Eye size={16} />
                                            </CRMRowAction>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </CRMTable>

                    <CRMPagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        total={pagination.totalPages * 10}
                        limit={10}
                        onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                        entityName="billing cycles"
                    />
                </div>
            </CRMPageShell>

        </DashboardLayout>
    );
}
