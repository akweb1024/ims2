'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import DataTransferActions from '@/components/dashboard/DataTransferActions';

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [showNewModal, setShowNewModal] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
            if (user.role === 'SUPER_ADMIN') {
                fetchCompanies();
            }
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
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
        }
    };

    const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowNewModal(false);
                fetchUsers();
                form.reset();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create user');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setActionLoading(false);
        }
    };

    const toggleUserStatus = async (user: any) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: !user.isActive })
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
            }
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const [editingUser, setEditingUser] = useState<any>(null);

    const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const payload: any = {
            role: formData.get('role'),
        };
        const password = formData.get('password');
        if (password) payload.password = password;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updated = await res.json();
                setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...updated } : u));
                setEditingUser(null);
            } else {
                alert('Failed to update user');
            }
        } catch (err) {
            alert('Error updating user');
        } finally {
            setActionLoading(false);
        }
    }; // Closed handleUpdateUser

    const handleBulkAssign = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const formData = new FormData(e.currentTarget);
        const assignedToUserId = formData.get('assignedToUserId');
        const filters = {
            country: formData.get('country') || undefined,
            state: formData.get('state') || undefined,
            customerType: formData.get('customerType') || undefined,
            organizationName: formData.get('organizationName') || undefined,
        };

        // Cleanup undefined
        Object.keys(filters).forEach(key => (filters as any)[key] === undefined && delete (filters as any)[key]);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/customers/bulk-assign', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignedToUserId, filters })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Successfully assigned ${data.count} customers.`);
                setShowBulkAssignModal(false);
                fetchUsers(); // Refresh stats
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to bulk assign');
            }
        } catch (err) {
            alert('Error performing bulk assignment');
        } finally {
            setActionLoading(false);
        }
    };

    const handleImpersonate = async (userId: string) => {
        if (!confirm('Are you sure you want to login as this user? You can switch back later.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/impersonate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ targetUserId: userId })
            });

            if (res.ok) {
                const data = await res.json();
                // Store original admin token to revert back
                localStorage.setItem('adminToken', token!);
                localStorage.setItem('adminUser', localStorage.getItem('user')!);

                // Set impersonated credentials
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                window.location.href = '/dashboard';
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to impersonate');
            }
        } catch (err) {
            alert('Impersonation error');
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">User Management</h1>
                        <p className="text-secondary-600">Administrative control over staff and system access</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowBulkAssignModal(true)}
                            className="btn btn-secondary bg-white border-secondary-200"
                        >
                            Bulk Assign Customers
                        </button>
                        <DataTransferActions type="users" onSuccess={fetchUsers} />
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="btn btn-primary px-6"
                        >
                            + Invite Staff
                        </button>
                    </div>
                </div>

                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Activity</th>
                                    <th>Created</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : users.map(user => (
                                    <tr key={user.id} className="hover:bg-secondary-50 transition-colors">
                                        <td>
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center font-bold text-secondary-600 mr-3">
                                                    {user.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-secondary-900">{user.email}</p>
                                                    <p className="text-xs text-secondary-500">ID: {user.id.split('-')[0]}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.role === 'SUPER_ADMIN' ? 'badge-primary' :
                                                user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'MANAGER' ? 'badge-success' :
                                                        user.role === 'TEAM_LEADER' ? 'bg-indigo-100 text-indigo-700' :
                                                            'badge-secondary'
                                                }`}>
                                                {user.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => toggleUserStatus(user)}
                                                className={`px-3 py-1 rounded-full text-xs font-bold ${user.isActive ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                                                    }`}
                                            >
                                                {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="text-xs space-y-1">
                                                <p><span className="text-secondary-400">Subs:</span> {user._count.assignedSubscriptions}</p>
                                                <p><span className="text-secondary-400">Tasks:</span> {user._count.tasks}</p>
                                            </div>
                                        </td>
                                        <td className="text-xs text-secondary-500">
                                            <FormattedDate date={user.createdAt} />
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {userRole === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN' && (
                                                    <button
                                                        onClick={() => handleImpersonate(user.id)}
                                                        className="p-2 border border-primary-200 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors flex items-center gap-1 text-xs font-bold"
                                                        title="Login as this user"
                                                    >
                                                        <span>👤</span> Login As
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-2 border border-secondary-200 rounded-lg text-secondary-600 hover:bg-secondary-50 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">Invite Staff Member</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="label">Work Email</label>
                                <input name="email" type="email" className="input" required placeholder="staff@stm.com" />
                            </div>
                            <div>
                                <label className="label">Temporary Password</label>
                                <input name="password" type="password" className="input" required placeholder="••••••••" />
                            </div>

                            {userRole === 'SUPER_ADMIN' && (
                                <div>
                                    <label className="label">Assign to Company</label>
                                    <select name="companyId" className="input" required>
                                        <option value="">Select a company...</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="label">System Role</label>
                                <select name="role" className="input" required>
                                    <option value="SALES_EXECUTIVE">Sales Executive</option>
                                    <option value="TEAM_LEADER">Team Leader</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="FINANCE_ADMIN">Finance Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
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
                                    {actionLoading ? 'Creating...' : 'Invite Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">Edit User</h2>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="label">Work Email (Read Only)</label>
                                <input type="email" className="input bg-secondary-100" value={editingUser.email} disabled />
                            </div>
                            <div>
                                <label className="label">New Password (Optional)</label>
                                <input name="password" type="password" className="input" placeholder="Leave blank to keep current" />
                            </div>
                            <div>
                                <label className="label">System Role</label>
                                <select name="role" className="input" defaultValue={editingUser.role} required>
                                    <option value="SALES_EXECUTIVE">Sales Executive</option>
                                    <option value="TEAM_LEADER">Team Leader</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="FINANCE_ADMIN">Finance Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="btn btn-primary px-8"
                                >
                                    {actionLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Assign Modal */}
            {showBulkAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-secondary-900 mb-2 font-primary">Bulk Customer Assignment</h2>
                        <p className="text-secondary-500 mb-6">Assign multiple customers to a Sales Executive based on filters.</p>

                        <form onSubmit={handleBulkAssign} className="space-y-4">
                            <div>
                                <label className="label">Target Sales Executive</label>
                                <select name="assignedToUserId" className="input" required>
                                    <option value="">Select Staff...</option>
                                    {users.filter(u => ['SALES_EXECUTIVE', 'MANAGER'].includes(u.role)).map(u => (
                                        <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-4 bg-secondary-50 rounded-xl space-y-3">
                                <h4 className="font-bold text-xs text-secondary-500 uppercase tracking-widest">Filter Criteria</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="label text-xs">Country</label>
                                        <input name="country" className="input text-sm" placeholder="e.g. India" />
                                    </div>
                                    <div>
                                        <label className="label text-xs">State</label>
                                        <input name="state" className="input text-sm" placeholder="e.g. Delhi" />
                                    </div>
                                    <div>
                                        <label className="label text-xs">Customer Type</label>
                                        <select name="customerType" className="input text-sm">
                                            <option value="">Any</option>
                                            <option value="INSTITUTION">Institution</option>
                                            <option value="AGENCY">Agency</option>
                                            <option value="INDIVIDUAL">Individual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label text-xs">Org Name (Contains)</label>
                                        <input name="organizationName" className="input text-sm" placeholder="e.g. Agency ABC" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-secondary-400 italic mt-2">
                                    Note: All matching customers will be re-assigned to the selected staff member.
                                </p>
                            </div>

                            <div className="flex justify-end space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkAssignModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="btn btn-primary px-8"
                                >
                                    {actionLoading ? 'Processing...' : 'Assign Customers'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
