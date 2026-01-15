'use client';

import { useState, useEffect, use, useCallback } from 'react';
import PublicLayout from '@/components/PublicLayout';
import Link from 'next/link';
import { Book, Users, Layers, FileText, Calendar, ArrowUpRight } from 'lucide-react';

export default function JournalHomepage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [journal, setJournal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchJournal = useCallback(async () => {
        try {
            const res = await fetch(`/api/public/journals/${id}`);
            if (res.ok) setJournal(await res.json());
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, [id]);

    useEffect(() => {
        fetchJournal();
    }, [fetchJournal]);

    if (loading) return <PublicLayout><div className="p-20 text-center">Loading Journal...</div></PublicLayout>;
    if (!journal) return <PublicLayout><div className="p-20 text-center">Journal not found.</div></PublicLayout>;

    const latestIssue = journal.volumes?.[0]?.issues?.[0];

    return (
        <PublicLayout>
            {/* Hero */}
            <div className="bg-secondary-900 text-white pt-20 pb-24">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-block px-3 py-1 bg-primary-600 rounded-full text-xs font-bold uppercase tracking-widest mb-4">{journal.subjectCategory || 'Journal'}</div>
                        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">{journal.name}</h1>
                        <p className="text-xl text-secondary-400 mb-8">ISSN: {journal.issnOnline || journal.issnPrint}</p>
                        <div className="flex gap-4">
                            <Link href={`/journals/${id}/archives`} className="btn bg-white text-secondary-900 hover:bg-secondary-100 font-bold px-8 py-3 rounded-full">
                                Browse Archives
                            </Link>
                            <Link href="/register" className="btn btn-primary px-8 py-3 rounded-full flex items-center gap-2">
                                Submit Manuscript <ArrowUpRight size={18} />
                            </Link>
                        </div>
                    </div>
                    {latestIssue && (
                        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                            <h2 className="text-sm font-black uppercase tracking-widest text-primary-400 mb-6">Current Issue</h2>
                            <div className="mb-6">
                                <h3 className="text-3xl font-black mb-1">Volume {journal.volumes[0].volumeNumber}, Issue {latestIssue.issueNumber}</h3>
                                <p className="text-lg text-secondary-300">{latestIssue.month} {journal.volumes[0].year}</p>
                            </div>
                            <div className="space-y-4">
                                {latestIssue.articles.slice(0, 3).map((article: any) => (
                                    <Link key={article.id} href={`/journals/${id}/articles/${article.id}`} className="block group">
                                        <h4 className="font-bold text-lg leading-snug group-hover:text-primary-400 transition-colors">{article.title}</h4>
                                        <p className="text-sm text-secondary-400 mt-1">{article.authors.map((a: any) => a.name).join(', ')}</p>
                                    </Link>
                                ))}
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/10">
                                <Link href={`/journals/${id}/archives`} className="text-sm font-bold flex items-center gap-2 hover:text-primary-400 transition-colors">
                                    View Full Table of Contents <ArrowUpRight size={14} />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-20 grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Information */}
                <div className="lg:col-span-2 space-y-12">
                    <section>
                        <h2 className="text-2xl font-black text-secondary-900 mb-6 flex items-center gap-3">
                            <Book className="text-primary-600" /> About the Journal
                        </h2>
                        <div className="prose prose-lg text-secondary-600">
                            {/* Placeholder description as it's not in DB yet efficiently */}
                            <p>
                                {journal.name} is a peer-reviewed journal dedicated to the advancement of research in its field.
                                We publish high-quality original research, reviews, and short communications.
                                Our goal is to provide a platform for researchers to share their findings with a global audience.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-secondary-900 mb-6 flex items-center gap-3">
                            <Users className="text-primary-600" /> Editorial Board
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {journal.editorialBoard.map((member: any) => (
                                <div key={member.id} className="bg-secondary-50 rounded-2xl p-6 border border-secondary-100 flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-bold text-lg text-primary-600 shadow-sm">
                                        {member.name[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-secondary-900">{member.name}</h4>
                                        <p className="text-xs font-black uppercase text-primary-600 mb-1">{member.designation}</p>
                                        <p className="text-sm text-secondary-600 italic">{member.affiliation}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <div className="bg-secondary-50 rounded-3xl p-8 border border-secondary-200">
                        <h3 className="font-black text-secondary-900 mb-4">Journal Information</h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex justify-between">
                                <span className="text-secondary-500">Frequency</span>
                                <span className="font-bold">{journal.frequency}</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-secondary-500">Format</span>
                                <span className="font-bold">{journal.formatAvailable.split(',').join(', ')}</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-secondary-500">Language</span>
                                <span className="font-bold">English</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-secondary-50 rounded-3xl p-8 border border-secondary-200">
                        <h3 className="font-black text-secondary-900 mb-4">For Authors</h3>
                        <ul className="space-y-3">
                            <li><Link href="/register" className="block p-3 bg-white rounded-xl border border-secondary-200 font-bold hover:border-primary-500 transition-colors text-center text-sm">Submit Manuscript</Link></li>
                            <li><Link href="#" className="block p-3 bg-white rounded-xl border border-secondary-200 font-bold hover:border-primary-500 transition-colors text-center text-sm">Author Guidelines</Link></li>
                        </ul>
                    </div>
                </div>

            </div>
        </PublicLayout>
    );
}
