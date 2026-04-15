'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CRMClientLayout from '../CRMClientLayout';
import {
    CRMPageShell, CRMSearchInput, CRMTable, CRMTableLoading,
    CRMTableEmpty, CRMTableError, CRMPagination, CRMBadge, CRMRowAction, CRMModal
} from '@/components/crm/CRMPageShell';
import { cn } from '@/lib/classnames';
import FormattedDate from '@/components/common/FormattedDate';
import {
    Users, User, Building2, Briefcase, Plus, Eye, MessageSquare,
    Mail, Phone, Globe, MapPin, ChevronRight, Filter, Target, UserCheck, X, Trash2, AlertTriangle
} from 'lucide-react';

// ─── Customer type tabs ────────────────────────────────────────────────────────
const TYPE_TABS = [
    { value: '', label: 'All Customers', icon: <Users size={13} />, color: 'text-secondary-600' },
    { value: 'INDIVIDUAL', label: 'Individuals', icon: <User size={13} />, color: 'text-primary-600' },
    { value: 'INSTITUTION', label: 'Institutions', icon: <Building2 size={13} />, color: 'text-emerald-600' },
    { value: 'AGENCY', label: 'Agencies', icon: <Briefcase size={13} />, color: 'text-amber-600' },
] as const;

const getBadgeVariant = (type: string): 'primary' | 'success' | 'warning' | 'secondary' => {
    switch (type) {
        case 'INDIVIDUAL': return 'primary';
        case 'INSTITUTION': return 'success';
        case 'UNIVERSITY': return 'success';
        case 'COMPANY': return 'warning';
        case 'AGENCY': return 'warning';
        default: return 'secondary';
    }
};

