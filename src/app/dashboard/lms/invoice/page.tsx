'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { 
    FileText, Eye, Clock, Download
} from 'lucide-react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'secondary' | 'info';

export default function LMSInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

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

            const res = await fetch(`/api/lms/invoices?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setInvoices(data.data);
                setPagination(prev => ({ 
                    ...prev, 
                    totalPages: data.pagination.totalPages,
                    total: data.pagination.total
                }));
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to fetch LMS invoices');
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

    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status) {
            case 'PAID': return 'success';
            case 'PARTIALLY_PAID': return 'warning';
            case 'UNPAID': return 'danger';
            case 'OVERDUE': return 'danger';
            default: return 'secondary';
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="LMS Workshop Invoices"
                subtitle="Dedicated view for invoices generated through workshop registrations."
                breadcrumb={[{ label: 'LMS', href: '/dashboard/lms' }, { label: 'Invoices' }]}
                icon={<FileText className="w-5 h-5" />}
            >
                <CRMFilterBar>
                    <CRMSearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search by Invoice ID or Participant..."
                    />
                </CRMFilterBar>

                <div className="crm-card overflow-hidden">
                    <CRMTable>
                        <thead>
                            <tr className="bg-secondary-50/50">
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Invoice ID</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Participant</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Workshop</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Amount</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Status</th>
                                <th className="text-right text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5 px-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {loading ? (
                                <CRMTableLoading rows={6} colSpan={6} />
                            ) : error ? (
                                <CRMTableError message={error} onRetry={fetchInvoices} colSpan={6} />
                            ) : invoices.length === 0 ? (
                                <CRMTableEmpty icon={<FileText size={48} />} message="No LMS invoices found" colSpan={6} />
                            ) : (
                                invoices.map(inv => (
                                    <tr key={inv.id} className="group hover:bg-secondary-50/30 transition-all">
                                        <td className="py-5">
                                            <span className="font-mono font-black text-secondary-900 text-sm">{inv.invoiceNumber}</span>
                                        </td>
                                        <td className="py-5">
                                            <div className="flex flex-col">
                                                <p className="font-bold text-secondary-900 text-xs uppercase">{inv.lmsParticipant?.name || 'Unknown'}</p>
                                                <p className="text-[10px] text-secondary-400 font-medium">{inv.lmsParticipant?.email}</p>
                                            </div>
                                        </td>
                                        <td className="py-5">
                                            <p className="text-xs font-semibold text-secondary-600 truncate max-w-[200px]">
                                                {inv.lmsParticipant?.workshopTitle}
                                            </p>
                                        </td>
                                        <td className="py-5">
                                             <span className="font-black text-primary-700 text-sm">
                                                 ₹{inv.total.toLocaleString()}
                                             </span>
                                         </td>
                                        <td className="py-5">
                                            <CRMBadge variant={getStatusVariant(inv.status)} dot>
                                                {inv.status}
                                            </CRMBadge>
                                        </td>
                                        <td className="text-right py-5 px-6">
                                            <CRMRowAction href={`/dashboard/crm/invoices/${inv.id}`} variant="primary">
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
                        total={pagination.total}
                        limit={10}
                        onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                        entityName="LMS invoices"
                    />
                </div>
            </CRMPageShell>
        </DashboardLayout>
    );
}
