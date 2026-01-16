'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

export default function NewJournalPage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState<string>('CUSTOMER');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        issnPrint: '',
        issnOnline: '',
        frequency: 'Monthly',
        formatAvailable: 'Print,Online,Hybrid',
        subjectCategory: '',
        priceINR: '',
        priceUSD: '',
    });

    const [plans, setPlans] = useState([
        { planType: 'Annual', format: 'Online', duration: '12', priceINR: '', priceUSD: '' },
        { planType: 'Annual', format: 'Print', duration: '12', priceINR: '', priceUSD: '' },
        { planType: 'Annual', format: 'Hybrid', duration: '12', priceINR: '', priceUSD: '' },
    ]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
            if (user.role !== 'SUPER_ADMIN') {
                router.push('/dashboard/journals');
            }
        } else {
            router.push('/login');
        }
    }, [router]);

    const handleJournalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePlanChange = (index: number, field: string, value: string) => {
        const newPlans = [...plans];
        newPlans[index] = { ...newPlans[index], [field]: value };
        setPlans(newPlans);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/journals', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    plans: plans.filter(p => p.priceINR !== '' || p.priceUSD !== '') // Only include plans with at least one price
                })
            });

            if (res.ok) {
                router.push('/dashboard/journals');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create journal');
            }
        } catch (error) {
            alert('A network error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/journals" className="p-2 hover:bg-secondary-100 rounded-full text-secondary-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <h1 className="text-3xl font-bold text-secondary-900">Add New Journal</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* General Information */}
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-bold text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">General Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="label">Journal Name*</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="input"
                                    placeholder="e.g. International Journal of Science"
                                    value={formData.name}
                                    onChange={handleJournalChange}
                                />
                            </div>
                            <div>
                                <label className="label">ISSN (Print)</label>
                                <input
                                    type="text"
                                    name="issnPrint"
                                    className="input"
                                    placeholder="0000-0000"
                                    value={formData.issnPrint}
                                    onChange={handleJournalChange}
                                />
                            </div>
                            <div>
                                <label className="label">ISSN (Online)</label>
                                <input
                                    type="text"
                                    name="issnOnline"
                                    className="input"
                                    placeholder="0000-0000"
                                    value={formData.issnOnline}
                                    onChange={handleJournalChange}
                                />
                            </div>
                            <div>
                                <label className="label">Frequency</label>
                                <select name="frequency" className="input" value={formData.frequency} onChange={handleJournalChange}>
                                    <option>Weekly</option>
                                    <option>Monthly</option>
                                    <option>Quarterly</option>
                                    <option>Semi-Annual</option>
                                    <option>Annual</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Base Price (INR)*</label>
                                <input
                                    type="number"
                                    name="priceINR"
                                    required
                                    className="input"
                                    placeholder="0.00"
                                    value={formData.priceINR}
                                    onChange={handleJournalChange}
                                />
                            </div>
                            <div>
                                <label className="label">Base Price (USD)</label>
                                <input
                                    type="number"
                                    name="priceUSD"
                                    className="input"
                                    placeholder="0.00"
                                    value={formData.priceUSD}
                                    onChange={handleJournalChange}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label">Subject Categories (comma separated)</label>
                                <input
                                    type="text"
                                    name="subjectCategory"
                                    className="input"
                                    placeholder="Medicine, Biology, Ethics"
                                    value={formData.subjectCategory}
                                    onChange={handleJournalChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Plans Information */}
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-bold text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Pricing Plans</h3>
                        <p className="text-sm text-secondary-500 mb-6">Define the standard annual plans for this journal.</p>

                        <div className="space-y-4">
                            {plans.map((plan, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-secondary-50 rounded-lg border border-secondary-100">
                                    <div className="md:col-span-1">
                                        <label className="text-xs font-bold text-secondary-400 uppercase">Type</label>
                                        <div className="font-semibold text-secondary-800">{plan.planType}</div>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs font-bold text-secondary-400 uppercase">Format</label>
                                        <div className="font-semibold text-secondary-800">{plan.format}</div>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs font-bold text-secondary-400 uppercase">Duration</label>
                                        <div className="font-semibold text-secondary-800">{plan.duration} Mo</div>
                                    </div>
                                    <div className="md:col-span-1.5">
                                        <label className="text-xs font-bold text-secondary-400 uppercase">Price (INR)*</label>
                                        <input
                                            type="number"
                                            required={index === 0}
                                            placeholder="0.00"
                                            className="input py-1 h-8 text-sm"
                                            value={plan.priceINR}
                                            onChange={(e) => handlePlanChange(index, 'priceINR', e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-1.5">
                                        <label className="text-xs font-bold text-secondary-400 uppercase">Price (USD)</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="input py-1 h-8 text-sm"
                                            value={plan.priceUSD}
                                            onChange={(e) => handlePlanChange(index, 'priceUSD', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Link href="/dashboard/journals" className="btn btn-secondary px-6">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            className="btn btn-primary px-10"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </span>
                            ) : 'Create Journal'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
