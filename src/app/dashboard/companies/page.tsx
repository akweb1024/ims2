'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import FormattedDate from '@/components/common/FormattedDate';
import DataTransferActions from '@/components/dashboard/DataTransferActions';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [showNewModal, setShowNewModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/companies', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (err) {
            console.error('Failed to fetch companies', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/companies', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowNewModal(false);
                fetchCompanies();
                form.reset();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create company');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Companies</h1>
                        <p className="text-secondary-600">Administrative control over multi-tenant organizations</p>
                    </div>
                    {userRole === 'SUPER_ADMIN' && (
                        <div className="flex items-center gap-3">
                            <DataTransferActions type="companies" onSuccess={fetchCompanies} />
                            <button
                                onClick={() => setShowNewModal(true)}
                                className="btn btn-primary px-6"
                            >
                                + Register Company
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="card-premium h-48 animate-pulse bg-secondary-100"></div>
                        ))
                    ) : companies.map(company => (
                        <div key={company.id} className="card-premium p-6 hover:shadow-xl transition-all border-l-4 border-primary-500">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center text-xl font-bold">
                                    {company.name.charAt(0)}
                                </div>
                                <span className="bg-secondary-100 text-secondary-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">
                                    ID: {company.id.split('-')[0]}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-secondary-900 mb-1">{company.name}</h3>
                            <p className="text-sm text-secondary-500 mb-4">{company.domain || 'No domain'}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-secondary-50">
                                <div className="flex space-x-4">
                                    <div className="text-center">
                                        <p className="text-xs text-secondary-400 font-bold uppercase">Staff</p>
                                        <p className="font-bold text-secondary-900">{company._count?.users || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-secondary-400 font-bold uppercase">Currency</p>
                                        <p className="font-bold text-secondary-900">{company.currency}</p>
                                    </div>
                                </div>
                                <Link
                                    href={`/dashboard/company?id=${company.id}`}
                                    className="p-2 bg-secondary-100 rounded-lg text-primary-600 hover:bg-primary-600 hover:text-white transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    ))}
                    {!loading && companies.length === 0 && (
                        <div className="col-span-full py-20 text-center card-premium">
                            <p className="text-secondary-500 mb-4 text-lg">No companies registered in the system yet.</p>
                            <button onClick={() => setShowNewModal(true)} className="btn btn-primary">+ Add First Company</button>
                        </div>
                    )}
                </div>
            </div>

            {/* New Company Modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">Register New Company</h2>
                        <form onSubmit={handleCreateCompany} className="space-y-4">
                            <div>
                                <label className="label">Company Name *</label>
                                <input name="name" className="input" required placeholder="e.g. Acme Corporation" />
                            </div>
                            <div>
                                <label className="label">Domain</label>
                                <input name="domain" className="input" placeholder="acme.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Email</label>
                                    <input name="email" type="email" className="input" placeholder="admin@acme.com" />
                                </div>
                                <div>
                                    <label className="label">Phone</label>
                                    <input name="phone" className="input" placeholder="+1-xxx-xxx-xxxx" />
                                </div>
                            </div>
                            <div>
                                <label className="label">Website</label>
                                <input name="website" className="input" placeholder="https://acme.com" />
                            </div>
                            <div className="flex justify-end space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="btn btn-primary px-8"
                                >
                                    {actionLoading ? 'Registering...' : 'Register Company'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
