'use client';

import { useState, useEffect } from 'react';
import PublicLayout from '@/components/PublicLayout';
import Link from 'next/link';
import { Search, ArrowRight, Book } from 'lucide-react';

export default function JournalsListPage() {
    const [journals, setJournals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchJournals();
    }, []);

    const fetchJournals = async (term = '') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/public/journals?search=${term}`);
            if (res.ok) setJournals(await res.json());
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchJournals(search);
    };

    return (
        <PublicLayout>
            <div className="bg-secondary-900 text-white py-20">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h1 className="text-5xl font-black mb-6 tracking-tight">Discover Research</h1>
                    <p className="text-xl text-secondary-400 mb-8 max-w-2xl mx-auto">Access peer-reviewed journals across various disciplines. Submit your manuscript or browse the latest issues.</p>
                    <form onSubmit={handleSearch} className="max-w-lg mx-auto relative">
                        <Search className="absolute left-4 top-4 text-secondary-400" />
                        <input
                            className="w-full pl-12 pr-4 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-secondary-400 focus:outline-none focus:bg-white/20 transition-all backdrop-blur-sm"
                            placeholder="Find journals by name or ISSN..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </form>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-16">
                <h2 className="text-2xl font-black text-secondary-900 mb-8">Active Journals</h2>

                {loading ? (
                    <div className="text-center py-20 text-secondary-400">Loading journals...</div>
                ) : journals.length === 0 ? (
                    <div className="text-center py-20 text-secondary-400">No journals found matching your search.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {journals.map(journal => (
                            <Link key={journal.id} href={`/journals/${journal.id}`} className="group bg-white rounded-3xl border border-secondary-200 p-8 hover:shadow-xl hover:border-primary-200 transition-all duration-300">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform">
                                    <Book size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">{journal.name}</h3>
                                <div className="space-y-1 text-sm text-secondary-500 mb-6">
                                    <p>ISSN: <span className="font-mono text-secondary-700">{journal.issnOnline || journal.issnPrint || 'N/A'}</span></p>
                                    <p>Subject: {journal.subjectCategory || 'Multidisciplinary'}</p>
                                    <p>{journal.frequency || 'Monthly'}</p>
                                </div>
                                <div className="flex items-center gap-2 text-primary-600 font-bold text-sm">
                                    Read Journal <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}
