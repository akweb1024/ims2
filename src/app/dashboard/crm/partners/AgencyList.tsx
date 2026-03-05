'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Trash2, Edit, ExternalLink, Mail, Phone, MapPin, TrendingUp, Users, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
            setSelectedIds(new Set()); // Clear selection on fetch
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900 flex items-center gap-3">
                        <Users className="text-primary-500" size={24} />
                        Agency Partners
                    </h2>
                    <p className="text-secondary-500 text-sm">Manage external agencies and their performance.</p>
                </div>
                <Link href="/dashboard/crm/agencies/new" className="btn btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    Add New Agency
                </Link>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-primary-50 border border-primary-200 p-4 rounded-2xl flex items-center justify-between shadow-sm ring-1 ring-primary-100">
                    <div className="flex items-center space-x-3">
                        <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">
                            {selectedIds.size}
                        </span>
                        <span className="font-black text-primary-900 tracking-tight">Agencies Selected</span>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="btn btn-secondary bg-white text-secondary-600 text-sm font-black"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={actionLoading}
                            className="btn bg-red-600 text-white hover:bg-red-700 text-sm font-black shadow-lg shadow-red-100"
                        >
                            {actionLoading ? 'Deleting...' : 'Bulk Delete'}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Search & Filter */}
            <div className="card-premium p-1.5 shadow-sm border border-secondary-200 flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search agencies by name, email, or organization..."
                        className="w-full bg-transparent pl-12 pr-4 py-3 focus:outline-none font-bold text-secondary-700 placeholder-secondary-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 pl-2">
                <input
                    type="checkbox"
                    id="selectAll"
                    className="rounded-lg border-gray-300 text-primary-600 focus:ring-primary-500 w-5 h-5 transition-all"
                    onChange={handleSelectAll}
                    checked={agencies.length > 0 && selectedIds.size === agencies.length}
                />
                <label htmlFor="selectAll" className="text-sm text-secondary-500 font-black cursor-pointer uppercase tracking-widest">
                    Select All Partners
                </label>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                        <p className="mt-4 text-secondary-500 font-black">Loading agencies...</p>
                    </div>
                ) : agencies.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-secondary-100 shadow-sm border-dashed p-12">
                         <Users className="mx-auto text-secondary-200 mb-4" size={48} />
                        <h3 className="text-xl font-black text-secondary-900 mb-2">No Agencies Found</h3>
                        <p className="text-secondary-500 text-sm max-w-xs mx-auto">Start building your network by adding your first agency partner.</p>
                    </div>
                ) : (
                    agencies.map((agency) => (
                        <div key={agency.id} className={`card-premium p-6 hover:shadow-xl transition-all border border-transparent hover:border-primary-100 flex flex-col justify-between group h-full relative ${selectedIds.has(agency.id) ? 'ring-2 ring-primary-500 bg-primary-50/20' : ''}`}>
                            <div className="flex items-start gap-4">
                                <input
                                    type="checkbox"
                                    className="rounded-md border-gray-300 text-primary-600 focus:ring-primary-500 w-5 h-5 mt-1 transition-all"
                                    checked={selectedIds.has(agency.id)}
                                    onChange={() => handleSelect(agency.id)}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-black text-secondary-900 truncate">{agency.name}</h3>
                                        <span className="px-3 py-1 bg-secondary-100 text-secondary-700 text-[10px] font-black rounded-full uppercase tracking-tighter shrink-0 border border-secondary-200 shadow-inner">
                                            {agency.organizationName || 'Individual'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                                        <div className="flex items-center gap-2 text-sm text-secondary-500 font-bold overflow-hidden">
                                            <Mail size={14} className="text-secondary-400 shrink-0" />
                                            <span className="truncate">{agency.primaryEmail}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-secondary-500 font-bold">
                                            <Phone size={14} className="text-secondary-400 shrink-0" />
                                            <span className="truncate">{agency.primaryPhone}</span>
                                        </div>
                                    </div>
                                    {agency.agencyDetails && (
                                        <div className="mt-6 flex items-center gap-4 pt-4 border-t border-secondary-50">
                                            <div className="bg-primary-50 p-2 rounded-xl border border-primary-100/50 flex items-center gap-2">
                                                <TrendingUp className="text-primary-500" size={14} />
                                                <span className="text-xs font-black text-primary-700 uppercase tracking-tight">{agency.agencyDetails.discountTier || 'GOLD'} - {agency.agencyDetails.discountRate}%</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-secondary-500 bg-secondary-50/50 p-2 rounded-xl border border-secondary-100/30">
                                                 <MapPin size={14} className="text-secondary-400" />
                                                 <span className="text-xs font-bold uppercase tracking-tight truncate max-w-[100px]">{agency.agencyDetails.territory || 'Universal'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-3 w-full">
                                <Link
                                    href={`/dashboard/crm/agencies/${agency.id}`}
                                    className="flex-1 btn btn-secondary text-xs font-black py-2 shadow-sm uppercase tracking-widest border-secondary-200"
                                >
                                    <Edit size={14} className="inline mr-2" />
                                    Configure
                                </Link>
                                <button
                                    onClick={() => handleDelete(agency.id)}
                                    className="px-4 py-2 rounded-xl bg-danger-50 text-danger-600 hover:bg-danger-100 transition-all border border-danger-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <Link
                                    href={`/dashboard/crm/agencies/${agency.id}`}
                                    className="px-4 py-2 rounded-xl bg-secondary-900 text-white hover:bg-black transition-all shadow-lg"
                                >
                                    <ExternalLink size={16} />
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
