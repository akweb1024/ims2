'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function NewArticlePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        category: 'FAQ',
        content: '',
        targetRole: 'ALL'
    });

    const categories = ['FAQ', 'SOP', 'Product Guide', 'Internal Policy'];
    const roles = ['ALL', 'STAFF', 'CUSTOMER', 'AGENCY'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/knowledge-base', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push('/dashboard/knowledge-base');
            } else {
                alert('Failed to create article');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="text-slate-500 hover:text-slate-900 font-bold text-sm flex items-center gap-2 mb-4"
                    >
                        ← Back to Library
                    </button>
                    <h1 className="text-3xl font-black text-slate-900">Create New Article</h1>
                    <p className="text-slate-500 mt-1">Share knowledge with your team or customers.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    Article Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                    placeholder="e.g. How to process refunds"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    Category
                                </label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white font-medium text-slate-700"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                Target Audience
                            </label>
                            <div className="flex gap-4">
                                {roles.map(role => (
                                    <label key={role} className={`cursor-pointer px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all ${formData.targetRole === role ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}>
                                        <input
                                            type="radio"
                                            className="hidden"
                                            value={role}
                                            checked={formData.targetRole === role}
                                            onChange={e => setFormData({ ...formData, targetRole: e.target.value })}
                                        />
                                        {role}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                Content
                            </label>
                            <div className="relative">
                                <textarea
                                    required
                                    rows={12}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300 resize-none font-mono text-sm leading-relaxed"
                                    placeholder="# Write your article content here...&#10;&#10;You can use Markdown for formatting."
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                />
                                <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400 pointer-events-none uppercase tracking-widest">
                                    Markdown Supported
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? 'Publishing...' : 'Publish Article'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
