'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ArrowLeft, FileText, CheckCircle, XCircle, Clock,
    Filter, Search, Eye, ThumbsUp, ThumbsDown
} from 'lucide-react';

export default function PaperManagementPage() {
    const params = useParams();
    const router = useRouter();
    const conferenceId = params.id as string;

    const [papers, setPapers] = useState<any[]>([]);
    const [conference, setConference] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDecision, setFilterDecision] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchData();
    }, [conferenceId]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [confRes, papersRes] = await Promise.all([
                fetch(`/api/conferences/${conferenceId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/conferences/${conferenceId}/papers`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (confRes.ok) setConference(await confRes.json());
            if (papersRes.ok) setPapers(await papersRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPapers = papers.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.authors.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || p.reviewStatus === filterStatus;
        const matchesDecision = filterDecision === 'all' || (p.finalDecision || 'PENDING') === filterDecision;
        return matchesSearch && matchesStatus && matchesDecision;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'REVIEWED': return 'bg-green-100 text-green-800';
            case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getDecisionColor = (decision: string | null) => {
        if (!decision) return 'bg-gray-100 text-gray-800';
        switch (decision) {
            case 'ACCEPTED': return 'bg-green-100 text-green-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            case 'REVISION_REQUIRED': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-8 text-center">Loading papers...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/dashboard/conferences/${conferenceId}`} className="btn btn-secondary btn-sm">
                            <ArrowLeft size={16} /> Back
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-secondary-900">Paper Management</h1>
                            <p className="text-secondary-500">{conference?.title}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="card-premium p-4 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search title, authors..."
                            className="input pl-10 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="input"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="REVIEWED">Reviewed</option>
                    </select>
                    <select
                        className="input"
                        value={filterDecision}
                        onChange={e => setFilterDecision(e.target.value)}
                    >
                        <option value="all">All Decisions</option>
                        <option value="PENDING">Pending Decision</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="REVISION_REQUIRED">Revision Required</option>
                    </select>
                </div>

                {/* Papers List */}
                <div className="card-premium overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-secondary-50 border-b border-secondary-200">
                            <tr>
                                <th className="text-left p-4 font-bold text-secondary-600">Title</th>
                                <th className="text-left p-4 font-bold text-secondary-600">Track</th>
                                <th className="text-left p-4 font-bold text-secondary-600">Authors</th>
                                <th className="text-left p-4 font-bold text-secondary-600">Review Status</th>
                                <th className="text-left p-4 font-bold text-secondary-600">Decision</th>
                                <th className="text-left p-4 font-bold text-secondary-600">Reviews</th>
                                <th className="text-right p-4 font-bold text-secondary-600">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPapers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-secondary-500">
                                        No papers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredPapers.map((paper) => (
                                    <tr key={paper.id} className="border-b border-secondary-100 hover:bg-secondary-50 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-secondary-900 line-clamp-1">{paper.title}</p>
                                            <p className="text-xs text-secondary-500">{paper.submissionType}</p>
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className="px-2 py-1 rounded text-xs text-white"
                                                style={{ backgroundColor: paper.track?.color || '#9ca3af' }}
                                            >
                                                {paper.track?.name || 'General'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-secondary-600 line-clamp-1">
                                            {paper.authors}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(paper.reviewStatus)}`}>
                                                {paper.reviewStatus.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getDecisionColor(paper.finalDecision)}`}>
                                                {paper.finalDecision || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="flex items-center gap-1">
                                                <FileText size={14} />
                                                {paper.reviews?.length || 0}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                href={`/dashboard/conferences/${conferenceId}/papers/${paper.id}`}
                                                className="btn btn-sm btn-primary inline-flex items-center gap-1"
                                            >
                                                <Eye size={14} /> Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
