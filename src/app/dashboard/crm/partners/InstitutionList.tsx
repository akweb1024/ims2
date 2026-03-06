'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
    Building2, Users, BookOpen, TrendingUp, Plus, 
    Edit, Trash2, Eye, MapPin, ChevronRight,
    Search, Filter, Globe, ShieldCheck, Zap,
    Activity, GraduationCap, School, Library,
    Landmark, Target, ChevronLeft, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CRMSearchInput, CRMBadge, CRMRowAction, CRMModal, CRMStatCard } from '@/components/crm/CRMPageShell';

export default function InstitutionList({ userRole }: { userRole: string }) {
    const router = useRouter();
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [stateFilter, setStateFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 1
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [executives, setExecutives] = useState<any[]>([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [assignTargetId, setAssignTargetId] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (['SUPER_ADMIN', 'MANAGER'].includes(userRole)) {
            fetch('/api/users?limit=100', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    const users = Array.isArray(data) ? data : (data.data || []);
                    setExecutives(users.filter((u: any) => ['EXECUTIVE', 'MANAGER', 'TEAM_LEADER'].includes(u.role)));
                })
                .catch(err => console.error('Failed to fetch staff', err));
        }
    }, [userRole]);

    const fetchInstitutions = useCallback(async (page = 1) => {
        setLoading(true);
        setSelectedIds(new Set());
        try {
            const token = localStorage.getItem('token');
            let url = `/api/institutions?page=${page}&limit=${pagination.limit}`;
            if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
            if (filterType !== 'ALL') url += `&type=${filterType}`;
            if (stateFilter) url += `&state=${encodeURIComponent(stateFilter)}`;
            if (cityFilter) url += `&city=${encodeURIComponent(cityFilter)}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const response = await res.json();
                if (response.pagination) {
                    setInstitutions(response.data);
                    setPagination(response.pagination);
                } else {
                    setInstitutions(response);
                }
            }
        } catch (error) {
            console.error('Error fetching institutions:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, searchTerm, filterType, stateFilter, cityFilter]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchInstitutions(1);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [fetchInstitutions]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this institution?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/institutions?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchInstitutions(pagination.page);
        } catch (error) {
            console.error('Error deleting institution:', error);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(institutions.map(i => i.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleBulkAssign = async () => {
        if (!assignTargetId) return alert('Please select a user to assign');
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/imports/institutions/bulk-assign', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    institutionIds: selectedIds.size > 0 ? Array.from(selectedIds) : null,
                    filters: selectedIds.size === 0 ? {
                        state: stateFilter,
                        city: cityFilter,
                        type: filterType === 'ALL' ? undefined : filterType,
                        search: searchTerm
                    } : null,
                    assignedToUserId: assignTargetId
                })
            });
            if (res.ok) {
                alert('Institutions assigned successfully');
                setShowBulkModal(false);
                setAssignTargetId('');
                fetchInstitutions(pagination.page);
            }
        } catch (error) {
            alert('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const institutionTypes = ['UNIVERSITY', 'COLLEGE', 'SCHOOL', 'RESEARCH_INSTITUTE', 'CORPORATE', 'LIBRARY', 'GOVERNMENT', 'HOSPITAL', 'NGO', 'AGENCY', 'OTHER'];

    return (
        <div className="space-y-8 pt-4 pb-20">
            {/* Header Matrix */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-2xl shadow-secondary-200/50 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8 relative overflow-hidden group">
                 {/* Decorative Visuals */}
                 <div className="absolute right-0 top-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                      <Building2 size={160} />
                 </div>
                 
                 <div className="flex items-center gap-6 relative z-10">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-200">
                           <LayoutGrid size={32} />
                      </div>
                      <div className="flex flex-col">
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-1 leading-none">Enterprise Architecture</span>
                           <h2 className="text-2xl font-black text-secondary-950 uppercase tracking-tight italic">Partner Institutions</h2>
                           <p className="text-secondary-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 space-x-2">
                                <span>Global Academic Sync</span>
                                <span className="text-secondary-200">•</span>
                                <span>Enterprise Networking</span>
                           </p>
                      </div>
                 </div>

                 <div className="flex items-center gap-4 relative z-10 shrink-0">
                      <Link
                          href="/dashboard/institutions/new"
                          className="bg-secondary-950 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-secondary-300 hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                      >
                          Add Institution <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                      </Link>
                 </div>
            </div>

            {/* Metrics Intelligence Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <CRMStatCard
                    label="Active Entities"
                    value={pagination.total}
                    icon={<Building2 className="w-5 h-5" />}
                    accent="bg-secondary-900 shadow-secondary-100"
                    trend={{ value: 'Operational', label: 'status', isPositive: true }}
                />
                <CRMStatCard
                    label="Learner Density"
                    value={institutions.reduce((sum, inst) => sum + (inst._count?.customers || 0), 0)}
                    icon={<Users className="w-5 h-5" />}
                    accent="bg-emerald-900 shadow-emerald-100"
                    trend={{ value: '+8.4%', label: 'vs avg', isPositive: true }}
                />
                <CRMStatCard
                    label="Unit Subscriptions"
                    value={institutions.reduce((sum, inst) => sum + (inst._count?.subscriptions || 0), 0)}
                    icon={<BookOpen className="w-5 h-5" />}
                    accent="bg-indigo-900 shadow-indigo-100"
                    trend={{ value: 'Active', label: 'contract', isPositive: true }}
                />
                <CRMStatCard
                    label="Engagement Map"
                    value="92%"
                    icon={<Activity className="w-5 h-5" />}
                    accent="bg-purple-900 shadow-purple-100"
                    trend={{ value: 'Optimal', label: 'rating', isPositive: true }}
                />
            </div>

            {/* Filter Matrix Controller */}
            <div className="flex flex-col 2xl:flex-row gap-4 items-center bg-secondary-50/50 p-4 rounded-[2rem] border border-secondary-200/50 backdrop-blur-md">
                <div className="w-full 2xl:flex-1 relative group">
                    <CRMSearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Scan institution registry (name, code, identifiers)..."
                        className="bg-white border-none shadow-sm h-16 pl-14 rounded-2xl font-black text-sm uppercase tracking-tight"
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full 2xl:w-auto">
                    <div className="flex-1 lg:flex-none relative group">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors pointer-events-none">
                              <MapPin size={18} />
                         </div>
                         <input
                            type="text"
                            placeholder="State Region"
                            className="input h-14 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest w-full lg:w-40 border-none shadow-sm rounded-2xl"
                            value={stateFilter}
                            onChange={(e) => setStateFilter(e.target.value)}
                         />
                    </div>
                    
                    <div className="flex-1 lg:flex-none relative group">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors pointer-events-none">
                              <Target size={18} />
                         </div>
                         <select
                            className="input h-14 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest w-full lg:w-56 border-none shadow-sm rounded-2xl cursor-pointer"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            title="Filter Type"
                         >
                            <option value="ALL">Universal Core Types</option>
                            {institutionTypes.map(type => (
                                <option key={type} value={type}>{type.replace('_', ' ')}</option>
                            ))}
                         </select>
                    </div>

                    <div className="flex items-center gap-3">
                        {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="h-14 bg-white border border-dashed border-secondary-300 text-[10px] font-black uppercase tracking-[0.2em] px-8 rounded-2xl hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                            >
                                Bulk Target Assign
                            </button>
                        )}
                        
                        <div className="flex items-center gap-3 h-14 px-6 bg-white border border-secondary-200/60 rounded-2xl shadow-sm hover:border-primary-500 transition-all cursor-pointer group">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-500 transition-all cursor-pointer"
                                onChange={handleSelectAll}
                                checked={institutions.length > 0 && selectedIds.size === institutions.length}
                            />
                            <span className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] group-hover:text-primary-600 transition-colors">Select Page Matrix</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Grid Topology */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full py-40 flex flex-col items-center">
                        <div className="relative">
                             <div className="w-24 h-24 rounded-[2.5rem] border-[6px] border-secondary-100 border-t-indigo-600 animate-spin" />
                             <div className="absolute inset-0 flex items-center justify-center">
                                  <GraduationCap size={32} className="text-secondary-300 animate-pulse" />
                             </div>
                        </div>
                        <p className="mt-10 text-[11px] font-black uppercase tracking-[0.4em] text-secondary-400 animate-pulse">Syncing institutional database...</p>
                    </div>
                ) : institutions.length === 0 ? (
                    <div className="col-span-full py-40 bg-white rounded-[4rem] border-2 border-dashed border-secondary-200 text-center shadow-inner group">
                        <div className="w-32 h-32 bg-secondary-50 text-secondary-200 rounded-[3.5rem] flex items-center justify-center mx-auto mb-10 rotate-12 group-hover:rotate-0 transition-transform duration-1000 border border-secondary-100">
                             <GraduationCap size={64} strokeWidth={1} />
                        </div>
                        <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight">Zero Registry Nodes</h3>
                        <p className="text-secondary-400 text-[11px] font-black uppercase tracking-widest max-w-sm mx-auto mt-3 leading-relaxed opacity-60">System is ready for onboarding. Deploy institution profiles to initialize the relationship matrix.</p>
                        <button onClick={() => router.push('/dashboard/institutions/new')} className="mt-12 px-12 py-4 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-1">Onboard Institution</button>
                    </div>
                ) : (
                    institutions.map((institution, i) => (
                        <motion.div
                            key={institution.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className={`group crm-card p-0 overflow-hidden relative transition-all duration-700 hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-3 border-2 ${selectedIds.has(institution.id) ? 'bg-indigo-50/20 border-indigo-400 ring-4 ring-indigo-50/50' : 'bg-white border-transparent'}`}
                        >
                            {/* Selection Anchor */}
                            <div className="absolute top-6 right-6 z-20">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-lg border-secondary-200 text-indigo-600 focus:ring-indigo-500 transition-transform group-hover:scale-110 shadow-sm"
                                    checked={selectedIds.has(institution.id)}
                                    onChange={() => handleSelect(institution.id)}
                                />
                            </div>

                            <div className="p-8 pb-4 relative z-10">
                                <div className="flex items-start gap-5 mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-white border-2 border-secondary-100 shadow-xl shadow-secondary-100/30 p-2.5 shrink-0 group-hover:scale-105 group-hover:rotate-3 group-hover:border-indigo-200 transition-all duration-500">
                                        {institution.logo ? (
                                            <Image src={institution.logo} alt={institution.name} width={60} height={60} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full bg-secondary-50 rounded-xl flex items-center justify-center">
                                                <Building2 className="text-secondary-300 group-hover:text-indigo-500 transition-colors" size={28} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 pr-6 pt-1">
                                        <h3 className="text-base font-black text-secondary-950 uppercase tracking-tight truncate leading-none mb-2 group-hover:text-indigo-700 transition-colors italic" title={institution.name}>
                                            {institution.name}
                                        </h3>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg uppercase tracking-widest">{institution.code}</span>
                                            <span className="text-[9px] font-black text-secondary-400 uppercase tracking-widest opacity-60">
                                                {institution.type?.replace('_', ' ') || 'ENTITY MODEL'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {institution.assignedTo && (
                                        <div className="flex items-center justify-between p-4 bg-secondary-50/50 rounded-2xl border border-secondary-100/50 group-hover:bg-indigo-50/50 group-hover:border-indigo-100/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white border-2 border-secondary-200 flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm uppercase shrink-0">
                                                    {institution.assignedTo.email[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[8px] font-black text-secondary-400 uppercase tracking-[0.2em] leading-none mb-1">Controller Assigned</p>
                                                    <p className="text-[11px] font-black text-secondary-900 truncate uppercase tracking-tight">
                                                        {institution.assignedTo.customerProfile?.name || institution.assignedTo.email.split('@')[0]}
                                                    </p>
                                                </div>
                                            </div>
                                            <ShieldCheck size={16} className="text-emerald-500 opacity-40 shrink-0" />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white border border-secondary-100 rounded-2xl text-center group-hover:border-indigo-100 transition-all shadow-sm">
                                            <p className="text-lg font-black text-secondary-950 leading-none tabular-nums mb-1">{institution._count?.customers || 0}</p>
                                            <p className="text-[9px] font-black text-secondary-400 uppercase tracking-[0.2em]">Learners</p>
                                        </div>
                                        <div className="p-4 bg-white border border-secondary-100 rounded-2xl text-center group-hover:border-purple-100 transition-all shadow-sm">
                                            <p className="text-lg font-black text-secondary-950 leading-none tabular-nums mb-1">{institution._count?.subscriptions || 0}</p>
                                            <p className="text-[9px] font-black text-secondary-400 uppercase tracking-[0.2em]">Contracts</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 px-2 py-2">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100 transition-transform group-hover:scale-110">
                                             <MapPin size={14} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                             <p className="text-[8px] font-black text-secondary-300 uppercase tracking-widest leading-none mb-1">Deployment Zone</p>
                                             <p className="text-[10px] font-black text-secondary-700 truncate uppercase tracking-tight italic">
                                                 {institution.city}, {institution.state}
                                             </p>
                                        </div>
                                        <div className="flex-1 text-right">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                                 <Zap size={8} /> Verified Node
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Matrix Operation Foot */}
                            <div className="bg-secondary-50/30 px-8 py-6 border-t border-secondary-100/60 mt-4 flex items-center justify-between gap-4 group-hover:bg-white transition-colors duration-500">
                                <div className="flex items-center gap-2">
                                    <CRMRowAction
                                        href={`/dashboard/institutions/${institution.id}`}
                                        title="System Sync"
                                        className="bg-white shadow-sm"
                                    >
                                        <Eye size={16} />
                                    </CRMRowAction>
                                    <CRMRowAction
                                        onClick={() => handleDelete(institution.id)}
                                        variant="danger"
                                        title="Purge Node"
                                        className="bg-white shadow-sm"
                                    >
                                        <Trash2 size={16} />
                                    </CRMRowAction>
                                </div>
                                <Link
                                    href={`/dashboard/institutions/${institution.id}`}
                                    className="flex items-center gap-3 bg-secondary-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-secondary-100 hover:bg-black transition-all hover:gap-4 group/btn shrink-0"
                                >
                                    Deep Intel Profile
                                    <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Pagination Logistics Matrix */}
            <AnimatePresence>
                {pagination.totalPages > 1 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-secondary-950 text-white p-6 px-10 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-secondary-900 mt-12"
                    >
                        <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                  <GraduationCap size={20} className="text-secondary-400" />
                             </div>
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-400">
                                Showing <span className="text-white">{Math.max(1, (pagination.page - 1) * pagination.limit + 1)}</span> 
                                <span className="mx-2">—</span>
                                <span className="text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> 
                                <span className="mx-2">of</span> 
                                <span className="text-white">{pagination.total} REGISTRY NODES</span>
                             </p>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <button
                                className="flex items-center gap-2 text-[10px] font-black text-secondary-500 hover:text-white disabled:opacity-30 uppercase tracking-[0.2em] transition-all group"
                                disabled={pagination.page === 1}
                                onClick={() => fetchInstitutions(pagination.page - 1)}
                            >
                                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                Previous Phase
                            </button>
                            
                            <div className="flex items-center gap-3 bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
                                <span className="text-xs font-black text-white">{pagination.page}</span>
                                <div className="w-px h-3 bg-white/10 mx-1" />
                                <span className="text-[10px] font-black text-secondary-500 uppercase">{pagination.totalPages} MAX</span>
                            </div>
                            
                            <button
                                className="flex items-center gap-2 text-[10px] font-black text-secondary-500 hover:text-white disabled:opacity-30 uppercase tracking-[0.2em] transition-all group"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => fetchInstitutions(pagination.page + 1)}
                            >
                                Next Phase
                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bulk Resource Reassignment Modal */}
            <CRMModal
                open={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                title="Institutional Resource Reassignment"
                subtitle={selectedIds.size > 0
                    ? `Executing target migration for ${selectedIds.size} manually isolated entity nodes.`
                    : "Initializing mass migration logic for ALL nodes matching the current operational filters."}
            >
                <div className="space-y-8 py-4">
                    <div className="bg-secondary-900 p-6 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
                         <div className="absolute right-0 top-0 p-8 opacity-5">
                              <Target size={100} className="text-white" />
                         </div>
                         <div className="relative z-10">
                              <label className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em] mb-4 block px-1">Designated Controller Migration</label>
                              <div className="relative group">
                                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 group-focus-within:text-white transition-colors">
                                        <Users size={20} />
                                   </div>
                                   <select
                                        className="input w-full h-14 pl-12 bg-white/5 border-white/10 text-white font-black text-sm uppercase tracking-tight focus:bg-white/10 focus:ring-primary-500/20 cursor-pointer"
                                        value={assignTargetId}
                                        onChange={(e) => setAssignTargetId(e.target.value)}
                                        title="Identity Selection"
                                   >
                                        <option value="" className="text-secondary-900 italic">Select Targeted Controller Identity…</option>
                                        {executives.map(ex => (
                                            <option key={ex.id} value={ex.id} className="text-secondary-900">
                                                {ex.email.toUpperCase()} [{ex.role}]
                                            </option>
                                        ))}
                                   </select>
                              </div>
                         </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-secondary-100">
                        <button
                            onClick={() => setShowBulkModal(false)}
                            className="flex-1 px-4 py-4 rounded-2xl border-2 border-secondary-200 text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 hover:bg-secondary-50 transition-all font-mono"
                        >
                            Abandon
                        </button>
                        <button
                            onClick={handleBulkAssign}
                            disabled={actionLoading || !assignTargetId}
                            className="flex-1 bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all hover:-translate-y-1 flex items-center justify-center gap-3 group"
                        >
                            {actionLoading ? 'Synchronizing...' : (
                                <>Initiate Migration <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </div>
                </div>
            </CRMModal>
        </div>
    );
}
