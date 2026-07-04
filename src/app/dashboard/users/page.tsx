'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import FormattedDate from '@/components/common/FormattedDate';
import DataTransferActions from '@/components/dashboard/DataTransferActions';

function UsersContent() {
    const searchParams = useSearchParams();
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [showNewModal, setShowNewModal] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deletePreview, setDeletePreview] = useState<any>(null);
    const [expandedDeleteDependencies, setExpandedDeleteDependencies] = useState<Record<string, boolean>>({});
    const [deleteSearchTerm, setDeleteSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
            if (user.role === 'SUPER_ADMIN') {
                fetchCompanies();
            }
            // Fetch departments and designations for all users
            fetchDepartments();
            fetchDesignations();
        }
    }, []);

    const fetchUsers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(searchTerm)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.pagination) {
                    setUsers(data.data);
                    setPagination(data.pagination);
                } else {
                    setUsers(data);
                }
            }
        } catch (err) {
            // console.error(err); // Removed console.error
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(pagination.page);
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchUsers, pagination.page]);

    const fetchCompanies = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/companies', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setCompanies(result.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch companies', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/departments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setDepartments(result.data || result || []);
            }
        } catch (err) {
            console.error('Failed to fetch departments', err);
        }
    };

    const fetchDesignations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/designations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setDesignations(result.data || result || []);
            }
        } catch (err) {
            console.error('Failed to fetch designations', err);
        }
    };

    // Helper to get assignable roles based on current user's role
    const getAssignableRoles = (currentUserRole: string) => {
        const roles = [
            { value: 'EXECUTIVE', label: 'Executive' },
            { value: 'TEAM_LEADER', label: 'Team Leader' },
            { value: 'MANAGER', label: 'Manager' },
            { value: 'ADMIN', label: 'Admin' },
            { value: 'FINANCE_ADMIN', label: 'Finance Admin' },
            { value: 'SUPER_ADMIN', label: 'Super Admin' },
        ];

        if (currentUserRole === 'SUPER_ADMIN') return roles;
        if (currentUserRole === 'ADMIN') return roles.filter(r => ['EXECUTIVE', 'TEAM_LEADER', 'MANAGER'].includes(r.value));
        if (currentUserRole === 'MANAGER') return roles.filter(r => ['EXECUTIVE', 'TEAM_LEADER'].includes(r.value));
        if (currentUserRole === 'TEAM_LEADER') return roles.filter(r => ['EXECUTIVE'].includes(r.value));

        return [];
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
            name: formData.get('name'),
        };
        if (userRole === 'SUPER_ADMIN') {
            payload.email = formData.get('email');
            payload.companyId = formData.get('companyId');
        }
        const password = formData.get('password') as string;
        if (password && password.trim().length > 0) payload.password = password;

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
    };

    const loadDeletePreview = async (user: any) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/${user.id}/delete-preview`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || 'Failed to load delete preview');
                return;
            }

            const preview = await res.json();
            setDeleteTarget(user);
            setDeletePreview(preview);
            setShowDeleteModal(true);
        } catch (err) {
            alert('Error loading delete preview');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeactivateUser = async (userId: string) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setUsers(users.filter(u => u.id !== userId));
                setPagination(prev => ({ ...prev, total: prev.total - 1 }));
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to deactivate user');
            }
        } catch (err) {
            alert('Error deactivating user');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePermanentDeleteUser = async () => {
        if (!deleteTarget) return;
        if (!confirm('This will permanently delete the user and clear linked records that block deletion. Continue?')) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/${deleteTarget.id}?mode=hard`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setUsers(users.filter(u => u.id !== deleteTarget.id));
                setPagination(prev => ({ ...prev, total: prev.total - 1 }));
                setShowDeleteModal(false);
                setDeleteTarget(null);
                setDeletePreview(null);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || 'Failed to permanently delete user');
            }
        } catch (err) {
            alert('Error permanently deleting user');
        } finally {
            setActionLoading(false);
        }
    };

    const toggleDeleteDependency = (key: string) => {
        setExpandedDeleteDependencies((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const renderHighlightedText = (value: string, query: string) => {
        if (!query.trim()) return value;

        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = value.split(new RegExp(`(${escaped})`, 'gi'));
        return parts.map((part, index) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <mark
                    key={`${part}-${index}`}
                    className="rounded-md bg-primary/10 px-1 py-0.5 font-medium text-primary ring-1 ring-inset ring-primary/15 dark:bg-primary/30 dark:text-primary-foreground dark:ring-primary/40"
                >
                    {part}
                </mark>
            ) : (
                <span key={`${part}-${index}`}>{part}</span>
            )
        );
    };

    const setAllDeleteDependencies = (expanded: boolean) => {
        if (!deletePreview?.dependencies?.length) return;

        const nextState: Record<string, boolean> = {};
        deletePreview.dependencies.forEach((dep: any) => {
            nextState[`${dep.table}.${dep.column}`] = expanded;
        });
        setExpandedDeleteDependencies(nextState);
    };

    const filteredDeleteDependencies = (deletePreview?.dependencies || []).filter((dep: any) => {
        if (!deleteSearchTerm.trim()) return true;

        const haystack = [
            dep.table,
            dep.column,
            dep.action,
            ...(dep.samples || []).flatMap((sample: any) => [
                sample.label,
                sample.id,
                sample.details
            ])
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return haystack.includes(deleteSearchTerm.toLowerCase());
    });

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

                // 1. Establish NextAuth Session using the token
                const result = await signIn('credentials', {
                    token: data.token,
                    redirect: false
                });

                if (result?.error) {
                    alert('Session establishment failed: ' + result.error);
                    return;
                }

                // 2. Store original admin token to revert back
                // Only store if not already impersonating
                if (!localStorage.getItem('adminToken')) {
                    localStorage.setItem('adminToken', token!);
                    if (localStorage.getItem('user')) {
                        localStorage.setItem('adminUser', localStorage.getItem('user')!);
                    }
                }

                // 3. Set impersonated credentials locally
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // 4. Reload to apply session
                window.location.href = '/dashboard';
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to impersonate');
            }
        } catch (err) {
            console.error('Impersonation error:', err);
            alert('Impersonation error encountered');
        }
    };

    return (
        <>
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
                        <Link
                            href="/dashboard/users/transfer"
                            className="btn btn-secondary bg-white border-secondary-200"
                        >
                            🔄 Transfer Employee
                        </Link>
                        <DataTransferActions type="users" onSuccess={fetchUsers} />
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="btn btn-primary px-6"
                        >
                            + Add New Employee
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="card-premium p-4">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Search users by name, email or role..."
                            className="input pl-10 w-full"
                            value={searchTerm}
                            title="Search Users"
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
                            }}
                        />
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
                                                <Link href={`/dashboard/hr-management/employees/${user.id}`} className="hover:opacity-80 transition-opacity">
                                                    <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center font-bold text-secondary-600 mr-3">
                                                        {(user.name?.[0] || user.email.charAt(0)).toUpperCase()}
                                                    </div>
                                                </Link>
                                                <div>
                                                    <Link href={`/dashboard/hr-management/employees/${user.id}`} className="hover:underline">
                                                        <p className="text-sm font-bold text-secondary-900 leading-tight">{user.name || user.email.split('@')[0]}</p>
                                                    </Link>
                                                    <p className="text-[10px] text-secondary-500 font-medium">{user.email}</p>
                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                        <span className="text-[9px] font-black text-primary-600 uppercase tracking-tighter">
                                                            {user.employeeProfile?.designatRef?.name || user.employeeProfile?.designation || 'Specialist'}
                                                        </span>
                                                        {user.company?.name && (
                                                            <>
                                                                <span className="text-[9px] text-secondary-300">•</span>
                                                                <span className="text-[9px] font-bold text-secondary-500 uppercase tracking-tighter">{user.company.name}</span>
                                                            </>
                                                        )}
                                                        {user.department?.name && (
                                                            <>
                                                                <span className="text-[9px] text-secondary-300">•</span>
                                                                <span className="text-[9px] font-bold text-secondary-400 uppercase tracking-tighter">{user.department.name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.role === 'SUPER_ADMIN' ? 'badge-primary' :
                                                user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' :
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
                                                <Link
                                                    href={`/dashboard/hr-management/employees/${user.id}`}
                                                    className="p-2 border border-secondary-200 rounded-lg text-secondary-600 hover:bg-secondary-50 transition-colors flex items-center justify-center"
                                                    title="View Detailed Profile"
                                                >
                                                    View
                                                </Link>
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-2 border border-secondary-200 rounded-lg text-secondary-600 hover:bg-secondary-50 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && user.role !== 'SUPER_ADMIN' && (
                                                    <button
                                                        onClick={() => loadDeletePreview(user)}
                                                        className="p-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Delete or Deactivate User"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {!loading && users.length > 0 && (
                        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-100 flex items-center justify-between">
                            <div className="text-sm text-secondary-500">
                                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> users
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    className="px-3 py-1 bg-white border border-secondary-200 rounded-md text-sm disabled:opacity-50 hover:bg-secondary-50"
                                    disabled={pagination.page === 1}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    Previous
                                </button>
                                <button
                                    className="px-3 py-1 bg-white border border-secondary-200 rounded-md text-sm disabled:opacity-50 hover:bg-secondary-50"
                                    disabled={pagination.page === pagination.totalPages}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">Add New Employee</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            {/* Basic Information */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Full Name *</label>
                                    <input name="name" type="text" className="input" required placeholder="John Doe" title="Full Name" />
                                </div>
                                <div>
                                    <label className="label">Work Email *</label>
                                    <input name="email" type="email" className="input" required placeholder="staff@stm.com" title="Work Email" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Temporary Password *</label>
                                    <input name="password" type="password" className="input" required placeholder="••••••••" title="Temporary Password" />
                                </div>
                                <div>
                                    <label className="label">Phone Number</label>
                                    <input name="phone" type="tel" className="input" placeholder="+91 9876543210" title="Phone Number" />
                                </div>
                            </div>

                            {/* Company & Role */}
                            {userRole === 'SUPER_ADMIN' && (
                                <div>
                                    <label className="label">Assign to Company *</label>
                                    <select name="companyId" className="input" required title="Select Company">
                                        <option value="">Select a company...</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Department</label>
                                    <select name="departmentId" className="input" title="Select Department">
                                        <option value="">Select a department...</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Designation</label>
                                    <select name="designationId" className="input" title="Select Designation">
                                        <option value="">Select a designation...</option>
                                        {designations.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">System Role *</label>
                                    <select name="role" className="input" required title="System Role">
                                        {getAssignableRoles(userRole).map(role => (
                                            <option key={role.value} value={role.value}>{role.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Date of Joining</label>
                                    <input name="dateOfJoining" type="date" className="input" title="Date of Joining" />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-secondary-200">
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
                                    {actionLoading ? 'Creating...' : 'Add Employee'}
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
                                <label className="label">Full Name</label>
                                <input
                                    name="name"
                                    type="text"
                                    className="input"
                                    defaultValue={editingUser.name}
                                    placeholder="Enter full name"
                                    title="Full Name"
                                />
                            </div>
                            <div>
                                <label className="label">Work Email {userRole !== 'SUPER_ADMIN' && '(Read Only)'}</label>
                                <input
                                    name="email"
                                    type="email"
                                    className={`input ${userRole !== 'SUPER_ADMIN' ? 'bg-secondary-100' : ''}`}
                                    defaultValue={editingUser.email}
                                    readOnly={userRole !== 'SUPER_ADMIN'}
                                    required={userRole === 'SUPER_ADMIN'}
                                    title="Work Email"
                                />
                            </div>
                            <div>
                                <label className="label">New Password (Optional)</label>
                                <input name="password" type="password" className="input" placeholder="Leave blank to keep current" title="New Password" />
                            </div>
                            {userRole === 'SUPER_ADMIN' && (
                                <div>
                                    <label className="label">Primary Company</label>
                                    <select name="companyId" className="input" defaultValue={editingUser.companyId} required title="Primary Company">
                                        <option value="">None / System Staff</option>
                                        {Array.isArray(companies) && companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-secondary-400 mt-1 italic">Note: Transferring will reset designation.</p>
                                </div>
                            )}
                            <div>
                                <label className="label">System Role</label>
                                <select name="role" className="input" defaultValue={editingUser.role} required title="System Role">
                                    {getAssignableRoles(userRole).map(role => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
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
                        <p className="text-secondary-500 mb-6">Assign multiple customers to a Executive based on filters.</p>

                        <form onSubmit={handleBulkAssign} className="space-y-4">
                            <div>
                                <label className="label">Target Executive</label>
                                <select name="assignedToUserId" className="input" required title="Target Executive">
                                    <option value="">Select Staff...</option>
                                    {users.filter(u => ['EXECUTIVE', 'MANAGER'].includes(u.role)).map(u => (
                                        <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-4 bg-secondary-50 rounded-xl space-y-3">
                                <h4 className="font-bold text-xs text-secondary-500 uppercase tracking-widest">Filter Criteria</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="label text-xs">Country</label>
                                        <input name="country" className="input text-sm" placeholder="e.g. India" title="Country" />
                                    </div>
                                    <div>
                                        <label className="label text-xs">State</label>
                                        <input name="state" className="input text-sm" placeholder="e.g. Delhi" title="State" />
                                    </div>
                                    <div>
                                        <label className="label text-xs">Account Type</label>
                                        <select name="customerType" className="input text-sm" title="Account Type">
                                            <option value="">Any</option>
                                            <option value="INSTITUTION">Institution</option>
                                            <option value="AGENCY">Agency</option>
                                            <option value="INDIVIDUAL">Individual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label text-xs">Org Name (Contains)</label>
                                        <input name="organizationName" className="input text-sm" placeholder="e.g. Agency ABC" title="Organization Name" />
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

            {/* Delete Preview Modal */}
            {showDeleteModal && deleteTarget && deletePreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <h2 className="text-2xl font-bold text-secondary-900">Delete user</h2>
                                <p className="text-secondary-500 mt-1">
                                    Review the linked records before choosing a permanent delete.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteTarget(null);
                                    setDeletePreview(null);
                                    setExpandedDeleteDependencies({});
                                    setDeleteSearchTerm('');
                                }}
                                className="rounded-full border border-secondary-200 px-3 py-1 text-secondary-500 hover:bg-secondary-50"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="rounded-2xl border border-secondary-200 bg-secondary-50 p-4 mb-5">
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-bold text-secondary-900">
                                    {deletePreview.user?.name || deletePreview.user?.email}
                                </p>
                                <p className="text-xs text-secondary-500">
                                    {deletePreview.user?.email} • {deletePreview.user?.role}
                                </p>
                                <p className="text-[11px] text-secondary-400 mt-1">
                                    Permanent delete will remove or clear linked records that block deletion. Soft delete only deactivates the user.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-secondary-900">Linked records</h3>
                                <span className="text-xs font-semibold text-secondary-500">
                                    {deletePreview.totalDependencies || 0} total linked rows
                                </span>
                            </div>

                            <div className="flex flex-col gap-3 rounded-2xl border border-secondary-200 bg-secondary-50 p-4 md:flex-row md:items-center md:justify-between">
                                <div className="relative flex-1">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">🔎</span>
                                    <input
                                        type="text"
                                        value={deleteSearchTerm}
                                        onChange={(e) => setDeleteSearchTerm(e.target.value)}
                                        placeholder="Search tables, sample names, IDs..."
                                        className="input pl-10 bg-white"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAllDeleteDependencies(true)}
                                        disabled={filteredDeleteDependencies.length === 0}
                                        className="btn btn-secondary"
                                    >
                                        Expand all
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAllDeleteDependencies(false)}
                                        disabled={filteredDeleteDependencies.length === 0}
                                        className="btn btn-secondary"
                                    >
                                        Collapse all
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-secondary-200 bg-white">
                                {filteredDeleteDependencies.length > 0 ? (
                                    <div className="divide-y divide-secondary-100">
                                        {filteredDeleteDependencies.map((dep: any) => {
                                            const depKey = `${dep.table}.${dep.column}`;
                                            const isExpanded = !!expandedDeleteDependencies[depKey];
                                            const visibleSamples = isExpanded ? dep.samples : dep.samples.slice(0, 3);

                                            return (
                                                <div key={depKey} className="bg-white">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleDeleteDependency(depKey)}
                                                        aria-expanded={isExpanded}
                                                        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary-50"
                                                    >
                                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                                                            dep.action === 'delete'
                                                                ? 'border-red-200 bg-red-50 text-red-600'
                                                                : dep.action === 'nullify'
                                                                    ? 'border-amber-200 bg-amber-50 text-amber-600'
                                                                    : 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                            <svg
                                                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </span>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-secondary-900">
                                                                    {renderHighlightedText(dep.table, deleteSearchTerm)}
                                                                </p>
                                                                <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-secondary-500">
                                                                    {renderHighlightedText(dep.column, deleteSearchTerm)}
                                                                </span>
                                                            </div>
                                                            <p className="mt-0.5 text-[11px] text-secondary-500">
                                                                {dep.count} linked row{dep.count === 1 ? '' : 's'}
                                                            </p>
                                                        </div>

                                                        <div className="flex shrink-0 items-center gap-2">
                                                            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${
                                                                dep.action === 'delete'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : dep.action === 'nullify'
                                                                        ? 'bg-amber-100 text-amber-700'
                                                                        : 'bg-emerald-100 text-emerald-700'
                                                            }`}>
                                                                {dep.action}
                                                            </span>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-secondary-400">
                                                                {isExpanded ? 'Collapse' : 'Expand'}
                                                            </span>
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="border-t border-secondary-100 bg-secondary-50 px-4 py-4">
                                                            <div className="mb-3 flex items-center justify-between">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary-500">
                                                                    Sample records
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleDeleteDependency(depKey)}
                                                                    className="text-[10px] font-bold text-primary hover:underline"
                                                                >
                                                                    Show fewer
                                                                </button>
                                                            </div>

                                                            {dep.samples?.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {visibleSamples.map((sample: any) => (
                                                                        <div key={`${dep.table}-${sample.id || sample.label}`} className="rounded-xl border border-secondary-200 bg-white px-3 py-2 shadow-sm">
                                                                            <p className="text-sm font-semibold text-secondary-900 leading-tight">
                                                                                {renderHighlightedText(sample.label, deleteSearchTerm)}
                                                                            </p>
                                                                            <p className="text-[10px] text-secondary-500 mt-0.5">
                                                                                {sample.id ? (
                                                                                    <>
                                                                                        {renderHighlightedText(`ID: ${sample.id}`, deleteSearchTerm)}
                                                                                    </>
                                                                                ) : (
                                                                                    'No record ID'
                                                                                )}
                                                                                {sample.details ? (
                                                                                    <>
                                                                                        {' • '}
                                                                                        {renderHighlightedText(sample.details, deleteSearchTerm)}
                                                                                    </>
                                                                                ) : null}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                    {dep.samples.length > 3 && !isExpanded && (
                                                                        <p className="text-[10px] font-semibold text-secondary-400">
                                                                            +{dep.samples.length - 3} more
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-secondary-400">No sample rows available.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="px-4 py-8 text-center text-sm text-secondary-500">
                                        {deleteSearchTerm.trim()
                                            ? 'No linked rows match your search.'
                                            : 'No linked rows found. This user should be safe to delete permanently.'}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => handleDeactivateUser(deleteTarget.id)}
                                disabled={actionLoading}
                                className="btn btn-secondary"
                            >
                                Deactivate Instead
                            </button>
                            <button
                                type="button"
                                onClick={handlePermanentDeleteUser}
                                disabled={actionLoading}
                                className="btn btn-danger bg-red-600 text-white hover:bg-red-700"
                            >
                                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function UsersPage() {
    return (
        <Suspense fallback={
            <>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </>
        }>
            <UsersContent />
        </Suspense>
    );
}
