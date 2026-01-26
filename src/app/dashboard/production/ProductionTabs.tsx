'use client';

import { useState } from 'react';
import {
    BookOpen,
    FileText,
    Clock,
    CheckCircle2,
    DollarSign,
    Activity,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    AlertCircle
} from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

export default function ProductionTabs({ journals, articles }: { journals: any[], articles: any[] }) {
    const [activeTab, setActiveTab] = useState<'overview' | 'journals' | 'issues' | 'articles'>('overview');

    const stats = {
        totalJournals: journals.length,
        pendingArticles: articles.filter(a => a.status !== 'PUBLISHED').length,
        publishedThisMonth: articles.filter(a => a.status === 'PUBLISHED').length,
        totalAPCCollected: articles.reduce((acc, a) => acc + (a.apcPaymentStatus === 'PAID' ? (a.apcAmountINR || 0) : 0), 0)
    };

    return (
        <>
            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1.5 bg-secondary-100 rounded-2xl w-fit">
                {(['overview', 'journals', 'issues', 'articles'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all capitalize ${activeTab === tab ? 'bg-white text-primary-600 shadow-md transform scale-105' : 'text-secondary-500 hover:text-secondary-900 hover:bg-white/50'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Stats Grid */}
            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard icon={<BookOpen className="text-primary-600" />} label="Assigned Journals" value={stats.totalJournals} trend="+2 new" color="primary" />
                        <StatCard icon={<FileText className="text-warning-600" />} label="Manuscripts in Review" value={stats.pendingArticles} trend="Action needed" color="warning" />
                        <StatCard icon={<CheckCircle2 className="text-success-600" />} label="Published (MTD)" value={stats.publishedThisMonth} trend="On track" color="success" />
                        <StatCard icon={<DollarSign className="text-indigo-600" />} label="APC Collected (INR)" value={`₹${stats.totalAPCCollected.toLocaleString()}`} trend="Fixed Pricing" color="indigo" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Ongoing Production Cycles */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-secondary-900">Active Production Cycles</h3>
                                <button className="text-sm font-bold text-primary-600 hover:underline">View All</button>
                            </div>
                            <div className="space-y-4">
                                {journals.slice(0, 3).map((journal) => (
                                    <ProductionCard key={journal.id} journal={journal} />
                                ))}
                            </div>
                        </div>

                        {/* Recent Submissions */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-secondary-900">Recent Manuscripts</h3>
                            <div className="card-premium divide-y divide-secondary-100">
                                {articles.slice(0, 5).map((article) => (
                                    <div key={article.id} className="p-4 flex flex-col gap-1 hover:bg-secondary-50 transition-colors group cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-secondary-900 line-clamp-1 flex-1 group-hover:text-primary-600 transition-colors">{article.title}</h4>
                                            <span className="text-[10px] font-black uppercase text-secondary-400 ml-2 whitespace-nowrap"><FormattedDate date={article.submissionDate} /></span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs text-secondary-500 font-medium">{article.journal?.name}</p>
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${article.status === 'PUBLISHED' ? 'bg-success-100 text-success-700' : 'bg-primary-50 text-primary-600'}`}>
                                                {article.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Journals Tab */}
            {activeTab === 'journals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {journals.map((journal) => (
                        <div key={journal.id} className="card-premium p-8 group hover:-translate-y-2 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all">
                                    <BookOpen size={24} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Impact Factor</span>
                                    <span className="text-xl font-black text-secondary-900 italic">3.4+</span>
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-secondary-900 mb-2 leading-tight min-h-[3rem] line-clamp-2">{journal.name}</h3>
                            <p className="text-xs text-secondary-500 font-medium mb-6 uppercase tracking-wider">{journal.subjectCategory || 'Academic Journal'}</p>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between text-xs font-bold items-center">
                                    <span className="text-secondary-400 uppercase tracking-tighter">Current Issue Progress</span>
                                    <span className="text-primary-600">75%</span>
                                </div>
                                <div className="w-full h-2 bg-secondary-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-500 rounded-full w-3/4 shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-secondary-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-secondary-400 uppercase mb-1">APC (OA)</span>
                                    <span className="text-sm font-black text-success-600">₹{journal.apcOpenAccessINR || '0'} / ${journal.apcOpenAccessUSD || '0'}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-secondary-400 uppercase mb-1">Next Issue</span>
                                    <span className="text-sm font-black text-secondary-700">Feb 2026</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Articles / Manuscript Tab */}
            {activeTab === 'articles' && (
                <div className="card-premium overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 bg-secondary-50/30 flex md:flex-row flex-col justify-between items-center gap-4">
                        <h3 className="font-black text-secondary-900 flex items-center gap-2">
                            <FileText className="text-primary-600" /> Manuscript Inventory
                        </h3>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                                <input className="pl-9 pr-4 py-2 bg-white border border-secondary-200 rounded-xl text-xs font-medium focus:ring-2 ring-primary-500 outline-none w-64" placeholder="Search manuscripts..." />
                            </div>
                            <button className="p-2 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50">
                                <Filter size={16} className="text-secondary-600" />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Manuscript Title</th>
                                    <th>Journal</th>
                                    <th>Status</th>
                                    <th>APC Billing</th>
                                    <th>Publication Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {articles.map((article) => (
                                    <tr key={article.id}>
                                        <td className="max-w-xs">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900 line-clamp-1">{article.title}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase">{article.authors?.[0]?.name || 'Unknown Author'}</span>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-secondary">{article.journal?.name}</span></td>
                                        <td>
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter
                                                ${article.status === 'PUBLISHED' ? 'bg-success-100 text-success-700 shadow-sm shadow-success-100' :
                                                    article.status === 'UNDER_REVIEW' ? 'bg-primary-100 text-primary-700 shadow-sm shadow-primary-100' :
                                                        'bg-secondary-100 text-secondary-700'}`}>
                                                {article.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-black ${article.apcPaymentStatus === 'PAID' ? 'text-success-600' : 'text-danger-600'} uppercase tracking-widest`}>
                                                    {article.apcPaymentStatus || 'UNPAID'}
                                                </span>
                                                <span className="text-xs font-bold text-secondary-500">₹{article.apcAmountINR || '0'} / ${article.apcAmountUSD || '0'}</span>
                                            </div>
                                        </td>
                                        <td className="font-bold text-secondary-500">
                                            {article.publicationDate ? <FormattedDate date={article.publicationDate} /> : 'TBD'}
                                        </td>
                                        <td>
                                            <button className="p-2 hover:bg-secondary-100 rounded-xl transition-all">
                                                <ArrowUpRight size={18} className="text-primary-600" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}

function StatCard({ icon, label, value, trend, color }: any) {
    const colorClasses: any = {
        primary: 'border-primary-500 shadow-primary-50',
        warning: 'border-warning-500 shadow-warning-50',
        success: 'border-success-500 shadow-success-50',
        indigo: 'border-indigo-500 shadow-indigo-50',
    };

    return (
        <div className={`card-premium p-6 border-t-4 ${colorClasses[color]} bg-white hover:scale-105 transition-transform cursor-pointer overflow-hidden relative`}>
            <div className="absolute -right-4 -bottom-4 opacity-5 translate-y-2 group-hover:translate-y-0 transition-all">
                {icon}
            </div>
            <div className="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center mb-4">
                {icon}
            </div>
            <p className="text-3xl font-black text-secondary-900 mb-1">{value}</p>
            <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-3">{label}</h4>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-secondary-500 bg-secondary-50 w-fit px-2 py-0.5 rounded-lg">
                <Activity size={10} className="text-primary-500" /> {trend}
            </div>
        </div>
    );
}

function ProductionCard({ journal }: any) {
    return (
        <div className="card-premium p-6 flex items-center gap-6 group hover:border-primary-100 transition-all">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex flex-col items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all shrink-0">
                <BookOpen size={24} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-black text-secondary-900 group-hover:text-primary-600 transition-colors truncate pr-4">{journal.name}</h3>
                    <div className="flex gap-1 shrink-0">
                        <span className="bg-secondary-100 px-2 py-0.5 rounded text-[9px] font-black uppercase text-secondary-500">Vol 14</span>
                        <span className="bg-primary-50 px-2 py-0.5 rounded text-[9px] font-black uppercase text-primary-600">Issue 2</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-secondary-400 uppercase tracking-tighter h-5">
                    <span className="flex items-center gap-1"><Clock size={12} className="text-warning-500" /> 14 Days Remaining</span>
                    <span className="flex items-center gap-1"><FileText size={12} className="text-primary-500" /> 8/12 Manuscripts</span>
                    {journal.editor && <span className="flex items-center gap-1"><AlertCircle size={12} className="text-info-500" /> Editor: {journal.editor.name}</span>}
                </div>
                {/* Progress Bar */}
                <div className="mt-4 w-full h-1.5 bg-secondary-50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 w-2/3 group-hover:shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all"></div>
                </div>
            </div>
            <button className="w-10 h-10 rounded-xl bg-secondary-50 flex items-center justify-center text-secondary-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                <ChevronRight size={20} />
            </button>
        </div>
    );
}
