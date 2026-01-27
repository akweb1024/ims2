'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

export default function AgencyListPage() {
    const router = useRouter();
    const [agencies, setAgencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchAgencies();
    }, [search]);

    const fetchAgencies = async () => {
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
        }
    };

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

    return (
        <DashboardLayout userRole="ADMIN"> {/* Adjusted to ADMIN or appropriate role */}
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
                            <div key={agency.id} className="card-premium p-6 hover:shadow-lg transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
