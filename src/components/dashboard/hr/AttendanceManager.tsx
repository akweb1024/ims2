'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import AttendanceModal from '@/components/dashboard/hr/AttendanceModal';
import { formatToISTTime, formatToISTDate } from '@/lib/date-utils';

interface AttendanceManagerProps {
    attendance: any[];
    employees: any[];
    filters: any;
    setFilters: (filters: any) => void;
    onCorrection: (data: any) => Promise<void>;
}

export default function AttendanceManager({ attendance, employees, filters, setFilters, onCorrection }: AttendanceManagerProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
    const [importing, setImporting] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    const handleExport = () => {
        if (!exportMonth) {
            toast.error('Please select a month to export');
            return;
        }
        const [y, m] = exportMonth.split('-');
        const start = `${y}-${m}-01`;
        const end = new Date(parseInt(y), parseInt(m), 0).toISOString().split('T')[0];
        window.open(`/api/hr/attendance/export?startDate=${start}&endDate=${end}`, '_blank');
        toast.success(`Exporting attendance for ${exportMonth}...`);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input so same file can be selected again if needed
        e.target.value = '';

        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a valid CSV file');
            return;
        }

        const fd = new FormData();
        fd.append('file', file);
        setImporting(true);

        const promise = fetch('/api/hr/attendance/import', { method: 'POST', body: fd })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Import failed');
                return data;
            });

        toast.promise(promise, {
            loading: 'Importing attendance records...',
            success: (data) => {
                setImporting(false);
                return `Imported ${data.success} records. Failed: ${data.failed}.`;
            },
            error: (err) => {
                setImporting(false);
                return `Error: ${err.message}`;
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-secondary-100 shadow-sm">
                <div>
                    <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tighter italic border-l-4 border-primary-500 pl-4">Staff Presence</h3>
                    <p className="text-xs font-bold text-secondary-400 pl-4">Monitoring {attendance.length} personnel</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2 items-center bg-secondary-50 p-1 rounded-lg border border-secondary-100">
                        {/* Export Controls */}
                        <input
                            type="month"
                            className="input h-8 text-xs w-32 border-none bg-transparent focus:ring-0"
                            value={exportMonth}
                            onChange={(e) => setExportMonth(e.target.value)}
                        />
                        <button
                            className="px-3 py-1 bg-white text-secondary-600 text-[10px] font-black uppercase rounded shadow-sm hover:text-primary-600 transition-colors"
                            onClick={handleExport}
                            title="Export Attendance CSV"
                        >
                            Export CSV
                        </button>
                        <label
                            className={`px-3 py-1 bg-white text-secondary-600 text-[10px] font-black uppercase rounded shadow-sm hover:text-primary-600 transition-colors cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}
                            title="Import Attendance CSV"
                        >
                            {importing ? 'Importing...' : 'Import CSV'}
                            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
                        </label>
                    </div>

                    <div className="flex gap-1 p-1 bg-secondary-100 rounded-lg">
                        <button onClick={() => setViewMode('grid')} className={`px-2 py-1 rounded-md text-[10px] font-black uppercase transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-400'}`}>Grid</button>
                        <button onClick={() => setViewMode('table')} className={`px-2 py-1 rounded-md text-[10px] font-black uppercase transition-all ${viewMode === 'table' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-400'}`}>Table</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Search staff..."
                            className="input h-9 text-xs w-48"
                            value={filters.staffSearch}
                            onChange={e => setFilters({ ...filters, staffSearch: e.target.value })}
                        />
                        <select
                            className="select-premium"
                            value={filters.status}
                            onChange={e => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="ALL">All Status</option>
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LEAVE">On Leave</option>
                        </select>
                        <select
                            className="input h-9 text-[10px] font-black uppercase w-40"
                            value={filters.employeeId}
                            onChange={e => setFilters({ ...filters, employeeId: e.target.value })}
                        >
                            <option value="ALL">All Employees</option>
                            {employees.map((e: any) => (
                                <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {attendance.filter(a => (filters.status === 'ALL' || a.status === filters.status) && (filters.employeeId === 'ALL' || a.employeeId === filters.employeeId) && (a.employee?.user?.name || '').toLowerCase().includes(filters.staffSearch.toLowerCase())).map(record => (
                        <div key={record.id} className="card-premium relative group hover:shadow-xl transition-all border border-secondary-100">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl mb-4 text-primary-600 font-black border border-primary-100 shadow-inner">
                                    {record.employee?.user?.name?.[0] || 'S'}
                                </div>
                                <h4 className="font-bold text-secondary-900">{record.employee?.user?.name || record.employee?.user?.email?.split('@')[0]}</h4>
                                <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">{record.employee?.designation}</p>

                                <div className="mt-6 w-full space-y-3 pt-4 border-t border-secondary-50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-secondary-400 uppercase">Check In</span>
                                        <span className="text-xs font-black text-secondary-900">{formatToISTTime(record.checkIn)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-secondary-400 uppercase">Check Out</span>
                                        <span className="text-xs font-black text-secondary-900">{formatToISTTime(record.checkOut)}</span>
                                    </div>
                                </div>
                                <span className={`mt-2 block text-[9px] font-black px-2 py-0.5 rounded uppercase ${record.status === 'PRESENT' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>{record.workFrom}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedRecord({
                                        id: record.id,
                                        checkIn: record.checkIn ? new Date(record.checkIn).toISOString().slice(0, 16) : '',
                                        checkOut: record.checkOut ? new Date(record.checkOut).toISOString().slice(0, 16) : '',
                                        status: record.status
                                    });
                                    setShowModal(true);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-secondary-100 rounded text-secondary-500 hover:text-secondary-900"
                            >
                                ✏️
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card-premium p-0 overflow-hidden">
                    <table className="table w-full text-left">
                        <thead>
                            <tr className="bg-secondary-50/50 text-[10px] font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100">
                                <th className="p-4">Staff</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Check In</th>
                                <th className="p-4">Check Out</th>
                                <th className="p-4">Work From</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {attendance.filter(a => (filters.status === 'ALL' || a.status === filters.status) && (filters.employeeId === 'ALL' || a.employeeId === filters.employeeId) && (a.employee?.user?.name || '').toLowerCase().includes(filters.staffSearch.toLowerCase())).map(record => (
                                <tr key={record.id} className="hover:bg-secondary-50/30 transition-all">
                                    <td className="p-4">
                                        <p className="font-bold text-secondary-900">{record.employee?.user?.name || record.employee?.user?.email?.split('@')[0]}</p>
                                        <p className="text-[10px] text-secondary-400 font-bold uppercase">{record.employee?.designation}</p>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-secondary-600">
                                        {formatToISTDate(record.date)}
                                    </td>
                                    <td className="p-4 text-xs font-black text-primary-600">
                                        {formatToISTTime(record.checkIn)}
                                    </td>
                                    <td className="p-4 text-xs font-black text-secondary-900">
                                        {formatToISTTime(record.checkOut)}
                                    </td>
                                    <td className="p-4">
                                        <span className="badge badge-secondary">{record.workFrom}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${record.status === 'PRESENT' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>{record.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && selectedRecord && (
                <AttendanceModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    initialData={selectedRecord}
                    onSave={async (data) => {
                        await onCorrection(data);
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
}
