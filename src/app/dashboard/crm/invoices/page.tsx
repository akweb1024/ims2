'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import FormattedDate from '@/components/common/FormattedDate';
import CRMClientLayout from '../CRMClientLayout';
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
    const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
    const [availableBrands, setAvailableBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const searchParams = useSearchParams();
    const openedFromQuery = useRef(false);
    const activeRequestRef = useRef(0);

    const fetchInvoices = useCallback(async (signal?: AbortSignal) => {
        const requestId = Date.now();
        activeRequestRef.current = requestId;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: '10',
                status: statusFilter,
                search: debouncedSearchTerm
            });
            if (companyFilter) params.set('companyId', companyFilter);
            if (brandFilter) params.set('brandId', brandFilter);

            const res = await fetch(`/api/invoices?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal,
            });

            if (activeRequestRef.current !== requestId) return;
            if (res.ok) {
                const data = await res.json();
                setInvoices(data.data);
                setPagination(prev => ({ ...prev, totalPages: data.pagination.totalPages }));
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to fetch invoices');
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            setError('An error occurred while fetching invoices');
        } finally {
            if (activeRequestRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [pagination.page, statusFilter, debouncedSearchTerm, companyFilter, brandFilter]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        const companiesData = localStorage.getItem('availableCompanies');
        if (companiesData) {
            try {
                const parsed = JSON.parse(companiesData);
                if (Array.isArray(parsed)) setAvailableCompanies(parsed);
            } catch {
                // Ignore invalid local storage payload
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchInvoices(controller.signal);
        return () => controller.abort();
    }, [fetchInvoices]);

    useEffect(() => {
        const fetchBrands = async () => {
            if (!companyFilter) {
                setAvailableBrands([]);
                setBrandFilter('');
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const params = new URLSearchParams({ companyId: companyFilter });
                const res = await fetch(`/api/brands?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!res.ok) {
                    setAvailableBrands([]);
                    setBrandFilter('');
                    return;
                }
                const data = await res.json();
                setAvailableBrands(Array.isArray(data) ? data : []);
            } catch {
                setAvailableBrands([]);
                setBrandFilter('');
            }
        };
        fetchBrands();
    }, [companyFilter]);

    useEffect(() => {
        if (openedFromQuery.current) return;
        const shouldOpen = searchParams.get('create');
        if (shouldOpen === '1' || shouldOpen === 'true') {
            openedFromQuery.current = true;
            window.location.href = '/dashboard/crm/invoices/new';
        }
    }, [searchParams]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            if (pagination.page !== 1) {
                setPagination(prev => ({ ...prev, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, pagination.page]);

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
        <CRMClientLayout>
            <CRMPageShell
                title="Billing & Invoices"
                subtitle="High-level financial overview and transaction lifecycle management."
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Invoices' }]}
                icon={<FileText className="w-5 h-5" />}
                actions={
                    <div className="flex items-center gap-3">
                        {['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN', 'ADMIN', 'EXECUTIVE'].includes(userRole) && (
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
                        placeholder="Search invoice, proforma, customer, company or brand..."
                    />
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-secondary-200/60 shadow-sm md:w-auto w-full">
                        <div className="pl-3 text-secondary-400">
                             <Filter size={14} />
                        </div>
                        <select
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer pr-10 py-1"
                            value={statusFilter}
                            onChange={e => {
                                setStatusFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                        >
                            <option value="">Status: All</option>
                            <option value="PAID">Paid</option>
                            <option value="UNPAID">Unpaid</option>
                            <option value="PARTIALLY_PAID">Partially Paid</option>
                            <option value="OVERDUE">Overdue</option>
                            <option value="VOID">Void</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-secondary-200/60 shadow-sm md:w-auto w-full">
                        <div className="pl-3 text-secondary-400">
                             <Filter size={14} />
                        </div>
                        <select
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer pr-10 py-1"
                            value={companyFilter}
                            onChange={e => {
                                setCompanyFilter(e.target.value);
                                setBrandFilter('');
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                        >
                            <option value="">Company: All</option>
                            {availableCompanies.map((company) => (
                                <option key={company.id} value={company.id}>
                                    {company.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-secondary-200/60 shadow-sm md:w-auto w-full">
                        <div className="pl-3 text-secondary-400">
                             <Filter size={14} />
                        </div>
                        <select
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer pr-10 py-1"
                            value={brandFilter}
                            onChange={e => {
                                setBrandFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            disabled={!companyFilter}
                        >
                            <option value="">{companyFilter ? 'Brand: All' : 'Brand: Select Company First'}</option>
                            {availableBrands.map((brand) => (
                                <option key={brand.id} value={brand.id}>
                                    {brand.name}
                                </option>
                            ))}
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
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-secondary-700">
                                                    {inv.company?.name || 'Global'}
                                                </span>
                                                {inv.brand?.name ? (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-secondary-500">
                                                        Brand: {inv.brand.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-secondary-300">
                                                        Brand: Default
                                                    </span>
                                                )}
                                            </div>
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

        </CRMClientLayout>
    );
}
