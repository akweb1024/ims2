'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, FileText, Upload, Save, AlertCircle } from 'lucide-react';

export default function SubmitPaperPage() {
    const params = useParams();
    const router = useRouter();
    const conferenceId = params.id as string;

    const [conference, setConference] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [userRole, setUserRole] = useState('');

    const fetchConference = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConference(data);

                // Check CFP dates
                const now = new Date();
                const start = data.cfpStartDate ? new Date(data.cfpStartDate) : null;
                const end = data.cfpEndDate ? new Date(data.cfpEndDate) : null;

                if (start && now < start) setError('Call for Papers has not started yet.');
                if (end && now > end) setError('Call for Papers has closed.');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [conferenceId]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchConference();
    }, [fetchConference]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}/papers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const paper = await res.json();
                alert('Paper submitted successfully!');
                // Redirect to paper detail or dashboard
                router.push(`/dashboard/conferences/${conferenceId}/papers/${paper.id}`);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to submit paper');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred during submission');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!conference) return <div className="p-8 text-center">Conference not found</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/conferences/${conferenceId}`} className="btn btn-secondary btn-sm">
                        <ArrowLeft size={16} /> Back
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-secondary-900">Submit Paper</h1>
                        <p className="text-secondary-500">{conference.title}</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="card-premium p-6 space-y-6">
                    <div>
                        <label className="label">Paper Title *</label>
                        <input name="title" className="input" required placeholder="Enter the full title of your paper" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label">Submission Type</label>
                            <select name="submissionType" className="input">
                                <option value="ABSTRACT">Abstract Only</option>
                                <option value="FULL_PAPER">Full Paper</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Track</label>
                            <select name="trackId" className="input">
                                <option value="">General / No Specific Track</option>
                                {conference.tracks?.map((track: any) => (
                                    <option key={track.id} value={track.id}>{track.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Abstract *</label>
                        <textarea
                            name="abstract"
                            className="input h-48"
                            required
                            placeholder="Paste your abstract here..."
                        />
                        <p className="text-xs text-secondary-400 mt-1">Maximum 500 words recommended.</p>
                    </div>

                    <div>
                        <label className="label">Authors *</label>
                        <input name="authors" className="input" required placeholder="e.g., Jane Doe, John Smith (University of X)" />
                        <p className="text-xs text-secondary-400 mt-1">List all authors separated by commas.</p>
                    </div>

                    <div>
                        <label className="label">Keywords</label>
                        <input name="keywords" className="input" placeholder="e.g., Machine Learning, AI, Healthcare" />
                    </div>

                    <div>
                        <label className="label">File URL</label>
                        <input name="fileUrl" type="url" className="input" placeholder="https://..." />
                        <p className="text-xs text-secondary-400 mt-1">Optional. Link to PDF/Doc if hosting externally (e.g., Google Drive, Dropbox).</p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting || !!error}
                            className="btn btn-primary w-full py-3 text-lg"
                        >
                            {submitting ? 'Submitting...' : 'Submit Paper'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
