'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface AttendanceManagementProps {
    filters: any;
}

export default function AttendanceManagement({ filters }: AttendanceManagementProps) {
    const [attendance, setAttendance] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
    const [showManualEntry, setShowManualEntry] = useState(false);

    // Manual entry form
    const [manualEntry, setManualEntry] = useState({
        employeeId: '',
        date: selectedDate,
        checkIn: '',
        checkOut: '',
        status: 'PRESENT',
        workMode: 'OFFICE',
        shift: 'GENERAL',
        remarks: ''
    });

    // Fetch employees for dropdown
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const params = new URLSearchParams();
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);

                const res = await fetch(`/api/staff-management/employees?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setEmployees(data);
                }
            } catch (err) {
                console.error('Error fetching employees:', err);
            }
        };

        fetchEmployees();
    }, [filters.companyId]);

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.append('date', selectedDate);
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);
                if (filters.teamId !== 'all') params.append('departmentId', filters.teamId);
                if (filters.employeeId !== 'all') params.append('employeeId', filters.employeeId);
                if (filters.status !== 'all') params.append('status', filters.status);
                if (filters.search) {
                    params.append('search', filters.search);
                    params.append('searchType', filters.searchType || 'all');
                }

                const res = await fetch(`/api/staff-management/attendance?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setAttendance(data);
                }
            } catch (err) {
                console.error('Error fetching attendance:', err);
                toast.error('Failed to fetch attendance');
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [filters, selectedDate]);

    const handleManualEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/staff-management/attendance/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(manualEntry)
            });

            if (res.ok) {
                toast.success('Attendance entry added successfully');
                setShowManualEntry(false);
                // Refresh attendance
                window.location.reload();
            } else {
                toast.error('Failed to add attendance entry');
            }
        } catch (err) {
            console.error('Error adding attendance:', err);
            toast.error('An error occurred');
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/staff-management/attendance/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                toast.success('Status updated successfully');
                setAttendance(attendance.map(a =>
                    a.id === id ? { ...a, status } : a
                ));
            } else {
                toast.error('Failed to update status');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error('An error occurred');
        }
    };

    // Calculate summary
    const summary = {
        present: attendance.filter(a => a.status === 'PRESENT').length,
        absent: attendance.filter(a => a.status === 'ABSENT').length,
        onLeave: attendance.filter(a => a.status === 'ON_LEAVE').length,
        halfDay: attendance.filter(a => a.status === 'HALF_DAY').length,
        late: attendance.filter(a => a.isLate).length
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-secondary-900">Attendance Management</h2>
                    <p className="text-sm text-secondary-500">Track and manage employee attendance</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                        onClick={() => setShowManualEntry(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                        + Manual Entry
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Present</p>
                            <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">✅</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Absent</p>
                            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                        </div>
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">❌</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">On Leave</p>
                            <p className="text-2xl font-bold text-yellow-600">{summary.onLeave}</p>
                        </div>
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">🏖️</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Half Day</p>
                            <p className="text-2xl font-bold text-orange-600">{summary.halfDay}</p>
                        </div>
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">⏰</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Late</p>
                            <p className="text-2xl font-bold text-purple-600">{summary.late}</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">🕒</div>
                    </div>
                </div>
            </div>

            {/* Attendance List */}
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
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Check In</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Check Out</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Working Hours</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-200">
                                {attendance.map((record) => (
                                    <tr key={record.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                                                    {record.employee?.user?.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-2">
                                                    <p className="text-sm font-medium text-secondary-900">{record.employee?.user?.name}</p>
                                                    <p className="text-xs text-secondary-500">{record.employee?.user?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {new Date(record.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            {record.isLate && <span className="ml-2 text-xs text-red-600 font-medium">(Late)</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {record.workingHours ? `${record.workingHours.toFixed(1)} hrs` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={record.status}
                                                onChange={(e) => handleStatusUpdate(record.id, e.target.value)}
                                                className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                                    record.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                                        record.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-orange-100 text-orange-700'
                                                    }`}
                                            >
                                                <option value="PRESENT">Present</option>
                                                <option value="ABSENT">Absent</option>
                                                <option value="ON_LEAVE">On Leave</option>
                                                <option value="HALF_DAY">Half Day</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setManualEntry({
                                                        employeeId: record.employeeId,
                                                        date: selectedDate,
                                                        checkIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
                                                        checkOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
                                                        status: record.status,
                                                        workMode: record.workFrom || 'OFFICE',
                                                        shift: 'GENERAL', // Defaulting as shift might be object
                                                        remarks: record.remarks || ''
                                                    });
                                                    setShowManualEntry(true);
                                                }}
                                                className="text-primary-600 hover:text-primary-800 text-sm"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {attendance.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-secondary-500">No attendance records found for this date</p>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Entry Modal */}
            {showManualEntry && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b border-secondary-200">
                            <h3 className="text-lg font-semibold text-secondary-900">Manual Attendance Entry</h3>
                        </div>
                        <form onSubmit={handleManualEntry} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Employee</label>
                                <select
                                    required
                                    value={manualEntry.employeeId}
                                    onChange={(e) => setManualEntry({ ...manualEntry, employeeId: e.target.value })}
                                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.user?.name || emp.name} - {emp.employeeCode || emp.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={manualEntry.date}
                                    onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
                                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Check In</label>
                                    <input
                                        type="time"
                                        value={manualEntry.checkIn}
                                        onChange={(e) => setManualEntry({ ...manualEntry, checkIn: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Check Out</label>
                                    <input
                                        type="time"
                                        value={manualEntry.checkOut}
                                        onChange={(e) => setManualEntry({ ...manualEntry, checkOut: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
                                    <select
                                        value={manualEntry.status}
                                        onChange={(e) => setManualEntry({ ...manualEntry, status: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="PRESENT">Present</option>
                                        <option value="ABSENT">Absent</option>
                                        <option value="ON_LEAVE">On Leave</option>
                                        <option value="HALF_DAY">Half Day</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Work Mode</label>
                                    <select
                                        value={manualEntry.workMode}
                                        onChange={(e) => setManualEntry({ ...manualEntry, workMode: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="OFFICE">Office</option>
                                        <option value="REMOTE">Remote</option>
                                        <option value="HYBRID">Hybrid</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Shift</label>
                                <select
                                    value={manualEntry.shift}
                                    onChange={(e) => setManualEntry({ ...manualEntry, shift: e.target.value })}
                                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="GENERAL">General Shift (9:30 - 18:30)</option>
                                    <option value="SHIFT_A">Shift A (Morning)</option>
                                    <option value="SHIFT_B">Shift B (Evening)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Remarks / Reason</label>
                                <textarea
                                    value={manualEntry.remarks}
                                    onChange={(e) => setManualEntry({ ...manualEntry, remarks: e.target.value })}
                                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    rows={3}
                                    placeholder="Enter reason for manual adjustment..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowManualEntry(false)}
                                    className="flex-1 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg text-sm font-medium hover:bg-secondary-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                >
                                    Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
