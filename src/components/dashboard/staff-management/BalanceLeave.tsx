'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface BalanceLeaveProps {
    filters: any;
}

interface LeaveBalance {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    department: string;
    annual: number;
    sick: number;
    casual: number;
    compensatory: number;
    used: {
        annual: number;
        sick: number;
        casual: number;
        compensatory: number;
    };
    pending: {
        annual: number;
        sick: number;
        casual: number;
        compensatory: number;
    };
}

export default function BalanceLeave({ filters }: BalanceLeaveProps) {
    const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBalance, setEditingBalance] = useState<LeaveBalance | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        const fetchLeaveBalances = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);
                if (filters.teamId !== 'all') params.append('departmentId', filters.teamId);
                if (filters.employeeId !== 'all') params.append('employeeId', filters.employeeId);

                const res = await fetch(`/api/staff-management/leaves/balance?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setLeaveBalances(data);
                }
            } catch (err) {
                console.error('Error fetching leave balances:', err);
                toast.error('Failed to fetch leave balances');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaveBalances();
    }, [filters]);

    const handleUpdateBalance = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingBalance) return;

        const formData = new FormData(e.currentTarget);
        const data = {
            annual: parseFloat(formData.get('annual') as string) || 0,
            sick: parseFloat(formData.get('sick') as string) || 0,
            casual: parseFloat(formData.get('casual') as string) || 0,
            compensatory: parseFloat(formData.get('compensatory') as string) || 0,
        };

        try {
            const res = await fetch(`/api/staff-management/leaves/balance/${editingBalance.employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                toast.success('Leave balance updated successfully');
                setShowEditModal(false);
                setEditingBalance(null);
                // Refresh data
                window.location.reload();
            } else {
                toast.error('Failed to update leave balance');
            }
        } catch (err) {
            console.error('Error updating leave balance:', err);
            toast.error('An error occurred');
        }
    };

    const getAvailable = (total: number, used: number) => Math.max(0, total - used);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-secondary-900">Leave Balance Management</h2>
                    <p className="text-sm text-secondary-500">Manage and track employee leave balances</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Annual Leave</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {leaveBalances.reduce((sum, b) => sum + getAvailable(b.annual, b.used.annual), 0)}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">📅</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Sick Leave</p>
                            <p className="text-2xl font-bold text-green-600">
                                {leaveBalances.reduce((sum, b) => sum + getAvailable(b.sick, b.used.sick), 0)}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">🏥</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Casual Leave</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {leaveBalances.reduce((sum, b) => sum + getAvailable(b.casual, b.used.casual), 0)}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">🎉</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Compensatory</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {leaveBalances.reduce((sum, b) => sum + getAvailable(b.compensatory, b.used.compensatory), 0)}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">🔄</div>
                    </div>
                </div>
            </div>

            {/* Leave Balance Table */}
            {
                loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Annual</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Sick</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Casual</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Compensatory</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Total Available</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-200">
                                    {leaveBalances.map((balance) => {
                                        const totalAvailable =
                                            getAvailable(balance.annual, balance.used.annual) +
                                            getAvailable(balance.sick, balance.used.sick) +
                                            getAvailable(balance.casual, balance.used.casual) +
                                            getAvailable(balance.compensatory, balance.used.compensatory);

                                        return (
                                            <tr key={balance.id} className="hover:bg-secondary-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                                                            {balance.employeeName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="ml-2">
                                                            <p className="text-sm font-medium text-secondary-900">{balance.employeeName}</p>
                                                            <p className="text-xs text-secondary-500">{balance.department}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-sm font-bold text-secondary-900">
                                                        {getAvailable(balance.annual, balance.used.annual)}
                                                    </div>
                                                    <div className="text-xs text-secondary-500">
                                                        / {balance.annual}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-sm font-bold text-secondary-900">
                                                        {getAvailable(balance.sick, balance.used.sick)}
                                                    </div>
                                                    <div className="text-xs text-secondary-500">
                                                        / {balance.sick}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-sm font-bold text-secondary-900">
                                                        {getAvailable(balance.casual, balance.used.casual)}
                                                    </div>
                                                    <div className="text-xs text-secondary-500">
                                                        / {balance.casual}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-sm font-bold text-secondary-900">
                                                        {getAvailable(balance.compensatory, balance.used.compensatory)}
                                                    </div>
                                                    <div className="text-xs text-secondary-500">
                                                        / {balance.compensatory}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
                                                        {totalAvailable}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setEditingBalance(balance);
                                                            setShowEditModal(true);
                                                        }}
                                                        className="text-primary-600 hover:text-primary-800 text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {leaveBalances.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-secondary-500">No leave balances found</p>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Edit Modal */}
            {
                showEditModal && editingBalance && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                            <div className="p-6 border-b border-secondary-200">
                                <h3 className="text-lg font-semibold text-secondary-900">Update Leave Balance</h3>
                                <p className="text-sm text-secondary-500">{editingBalance.employeeName}</p>
                            </div>
                            <form onSubmit={handleUpdateBalance} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">Annual Leave</label>
                                        <input
                                            type="number"
                                            name="annual"
                                            defaultValue={editingBalance.annual}
                                            min="0"
                                            step="0.5"
                                            className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">Sick Leave</label>
                                        <input
                                            type="number"
                                            name="sick"
                                            defaultValue={editingBalance.sick}
                                            min="0"
                                            step="0.5"
                                            className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">Casual Leave</label>
                                        <input
                                            type="number"
                                            name="casual"
                                            defaultValue={editingBalance.casual}
                                            min="0"
                                            step="0.5"
                                            className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">Compensatory</label>
                                        <input
                                            type="number"
                                            name="compensatory"
                                            defaultValue={editingBalance.compensatory}
                                            min="0"
                                            step="0.5"
                                            className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditingBalance(null);
                                        }}
                                        className="flex-1 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg text-sm font-medium hover:bg-secondary-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                    >
                                        Update
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
