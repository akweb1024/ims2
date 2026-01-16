'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Search,
    Filter,
    Eye,
    Download,
    CheckCircle,
    Clock,
    XCircle,
    BookOpen
} from 'lucide-react';

export default function ArticlesPage() {
    const router = useRouter();
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    useEffect(() => {
        fetchArticles();
    }, [search, statusFilter]);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                search,
                status: statusFilter
            });

            const res = await fetch(`/api/articles?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setArticles(Array.isArray(data) ? data : []);
            } else {
                console.error('Failed to fetch articles');
            }
        } catch (error) {
            console.error('Network error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PUBLISHED': return 'bg-success-100 text-success-700 border-success-200';
            case 'ACCEPTED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'REJECTED': return 'bg-danger-100 text-danger-700 border-danger-200';
            case 'UNDER_REVIEW': return 'bg-warning-100 text-warning-700 border-warning-200';
            default: return 'bg-secondary-100 text-secondary-600 border-secondary-200';
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-3">
                            <span className="p-2 bg-primary-100 rounded-lg text-primary-600">
                                <FileText size={28} />
                            </span>
                            Articles Repository
                        </h1>
                        <p className="text-secondary-500 mt-1 ml-14">
                            Browse and manage all research articles and manuscripts.
                        </p>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="card-premium p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by title..."
                                className="input-premium pl-10 w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <select
                                    className="input-premium pl-10 w-full appearance-none cursor-pointer"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="SUBMITTED">Submitted</option>
                                    <option value="UNDER_REVIEW">Under Review</option>
                                    <option value="ACCEPTED">Accepted</option>
                                    <option value="PUBLISHED">Published</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Articles List */}
                <div className="card-premium overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead className="bg-secondary-50 border-b border-secondary-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Article Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Journal / Issue</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Dates</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase tracking-wider">Actions</th>
                                    0</tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                                <p className="text-secondary-500 font-medium">Loading articles...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : articles.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-50">
                                                <BookOpen size={48} className="text-secondary-300 mb-4" />
                                                <p className="text-secondary-900 font-bold text-lg">No articles found</p>
                                                <p className="text-secondary-500 text-sm">Try adjusting your search or filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    articles.map((article) => (
                                        <tr key={article.id} className="group hover:bg-secondary-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-secondary-900 text-sm line-clamp-2 md:w-96" title={article.title}>
                                                        {article.title}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-secondary-500">
                                                            {article.authors?.map((a: any) => a.name).join(', ') || 'Unknown Author'}
                                                        </span>
                                                        {article.type && (
                                                            <span className="text-[10px] font-mono bg-secondary-100 text-secondary-600 px-1.5 rounded">
                                                                {article.type}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-primary-700">
                                                        {article.journal?.name || 'Unknown Journal'}
                                                    </span>
                                                    {article.issue && (
                                                        <span className="text-[10px] text-secondary-500 mt-0.5">
                                                            Vol {article.issue.volumeId}, Issue {article.issue.issueNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(article.status)}`}>
                                                    {article.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-xs text-secondary-500">
                                                    <div className="flex items-center gap-2" title="Submission Date">
                                                        <Clock size={12} />
                                                        <FormattedDate date={article.submissionDate} />
                                                    </div>
                                                    {article.publicationDate && (
                                                        <div className="flex items-center gap-2 text-success-600 font-medium" title="Publication Date">
                                                            <CheckCircle size={12} />
                                                            <FormattedDate date={article.publicationDate} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 text-secondary-400">
                                                    {article.fileUrl && (
                                                        <a
                                                            href={article.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                                                            title="Download PDF"
                                                        >
                                                            <Download size={16} />
                                                        </a>
                                                    )}
                                                    <button className="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors" title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
