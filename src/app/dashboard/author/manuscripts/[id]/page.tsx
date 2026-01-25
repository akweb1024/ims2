'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, Clock, CheckCircle, FileText, Users, MessageSquare, AlertCircle, Upload } from 'lucide-react';

export default function ManuscriptDetail(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const router = useRouter();
    const [manuscript, setManuscript] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'revisions'>('overview');

    const fetchManuscript = useCallback(async () => {
        try {
            const res = await fetch(`/api/manuscripts/author`);
            if (res.ok) {
                const manuscripts = await res.json();
                const found = manuscripts.find((m: any) => m.id === params.id);
                setManuscript(found);
            }
        } catch (error) {
            console.error('Error fetching manuscript:', error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    const fetchTimeline = useCallback(async () => {
        try {
            const res = await fetch(`/api/manuscripts/${params.id}/timeline`);
            if (res.ok) {
                const data = await res.json();
                setTimeline(data.timeline || []);
            }
        } catch (error) {
            console.error('Error fetching timeline:', error);
        }
    }, [params.id]);

    useEffect(() => {
        fetchManuscript();
        fetchTimeline();
    }, [params.id, fetchManuscript, fetchTimeline]);

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'SUBMITTED': 'bg-blue-100 text-blue-700 border-blue-200',
            'UNDER_REVIEW': 'bg-purple-100 text-purple-700 border-purple-200',
            'REVISION_REQUIRED': 'bg-orange-100 text-orange-700 border-orange-200',
            'ACCEPTED': 'bg-green-100 text-green-700 border-green-200',
            'REJECTED': 'bg-red-100 text-red-700 border-red-200',
            'PUBLISHED': 'bg-emerald-100 text-emerald-700 border-emerald-200'
        };
        return colors[status] || 'bg-secondary-100 text-secondary-700 border-secondary-200';
    };

    const getTimelineIcon = (type: string) => {
        switch (type) {
            case 'status_change':
                return <CheckCircle className="w-5 h-5" />;
            case 'revision':
                return <Upload className="w-5 h-5" />;
            case 'communication':
                return <MessageSquare className="w-5 h-5" />;
            case 'plagiarism_check':
            case 'quality_check':
                return <AlertCircle className="w-5 h-5" />;
            default:
                return <Clock className="w-5 h-5" />;
        }
    };

    const getTimelineColor = (type: string) => {
        switch (type) {
            case 'status_change':
                return 'bg-blue-100 text-blue-700';
            case 'revision':
                return 'bg-purple-100 text-purple-700';
            case 'communication':
                return 'bg-green-100 text-green-700';
            case 'plagiarism_check':
            case 'quality_check':
                return 'bg-orange-100 text-orange-700';
            default:
                return 'bg-secondary-100 text-secondary-700';
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-6">
                    <div className="text-center py-12">Loading manuscript...</div>
                </div>
            </DashboardLayout>
        );
    }

    if (!manuscript) {
        return (
            <DashboardLayout>
                <div className="p-6">
                    <div className="text-center py-12">
                        <p className="text-secondary-600 mb-4">Manuscript not found</p>
                        <Link href="/dashboard/author" className="btn-primary">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-secondary-100 rounded-full transition-colors mt-1"
                    >
                        <ArrowLeft className="w-5 h-5 text-secondary-600" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-black text-secondary-900">{manuscript.title}</h1>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border ${getStatusColor(manuscript.manuscriptStatus)}`}>
                                {manuscript.manuscriptStatus.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-secondary-600">
                            <span className="font-medium">{manuscript.manuscriptId}</span>
                            <span>•</span>
                            <span>{manuscript.journal.name}</span>
                            <span>•</span>
                            <span>Submitted {new Date(manuscript.submissionDate).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {manuscript.manuscriptStatus === 'REVISION_REQUIRED' && (
                        <Link
                            href={`/dashboard/author/manuscripts/${manuscript.id}/revise`}
                            className="btn-primary"
                        >
                            Submit Revision
                        </Link>
                    )}
                </div>

                {/* Tabs */}
                <div className="border-b border-secondary-200">
                    <div className="flex gap-6">
                        {['overview', 'timeline', 'revisions'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`pb-3 px-1 font-bold text-sm capitalize transition-colors border-b-2 ${activeTab === tab
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-secondary-600 hover:text-secondary-900'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="card-premium p-6">
                                <h2 className="text-lg font-bold text-secondary-900 mb-4">Abstract</h2>
                                <p className="text-secondary-700 leading-relaxed">{manuscript.abstract}</p>
                            </div>

                            {manuscript.keywords && (
                                <div className="card-premium p-6">
                                    <h2 className="text-lg font-bold text-secondary-900 mb-4">Keywords</h2>
                                    <div className="flex flex-wrap gap-2">
                                        {manuscript.keywords.split(',').map((keyword: string, index: number) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                                            >
                                                {keyword.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="card-premium p-6">
                                <h2 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Authors
                                </h2>
                                <div className="space-y-3">
                                    {manuscript.authors.map((author: any) => (
                                        <div key={author.id} className="flex items-start gap-3 p-3 bg-secondary-50 rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-secondary-900">{author.name}</p>
                                                    {author.isCorresponding && (
                                                        <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-bold">
                                                            Corresponding
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-secondary-600">{author.email}</p>
                                                {author.affiliation && (
                                                    <p className="text-sm text-secondary-500 mt-1">{author.affiliation}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Status Info */}
                            <div className="card-premium p-6">
                                <h3 className="text-sm font-bold text-secondary-500 uppercase mb-4">Status Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-secondary-500 uppercase">Current Status</label>
                                        <p className="text-secondary-900 font-medium mt-1">
                                            {manuscript.manuscriptStatus.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-secondary-500 uppercase">Submission Date</label>
                                        <p className="text-secondary-900 font-medium mt-1">
                                            {new Date(manuscript.submissionDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {manuscript.acceptanceDate && (
                                        <div>
                                            <label className="text-xs font-bold text-secondary-500 uppercase">Acceptance Date</label>
                                            <p className="text-secondary-900 font-medium mt-1">
                                                {new Date(manuscript.acceptanceDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Plagiarism Report */}
                            {manuscript.plagiarismReport && (
                                <div className="card-premium p-6">
                                    <h3 className="text-sm font-bold text-secondary-500 uppercase mb-4">Plagiarism Check</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-secondary-600">Status</span>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${manuscript.plagiarismReport.status === 'PASSED'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {manuscript.plagiarismReport.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-secondary-600">Similarity</span>
                                            <span className="font-bold text-secondary-900">
                                                {manuscript.plagiarismReport.similarityScore}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quality Report */}
                            {manuscript.qualityReport && (
                                <div className="card-premium p-6">
                                    <h3 className="text-sm font-bold text-secondary-500 uppercase mb-4">Quality Check</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-secondary-600">Status</span>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${manuscript.qualityReport.status === 'APPROVED'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {manuscript.qualityReport.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-secondary-600">Overall Score</span>
                                            <span className="font-bold text-secondary-900">
                                                {manuscript.qualityReport.overallScore}/10
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-bold text-secondary-900 mb-6">Manuscript Timeline</h2>
                        <div className="space-y-4">
                            {timeline.length === 0 ? (
                                <p className="text-center text-secondary-500 py-8">No timeline events yet</p>
                            ) : (
                                timeline.map((event, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTimelineColor(event.type)}`}>
                                                {getTimelineIcon(event.type)}
                                            </div>
                                            {index < timeline.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-secondary-200 my-2" />
                                            )}
                                        </div>
                                        <div className="flex-1 pb-6">
                                            <div className="flex items-start justify-between mb-1">
                                                <h3 className="font-bold text-secondary-900">{event.title}</h3>
                                                <span className="text-xs text-secondary-500">
                                                    {new Date(event.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            {event.description && (
                                                <p className="text-sm text-secondary-600 mt-1">{event.description}</p>
                                            )}
                                            {event.user && (
                                                <p className="text-xs text-secondary-500 mt-2">
                                                    By {event.user.name || event.user.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'revisions' && (
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-bold text-secondary-900 mb-6">Revision History</h2>
                        {manuscript.revisions && manuscript.revisions.length > 0 ? (
                            <div className="space-y-4">
                                {manuscript.revisions.map((revision: any) => (
                                    <div key={revision.id} className="p-4 bg-secondary-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-secondary-900">
                                                Revision {revision.revisionNumber}
                                            </h3>
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">
                                                {revision.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-secondary-600 mb-2">
                                            Submitted {new Date(revision.submittedAt).toLocaleString()}
                                        </p>
                                        {revision.changesDescription && (
                                            <p className="text-sm text-secondary-700 mt-2">
                                                <strong>Changes:</strong> {revision.changesDescription}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-secondary-500 py-8">No revisions submitted yet</p>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
