'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    CRMPageShell, 
    CRMFilterBar, 
    CRMSearchInput, 
    CRMTable, 
    CRMTableLoading, 
    CRMTableError, 
    CRMTableEmpty, 
    CRMPagination, 
    CRMBadge, 
    CRMRowAction, 
    CRMModal 
} from '@/components/crm/CRMPageShell';
import { 
    Users, Plus, Search, Filter, Globe, MapPin, 
    Building2, UserCheck, MessageSquare, Eye,
    MoreHorizontal, Target, CheckSquare, X,
    Mail, Briefcase, ChevronRight
} from 'lucide-react';

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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);

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

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
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
    }, [pagination.page, pagination.limit, search, typeFilter, stateFilter, countryFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchCustomers]);

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
                fetchCustomers();
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

    const getBadgeVariant = (type: string): 'primary' | 'success' | 'warning' | 'secondary' => {
        switch (type) {
            case 'INDIVIDUAL': return 'primary';
            case 'INSTITUTION': return 'success';
            case 'AGENCY': return 'warning';
            default: return 'secondary';
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="Customer Intelligence"
                subtitle="Centralized repository of client profiles, organizational structures, and engagement metrics."
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Customers Base' }]}
                icon={<Users className="w-5 h-5" />}
                actions={
                    <Link href="/dashboard/customers/new" className="btn btn-primary py-2 px-5 text-xs font-black uppercase tracking-[0.15em] flex items-center gap-2 shadow-lg shadow-primary-200 group grow-0">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Establish Profile
                    </Link>
                }
            >
                {/* Bulk Action Intelligence */}
                {selectedIds.size > 0 && ['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                    <div className="bg-primary-900 text-white p-4 rounded-3xl flex items-center justify-between mb-8 animate-in slide-in-from-top-4 duration-500 shadow-2xl shadow-primary-200 ring-4 ring-primary-50">
                        <div className="flex items-center gap-4 pl-2">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary-400">
                                 <CheckSquare size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400">Batch Selection Active</span>
                                <span className="text-sm font-bold tracking-tight">{selectedIds.size} Target Profiles Categorized</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pr-1">
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary-300 hover:text-white transition-colors"
                            >
                                De-select All
                            </button>
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="bg-primary-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/20 hover:bg-primary-500 transition-all hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Re-assign Ownership
                            </button>
                        </div>
                    </div>
                )}

                {/* Filter Matrix */}
                <CRMFilterBar>
                    <CRMSearchInput
                        placeholder="Search names, digital identities or orgs..."
                        value={search}
                        onChange={setSearch}
                    />
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-secondary-200/60 shadow-sm">
                             <Globe size={14} className="text-secondary-400" />
                             <input
                                type="text"
                                placeholder="Country..."
                                className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest w-20 p-0"
                                value={countryFilter}
                                onChange={(e) => setCountryFilter(e.target.value)}
                             />
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-secondary-200/60 shadow-sm">
                             <MapPin size={14} className="text-secondary-400" />
                             <input
                                type="text"
                                placeholder="State..."
                                className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest w-20 p-0"
                                value={stateFilter}
                                onChange={(e) => setStateFilter(e.target.value)}
                             />
                        </div>
                        <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border border-secondary-200/60 shadow-sm">
                             <div className="pl-3 text-secondary-400 border-r border-secondary-100 pr-2">
                                  <Filter size={14} />
                             </div>
                             <select
                                className="bg-transparent text-[10px] font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer pr-8 py-1"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                             >
                                <option value="">Profiles: All</option>
                                <option value="INDIVIDUAL">Type: Individual</option>
                                <option value="INSTITUTION">Type: Institution</option>
                                <option value="AGENCY">Type: Agency</option>
                             </select>
                        </div>
                        
                        {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && selectedIds.size === 0 && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-secondary-50 text-secondary-600 border border-secondary-200 border-dashed rounded-xl hover:bg-secondary-100 hover:border-primary-300 transition-all text-[10px] font-black uppercase tracking-widest"
                                title="Assign all customers matching the current filters"
                            >
                                <Target size={14} /> Global Assign
                            </button>
                        )}
                    </div>
                </CRMFilterBar>

                {/* Profiles Matrix */}
                <div className="crm-card overflow-hidden">
                    <CRMTable>
                        <thead>
                            <tr className="bg-secondary-50/50">
                                {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                                    <th className="w-12 text-center py-5">
                                        <div className="flex justify-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-500/20 transition-all cursor-pointer"
                                                onChange={handleSelectAll}
                                                checked={customers.length > 0 && selectedIds.size === customers.length}
                                            />
                                        </div>
                                    </th>
                                )}
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Corporate Identity</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Classification</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Meta Alignment</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Active Ownership</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Sub. Units</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Last Lifecycle sync</th>
                                <th className="text-right text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5 px-6">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {loading ? (
                                <CRMTableLoading colSpan={['SUPER_ADMIN', 'MANAGER'].includes(userRole) ? 8 : 7} rows={8} />
                            ) : error ? (
                                <CRMTableError message={error} onRetry={fetchCustomers} colSpan={['SUPER_ADMIN', 'MANAGER'].includes(userRole) ? 8 : 7} />
                            ) : customers.length === 0 ? (
                                <CRMTableEmpty icon={<Users size={48} />} message="No customer intelligence found in current matrix parameters" colSpan={['SUPER_ADMIN', 'MANAGER'].includes(userRole) ? 8 : 7} />
                            ) : (
                                customers.map((customer) => (
                                    <tr key={customer.id} className={`group hover:bg-secondary-50/30 transition-all border-l-4 ${selectedIds.has(customer.id) ? 'bg-primary-50/40 border-primary-500' : 'border-transparent hover:border-primary-500'}`}>
                                        {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                                            <td className="py-5 text-center">
                                                <div className="flex justify-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-500/20 transition-all cursor-pointer"
                                                        checked={selectedIds.has(customer.id)}
                                                        onChange={() => handleSelect(customer.id)}
                                                    />
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-5">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-2xl bg-white border border-secondary-200 text-secondary-900 flex items-center justify-center font-black mr-4 text-xs shadow-sm group-hover:scale-110 group-hover:border-primary-200 transition-all uppercase">
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-secondary-900 leading-tight uppercase tracking-tight">{customer.name}</span>
                                                        {customer.designation && (
                                                            <span className="px-1.5 py-0.5 bg-secondary-100 text-secondary-500 text-[8px] font-black rounded-lg uppercase tracking-wider border border-secondary-200/50">
                                                                {customer.designation.replace('_', ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-secondary-400 font-bold lowercase flex items-center gap-1 mt-0.5">
                                                         <Mail size={10} className="opacity-40" /> {customer.primaryEmail}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5">
                                            <CRMBadge variant={getBadgeVariant(customer.customerType)} dot>
                                                {customer.customerType}
                                            </CRMBadge>
                                        </td>
                                        <td className="py-5">
                                            {customer.institution ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-secondary-800 flex items-center gap-1">
                                                         <Building2 size={12} className="text-secondary-300" />
                                                         {customer.institution.name}
                                                    </span>
                                                    <span className="text-[9px] font-black text-primary-600 mt-1 uppercase tracking-widest">{customer.institution.code}</span>
                                                </div>
                                            ) : customer.organizationName ? (
                                                <div className="text-[11px] font-bold text-secondary-600 flex items-center gap-1">
                                                     <Briefcase size={12} className="text-secondary-300" />
                                                     {customer.organizationName}
                                                </div>
                                            ) : (
                                                <span className="text-secondary-300 text-[10px] font-black uppercase tracking-widest italic opacity-60">Unmapped Matrix</span>
                                            )}
                                        </td>
                                        <td className="py-5">
                                            <div className="flex flex-col">
                                                {customer.assignedTo?.email ? (
                                                    <div className="flex items-center gap-2">
                                                         <div className="w-6 h-6 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center text-[8px] font-black border border-primary-100 uppercase">
                                                              {customer.assignedTo.email.charAt(0)}
                                                         </div>
                                                         <span className="text-[11px] font-bold text-secondary-700 capitalize">
                                                              {(customer.assignedTo.customerProfile?.name || customer.assignedTo.email.split('@')[0])}
                                                         </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-secondary-300 text-[10px] font-black uppercase tracking-widest">Autonomous</span>
                                                )}
                                                {customer.assignments?.length > 1 && (
                                                    <span className="text-[8px] text-success-600 font-black uppercase tracking-widest mt-1 pl-8">
                                                         Shared Access ({customer.assignments.length})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-5">
                                            <div className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-xl bg-secondary-100/50 text-secondary-900 text-xs font-black border border-secondary-200/40">
                                                {customer._count?.subscriptions || 0}
                                            </div>
                                        </td>
                                        <td className="py-5 text-center">
                                            <div className="flex flex-col items-start gap-1">
                                                 <div className="text-[11px] font-bold text-secondary-600">
                                                      <FormattedDate date={customer.user?.lastLogin} fallback="Phase: Offline" />
                                                 </div>
                                                 <span className="text-[8px] font-black text-secondary-400 uppercase tracking-widest opacity-60">Sync completed</span>
                                            </div>
                                        </td>
                                        <td className="text-right py-5 px-6">
                                            <div className="flex justify-end gap-2">
                                                <CRMRowAction
                                                    onClick={() => handleStartChat(customer.userId)}
                                                    disabled={actionLoading || !customer.userId}
                                                    variant="primary"
                                                    title="Initiate Real-time Comm"
                                                >
                                                    <MessageSquare size={16} />
                                                </CRMRowAction>
                                                <CRMRowAction
                                                    href={`/dashboard/customers/${customer.id}`}
                                                    variant="secondary"
                                                    title="Access Detailed Dossier"
                                                >
                                                    <Eye size={16} />
                                                </CRMRowAction>
                                            </div>
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
                        limit={pagination.limit}
                        onPageChange={(p) => setPagination({ ...pagination, page: p })}
                        entityName="strategic profiles"
                    />
                </div>

                {/* Bulk Assign Matrix Modal */}
                <CRMModal
                    open={showBulkModal}
                    onClose={() => setShowBulkModal(false)}
                    title="Ownership Matrix Reconfiguration"
                    subtitle={selectedIds.size > 0
                        ? `Relocating ${selectedIds.size} manually targeted profiles under new executive oversight.`
                        : "Executing global re-assignment task for ALL profiles matching current filter parameters."}
                >
                    {selectedIds.size === 0 && (
                        <div className="bg-danger-50 border border-danger-100 p-5 rounded-3xl mb-8 flex items-start gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-2xl bg-danger-100 text-danger-600 flex items-center justify-center shrink-0">
                                 <X size={20} className="animate-pulse" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-danger-900 uppercase tracking-widest mb-1 leading-none">High-Impact Protocol</p>
                                <p className="text-[10px] text-danger-700/80 font-bold leading-relaxed uppercase tracking-tight">
                                    Warning: This protocol will affect the entire filtered dataset. Ensure all parameters are correctly verified before initiating.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-secondary-400 tracking-[0.2em] mb-2 block">Target Executive Oversight</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors">
                                     <UserCheck size={18} />
                                </div>
                                <select
                                    className="input w-full pl-12 font-bold text-xs p-4 bg-secondary-50 border-secondary-100 hover:bg-white hover:border-primary-200 focus:ring-4 focus:ring-primary-50 transition-all cursor-pointer"
                                    value={assignTargetId}
                                    onChange={(e) => setAssignTargetId(e.target.value)}
                                    title="Select Oversight"
                                >
                                    <option value="">-- Deploy to Executive --</option>
                                    {executives.map(ex => (
                                        <option key={ex.id} value={ex.id}>
                                            {ex.email} [{ex.role.replace('_', ' ')}]
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6 border-t border-secondary-100/50">
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className="flex-1 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-secondary-500 hover:bg-secondary-50 transition-all border border-secondary-200"
                            >
                                Terminate
                            </button>
                            <button
                                onClick={handleBulkAssign}
                                disabled={actionLoading || !assignTargetId}
                                className="flex-1 bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                {actionLoading ? 'Synchronizing...' : (
                                    <>Initiate Re-assignment <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </div>
                    </div>
                </CRMModal>
            </CRMPageShell>
        </DashboardLayout>
    );
}
