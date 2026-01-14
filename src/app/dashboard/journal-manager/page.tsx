'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface DashboardMetrics {
    statusCounts: Record<string, number>;
    pendingPlagiarism: number;
    pendingQuality: number;
    recentManuscripts: any[];
    avgProcessingTime: number;
    teamPerformance: {
        plagiarism: any[];
        quality: any[];
    };
}

export default function JournalManagerDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [selectedJournal, setSelectedJournal] = useState<string>('');
    const [journals, setJournals] = useState<any[]>([]);

    useEffect(() => {
        fetchJournals();
    }, []);

    useEffect(() => {
        if (selectedJournal) {
            fetchDashboardMetrics();
        }
    }, [selectedJournal]);

    const fetchJournals = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/journals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setJournals(data);
                if (data.length > 0) {
                    setSelectedJournal(data[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching journals:', error);
        }
    };

    const fetchDashboardMetrics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = selectedJournal
                ? `/api/manuscripts/dashboard?journalId=${selectedJournal}`
                : '/api/manuscripts/dashboard';

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
            }
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'SUBMITTED': 'bg-blue-100 text-blue-700',
            'PLAGIARISM_CHECK': 'bg-yellow-100 text-yellow-700',
            'UNDER_REVIEW': 'bg-purple-100 text-purple-700',
            'QUALITY_CHECK': 'bg-orange-100 text-orange-700',
            'ACCEPTED': 'bg-green-100 text-green-700',
            'PUBLISHED': 'bg-emerald-100 text-emerald-700',
            'REJECTED': 'bg-red-100 text-red-700',
            'REVISION_REQUIRED': 'bg-amber-100 text-amber-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    if (loading && !metrics) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Journal Manager Dashboard</h1>
                        <p className="text-secondary-600">Manuscript workflow and team performance</p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={selectedJournal}
                            onChange={(e) => setSelectedJournal(e.target.value)}
                            className="input w-64"
                        >
                            <option value="">All Journals</option>
                            {journals.map(journal => (
                                <option key={journal.id} value={journal.id}>
                                    {journal.name}
                                </option>
                            ))}
                        </select>
                        <Link href="/dashboard/manuscripts/new" className="btn btn-primary">
                            + New Manuscript
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-secondary-500 text-sm font-bold uppercase">Pending Plagiarism</span>
                            <span className="text-3xl">🔍</span>
                        </div>
                        <p className="text-4xl font-bold text-secondary-900">{metrics?.pendingPlagiarism || 0}</p>
                        <Link href="/dashboard/plagiarism" className="text-primary-600 text-sm font-medium hover:underline mt-2 inline-block">
                            View Queue →
                        </Link>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-secondary-500 text-sm font-bold uppercase">Pending Quality</span>
                            <span className="text-3xl">✅</span>
                        </div>
                        <p className="text-4xl font-bold text-secondary-900">{metrics?.pendingQuality || 0}</p>
                        <Link href="/dashboard/quality" className="text-primary-600 text-sm font-medium hover:underline mt-2 inline-block">
                            View Queue →
                        </Link>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-secondary-500 text-sm font-bold uppercase">Avg Processing</span>
                            <span className="text-3xl">⏱️</span>
                        </div>
                        <p className="text-4xl font-bold text-secondary-900">{metrics?.avgProcessingTime || 0}</p>
                        <p className="text-secondary-500 text-sm mt-1">days</p>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-secondary-500 text-sm font-bold uppercase">Total Active</span>
                            <span className="text-3xl">📄</span>
                        </div>
                        <p className="text-4xl font-bold text-secondary-900">
                            {Object.values(metrics?.statusCounts || {}).reduce((a, b) => a + b, 0)}
                        </p>
                        <Link href="/dashboard/manuscripts" className="text-primary-600 text-sm font-medium hover:underline mt-2 inline-block">
                            View All →
                        </Link>
                    </div>
                </div>

                {/* Pipeline Overview */}
                <div className="card-premium p-6">
                    <h2 className="text-2xl font-bold text-secondary-900 mb-6">Manuscript Pipeline</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                        {Object.entries(metrics?.statusCounts || {}).map(([status, count]) => (
                            <div key={status} className="text-center">
                                <div className={`${getStatusColor(status)} rounded-xl p-4 mb-2`}>
                                    <p className="text-3xl font-bold">{count}</p>
                                </div>
                                <p className="text-xs font-medium text-secondary-600">
                                    {status.replace(/_/g, ' ')}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Manuscripts */}
                <div className="card-premium p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-secondary-900">Recent Submissions</h2>
                        <Link href="/dashboard/manuscripts" className="text-primary-600 font-medium hover:underline">
                            View All →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {metrics?.recentManuscripts?.slice(0, 5).map((manuscript) => (
                            <div key={manuscript.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors">
                                <div className="flex-1">
                                    <p className="font-bold text-secondary-900">{manuscript.title}</p>
                                    <p className="text-sm text-secondary-500">
                                        {manuscript.manuscriptId} • {manuscript.journal?.name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(manuscript.manuscriptStatus)}`}>
                                        {manuscript.manuscriptStatus?.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-sm text-secondary-500">
                                        {new Date(manuscript.submissionDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card-premium p-6">
                        <h2 className="text-xl font-bold text-secondary-900 mb-4">Plagiarism Team</h2>
                        <div className="space-y-3">
                            {metrics?.teamPerformance?.plagiarism?.map((stat: any) => (
                                <div key={stat.status} className="flex justify-between items-center">
                                    <span className="text-secondary-600">{stat.status}</span>
                                    <span className="font-bold text-secondary-900">{stat._count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card-premium p-6">
                        <h2 className="text-xl font-bold text-secondary-900 mb-4">Quality Team</h2>
                        <div className="space-y-3">
                            {metrics?.teamPerformance?.quality?.map((stat: any) => (
                                <div key={stat.status} className="flex justify-between items-center">
                                    <span className="text-secondary-600">{stat.status}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-secondary-900">{stat._count}</span>
                                        {stat._avg?.overallScore && (
                                            <span className="text-sm text-secondary-500">
                                                Avg: {stat._avg.overallScore.toFixed(1)}/10
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
