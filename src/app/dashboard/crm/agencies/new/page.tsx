'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function NewAgencyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        organizationName: '',
        primaryEmail: '',
        primaryPhone: '',
        discountRate: 0,
        commissionTerms: '',
        territory: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/agencies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push('/dashboard/crm/agencies');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create agency');
            }
        } catch (error) {
            console.error('Error creating agency:', error);
            alert('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole="ADMIN">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center space-x-4 mb-6">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full transition-colors text-secondary-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">New Agency</h1>
                        <p className="text-secondary-500">Register a new agency partner.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="card-premium p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="label">Contact Name *</label>
                            <input
                                required
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Agency / Organization Name</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.organizationName}
                                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Email *</label>
                            <input
                                required
                                type="email"
                                className="input"
                                value={formData.primaryEmail}
                                onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Phone *</label>
                            <input
                                required
                                type="tel"
                                className="input"
                                value={formData.primaryPhone}
                                onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                            />
                        </div>

                        <div className="border-t border-secondary-200 col-span-2 pt-4 mt-2">
                            <h3 className="font-bold text-secondary-900 mb-4">Commercial Terms</h3>
                        </div>

                        <div>
                            <label className="label">Standard Discount Rate (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="input"
                                value={formData.discountRate}
                                onChange={(e) => setFormData({ ...formData, discountRate: parseFloat(e.target.value) })}
                            />
                            <p className="text-xs text-secondary-500 mt-1">This discount will be applied automatically to subscriptions.</p>
                        </div>
                        <div>
                            <label className="label">Commission / Payment Terms</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. Net 30, 5% Commission"
                                value={formData.commissionTerms}
                                onChange={(e) => setFormData({ ...formData, commissionTerms: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Territory / Region</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. North India, Global"
                                value={formData.territory}
                                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Creating...' : 'Register Agency'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
