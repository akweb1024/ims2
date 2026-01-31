'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Save, X, User as UserIcon, Calendar, Clock, AlertTriangle } from 'lucide-react';
import AttendanceCalendar from '@/components/dashboard/staff/AttendanceCalendar';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function ManualAttendanceView() {
    // State
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editDate, setEditDate] = useState<Date | null>(null);
    const [editForm, setEditForm] = useState({
        checkIn: '',
        checkOut: '',
        status: 'PRESENT',
        notes: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Search Employees
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const res = await fetch(`/api/hr/employees?search=${searchQuery}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.items || []); // Assuming API returns { items: [] } or array
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchAttendance = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const now = new Date();
            // Fetch using the targetUserId which we added support for in the API
            const res = await fetch(`/api/hr/attendance?month=${now.getMonth() + 1}&year=${now.getFullYear()}&targetUserId=${selectedEmployee.userId || selectedEmployee.id}&all=true`);
            if (res.ok) {
                const data = await res.json();
                setAttendanceData(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingData(false);
        }
    }, [selectedEmployee]);

    // Fetch Attendance when employee selected
    useEffect(() => {
        if (!selectedEmployee) return;
        fetchAttendance();
    }, [selectedEmployee, fetchAttendance]);

    const handleDateClick = (date: Date, record?: any) => {
        setEditDate(date);

        // Populate form
        if (record) {
            setEditForm({
                checkIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
                checkOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
                status: record.status,
                notes: '' // API doesn't seem to return notes yet
            });
        } else {
            setEditForm({
                checkIn: '09:00',
                checkOut: '18:00',
                status: 'PRESENT',
                notes: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!selectedEmployee || !editDate) return;
        setIsSaving(true);
        try {
            const payload = {
                employeeId: selectedEmployee.profileId, // We need Profile ID
                date: editDate.toISOString(),
                checkIn: editForm.checkIn,
                checkOut: editForm.checkOut,
                status: editForm.status,
                notes: editForm.notes
            };

            const res = await fetch('/api/hr/attendance/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to save');
            }

            // Refresh
            await fetchAttendance();
            setShowModal(false);
            alert('Attendance Updated Successfully');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Selector */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-secondary-100">
                <h2 className="text-2xl font-black text-secondary-900 mb-6 flex items-center gap-2">
                    <Calendar className="text-primary-600" />
                    Manual Attendance Entry
                </h2>

                <div className="relative max-w-xl">
                    <div className="flex items-center gap-2 border-2 border-secondary-100 rounded-2xl p-3 focus-within:border-primary-500 transition-colors">
                        <Search className="text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search employee by name..."
                            className="flex-1 outline-none text-secondary-900 font-bold placeholder:font-normal"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {isSearching && <LoadingSpinner size="sm" />}
                    </div>

                    {/* Results Dropdown */}
                    {searchResults.length > 0 && !selectedEmployee && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-secondary-100 z-50 max-h-60 overflow-y-auto">
                            {searchResults.map(emp => (
                                <button
                                    key={emp.id}
                                    className="w-full text-left p-3 hover:bg-secondary-50 flex items-center gap-3 border-b border-secondary-50 last:border-none"
                                    onClick={() => {
                                        setSelectedEmployee(emp);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                    }}
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-black text-xs">
                                        {emp.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-secondary-900">{emp.name}</p>
                                        <p className="text-xs text-secondary-500">{emp.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedEmployee && (
                    <div className="mt-6 flex items-center justify-between bg-primary-50 p-4 rounded-2xl border border-primary-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-black text-lg">
                                {selectedEmployee.name?.charAt(0)}
                            </div>
                            <div>
                                <p className="text-lg font-black text-secondary-900">{selectedEmployee.name}</p>
                                <p className="text-sm text-secondary-600">{selectedEmployee.department} • {selectedEmployee.designation}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setSelectedEmployee(null); setAttendanceData([]); }}
                            className="p-2 hover:bg-white/50 rounded-full transition-colors text-secondary-500"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Calendar */}
            {selectedEmployee && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <AttendanceCalendar
                        attendance={attendanceData}
                        workReports={[]} // Not needed for manual entry view
                        onDateClick={handleDateClick}
                    />
                </div>
            )}

            {/* Edit Modal */}
            {showModal && editDate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-secondary-50 p-6 border-b border-secondary-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-secondary-900">Edit Attendance</h3>
                                <p className="text-sm text-secondary-500 font-bold">{editDate.toDateString()}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-secondary-500 uppercase tracking-wider flex items-center gap-1">
                                        <Clock size={12} /> Check In
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full p-3 rounded-xl bg-secondary-50 border border-secondary-200 focus:border-primary-500 focus:bg-white outline-none font-bold text-secondary-900"
                                        value={editForm.checkIn}
                                        onChange={e => setEditForm({ ...editForm, checkIn: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-secondary-500 uppercase tracking-wider flex items-center gap-1">
                                        <Clock size={12} /> Check Out
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full p-3 rounded-xl bg-secondary-50 border border-secondary-200 focus:border-primary-500 focus:bg-white outline-none font-bold text-secondary-900"
                                        value={editForm.checkOut}
                                        onChange={e => setEditForm({ ...editForm, checkOut: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-secondary-500 uppercase tracking-wider">Status</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKOFF'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setEditForm({ ...editForm, status: s })}
                                            className={`
                                                p-2 rounded-xl text-xs font-bold border transition-all
                                                ${editForm.status === s
                                                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/30'
                                                    : 'bg-white text-secondary-600 border-secondary-200 hover:border-primary-300'
                                                }
                                            `}
                                        >
                                            {s.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-warning-50 rounded-xl border border-warning-100 flex gap-3">
                                <AlertTriangle className="text-warning-600 shrink-0" size={20} />
                                <p className="text-xs text-warning-800 leading-relaxed font-medium">
                                    <span className="font-bold">Warning:</span> Manual changes will override any existing geofence or biometric data for this day.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-secondary-100 bg-secondary-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-3 rounded-xl font-bold text-secondary-600 hover:bg-secondary-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-3 rounded-xl font-bold bg-primary-600 text-white hover:bg-primary-700 active:scale-95 transition-all shadow-xl shadow-primary-600/20 disabled:opacity-50 disabled:scale-100"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