export default function CRMCustomersPage() {
    const router = useRouter();
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState('EXECUTIVE');
    const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
    const [executives, setExecutives] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [assignTargetId, setAssignTargetId] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Counts per type for tab badges
    const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const u = JSON.parse(userData);
            setUserRole(u.role);
            if (['SUPER_ADMIN', 'MANAGER', 'ADMIN'].includes(u.role)) {
                fetch('/api/users?limit=100')
                    .then(r => r.json())
                    .then(d => setExecutives((d.data || []).filter((u: any) =>
                        ['EXECUTIVE', 'MANAGER', 'TEAM_LEADER'].includes(u.role)
                    )));
            }
        }
    }, []);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                search,
                ...(typeFilter && { type: typeFilter }),
            });
            const res = await fetch(`/api/customers?${params}`);
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.data ?? []);
                setPagination(p => ({ ...p, ...data.pagination }));
            } else {
                setError('Failed to load customers');
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, typeFilter]);

    // Fetch counts for tab badges (once, no filter)
    const fetchCounts = useCallback(async () => {
        try {
            const all = await fetch('/api/customers?limit=1');
            const ind = await fetch('/api/customers?limit=1&type=INDIVIDUAL');
            const ins = await fetch('/api/customers?limit=1&type=INSTITUTION');
            const age = await fetch('/api/customers?limit=1&type=AGENCY');
            const [a, i, n, g] = await Promise.all([all.json(), ind.json(), ins.json(), age.json()]);
            setTypeCounts({
                '': a.pagination?.total ?? 0,
                'INDIVIDUAL': i.pagination?.total ?? 0,
                'INSTITUTION': n.pagination?.total ?? 0,
                'AGENCY': g.pagination?.total ?? 0,
            });
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchCounts(); }, [fetchCounts]);

    useEffect(() => {
        const t = setTimeout(fetchCustomers, 300);
        return () => clearTimeout(t);
    }, [fetchCustomers]);

    const handleBulkAssign = async () => {
        if (!assignTargetId) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/customers/bulk-assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerIds: selectedIds.size > 0 ? Array.from(selectedIds) : null,
                    assignedToUserId: assignTargetId,
                }),
            });
            if (res.ok) {
                setShowBulkModal(false);
                setSelectedIds(new Set());
                fetchCustomers();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const isManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/customers/${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteTarget(null);
                fetchCustomers();
                fetchCounts();
            } else {
                const d = await res.json();
                alert(d.error || 'Failed to delete customer');
            }
        } catch {
            alert('Network error');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <CRMClientLayout>
            <CRMPageShell
                title="Customers"
                subtitle="Manage all customer accounts — Individuals, Institutions, and Agencies — in one place."
                icon={<Users className="w-5 h-5" />}
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Customers' }]}
                actions={
                    <Link
                        href="/dashboard/customers/new"
                        className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95 group"
                    >
                        <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                        Add Customer
                    </Link>
                }
            >
                {/* ── Type Tabs ─────────────────────────────────────── */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {TYPE_TABS.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                setTypeFilter(tab.value);
                                setPagination(p => ({ ...p, page: 1 }));
                            }}
                            className={cn(
                                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all',
                                typeFilter === tab.value
                                    ? 'bg-secondary-950 text-white border-secondary-950 shadow-lg'
                                    : 'bg-white text-secondary-500 border-secondary-200 hover:border-secondary-400'
                            )}
                        >
                            <span className={typeFilter === tab.value ? 'text-white' : tab.color}>{tab.icon}</span>
                            {tab.label}
                            {typeCounts[tab.value] !== undefined && (
                                <span className={cn(
                                    'ml-1 px-2 py-0.5 rounded-full text-[8px] font-black',
                                    typeFilter === tab.value
                                        ? 'bg-white/20 text-white'
                                        : 'bg-secondary-100 text-secondary-500'
                                )}>
                                    {typeCounts[tab.value]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Context Banner for current tab ──────────────── */}
                {typeFilter === 'INSTITUTION' && (
                    <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Building2 size={18} className="text-emerald-600" />
                            <div>
                                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Institution customers</p>
                                <p className="text-xs text-emerald-700 mt-0.5">Includes universities, colleges, and affiliated institutions. <Link href="/dashboard/institutions" className="underline underline-offset-2">Manage institutions →</Link></p>
                            </div>
                        </div>
                        <Link href="/dashboard/institutions" className="text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-900 border border-emerald-200 rounded-xl px-4 py-2 hover:bg-emerald-100 transition-all whitespace-nowrap">
                            View All Institutions
                        </Link>
                    </div>
                )}
                {typeFilter === 'AGENCY' && (
                    <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Briefcase size={18} className="text-amber-600" />
                            <div>
                                <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Agency partners</p>
                                <p className="text-xs text-amber-700 mt-0.5">Agencies sell our products to institutions, universities, and individuals on our behalf.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Search + Bulk Actions ────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-1">
                        <CRMSearchInput
                            value={search}
                            onChange={v => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }}
                            placeholder="Search name, email, company..."
                        />
                    </div>
                    {isManager && selectedIds.size > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-secondary-500">{selectedIds.size} selected</span>
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 transition-all"
                            >
                                <UserCheck size={14} /> Reassign
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-secondary-500 hover:text-secondary-800 font-black uppercase">Clear</button>
                        </div>
                    )}
                </div>

                {/* ── Customer Table ───────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-secondary-100 shadow-xl overflow-hidden">
                    <CRMTable>
                        <thead>
                            <tr className="bg-secondary-50/60 border-b border-secondary-100">
                                {isManager && (
                                    <th className="w-12 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-secondary-300 text-primary-600"
                                            onChange={e => setSelectedIds(e.target.checked ? new Set(customers.map(c => c.id)) : new Set())}
                                            checked={customers.length > 0 && selectedIds.size === customers.length}
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-secondary-400 text-left">Customer</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-secondary-400">Type</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-secondary-400 text-left">Institution / Org</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-secondary-400 text-left">Owner</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-secondary-400 text-center">Subs</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-secondary-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {loading ? (
                                <CRMTableLoading rows={8} colSpan={isManager ? 7 : 6} />
                            ) : error ? (
                                <CRMTableError message={error} onRetry={fetchCustomers} colSpan={isManager ? 7 : 6} />
                            ) : customers.length === 0 ? (
                                <CRMTableEmpty
                                    icon={<Users size={44} strokeWidth={1.2} />}
                                    message={typeFilter ? `No ${typeFilter.toLowerCase()} customers found.` : 'No customers found.'}
                                    action={
                                        <Link href="/dashboard/customers/new" className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 transition-all">
                                            <Plus size={14} /> Add first customer
                                        </Link>
                                    }
                                    colSpan={isManager ? 7 : 6}
                                />
                            ) : (
                                customers.map(customer => (
                                    <tr
                                        key={customer.id}
                                        className={cn(
                                            'group hover:bg-secondary-50/40 transition-colors cursor-pointer',
                                            selectedIds.has(customer.id) && 'bg-primary-50/30'
                                        )}
                                    >
                                        {isManager && (
                                            <td className="py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-secondary-300 text-primary-600"
                                                    checked={selectedIds.has(customer.id)}
                                                    onChange={() => {
                                                        const s = new Set(selectedIds);
                                                        if (s.has(customer.id)) {
                                                            s.delete(customer.id);
                                                        } else {
                                                            s.add(customer.id);
                                                        }
                                                        setSelectedIds(s);
                                                    }}
                                                />
                                            </td>
                                        )}

                                        {/* Customer identity */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-secondary-100 flex items-center justify-center text-[11px] font-black text-secondary-700 uppercase shrink-0">
                                                    {customer.name?.charAt(0) ?? '?'}
                                                </div>
                                                <div>
                                                    <p className="text-[12px] font-bold text-secondary-900 leading-tight">{customer.name}</p>
                                                    <p className="text-[10px] text-secondary-400 flex items-center gap-1 mt-0.5">
                                                        <Mail size={9} className="opacity-50" />
                                                        <span className="lowercase">{customer.primaryEmail}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Type badge */}
                                        <td className="px-4 py-4 text-center">
                                            <CRMBadge variant={getBadgeVariant(customer.organizationType || customer.customerType)} dot>
                                                {customer.organizationType 
                                                    ? customer.organizationType.replace('_', ' ')
                                                    : customer.customerType === 'INDIVIDUAL' 
                                                    ? 'Person'
                                                    : customer.customerType}
                                            </CRMBadge>
                                        </td>

                                        {/* Institution / Org */}
                                        <td className="px-4 py-4">
                                            {customer.institution ? (
                                                <div>
                                                    <p className="text-[11px] font-bold text-secondary-800 flex items-center gap-1">
                                                        <Building2 size={11} className="text-emerald-400" /> {customer.institution.name}
                                                    </p>
                                                    {customer.institution.universityCategory && (
                                                        <p className="text-[9px] font-black text-emerald-600 mt-0.5 uppercase tracking-wider">
                                                            {customer.institution.universityCategory.replace(/_/g, ' ')}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : customer.organizationName ? (
                                                <p className="text-[11px] text-secondary-600 flex items-center gap-1">
                                                    <Briefcase size={11} className="text-secondary-300" /> {customer.organizationName}
                                                </p>
                                            ) : (
                                                <span className="text-[10px] text-secondary-300 italic">—</span>
                                            )}
                                        </td>

                                        {/* Owner */}
                                        <td className="px-4 py-4">
                                            {customer.assignedTo?.email ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 text-[8px] font-black flex items-center justify-center uppercase">
                                                        {customer.assignedTo.email.charAt(0)}
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-secondary-700">
                                                        {customer.assignedTo.customerProfile?.name ?? customer.assignedTo.email.split('@')[0]}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-secondary-300 italic">Unassigned</span>
                                            )}
                                        </td>

                                        {/* Subscription count */}
                                        <td className="px-4 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-secondary-100 text-secondary-700 text-xs font-black border border-secondary-200/50">
                                                {customer._count?.subscriptions ?? 0}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <CRMRowAction
                                                    href={`/dashboard/customers/${customer.id}`}
                                                    variant="primary"
                                                    title="View customer"
                                                >
                                                    <Eye size={16} />
                                                </CRMRowAction>
                                                <CRMRowAction
                                                    href={`/dashboard/crm/billing?customer=${customer.id}`}
                                                    variant="secondary"
                                                    title="Create invoice"
                                                >
                                                    <ChevronRight size={16} />
                                                </CRMRowAction>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => setDeleteTarget({ id: customer.id, name: customer.name })}
                                                        title="Delete customer"
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-all active:scale-95"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </CRMTable>

                    <div className="px-6 py-4 border-t border-secondary-50 bg-secondary-50/30">
                        <CRMPagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            total={pagination.total}
                            limit={pagination.limit}
                            onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                            entityName="customers"
                            className="!bg-transparent !p-0"
                        />
                    </div>
                </div>

                {/* ── Delete Confirm Modal ─────────────────────────── */}
                <CRMModal
                    open={!!deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    title="Delete Customer"
                    subtitle={`This action is permanent and cannot be undone.`}
                >
                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                            <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-red-800">You are about to delete:</p>
                                <p className="text-sm text-red-700 mt-0.5 font-semibold">{deleteTarget?.name}</p>
                                <p className="text-xs text-red-600 mt-2">All related subscriptions, invoices, communications, and assignments will also be permanently removed.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 px-4 py-3 rounded-xl border border-secondary-200 text-[10px] font-black uppercase tracking-wider text-secondary-500 hover:bg-secondary-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 transition-all"
                            >
                                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </CRMModal>

                {/* ── Bulk Assign Modal ────────────────────────────── */}
                <CRMModal
                    open={showBulkModal}
                    onClose={() => setShowBulkModal(false)}
                    title="Reassign owner"
                    subtitle={`Assign ${selectedIds.size > 0 ? selectedIds.size + ' selected' : 'all filtered'} customers to a team member.`}
                >
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-secondary-400 block mb-2">Assign to</label>
                            <select
                                className="input w-full font-bold text-sm"
                                value={assignTargetId}
                                onChange={e => setAssignTargetId(e.target.value)}
                            >
                                <option value="">Select team member</option>
                                {executives.map(ex => (
                                    <option key={ex.id} value={ex.id}>{ex.email} [{ex.role}]</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-secondary-100">
                            <button onClick={() => setShowBulkModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-secondary-200 text-[10px] font-black uppercase tracking-wider text-secondary-500 hover:bg-secondary-50 transition-all">Cancel</button>
                            <button
                                onClick={handleBulkAssign}
                                disabled={actionLoading || !assignTargetId}
                                className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 disabled:opacity-50 transition-all"
                            >
                                {actionLoading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </CRMModal>
            </CRMPageShell>
        </CRMClientLayout>
    );
}
