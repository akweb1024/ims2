'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function SubmitArticlePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [journals, setJournals] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        abstract: '',
        keywords: '',
        journalId: '',
        apcType: '', // OPEN_ACCESS, RAPID, WOS, OTHER
        fileUrl: '',
        userRole: 'CUSTOMER'
    });

    useEffect(() => {
        const fetchJournals = async () => {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/journals?limit=100', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                setJournals(await res.json());
            }
        };
        fetchJournals();

        const userData = localStorage.getItem('user');
        if (userData) {
            setFormData(prev => ({ ...prev, userRole: JSON.parse(userData).role }));
        }
    }, []);

    const selectedJournal = journals.find(j => j.id === formData.journalId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/customer/articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('Article submitted successfully!');
                router.push('/dashboard/articles'); // Redirect to articles list (assuming it exists or dashboard)
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to submit article');
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert('A network error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole={formData.userRole}>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full transition-colors text-secondary-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-bold text-secondary-900">Submit Manuscript</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. Manuscript Details */}
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-bold text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Manuscript Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Title*</label>
                                <input
                                    required
                                    className="input"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Abstract</label>
                                <textarea
                                    className="input min-h-[100px]"
                                    value={formData.abstract}
                                    onChange={e => setFormData({ ...formData, abstract: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Keywords</label>
                                <input
                                    className="input"
                                    placeholder="Comma separated (e.g. AI, Medicine, Ethics)"
                                    value={formData.keywords}
                                    onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Manuscript File URL*</label>
                                <input
                                    required
                                    className="input"
                                    placeholder="https://..."
                                    value={formData.fileUrl}
                                    onChange={e => setFormData({ ...formData, fileUrl: e.target.value })}
                                />
                                <p className="text-xs text-secondary-400 mt-1">Please provide a direct link to your PDF/Word document (Google Drive, Dropbox, etc.)</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Journal Selection */}
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-bold text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Target Journal</h3>
                        <div className="space-y-4">
                            <label className="label">Select Journal*</label>
                            <select
                                required
                                className="input"
                                value={formData.journalId}
                                onChange={e => setFormData({ ...formData, journalId: e.target.value, apcType: '' })}
                            >
                                <option value="">-- Choose Journal --</option>
                                {journals.map(j => (
                                    <option key={j.id} value={j.id}>{j.name} ({j.frequency})</option>
                                ))}
                            </select>
                        </div>

                        {selectedJournal && (
                            <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                                <h4 className="font-bold text-secondary-700 mb-3">Publication Options (APC)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { type: 'OPEN_ACCESS', label: 'Open Access', desc: 'Article is freely available to everyone.', price: selectedJournal.apcOpenAccessINR },
                                        { type: 'RAPID', label: 'Rapid Publication', desc: 'Expedited review process.', price: selectedJournal.apcRapidINR },
                                        { type: 'WOS', label: 'WoS Indexed', desc: 'Publication in WoS tracked category.', price: selectedJournal.apcWoSINR },
                                        { type: 'OTHER', label: 'Standard/Other', desc: 'Standard publication process.', price: selectedJournal.apcOtherINR }
                                    ].map(opt => (
                                        <label
                                            key={opt.type}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${formData.apcType === opt.type
                                                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                                    : 'border-secondary-200 hover:border-primary-300 hover:bg-secondary-50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <input
                                                    type="radio"
                                                    name="apcType"
                                                    value={opt.type}
                                                    checked={formData.apcType === opt.type}
                                                    onChange={(e) => setFormData({ ...formData, apcType: e.target.value })}
                                                    className="mt-1 h-4 w-4 text-primary-600 border-secondary-300 focus:ring-primary-500"
                                                />
                                                <div>
                                                    <div className="font-bold text-secondary-900">{opt.label}</div>
                                                    <div className="text-xs text-secondary-500 mb-2">{opt.desc}</div>
                                                    <div className="font-bold text-primary-600">₹{opt.price?.toLocaleString() || '0'}</div>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => router.back()} className="btn btn-secondary px-8">Cancel</button>
                        <button type="submit" className="btn btn-primary px-10" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Manuscript'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
