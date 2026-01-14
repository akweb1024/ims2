'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface PlagiarismReport {
    id: string;
    articleId: string;
    status: string;
    similarityScore?: number;
    toolUsed?: string;
    reportUrl?: string;
    comments?: string;
    checkedDate?: string;
    article: {
        id: string;
        title: string;
        manuscriptId: string;
        submissionDate: string;
    };
    journal: {
        id: string;
        name: string;
    };
}

export default function PlagiarismDashboard() {
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<PlagiarismReport[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<any>(null);
    const [formData, setFormData] = useState({
        similarityScore: '',
        toolUsed: 'Turnitin',
        reportUrl: '',
        status: 'PASSED',
        comments: ''
    });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/plagiarism?pending=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setReports(data);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedArticle) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/plagiarism', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    articleId: selectedArticle.articleId,
                    journalId: selectedArticle.journal.id,
                    similarityScore: parseFloat(formData.similarityScore),
                    toolUsed: formData.toolUsed,
                    reportUrl: formData.reportUrl,
                    status: formData.status,
                    comments: formData.comments
                })
            });

            if (res.ok) {
                alert('Report submitted successfully!');
                setShowUploadModal(false);
                setSelectedArticle(null);
                setFormData({
                    similarityScore: '',
                    toolUsed: 'Turnitin',
                    reportUrl: '',
                    status: 'PASSED',
                    comments: ''
                });
                fetchReports();
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Failed to submit report');
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'PENDING': 'bg-yellow-100 text-yellow-700',
            'IN_PROGRESS': 'bg-blue-100 text-blue-700',
            'PASSED': 'bg-green-100 text-green-700',
            'FAILED': 'bg-red-100 text-red-700',
            'REQUIRES_REVISION': 'bg-orange-100 text-orange-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">🔍 Plagiarism Check Dashboard</h1>
                        <p className="text-secondary-600">Review and process plagiarism reports</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-bold text-secondary-900">{reports.length}</p>
                        <p className="text-sm text-secondary-500">Pending Checks</p>
                    </div>
                </div>

                {/* Pending Queue */}
                <div className="card-premium p-6">
                    <h2 className="text-2xl font-bold text-secondary-900 mb-6">Pending Queue</h2>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-6xl mb-4 block">✅</span>
                            <p className="text-xl font-bold text-secondary-900">All caught up!</p>
                            <p className="text-secondary-500">No pending plagiarism checks</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reports.map((report) => (
                                <div key={report.id} className="border border-secondary-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-secondary-900 mb-2">
                                                {report.article.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-secondary-500">
                                                <span className="font-mono font-bold">{report.article.manuscriptId}</span>
                                                <span>•</span>
                                                <span>{report.journal.name}</span>
                                                <span>•</span>
                                                <span>Submitted {new Date(report.article.submissionDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(report.status)}`}>
                                            {report.status}
                                        </span>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setSelectedArticle(report);
                                                setShowUploadModal(true);
                                            }}
                                            className="btn btn-primary"
                                        >
                                            Check Now
                                        </button>
                                        <button className="btn btn-secondary">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upload Report Modal */}
                {showUploadModal && selectedArticle && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6">
                                <h2 className="text-2xl font-bold text-white">Upload Plagiarism Report</h2>
                                <p className="text-primary-100">{selectedArticle.article.manuscriptId}</p>
                            </div>

                            <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
                                <div>
                                    <label className="label">Manuscript</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={selectedArticle.article.title}
                                        disabled
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Similarity Score (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            className="input"
                                            value={formData.similarityScore}
                                            onChange={(e) => setFormData({ ...formData, similarityScore: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Tool Used</label>
                                        <select
                                            className="input"
                                            value={formData.toolUsed}
                                            onChange={(e) => setFormData({ ...formData, toolUsed: e.target.value })}
                                        >
                                            <option value="Turnitin">Turnitin</option>
                                            <option value="iThenticate">iThenticate</option>
                                            <option value="Grammarly">Grammarly</option>
                                            <option value="Copyscape">Copyscape</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Report URL (Optional)</label>
                                    <input
                                        type="url"
                                        className="input"
                                        placeholder="https://..."
                                        value={formData.reportUrl}
                                        onChange={(e) => setFormData({ ...formData, reportUrl: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="label">Status</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['PASSED', 'FAILED', 'REQUIRES_REVISION'].map((status) => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status })}
                                                className={`p-3 rounded-xl font-bold transition-all ${formData.status === status
                                                        ? 'bg-primary-600 text-white shadow-lg'
                                                        : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                                                    }`}
                                            >
                                                {status.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Comments</label>
                                    <textarea
                                        className="input"
                                        rows={4}
                                        placeholder="Add any notes or observations..."
                                        value={formData.comments}
                                        onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="submit" className="btn btn-primary flex-1">
                                        Submit Report
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowUploadModal(false);
                                            setSelectedArticle(null);
                                        }}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
