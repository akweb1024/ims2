'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface QualityReport {
    id: string;
    articleId: string;
    status: string;
    formattingScore?: number;
    languageScore?: number;
    structureScore?: number;
    overallScore?: number;
    comments?: string;
    issues: string[];
    article: {
        id: string;
        title: string;
        manuscriptId: string;
    };
    journal: {
        id: string;
        name: string;
    };
}

export default function QualityDashboard() {
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<QualityReport[]>([]);
    const [showCheckModal, setShowCheckModal] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<any>(null);
    const [formData, setFormData] = useState({
        formattingScore: 8,
        languageScore: 8,
        structureScore: 8,
        status: 'APPROVED',
        comments: '',
        issues: [] as string[]
    });
    const [newIssue, setNewIssue] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/quality?pending=true', {
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
            const res = await fetch('/api/quality', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    articleId: selectedArticle.articleId,
                    journalId: selectedArticle.journal.id,
                    formattingScore: formData.formattingScore,
                    languageScore: formData.languageScore,
                    structureScore: formData.structureScore,
                    status: formData.status,
                    comments: formData.comments,
                    issues: formData.issues
                })
            });

            if (res.ok) {
                alert('Quality report submitted successfully!');
                setShowCheckModal(false);
                setSelectedArticle(null);
                setFormData({
                    formattingScore: 8,
                    languageScore: 8,
                    structureScore: 8,
                    status: 'APPROVED',
                    comments: '',
                    issues: []
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

    const addIssue = () => {
        if (newIssue.trim()) {
            setFormData({ ...formData, issues: [...formData.issues, newIssue.trim()] });
            setNewIssue('');
        }
    };

    const removeIssue = (index: number) => {
        setFormData({
            ...formData,
            issues: formData.issues.filter((_, i) => i !== index)
        });
    };

    const overallScore = Math.round(
        (formData.formattingScore + formData.languageScore + formData.structureScore) / 3
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">✅ Quality Check Dashboard</h1>
                        <p className="text-secondary-600">Review manuscript quality and formatting</p>
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
                            <span className="text-6xl mb-4 block">🎉</span>
                            <p className="text-xl font-bold text-secondary-900">All caught up!</p>
                            <p className="text-secondary-500">No pending quality checks</p>
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
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedArticle(report);
                                            setShowCheckModal(true);
                                        }}
                                        className="btn btn-primary"
                                    >
                                        Start Quality Check
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quality Check Modal */}
                {showCheckModal && selectedArticle && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl my-8">
                            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6">
                                <h2 className="text-2xl font-bold text-white">Quality Check</h2>
                                <p className="text-emerald-100">{selectedArticle.article.manuscriptId}</p>
                            </div>

                            <form onSubmit={handleSubmitReport} className="p-6 space-y-6">
                                <div>
                                    <label className="label">Manuscript</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={selectedArticle.article.title}
                                        disabled
                                    />
                                </div>

                                {/* Scoring */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-secondary-900">Quality Scores</h3>

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="label">Formatting</label>
                                            <span className="text-2xl font-bold text-primary-600">{formData.formattingScore}/10</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            className="w-full"
                                            value={formData.formattingScore}
                                            onChange={(e) => setFormData({ ...formData, formattingScore: parseInt(e.target.value) })}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="label">Language</label>
                                            <span className="text-2xl font-bold text-primary-600">{formData.languageScore}/10</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            className="w-full"
                                            value={formData.languageScore}
                                            onChange={(e) => setFormData({ ...formData, languageScore: parseInt(e.target.value) })}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="label">Structure</label>
                                            <span className="text-2xl font-bold text-primary-600">{formData.structureScore}/10</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            className="w-full"
                                            value={formData.structureScore}
                                            onChange={(e) => setFormData({ ...formData, structureScore: parseInt(e.target.value) })}
                                        />
                                    </div>

                                    <div className="bg-gradient-to-r from-primary-50 to-emerald-50 p-4 rounded-xl">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-secondary-900">Overall Score</span>
                                            <span className="text-4xl font-bold text-primary-600">{overallScore}/10</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Issues */}
                                <div>
                                    <label className="label">Issues Found</label>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            className="input flex-1"
                                            placeholder="Add an issue..."
                                            value={newIssue}
                                            onChange={(e) => setNewIssue(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIssue())}
                                        />
                                        <button type="button" onClick={addIssue} className="btn btn-secondary">
                                            Add
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {formData.issues.map((issue, index) => (
                                            <div key={index} className="flex items-center gap-2 bg-secondary-50 p-3 rounded-lg">
                                                <span className="flex-1 text-secondary-700">• {issue}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeIssue(index)}
                                                    className="text-red-600 hover:text-red-700 font-bold"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="label">Decision</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['APPROVED', 'REQUIRES_FORMATTING', 'REJECTED'].map((status) => (
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

                                {/* Comments */}
                                <div>
                                    <label className="label">Comments</label>
                                    <textarea
                                        className="input"
                                        rows={4}
                                        placeholder="Add detailed feedback..."
                                        value={formData.comments}
                                        onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="submit" className="btn btn-primary flex-1">
                                        Submit Quality Report
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCheckModal(false);
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
