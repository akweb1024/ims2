'use client';

import { useState, useEffect, use } from 'react';
import PublicLayout from '@/components/PublicLayout';
import Link from 'next/link';
import { Layers, Calendar, ChevronRight } from 'lucide-react';

export default function ArchivesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [volumes, setVolumes] = useState<any[]>([]);
    const [journal, setJournal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                // Fetch basic journal info for header
                const resJ = await fetch(`/api/public/journals/${id}`);
                if (resJ.ok) setJournal(await resJ.json());

                // Fetch Archives
                const resV = await fetch(`/api/public/journals/${id}/archives`);
                if (resV.ok) setVolumes(await resV.json());
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchInitial();
    }, [id]);

    if (loading) return <PublicLayout><div className="p-20 text-center">Loading Archives...</div></PublicLayout>;

    return (
        <PublicLayout>
            <div className="bg-secondary-50 border-b border-secondary-200 py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-secondary-500 mb-4">
                        <Link href="/journals" className="hover:text-primary-600">Journals</Link>
                        <ChevronRight size={14} />
                        <Link href={`/journals/${id}`} className="hover:text-primary-600">{journal?.name}</Link>
                        <ChevronRight size={14} />
                        <span>Archives</span>
                    </div>
                    <h1 className="text-4xl font-black text-secondary-900">Archives</h1>
                    <p className="text-secondary-500 mt-2">Browse past volumes and issues.</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-16 space-y-12">
                {volumes.map(vol => (
                    <div key={vol.id}>
                        <div className="flex items-baseline gap-4 border-b border-secondary-200 pb-4 mb-8">
                            <h2 className="text-2xl font-black text-secondary-900">Volume {vol.volumeNumber}</h2>
                            <span className="text-lg font-bold text-secondary-400">{vol.year}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {vol.issues.map((issue: any) => (
                                <Link key={issue.id} href={`/journals/${id}/issues/${issue.id}`} className="group bg-white rounded-2xl p-6 border border-secondary-200 hover:shadow-lg hover:border-primary-200 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-black text-secondary-900 group-hover:text-primary-600 transition-colors">Issue {issue.issueNumber}</h3>
                                            <p className="text-sm font-bold text-secondary-500">{issue.month}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                            <Layers size={16} />
                                        </div>
                                    </div>
                                    {issue.title && <p className="text-sm text-secondary-600 italic mb-4">"{issue.title}"</p>}
                                    <div className="flex items-center justify-between text-xs font-bold text-secondary-400 uppercase tracking-wider">
                                        <span>{issue._count.articles} Articles</span>
                                        <span className="group-hover:translate-x-1 transition-transform">View Issue &rarr;</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}

                {volumes.length === 0 && <div className="text-center text-secondary-400 italic">No published volumes found.</div>}
            </div>
        </PublicLayout>
    );
}
