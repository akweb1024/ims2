'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
    Plus, Filter, Search, Eye, Edit, Trash2, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import FormattedDate from '@/components/common/FormattedDate';

export default function IncrementList({ initialIncrements }: { initialIncrements: any[] }) {
    const router = useRouter();
    const [increments, setIncrements] = useState(initialIncrements);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setCurrentUser(JSON.parse(userData));
        }
    }, []);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const handleDelete = async (id: string, status: string) => {
        const message = status === 'DRAFT'
            ? 'Are you sure you want to delete this increment draft?'
            : `WARNING: This increment is in ${status} status. Deleting it may affect payroll and history. Are you sure you want to proceed?`;

        if (!confirm(message)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/increments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setIncrements(increments.filter(inc => inc.id !== id));
                alert('Increment deleted successfully');
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error deleting increment:', error);
        }
    };

    const filteredIncrements = increments.filter(inc => {
        const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
        const matchesSearch = searchQuery === '' ||
            inc.employeeProfile?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inc.employeeProfile?.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        const badges: any = {
            'DRAFT': { color: 'bg-secondary-100 text-secondary-700', icon: Clock },
            'MANAGER_APPROVED': { color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
            'APPROVED': { color: 'bg-success-100 text-success-700', icon: CheckCircle },
            'REJECTED': { color: 'bg-danger-100 text-danger-700', icon: XCircle }
        };

        const badge = badges[status] || badges['DRAFT'];
        const Icon = badge.icon;

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${badge.color}`}>
                <Icon size={14} />
                {status.replace('_', ' ')}
            </span>
        );
    };

    const stats = {
        total: filteredIncrements.length,
        draft: filteredIncrements.filter(i => i.status === 'DRAFT').length,
        pending: filteredIncrements.filter(i => i.status === 'MANAGER_APPROVED').length,
        approved: filteredIncrements.filter(i => i.status === 'APPROVED').length,
        rejected: filteredIncrements.filter(i => i.status === 'REJECTED').length
    };

    return (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="card-premium p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary-100 rounded-xl">
                            <DollarSign className="text-primary-600" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500 font-bold uppercase">Total</p>
                            <p className="text-2xl font-black text-secondary-900">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="card-premium p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-secondary-100 rounded-xl">
                            <Clock className="text-secondary-600" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500 font-bold uppercase">Drafts</p>
                            <p className="text-2xl font-black text-secondary-900">{stats.draft}</p>
                        </div>
                    </div>
                </div>

                <div className="card-premium p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <AlertCircle className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500 font-bold uppercase">Pending Admin</p>
                            <p className="text-2xl font-black text-secondary-900">{stats.pending}</p>
                        </div>
                    </div>
                </div>

                <div className="card-premium p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-success-100 rounded-xl">
                            <CheckCircle className="text-success-600" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500 font-bold uppercase">Approved</p>
                            <p className="text-2xl font-black text-secondary-900">{stats.approved}</p>
                        </div>
                    </div>
                </div>

                <div className="card-premium p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-danger-100 rounded-xl">
                            <XCircle className="text-danger-600" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500 font-bold uppercase">Rejected</p>
                            <p className="text-2xl font-black text-secondary-900">{stats.rejected}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card-premium p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by employee name or email..."
                                className="input-premium pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-secondary-400" />
                        <select
                            className="input-premium"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="MANAGER_APPROVED">Manager Approved</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Increments Table */}
            <div className="card-premium overflow-hidden">
                {filteredIncrements.length === 0 ? (
                    <div className="p-12 text-center">
                        <DollarSign className="mx-auto text-secondary-300" size={48} />
                        <p className="text-secondary-600 mt-4">No increments found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-600 uppercase">Employee</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-600 uppercase text-center">FY</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-600 uppercase">Old Salary</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-600 uppercase">New Salary</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-600 uppercase">Increment</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-600 uppercase">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-600 uppercase">Effective Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {filteredIncrements.map((increment) => (
                                    <tr key={increment.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-secondary-900">
                                                    {increment.employeeProfile?.user?.name}
                                                </p>
                                                <p className="text-xs text-secondary-500">
                                                    {increment.employeeProfile?.user?.email}
                                                </p>
                                                {increment.newDesignation && increment.newDesignation !== increment.previousDesignation && (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                                        <TrendingUp size={10} />
                                                        PROMOTION
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-black">
                                                {increment.fiscalYear || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-secondary-900">
                                                ₹{increment.oldSalary?.toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-primary-600">
                                                ₹{increment.newSalary?.toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-success-600">
                                                    +₹{increment.incrementAmount?.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-secondary-500">
                                                    {increment.percentage?.toFixed(2)}%
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(increment.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <FormattedDate date={increment.effectiveDate} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/dashboard/hr-management/increments/${increment.id}`}
                                                    className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} className="text-primary-600" />
                                                </Link>

                                                <Link
                                                    href={`/dashboard/hr-management/increments/${increment.id}/edit`}
                                                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} className="text-blue-600" />
                                                </Link>

                                                <button
                                                    onClick={() => handleDelete(increment.id, increment.status)}
                                                    className="p-2 hover:bg-danger-100 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} className="text-danger-600" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
