'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import DataTransferActions from '@/components/dashboard/DataTransferActions';

export default function JournalsPage() {
    const [journals, setJournals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('CUSTOMER');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
    }, []);

    const fetchJournals = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                search,
                category: categoryFilter
            });

            const res = await fetch(`/api/journals?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setJournals(data);
            }
        } catch (error) {
            console.error('Error fetching journals:', error);
        } finally {
            setLoading(false);
        }
    }, [search, categoryFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchJournals();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchJournals]);

    const [selectedJournal, setSelectedJournal] = useState<any>(null);

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Journal Catalog</h1>
                        <p className="text-secondary-600 mt-1">Browse and manage available scientific journals and pricing plans</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {userRole === 'SUPER_ADMIN' && (
                            <>
                                <DataTransferActions type="journals" onSuccess={fetchJournals} />
                                <Link href="/dashboard/journals/new" className="btn btn-primary px-6">
                                    Add Journal
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="card-premium p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name or ISSN..."
                                className="input pl-10 w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Journal Grid */}
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {journals.map((journal) => (
                            <div key={journal.id} className="card-premium flex flex-col hover:shadow-xl transition-shadow border-t-4 border-primary-500">
                                <div className="flex-1 p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-lg font-bold text-secondary-900">{journal.name}</h3>
                                        <span className="badge badge-primary text-[10px] uppercase">{journal.frequency}</span>
                                    </div>
                                    <div className="space-y-2 text-sm text-secondary-600">
                                        <p><span className="font-semibold">ISSN (P):</span> {journal.issnPrint || 'N/A'}</p>
                                        <p><span className="font-semibold">ISSN (O):</span> {journal.issnOnline || 'N/A'}</p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {journal.subjectCategory?.split(',').map((cat: string) => (
                                                <span key={cat} className="px-2 py-0.5 bg-secondary-100 rounded-full text-xs">
                                                    {cat.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 bg-secondary-50 border-t border-secondary-100">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-secondary-500">Starting from</p>
                                            <p className="text-sm font-bold text-primary-600">
                                                ₹{Math.min(...journal.plans.map((p: any) => p.priceINR || 0)).toLocaleString()} / ${Math.min(...journal.plans.map((p: any) => p.priceUSD || 0)).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedJournal(journal)}
                                            className="btn btn-secondary py-1.5 px-4 text-sm"
                                        >
                                            View Plans
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Plans Modal */}
            {selectedJournal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-secondary-900">{selectedJournal.name}</h2>
                                <p className="text-secondary-500">Available Subscription Plans</p>
                            </div>
                            <button
                                onClick={() => setSelectedJournal(null)}
                                className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {selectedJournal.plans.map((plan: any) => (
                                <div key={plan.id} className="flex items-center justify-between p-6 bg-secondary-50 border border-secondary-200 rounded-2xl hover:border-primary-300 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-xl bg-white border border-secondary-200 flex items-center justify-center text-2xl">
                                            {plan.format === 'Online' ? '🌐' : plan.format === 'Print' ? '📖' : '💎'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-secondary-900 uppercase tracking-wide">{plan.format} - {plan.planType}</h4>
                                            <p className="text-xs text-secondary-500">Duration: {plan.duration} Months</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-primary-600">₹{plan.priceINR?.toLocaleString()} / ${plan.priceUSD?.toLocaleString()}</p>
                                        <p className="text-[10px] uppercase font-bold text-secondary-400 tracking-widest">Per Term</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-8 border-t border-secondary-100 flex justify-between items-center">
                            <div className="flex gap-3">
                                {userRole === 'SUPER_ADMIN' && (
                                    <>
                                        <Link
                                            href={`/dashboard/journals/${selectedJournal.id}/reviewers`}
                                            className="btn btn-secondary border-primary-200 text-primary-600 hover:bg-primary-50 px-6 py-2"
                                        >
                                            Manage Reviewers
                                        </Link>
                                        <Link
                                            href={`/dashboard/journals/${selectedJournal.id}/edit`}
                                            className="btn btn-secondary border-primary-200 text-primary-600 hover:bg-primary-50 px-6 py-2"
                                        >
                                            Edit Journal
                                        </Link>
                                        <button
                                            onClick={async () => {
                                                if (confirm('Are you sure you want to delete this journal? This will hide it from the catalog.')) {
                                                    const token = localStorage.getItem('token');
                                                    const res = await fetch(`/api/journals/${selectedJournal.id}`, {
                                                        method: 'DELETE',
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                    if (res.ok) {
                                                        setSelectedJournal(null);
                                                        fetchJournals();
                                                    }
                                                }
                                            }}
                                            className="btn btn-secondary border-danger-200 text-danger-600 hover:bg-danger-50 px-6 py-2"
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedJournal(null)}
                                className="btn btn-primary px-10"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
