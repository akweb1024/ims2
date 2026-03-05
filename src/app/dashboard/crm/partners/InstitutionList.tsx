'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Building2, Users, BookOpen, TrendingUp, Plus, Search, Edit, Trash2, Eye, MapPin, Globe, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InstitutionList({ userRole }: { userRole: string }) {
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
    const [agencies, setAgencies] = useState<any[]>([]);
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

        fetch('/api/agencies?limit=1000', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setAgencies(Array.isArray(data) ? data : (data.data || [])))
            .catch(err => console.error('Failed to fetch agencies', err));
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
        <div className="space-y-6">
            {/* Header & Stats Container */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900 flex items-center gap-3 tracking-tighter uppercase p-2 border-l-4 border-primary-500">
                        Institutional Governance
                    </h2>
                    <p className="text-secondary-500 text-sm mt-1">Manage global academic and enterprise partners.</p>
                </div>
                <Link
                    href="/dashboard/institutions/new"
                    className="btn btn-primary bg-secondary-900 hover:bg-black text-white px-8 py-3 rounded-2xl flex items-center gap-2 shadow-xl"
                >
                    <Plus size={20} />
                    Register Institution
                </Link>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Entities', value: pagination.total, icon: Building2, color: 'text-primary-500' },
                    { label: 'Active Learners', value: institutions.reduce((sum, inst) => sum + (inst._count?.customers || 0), 0), icon: Users, color: 'text-success-500' },
                    { label: 'Subscriptions', value: institutions.reduce((sum, inst) => sum + (inst._count?.subscriptions || 0), 0), icon: BookOpen, color: 'text-warning-500' },
                    { label: 'Engagement Rate', value: '88%', icon: TrendingUp, color: 'text-accent-500' },
                ].map((stat, i) => (
                    <div key={i} className="card-premium p-4 border border-secondary-100 shadow-sm shadow-secondary-100/50 flex items-center justify-between">
                        <div>
                             <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{stat.label}</p>
                             <p className="text-2xl font-black text-secondary-900 mt-1">{stat.value}</p>
                        </div>
                        <stat.icon className={stat.color} size={24} />
                    </div>
                ))}
            </div>

            {/* Advanced Filters */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-secondary-200/50 border border-secondary-100 ring-1 ring-secondary-50">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Universal Search..."
                            className="w-full bg-secondary-50/50 pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 ring-primary-500/20 font-bold text-secondary-700 placeholder-secondary-400 transition-all border border-secondary-100"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <input
                            type="text"
                            placeholder="State"
                            className="w-full bg-secondary-50/50 px-4 py-3 rounded-2xl focus:outline-none font-bold text-secondary-700 border border-secondary-100"
                            value={stateFilter}
                            onChange={(e) => setStateFilter(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <select
                            className="w-full bg-secondary-50/50 px-4 py-3 rounded-2xl focus:outline-none font-black text-secondary-700 uppercase p-2 text-xs border border-secondary-100"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">All Types</option>
                            {institutionTypes.map(type => (
                                <option key={type} value={type}>{type.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-4 flex gap-2">
                         {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="flex-1 bg-primary-100/50 text-primary-700 font-black uppercase text-xs tracking-widest py-3 rounded-2xl border border-primary-200 hover:bg-primary-100 transition-all shadow-sm shadow-primary-50"
                            >
                                🎯 Bulk Assign
                            </button>
                        )}
                        <label className="flex items-center gap-2 bg-secondary-50 px-4 py-3 rounded-2xl cursor-pointer hover:bg-secondary-100 transition-all border border-secondary-100">
                             <input
                                type="checkbox"
                                className="rounded-md border-gray-300 text-primary-600 focus:ring-primary-500 w-5 h-5 shadow-inner"
                                onChange={handleSelectAll}
                                checked={institutions.length > 0 && selectedIds.size === institutions.length}
                            />
                            <span className="text-[10px] font-black text-secondary-500 uppercase tracking-tighter">ALL</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Institutions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center flex flex-col items-center">
                         <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-primary-100 ring-2 ring-primary-50 shadow-inner"></div>
                            <div className="absolute inset-0 rounded-full border-t-4 border-primary-500 animate-spin"></div>
                        </div>
                        <p className="mt-6 text-secondary-500 font-black uppercase tracking-tighter text-sm">Synchronizing Data Matrix...</p>
                    </div>
                ) : institutions.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-secondary-200 flex flex-col items-center justify-center p-12 shadow-lg shadow-secondary-100">
                        <Building2 className="text-secondary-100 mb-6 scale-150 animate-pulse" size={64} />
                        <h3 className="text-2xl font-black text-secondary-900 mb-2">System Empty</h3>
                        <p className="text-secondary-500 text-sm italic">No institutional frameworks detected in current parameters.</p>
                    </div>
                ) : (
                    institutions.map((institution, i) => (
                        <motion.div
                            key={institution.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className={`card-premium group relative bg-white border border-secondary-100 shadow-xl shadow-secondary-200/20 overflow-hidden ${selectedIds.has(institution.id) ? 'ring-2 ring-primary-500 ring-offset-4' : ''}`}
                        >
                             <div className="absolute top-0 right-0 p-4 z-10">
                                <input
                                    type="checkbox"
                                    className="rounded-lg border-gray-300 text-primary-600 focus:ring-primary-500 w-6 h-6 shadow-sm cursor-pointer transition-all hover:scale-110"
                                    checked={selectedIds.has(institution.id)}
                                    onChange={() => handleSelect(institution.id)}
                                />
                             </div>

                             {/* Logo Section */}
                             <div className="h-2 w-full bg-gradient-to-r from-primary-400 via-primary-500 to-secondary-900 group-hover:h-3 transition-all duration-500"></div>
                             
                             <div className="p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-3xl bg-secondary-50 border border-secondary-100 p-2 overflow-hidden shadow-inner shrink-0 ring-4 ring-secondary-50/50">
                                        {institution.logo ? (
                                            <Image src={institution.logo} alt={institution.name} width={56} height={56} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full bg-primary-100 rounded-2xl flex items-center justify-center">
                                                <Building2 className="text-primary-600" size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg font-black text-secondary-900 truncate leading-tight mb-1 group-hover:text-primary-600 transition-colors" title={institution.name}>{institution.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-secondary-900 text-white text-[9px] font-black rounded-sm shadow-sm">{institution.code}</span>
                                            <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest truncate">{institution.type?.replace('_', ' ') || 'ENTITY'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Metadata */}
                                <div className="space-y-4">
                                     {institution.assignedTo && (
                                        <div className="flex items-center justify-between p-3 bg-secondary-50/50 rounded-2xl border border-secondary-100/50 shadow-inner">
                                            <div>
                                                 <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Controller</p>
                                                 <p className="text-xs font-black text-secondary-700 truncate">{institution.assignedTo.customerProfile?.name || institution.assignedTo.email.split('@')[0]}</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white border border-secondary-200 flex items-center justify-center text-[10px] font-black text-primary-500 shadow-sm">
                                                {institution.assignedTo.email[0].toUpperCase()}
                                            </div>
                                        </div>
                                     )}

                                     <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-white border border-secondary-100 rounded-2xl shadow-sm text-center group-hover:border-primary-100 transition-colors">
                                             <p className="text-xl font-black text-secondary-900">{institution._count?.customers || 0}</p>
                                             <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Enrollees</p>
                                        </div>
                                        <div className="p-3 bg-white border border-secondary-100 rounded-2xl shadow-sm text-center group-hover:border-warning-100 transition-colors">
                                             <p className="text-xl font-black text-secondary-900">{institution._count?.subscriptions || 0}</p>
                                             <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Contracts</p>
                                        </div>
                                     </div>

                                     <div className="flex items-center gap-2 px-2">
                                         <MapPin size={14} className="text-primary-500" />
                                         <p className="text-xs font-black text-secondary-600 truncate tracking-tight">{institution.city}, {institution.state}</p>
                                         <div className="h-1 w-1 rounded-full bg-secondary-300"></div>
                                         <div className="flex-1 flex justify-end">
                                             <span className="text-[9px] font-black text-success-600 uppercase">Verfied Status</span>
                                         </div>
                                     </div>
                                </div>

                                {/* Action Matrix */}
                                <div className="mt-8 grid grid-cols-3 gap-2">
                                    <Link
                                        href={`/dashboard/institutions/${institution.id}`}
                                        className="col-span-1 btn bg-secondary-100 hover:bg-secondary-200 transition-all text-secondary-700 p-2 rounded-xl flex items-center justify-center border border-secondary-200 shadow-sm"
                                    >
                                        <Eye size={16} />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(institution.id)}
                                        className="col-span-1 btn bg-danger-50 hover:bg-danger-100 transition-all text-danger-600 p-2 rounded-xl flex items-center justify-center border border-danger-100 shadow-sm shadow-danger-50"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                     <Link
                                        href={`/dashboard/institutions/${institution.id}`}
                                        className="col-span-1 bg-secondary-900 hover:bg-black transition-all text-white p-2 rounded-xl flex items-center justify-center shadow-lg hover:shadow-secondary-400/50"
                                    >
                                        <ChevronRight size={18} />
                                    </Link>
                                </div>
                             </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-secondary-100 shadow-xl shadow-secondary-100/50">
                    <p className="text-xs font-black text-secondary-500 uppercase tracking-widest">
                        Index {Math.max(1, (pagination.page - 1) * pagination.limit + 1)} — {Math.min(pagination.page * pagination.limit, pagination.total)} OF {pagination.total} ENTITIES
                    </p>
                    <div className="flex gap-2">
                        <button
                            className="bg-secondary-100 text-secondary-700 px-4 py-2 rounded-xl font-black text-xs uppercase disabled:opacity-50 transition-all border border-secondary-200 shadow-sm"
                            disabled={pagination.page === 1}
                            onClick={() => fetchInstitutions(pagination.page - 1)}
                        >
                            PREV
                        </button>
                        <div className="flex items-center gap-2 bg-secondary-50 px-3 rounded-xl border border-secondary-100">
                             <span className="text-xs font-black text-primary-600">{pagination.page}</span>
                             <span className="text-[10px] font-black text-secondary-300">/</span>
                             <span className="text-xs font-black text-secondary-500">{pagination.totalPages}</span>
                        </div>
                        <button
                            className="bg-secondary-900 text-white px-4 py-2 rounded-xl font-black text-xs uppercase disabled:opacity-50 transition-all shadow-md shadow-secondary-200 border border-secondary-900"
                            disabled={pagination.page === pagination.totalPages}
                            onClick={() => fetchInstitutions(pagination.page + 1)}
                        >
                            NEXT
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Assign Modal (Simplified view for component) */}
            {showBulkModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-secondary-900/40 backdrop-blur-md p-4 animate-fadeIn">
                    <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-secondary-200 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 to-secondary-900"></div>
                        <h3 className="text-2xl font-black text-secondary-900 mb-2 leading-tight">Institutional Reassignment</h3>
                        <p className="text-secondary-500 mb-8 font-bold text-sm leading-relaxed">
                            {selectedIds.size > 0
                                ? `Initiating reassignment for ${selectedIds.size} manually targeted entities.`
                                : "Executing mass reassignment for ALL entities matching current global filters."}
                        </p>

                        <div className="mb-8">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] mb-3 block">Target Controller</label>
                            <select
                                className="w-full bg-secondary-50 px-5 py-4 rounded-2xl focus:outline-none focus:ring-4 ring-primary-500/10 font-bold text-secondary-700 border border-secondary-100 transition-all appearance-none"
                                value={assignTargetId}
                                onChange={(e) => setAssignTargetId(e.target.value)}
                            >
                                <option value="">-- SELECT IDENTITY --</option>
                                {executives.map(ex => (
                                    <option key={ex.id} value={ex.id}>
                                        {ex.email} [{ex.role}]
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className="flex-1 px-6 py-4 rounded-2xl bg-secondary-50 text-secondary-500 font-black uppercase text-xs tracking-widest border border-secondary-100 hover:bg-secondary-100 transition-all"
                            >
                                ABORT
                            </button>
                            <button
                                onClick={handleBulkAssign}
                                disabled={actionLoading || !assignTargetId}
                                className="flex-[2] px-6 py-4 rounded-2xl bg-primary-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary-200 hover:bg-primary-700 disabled:opacity-50 transition-all"
                            >
                                {actionLoading ? 'PROCESSING...' : 'EXECUTE ASSIGNMENT'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
