'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

export default function BulkCommunicationPage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<any>(null);

    const [formData, setFormData] = useState({
        target: 'ALL',
        subject: '',
        message: ''
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
            if (!['SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
                router.push('/dashboard');
            }
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm('Are you sure you want to send this bulk email to all selected recipients?')) return;

        setSending(true);
        setResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/communications/bulk', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (res.ok) {
                setResult({ success: true, message: data.message });
                setFormData({ target: 'ALL', subject: '', message: '' });
            } else {
                setResult({ success: false, message: data.error || 'Failed to send bulk email' });
            }
        } catch (err) {
            setResult({ success: false, message: 'A network error occurred' });
        } finally {
            setSending(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/communications" className="p-2 hover:bg-secondary-100 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Bulk Communication</h1>
                        <p className="text-secondary-600">Broadcast messages to your customer segments</p>
                    </div>
                </div>

                {result && (
                    <div className={`p-4 rounded-xl border-2 ${result.success ? 'bg-success-50 border-success-200 text-success-700' : 'bg-danger-50 border-danger-200 text-danger-700'}`}>
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{result.success ? '✅' : '⚠️'}</span>
                            <p className="font-bold">{result.message}</p>
                        </div>
                    </div>
                )}

                <div className="card-premium">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="label">Target Audience</label>
                                <select
                                    className="input text-lg py-3"
                                    value={formData.target}
                                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                                    disabled={sending}
                                >
                                    <option value="ALL">All Customers</option>
                                    <option value="INSTITUTION">Institutions Only</option>
                                    <option value="AGENCY">Agencies Only</option>
                                    <option value="INDIVIDUAL">Individuals Only</option>
                                </select>
                                <p className="text-xs text-secondary-500 italic">Emails will be sent to the primary contact email of each registered profile in the selected category.</p>
                            </div>

                            <div className="space-y-4">
                                <label className="label">Email Subject</label>
                                <input
                                    type="text"
                                    placeholder="Enter subject line..."
                                    className="input text-lg py-3"
                                    required
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    disabled={sending}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="label">Message Content</label>
                            <textarea
                                rows={12}
                                className="input font-serif text-lg leading-relaxed p-6"
                                placeholder="Write your announcement or newsletter here..."
                                required
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                disabled={sending}
                            />
                            <p className="text-xs text-secondary-400 text-right">Plain text supported. Automatically formatted into a premium email template.</p>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={sending}
                                className={`btn btn-primary px-12 py-4 text-lg font-bold shadow-lg shadow-primary-200 transition-all hover:-translate-y-1 ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {sending ? (
                                    <span className="flex items-center gap-3">
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing Broadcast...
                                    </span>
                                ) : '🚀 Send Broadcast'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
