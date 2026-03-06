'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Plus, Trash2, Edit, ExternalLink, Mail, Phone, 
    MapPin, TrendingUp, Users, Search, Filter,
    Building2, LayoutGrid, ChevronRight, Target,
    Globe, ShieldCheck, Zap, Activity
} from 'lucide-react';
import { CRMSearchInput, CRMBadge, CRMRowAction } from '@/components/crm/CRMPageShell';

export default function AgencyList({ userRole }: { userRole: string }) {
    const router = useRouter();
    const [agencies, setAgencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);

    const fetchAgencies = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/agencies?search=${search}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAgencies(data);
            }
        } catch (error) {
            console.error('Error fetching agencies:', error);
        } finally {
            setLoading(false);
            setSelectedIds(new Set());
        }
    }, [search]);

    useEffect(() => {
        fetchAgencies();
    }, [fetchAgencies]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this agency? This action cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/agencies/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setAgencies(agencies.filter(a => a.id !== id));
            } else {
                alert('Failed to delete agency');
            }
        } catch (error) {
            console.error('Error deleting agency:', error);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected agencies? This action cannot be undone.`)) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/agencies/bulk-delete', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ids: Array.from(selectedIds)
                })
            });

            if (res.ok) {
                alert('Agencies deleted successfully');
                setSelectedIds(new Set());
                fetchAgencies();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete agencies');
            }
        } catch (error) {
            alert('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = agencies.map(a => a.id);
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

    return (
        <div className="space-y-8 pt-4">
            {/* Contextual Header */}
            <div className="bg-white p-6 rounded-[2rem] border border-secondary-100 shadow-xl shadow-secondary-100/50 flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                      <Users size={120} />
                 </div>
                 <div className="flex items-center gap-5 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-200">
                           <Users size={28} />
                      </div>
                      <div className="flex flex-col">
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-600 mb-1 leading-none">Resource Matrix</span>
                           <h2 className="text-xl font-black text-secondary-900 uppercase tracking-tight italic">Agency Partners</h2>
                           <p className="text-secondary-400 text-[10px] font-bold uppercase tracking-widest mt-1">Global network mobilization & performance tracking</p>
                      </div>
                 </div>
                 <Link href="/dashboard/crm/agencies/new" className="relative z-10 bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-100 hover:bg-primary-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95 group">
                    Add Partner Agency <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                </Link>
            </div>

            {/* Matrix Control Bar */}
            <div className="flex flex-col xl:flex-row gap-4 items-center bg-secondary-50/50 p-3 rounded-[1.8rem] border border-secondary-200/50 backdrop-blur-sm">
                <div className="w-full xl:flex-1 relative group">
                    <CRMSearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Scan agency matrix (name, email, identifier)..."
                        className="bg-white border-none shadow-sm h-14 pl-12 rounded-2xl font-medium"
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full xl:w-auto">
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border-2 border-primary-500 shadow-xl shadow-primary-100 animate-in zoom-in-95">
                            <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-secondary-900">{selectedIds.size} Selected</span>
                            </div>
                            <div className="w-px h-4 bg-secondary-200 mx-1" />
                            <button
                                onClick={handleBulkDelete}
                                disabled={actionLoading}
                                className="text-[10px] font-black text-danger-600 hover:text-danger-700 uppercase tracking-[0.2em] transition-colors"
                            >
                                {actionLoading ? 'Purging...' : 'Purge Selected'}
                            </button>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-white border border-secondary-200/60 rounded-2xl shadow-sm hover:border-secondary-300 transition-colors cursor-pointer group">
                        <input
                            type="checkbox"
                            id="selectAll"
                            className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 transition-all cursor-pointer"
                            onChange={handleSelectAll}
                            checked={agencies.length > 0 && selectedIds.size === agencies.length}
                        />
                        <label htmlFor="selectAll" className="text-[10px] font-black text-secondary-500 uppercase tracking-[0.1em] cursor-pointer group-hover:text-secondary-900 transition-colors">
                            Toggle Matrix Select
                        </label>
                    </div>
                </div>
            </div>

            {/* Results Topology */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-32 flex flex-col items-center">
                        <div className="relative">
                             <div className="w-20 h-20 rounded-[2rem] border-4 border-primary-100 border-t-primary-600 animate-spin" />
                             <div className="absolute inset-0 flex items-center justify-center">
                                  <Users size={24} className="text-primary-600 animate-pulse" />
                             </div>
                        </div>
                        <p className="mt-8 text-[11px] font-black uppercase tracking-[0.3em] text-secondary-400 animate-pulse">Synchronizing agency topology...</p>
                    </div>
                ) : agencies.length === 0 ? (
                    <div className="col-span-full py-32 bg-white rounded-[3rem] border-2 border-dashed border-secondary-200 text-center shadow-inner group">
                        <div className="w-24 h-24 bg-secondary-50 text-secondary-200 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 rotate-12 group-hover:rotate-0 transition-transform duration-700 border border-secondary-100 shadow-sm">
                             <Users size={48} strokeWidth={1} />
                        </div>
                        <h3 className="text-lg font-black text-secondary-900 uppercase tracking-tight">Zero Node Coverage</h3>
                        <p className="text-secondary-500 text-[11px] font-bold uppercase tracking-widest max-w-sm mx-auto mt-2 leading-relaxed opacity-60">System is ready for integration. Initiate nodal deployment by adding your first agency partner.</p>
                        <button onClick={() => router.push('/dashboard/crm/agencies/new')} className="mt-8 px-10 py-3.5 bg-secondary-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-secondary-200 hover:bg-black transition-all hover:-translate-y-1">Initialize First Connection</button>
                    </div>
                ) : (
                    agencies.map((agency) => (
                        <div key={agency.id} className={`group crm-card p-0 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary-100/50 hover:-translate-y-2 border-2 ${selectedIds.has(agency.id) ? 'bg-primary-50/20 border-primary-400 scale-[0.98]' : 'bg-white border-transparent'}`}>
                            {/* Profile Header */}
                            <div className="p-7">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-start gap-4">
                                         <div className="relative mt-1">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 transition-all cursor-pointer"
                                                checked={selectedIds.has(agency.id)}
                                                onChange={() => handleSelect(agency.id)}
                                            />
                                         </div>
                                         <div className="flex flex-col min-w-0">
                                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                   <h3 className="text-lg font-black text-secondary-950 uppercase tracking-tight truncate leading-tight group-hover:text-primary-700 transition-colors italic">{agency.name}</h3>
                                              </div>
                                              <CRMBadge variant="secondary" className="text-[9px] font-black uppercase tracking-[0.2em] w-fit bg-secondary-100 border-none text-secondary-500">
                                                   {agency.organizationName || 'Individual Entity'}
                                              </CRMBadge>
                                         </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-secondary-50 text-secondary-300 flex items-center justify-center border border-secondary-100 group-hover:bg-primary-50 group-hover:text-primary-500 group-hover:border-primary-100 transition-all duration-500 shrink-0">
                                         <Building2 size={24} strokeWidth={1.5} />
                                    </div>
                                </div>

                                <div className="space-y-3.5 pl-9">
                                    <div className="flex items-center gap-3 text-xs text-secondary-600 font-bold group-hover:text-secondary-900 transition-colors">
                                        <div className="w-8 h-8 rounded-xl bg-secondary-50 flex items-center justify-center text-secondary-300 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-secondary-100">
                                             <Mail size={14} />
                                        </div>
                                        <span className="truncate">{agency.primaryEmail}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-secondary-600 font-bold group-hover:text-secondary-900 transition-colors">
                                        <div className="w-8 h-8 rounded-xl bg-secondary-50 flex items-center justify-center text-secondary-300 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-secondary-100">
                                             <Phone size={14} />
                                        </div>
                                        <span className="font-mono">{agency.primaryPhone}</span>
                                    </div>
                                </div>

                                {agency.agencyDetails ? (
                                    <div className="mt-8 grid grid-cols-2 gap-3 pl-9">
                                        <div className="flex flex-col gap-2 p-3 bg-primary-50/50 rounded-2xl border border-primary-100/50 group-hover:bg-primary-50 transition-colors">
                                            <div className="flex items-center gap-1.5 text-primary-600 opacity-60">
                                                 <TrendingUp size={12} />
                                                 <span className="text-[9px] font-black uppercase tracking-widest">Growth Matrix</span>
                                            </div>
                                            <span className="text-[10px] font-black text-primary-800 uppercase tracking-tight">
                                                {agency.agencyDetails.discountTier || 'GOLD'} • {agency.agencyDetails.discountRate}%
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-2 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 group-hover:bg-indigo-50 transition-colors">
                                            <div className="flex items-center gap-1.5 text-indigo-600 opacity-60">
                                                 <MapPin size={12} />
                                                 <span className="text-[9px] font-black uppercase tracking-widest">Deployment</span>
                                            </div>
                                            <span className="text-[10px] font-black text-indigo-800 uppercase tracking-tight truncate">
                                                {agency.agencyDetails.territory || 'Universal Scope'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                     <div className="mt-8 pl-9 opacity-40">
                                          <div className="h-14 bg-secondary-50 rounded-2xl border border-dashed border-secondary-200 flex items-center justify-center">
                                               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary-400 italic">Static Profile Model</span>
                                          </div>
                                     </div>
                                )}
                            </div>

                            {/* Action Matrix */}
                            <div className="bg-secondary-50/50 px-7 py-5 border-t border-secondary-100/60 flex items-center justify-between group-hover:bg-white transition-colors duration-500">
                                <div className="flex items-center gap-2">
                                    <CRMRowAction
                                        href={`/dashboard/crm/agencies/${agency.id}`}
                                        title="System Configuration"
                                        className="bg-white"
                                    >
                                        <Edit size={16} />
                                    </CRMRowAction>
                                    <CRMRowAction
                                        onClick={() => handleDelete(agency.id)}
                                        variant="danger"
                                        title="Purge Operational Node"
                                        className="bg-white"
                                    >
                                        <Trash2 size={16} />
                                    </CRMRowAction>
                                </div>
                                <Link
                                    href={`/dashboard/crm/agencies/${agency.id}`}
                                    className="flex items-center gap-2.5 bg-secondary-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-secondary-100 hover:bg-black transition-all hover:gap-3 group/btn shrink-0"
                                >
                                    Full Intel Profiling
                                    <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
