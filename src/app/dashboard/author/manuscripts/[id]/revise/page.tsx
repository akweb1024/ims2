'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, Upload, Check, Trash2 } from 'lucide-react';

export default function SubmitRevision(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const router = useRouter();
    const [manuscript, setManuscript] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        fileUrl: '',
        coverLetter: '',
        responseToReviewers: '',
        changesDescription: ''
    });

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

    useEffect(() => {
        fetchManuscript();
    }, [params.id, fetchManuscript]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.fileUrl) {
            alert('Please upload the revised manuscript file');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/manuscripts/${params.id}/revisions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('Revision submitted successfully!');
                router.push(`/dashboard/author/manuscripts/${params.id}`);
            } else {
                const error = await res.json();
                alert(`Submission failed: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
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
                        <button onClick={() => router.back()} className="btn-primary">
                            Go Back
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (manuscript.manuscriptStatus !== 'REVISION_REQUIRED') {
        return (
            <DashboardLayout>
                <div className="p-6">
                    <div className="text-center py-12">
                        <p className="text-secondary-600 mb-4">This manuscript is not in revision status</p>
                        <button onClick={() => router.back()} className="btn-primary">
                            Go Back
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-6 space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-secondary-100 rounded-full transition-colors mt-1"
                    >
                        <ArrowLeft className="w-5 h-5 text-secondary-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-secondary-900">Submit Revision</h1>
                        <p className="text-sm text-secondary-600 mt-1">
                            {manuscript.manuscriptId} - {manuscript.title}
                        </p>
                    </div>
                </div>

                {/* Reviewer Comments (if available) */}
                {manuscript.reviews && manuscript.reviews.length > 0 && (
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-bold text-secondary-900 mb-4">Reviewer Comments</h2>
                        <div className="space-y-4">
                            {manuscript.reviews.map((review: any, index: number) => (
                                <div key={review.id} className="p-4 bg-secondary-50 rounded-lg">
                                    <h3 className="font-bold text-secondary-900 mb-2">Reviewer {index + 1}</h3>
                                    {review.commentsToAuthor && (
                                        <div className="mb-3">
                                            <label className="text-xs font-bold text-secondary-500 uppercase">Comments to Author</label>
                                            <p className="text-sm text-secondary-700 mt-1">{review.commentsToAuthor}</p>
                                        </div>
                                    )}
                                    {review.recommendation && (
                                        <div>
                                            <label className="text-xs font-bold text-secondary-500 uppercase">Recommendation</label>
                                            <p className="text-sm text-secondary-700 mt-1">{review.recommendation}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Revision Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload */}
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-bold text-secondary-900 mb-4">Upload Revised Manuscript *</h2>

                        {!formData.fileUrl ? (
                            <div className="text-center p-12 border-2 border-dashed border-secondary-300 rounded-xl hover:border-primary-500 transition-colors cursor-pointer bg-secondary-50/50">
                                <Upload className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-secondary-900 mb-2">Upload Revised File</h3>
                                <p className="text-sm text-secondary-600 mb-4">
                                    Upload your revised manuscript with all changes incorporated
                                </p>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    className="hidden"
                                    id="file-upload"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setSubmitting(true);
                                            const formDataToUpload = new FormData();
                                            formDataToUpload.append('file', file);
                                            formDataToUpload.append('category', 'publications');
                                            formDataToUpload.append('articleId', params.id);
                                            if (manuscript?.journalId) {
                                                formDataToUpload.append('journalId', manuscript.journalId);
                                            }

                                            try {
                                                const res = await fetch('/api/manuscripts/upload', {
                                                    method: 'POST',
                                                    body: formDataToUpload
                                                });

                                                if (res.ok) {
                                                    const data = await res.json();
                                                    setFormData({ ...formData, fileUrl: data.url });
                                                } else {
                                                    alert('Failed to upload file');
                                                }
                                            } catch (error) {
                                                console.error('Upload error:', error);
                                                alert('Error uploading file');
                                            } finally {
                                                setSubmitting(false);
                                            }
                                        }
                                    }}
                                />
                                <label htmlFor="file-upload" className="btn-primary cursor-pointer inline-block">
                                    Choose File
                                </label>
                                <p className="text-xs text-secondary-500 mt-4">
                                    Supported formats: PDF, DOC, DOCX (Max 10MB)
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="font-medium text-green-900">File uploaded successfully</p>
                                        <p className="text-sm text-green-700">{formData.fileUrl}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, fileUrl: '' })}
                                    className="text-rose-600 hover:text-rose-700"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Cover Letter */}
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-bold text-secondary-900 mb-4">Cover Letter</h2>
                        <textarea
                            className="input-premium"
                            rows={6}
                            placeholder="Write a cover letter explaining the revisions made..."
                            value={formData.coverLetter}
                            onChange={e => setFormData({ ...formData, coverLetter: e.target.value })}
                        />
                        <p className="text-xs text-secondary-500 mt-2">
                            Briefly summarize the changes made in response to reviewer comments
                        </p>
                    </div>

                    {/* Response to Reviewers */}
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-bold text-secondary-900 mb-4">Response to Reviewers</h2>
                        <textarea
                            className="input-premium"
                            rows={10}
                            placeholder="Provide a detailed point-by-point response to each reviewer comment..."
                            value={formData.responseToReviewers}
                            onChange={e => setFormData({ ...formData, responseToReviewers: e.target.value })}
                        />
                        <p className="text-xs text-secondary-500 mt-2">
                            Address each reviewer comment individually with your response and changes made
                        </p>
                    </div>

                    {/* Changes Description */}
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-bold text-secondary-900 mb-4">Summary of Changes</h2>
                        <textarea
                            className="input-premium"
                            rows={6}
                            placeholder="Provide a summary of all changes made to the manuscript..."
                            value={formData.changesDescription}
                            onChange={e => setFormData({ ...formData, changesDescription: e.target.value })}
                        />
                        <p className="text-xs text-secondary-500 mt-2">
                            List the major changes made to the manuscript
                        </p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !formData.fileUrl}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Submitting...' : 'Submit Revision'}
                        </button>
                    </div>
                </form>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                        <strong>Note:</strong> After submitting your revision, the editorial team will review your changes.
                        You will be notified via email about the status of your revised manuscript.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
