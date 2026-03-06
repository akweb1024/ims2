'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import { SubscriptionStatus } from '@/types';
import Link from 'next/link';
import {
    CRMSearchInput,
    CRMFilterBar,
    CRMTable,
    CRMTableLoading,
    CRMTableEmpty,
    CRMTableError,
    CRMPagination,
    CRMBadge,
    CRMRowAction,
    CRMPageShell,
    CRMStatCard
} from '@/components/crm/CRMPageShell';
import { 
    BookOpen, Download, Plus, Bell, Eye, 
    ShieldCheck, Calendar, Activity, Zap, 
    DollarSign, Briefcase, ChevronRight, Layers,
    Clock, Archive
} from 'lucide-react';

function getStatusVariant(status: SubscriptionStatus) {
    switch (status) {
        case 'REQUESTED': return 'info';
        case 'ACTIVE': return 'success';
        case 'PENDING_PAYMENT': return 'warning';
        case 'EXPIRED': return 'secondary';
        case 'CANCELLED': return 'secondary';
        case 'SUSPENDED': return 'danger';
        default: return 'secondary';
    }
}

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('CUSTOMER');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);
    }, []);

    const fetchSubscriptions = useCallback(async () => {
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
                setError(err.message || err.error || 'Identity Sync Failed');
            }
        } catch {
            setError('Global Network Desync');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => fetchSubscriptions(), 300);
        return () => clearTimeout(timer);
    }, [fetchSubscriptions]);

    const handleExport = async () => {
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
            }
        } catch {
            console.error('Export failed');
        }
    };

    const isAdmin = ['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole);

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="Subscription Matrix"
                subtitle={userRole === 'CUSTOMER' ? 'Monitor and manage your active journal licenses and temporal access nodes.' : 'Orchestrate global journal subscriptions, physical/digital access, and renewal lifecycles.'}
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Subscription Hub' }]}
                icon={<BookOpen className="w-5 h-5" />}
                actions={
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => setStatusFilter('REQUESTED')}
                                    className="hidden lg:flex items-center gap-2.5 px-6 py-3 bg-white text-secondary-500 border border-secondary-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-secondary-50 hover:text-primary-600 transition-all shadow-sm"
                                >
                                    <Bell size={14} className="animate-pulse" />
                                    Review Requests
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="hidden lg:flex items-center gap-2.5 px-6 py-3 bg-white text-secondary-500 border border-secondary-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-secondary-50 transition-all shadow-sm"
                                >
                                    <Download size={14} />
                                    Export Registry
                                </button>
                            </>
                        )}
                        <Link 
                            href="/dashboard/crm/subscriptions/new" 
                            className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3 active:scale-95 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                            {userRole === 'CUSTOMER' ? 'Request Portal' : 'New Subscription'}
                        </Link>
                    </div>
                }
            >
                {/* Visual Intelligence Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CRMStatCard
                        label="Active Licenses"
                        value={subscriptions.filter(s => s.status === 'ACTIVE').length}
                        icon={<ShieldCheck size={22} />}
                        accent="bg-emerald-900 text-white shadow-emerald-100"
                        trend={{ value: 'Real-time', label: 'verification', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Pending Sync"
                        value={subscriptions.filter(s => s.status === 'PENDING_PAYMENT').length}
                        icon={<Activity size={22} />}
                        accent="bg-amber-900 text-white shadow-amber-100"
                        trend={{ value: 'Awaiting', label: 'settlement', isPositive: false }}
                    />
                    <CRMStatCard
                        label="Fiscal Volume"
                        value={`$${pagination.total > 0 ? (pagination.total * 450).toLocaleString() : '0'}`}
                        icon={<DollarSign size={22} />}
                        accent="bg-primary-950 text-white shadow-primary-100"
                        trend={{ value: 'Projected', label: 'revenue', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Matrix Density"
                        value={pagination.total}
                        icon={<Layers size={22} />}
                        accent="bg-secondary-900 text-white shadow-secondary-100"
                        trend={{ value: 'Nodes', label: 'mapped', isPositive: true }}
                    />
                </div>

                {/* Tactical Operations Hub */}
                <div className="mt-10 space-y-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-secondary-100 pb-8">
                         <div className="flex flex-wrap gap-2.5">
                             {[
                                 { value: '', label: 'Universal Feed' },
                                 { value: 'ACTIVE', label: 'Active Matrix' },
                                 { value: 'REQUESTED', label: 'Incoming Requests' },
                                 { value: 'PENDING_PAYMENT', label: 'Sync Pending' },
                                 { value: 'EXPIRED', label: 'Historical' }
                             ].map(opt => (
                                 <button
                                     key={opt.value}
                                     onClick={() => { setStatusFilter(opt.value); setPagination(p => ({ ...p, page: 1 })); }}
                                     className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${statusFilter === opt.value ? 'bg-secondary-950 text-white border-secondary-950 shadow-xl' : 'bg-white text-secondary-400 border-secondary-200 hover:border-primary-300'}`}
                                 >
                                     {opt.label}
                                 </button>
                             ))}
                         </div>

                         <div className="flex items-center gap-3">
                              <CRMSearchInput
                                  value={search}
                                  onChange={setSearch}
                                  placeholder="Search identity node or organization..."
                                  className="!bg-secondary-50 border-secondary-100 !h-12 !w-full lg:!w-80 font-bold"
                              />
                              <div className="flex items-center gap-2 p-1 bg-secondary-100 rounded-xl">
                                   <button className="p-2 bg-white rounded-lg shadow-sm text-primary-600">
                                        <Activity size={18} />
                                   </button>
                                   <button className="p-2 text-secondary-400">
                                        <Archive size={18} />
                                   </button>
                              </div>
                         </div>
                    </div>

                    {/* Subscription Registry */}
                    <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-2xl shadow-secondary-100/50 overflow-hidden">
                         <CRMTable>
                             <thead>
                                 <tr className="bg-secondary-50/50 border-b border-secondary-100">
                                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">Subscription ID</th>
                                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">Target Node (Organization)</th>
                                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">Temporal Range</th>
                                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">Valuation</th>
                                     <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">Status Protocol</th>
                                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic text-right">Operations</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-secondary-50">
                                 {loading ? (
                                     <CRMTableLoading rows={6} colSpan={6} />
                                 ) : error ? (
                                     <CRMTableError message={error} onRetry={fetchSubscriptions} colSpan={6} />
                                 ) : subscriptions.length === 0 ? (
                                     <CRMTableEmpty
                                         icon="🗒️"
                                         message="No identity nodes found in the current mapping."
                                         colSpan={6}
                                         className="py-40"
                                     />
                                 ) : (
                                     subscriptions.map(sub => (
                                         <tr key={sub.id} className="group hover:bg-secondary-50/50 transition-all duration-500">
                                             <td className="px-8 py-6">
                                                 <div className="flex flex-col">
                                                     <div className="flex items-center gap-2 mb-1.5">
                                                          <div className="w-1.5 h-1.5 bg-primary-600 rounded-full group-hover:animate-ping" />
                                                          <span className="font-black text-secondary-950 text-sm uppercase tracking-tight italic group-hover:text-primary-600 transition-colors">
                                                               {sub.items.length > 0 ? sub.items[0].journal.name : 'GENERIC_LICENSE'}
                                                          </span>
                                                     </div>
                                                     <span className="text-[9px] font-black text-secondary-300 uppercase tracking-widest pl-3.5">ARCHIVE: {sub.id.substring(0, 8)}…</span>
                                                 </div>
                                             </td>
                                             <td className="px-6 py-6">
                                                 <div className="flex items-center gap-4">
                                                      <div className="w-10 h-10 rounded-xl bg-secondary-100/50 flex items-center justify-center text-secondary-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                                                           <Briefcase size={18} />
                                                      </div>
                                                      <div className="flex flex-col min-w-0">
                                                          <span className="font-black text-secondary-900 text-[11px] uppercase truncate max-w-[180px]">{sub.customerProfile.name}</span>
                                                          <span className="text-[9px] font-black text-secondary-300 uppercase truncate max-w-[180px] tracking-widest mt-0.5">{sub.customerProfile.organizationName || 'INDIVIDUAL_NODE'}</span>
                                                      </div>
                                                 </div>
                                             </td>
                                             <td className="px-6 py-6">
                                                 <div className="flex flex-col gap-1.5">
                                                     <div className="flex items-center gap-2 text-xs font-black text-secondary-800 italic">
                                                         <Calendar size={13} className="text-secondary-300" />
                                                         <FormattedDate date={sub.startDate} />
                                                         <span className="text-secondary-200">/</span>
                                                         <FormattedDate date={sub.endDate} />
                                                     </div>
                                                     <div className="flex items-center gap-2">
                                                          <CRMBadge variant="secondary" className="px-2 py-0.5 text-[8px] font-black border-none uppercase tracking-widest bg-secondary-100/50">
                                                               {sub.salesChannel} VECTOR
                                                          </CRMBadge>
                                                     </div>
                                                 </div>
                                             </td>
                                             <td className="px-6 py-6">
                                                 <span className="font-black text-secondary-950 text-base italic">${sub.total.toLocaleString()}</span>
                                                 <p className="text-[8px] font-black text-secondary-300 uppercase tracking-widest mt-1">NET_PROCEEDS</p>
                                             </td>
                                             <td className="px-6 py-6">
                                                 <CRMBadge variant={getStatusVariant(sub.status)} className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border-none shadow-sm" dot>
                                                     {sub.status.replace('_', ' ')}
                                                 </CRMBadge>
                                             </td>
                                             <td className="px-8 py-6 text-right">
                                                 <div className="flex items-center justify-end gap-2">
                                                      <Link 
                                                           href={`/dashboard/crm/subscriptions/${sub.id}`}
                                                           className="p-3 bg-secondary-50 border border-secondary-100 rounded-xl text-secondary-400 hover:text-primary-600 hover:bg-white hover:border-primary-100 hover:shadow-lg transition-all flex items-center gap-2 group/btn"
                                                      >
                                                           <span className="text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-all group-hover/btn:-translate-x-1">Details</span>
                                                           <ChevronRight size={18} />
                                                      </Link>
                                                 </div>
                                             </td>
                                         </tr>
                                     ))
                                 )}
                             </tbody>
                         </CRMTable>

                         <div className="p-8 bg-secondary-50/30 border-t border-secondary-100">
                             <CRMPagination
                                 page={pagination.page}
                                 totalPages={pagination.totalPages}
                                 total={pagination.total}
                                 limit={pagination.limit}
                                 onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                                 entityName="identity nodes"
                                 className="!bg-transparent !p-0"
                             />
                         </div>
                    </div>
                </div>
            </CRMPageShell>
        </DashboardLayout>
    );
}
