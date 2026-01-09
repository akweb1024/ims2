'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function EmployeeTransferPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [userRole, setUserRole] = useState('CUSTOMER');

    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [primaryCompanyId, setPrimaryCompanyId] = useState('');
    const [sharedCompanyIds, setSharedCompanyIds] = useState<string[]>([]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
            if (user.role !== 'SUPER_ADMIN') {
                router.push('/dashboard');
                return;
            }
        }
        fetchData();
    }, [router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [usersRes, companiesRes] = await Promise.all([
                fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/companies', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (usersRes.ok && companiesRes.ok) {
                const usersData = await usersRes.json();
                const companiesData = await companiesRes.json();
                setUsers(usersData.filter((u: any) => u.role !== 'CUSTOMER'));
                setCompanies(companiesData);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDetails = async (userId: string) => {
        if (!userId) {
            setSelectedUser(null);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedUser(data);
                setPrimaryCompanyId(data.companyId || '');
                setSharedCompanyIds(data.companies?.map((c: any) => c.id) || []);
            }
        } catch (err) {
            console.error('Fetch user details error:', err);
        }
    };

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const userId = e.target.value;
        setSelectedUserId(userId);
        fetchUserDetails(userId);
    };

    const handleToggleSharedCompany = (companyId: string) => {
        setSharedCompanyIds(prev =>
            prev.includes(companyId)
                ? prev.filter(id => id !== companyId)
                : [...prev, companyId]
        );
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/${selectedUserId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    companyId: primaryCompanyId || null,
                    companyIds: sharedCompanyIds
                })
            });

            if (res.ok) {
                alert('Employee transfer and access updated successfully!');
                fetchUserDetails(selectedUserId);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to update access');
            }
        } catch (err) {
            alert('Error updating access');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900">Employee Transfer Tool</h1>
                    <p className="text-secondary-600">Move employees between companies or manage multi-company access.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Step 1: Select Employee */}
                    <div className="card-premium h-fit">
                        <h3 className="text-lg font-bold text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">1. Select Employee</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Employee</label>
                                <select
                                    className="input"
                                    value={selectedUserId}
                                    onChange={handleUserChange}
                                >
                                    <option value="">-- Choose Employee --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name || u.email.split('@')[0]} ({u.email} - {u.role})</option>
                                    ))}
                                </select>
                            </div>

                            {selectedUser && (
                                <div className="p-4 bg-secondary-50 rounded-xl space-y-2">
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Current Status</p>
                                    <p className="text-sm font-bold text-secondary-900">{selectedUser.email}</p>
                                    <p className="text-xs text-secondary-600">
                                        Role: <span className="font-bold text-primary-600">{selectedUser.role}</span>
                                    </p>
                                    <p className="text-xs text-secondary-600">
                                        Primary: <span className="font-bold">{companies.find(c => c.id === selectedUser.companyId)?.name || 'None'}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Configure Access */}
                    <div className="md:col-span-2 space-y-6">
                        {selectedUser ? (
                            <form onSubmit={handleTransfer} className="space-y-6">
                                <div className="card-premium">
                                    <h3 className="text-lg font-bold text-secondary-900 mb-4 border-l-4 border-success-500 pl-3">2. Configure Company Access</h3>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="label">Primary Company (Main Context)</label>
                                            <select
                                                className="input"
                                                value={primaryCompanyId}
                                                onChange={(e) => setPrimaryCompanyId(e.target.value)}
                                            >
                                                <option value="">-- No Primary Company --</option>
                                                {companies.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-secondary-500 mt-1 italic">
                                                The employee will default to this company when logging in.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="label">Accessible Companies (Multi-Tenant Access)</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                                {companies.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => handleToggleSharedCompany(c.id)}
                                                        className={`p-3 text-left rounded-xl border-2 transition-all flex items-center justify-between group ${sharedCompanyIds.includes(c.id)
                                                            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
                                                            : 'border-secondary-100 hover:border-secondary-300'
                                                            }`}
                                                    >
                                                        <div className="truncate pr-2">
                                                            <p className={`text-xs font-bold ${sharedCompanyIds.includes(c.id) ? 'text-primary-700' : 'text-secondary-700'}`}>
                                                                {c.name}
                                                            </p>
                                                            <p className="text-[10px] text-secondary-400">ID: {c.id.split('-')[0]}</p>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${sharedCompanyIds.includes(c.id) ? 'bg-primary-500 text-white' : 'bg-secondary-100'
                                                            }`}>
                                                            {sharedCompanyIds.includes(c.id) ? '✓' : ''}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-secondary-100 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={actionLoading}
                                            className="btn btn-primary px-12 py-3 shadow-lg shadow-primary-200"
                                        >
                                            {actionLoading ? 'Updating Access...' : 'Save & Update Employee Access'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="card-premium flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="text-4xl">👋</div>
                                <h3 className="text-xl font-bold text-secondary-900">Ready to start?</h3>
                                <p className="text-secondary-500 max-w-xs">Select an employee from the left panel to begin managing their company assignments.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
