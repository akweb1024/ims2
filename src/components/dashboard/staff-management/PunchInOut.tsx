'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface PunchInOutProps {
    filters: any;
}

export default function PunchInOut({ filters }: PunchInOutProps) {
    const [punchRecords, setPunchRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showManualEntry, setShowManualEntry] = useState(false);

    const [manualEntry, setManualEntry] = useState({
        employeeId: '',
        date: selectedDate,
        punchIn: '',
        punchOut: '',
        punchInLocation: '',
        punchOutLocation: ''
    });

    useEffect(() => {
        const fetchPunchRecords = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.append('date', selectedDate);
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);
                if (filters.teamId !== 'all') params.append('departmentId', filters.teamId);
                if (filters.employeeId !== 'all') params.append('employeeId', filters.employeeId);

                const res = await fetch(`/api/staff-management/punch?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setPunchRecords(data);
                }
            } catch (err) {
                console.error('Error fetching punch records:', err);
                toast.error('Failed to fetch punch records');
            } finally {
                setLoading(false);
            }
        };

        fetchPunchRecords();
    }, [filters, selectedDate]);

    const handleManualEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/staff-management/punch/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(manualEntry)
            });

            if (res.ok) {
                toast.success('Punch entry added successfully');
                setShowManualEntry(false);
                window.location.reload();
            } else {
                toast.error('Failed to add punch entry');
            }
        } catch (err) {
            console.error('Error adding punch entry:', err);
            toast.error('An error occurred');
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (!confirm('Are you sure you want to delete this punch entry?')) return;

        try {
            const res = await fetch(`/api/staff-management/punch/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Punch entry deleted successfully');
                setPunchRecords(punchRecords.filter(r => r.id !== id));
            } else {
                toast.error('Failed to delete punch entry');
            }
        } catch (err) {
            console.error('Error deleting punch entry:', err);
            toast.error('An error occurred');
        }
    };

    // Summary
    const summary = {
        total: punchRecords.length,
        completed: punchRecords.filter(r => r.punchOut).length,
        pending: punchRecords.filter(r => !r.punchOut).length,
        late: punchRecords.filter(r => r.status === 'LATE').length
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-secondary-900">Punch In/Out Management</h2>
                    <p className="text-sm text-secondary-500">Track employee punch in and out times</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {/* Button Removed: Use Attendance Tab for Manual Entry */}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Total Records</p>
                            <p className="text-2xl font-bold text-secondary-900">{summary.total}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">📊</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">✅</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Pending</p>
                            <p className="text-2xl font-bold text-orange-600">{summary.pending}</p>
                        </div>
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">⏳</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Late Arrivals</p>
                            <p className="text-2xl font-bold text-red-600">{summary.late}</p>
                        </div>
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">🕒</div>
                    </div>
                </div>
            </div>

            {/* Punch Records Table */}
            {loading ? (
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
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Punch In</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Punch Out</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Working Hours</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-200">
                                {punchRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                                                    {record.employeeName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-2">
                                                    <p className="text-sm font-medium text-secondary-900">{record.employeeName}</p>
                                                    <p className="text-xs text-secondary-500">{record.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {new Date(record.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {record.punchIn ? (
                                                <div>
                                                    <span className="font-medium">{new Date(record.punchIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {record.punchInLocation && (
                                                        <p className="text-xs text-secondary-400">{record.punchInLocation}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-secondary-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {record.punchOut ? (
                                                <div>
                                                    <span className="font-medium">{new Date(record.punchOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {record.punchOutLocation && (
                                                        <p className="text-xs text-secondary-400">{record.punchOutLocation}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-secondary-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600 font-medium">
                                            {record.workingHours ? `${record.workingHours.toFixed(1)} hrs` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                record.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                    record.status === 'LATE' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteEntry(record.id)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {punchRecords.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-secondary-500">No punch records found for this date</p>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Entry Modal Removed - Consolidated in AttendanceManagement */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
                <p className="text-blue-700 text-sm">
                    ℹ️ Manual punch entries has been consolidated. Please use the <strong>Attendance</strong> tab to add or edit attendance records manually.
                </p>
            </div>
        </div>
    );
}
