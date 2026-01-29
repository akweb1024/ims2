'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

export default function AgencyListPage() {
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
        <DashboardLayout userRole="ADMIN">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Agency Partners</h1>
                        <p className="text-secondary-500">Manage external agencies and their performance.</p>
                    </div>
                    <Link href="/dashboard/crm/agencies/new" className="btn btn-primary">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Agency
                    </Link>
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && (
                    <div className="bg-primary-50 border border-primary-200 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
                        <div className="flex items-center space-x-3">
                            <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                {selectedIds.size}
                            </span>
                            <span className="font-medium text-primary-900">Agencies Selected</span>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="btn btn-secondary bg-white text-secondary-600 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={actionLoading}
                                className="btn bg-red-600 text-white hover:bg-red-700 text-sm"
                            >
                                {actionLoading ? 'Deleting...' : 'Bulk Delete'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Search & Filter */}
                <div className="card-premium p-4">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search agencies by name, email, or organization..."
                            className="input pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="selectAll"
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            onChange={handleSelectAll}
                            checked={agencies.length > 0 && selectedIds.size === agencies.length}
                        />
                        <label htmlFor="selectAll" className="text-sm text-secondary-600 font-medium cursor-pointer">
                            Select All
                        </label>
                    </div>
                </div>

                {/* List */}
                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="text-center py-10 text-secondary-500">Loading agencies...</div>
                    ) : agencies.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-secondary-200">
                            <p className="text-secondary-500">No agencies found.</p>
                        </div>
                    ) : (
                        agencies.map((agency) => (
                            <div key={agency.id} className={`card-premium p-6 hover:shadow-lg transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${selectedIds.has(agency.id) ? 'ring-2 ring-primary-500 bg-primary-50/10' : ''}`}>
                                <div className="flex items-start gap-4 flex-1">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-1"
                                        checked={selectedIds.has(agency.id)}
                                        onChange={() => handleSelect(agency.id)}
                                    />
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-secondary-900">{agency.name}</h3>
                                            {agency.organizationName && (
                                                <span className="badge badge-secondary">{agency.organizationName}</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-secondary-500 mt-1 space-x-4">
                                            <span>{agency.primaryEmail}</span>
                                            <span>{agency.primaryPhone}</span>
                                        </div>
                                        {agency.agencyDetails && (
                                            <div className="text-xs text-secondary-400 mt-2 flex items-center gap-4">
                                                <span>Discount: {agency.agencyDetails.discountRate}%</span>
                                                <span>Territory: {agency.agencyDetails.territory || 'N/A'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end md:self-center">
                                    <Link
                                        href={`/dashboard/crm/agencies/${agency.id}`}
                                        className="btn btn-secondary text-sm"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(agency.id)}
                                        className="btn bg-danger-50 text-danger-600 hover:bg-danger-100 border-danger-100 text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
