import { useState } from 'react';
import { useLeaveLedger, useUpdateLeaveLedger } from '@/hooks/useHR';
import { ChevronDown, Save, History, Search, Zap, Download, Upload, AlertCircle, Info, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FormattedNumber } from '@/components/common/FormattedNumber';
import EmployeeLeaveHistory from './EmployeeLeaveHistory';

const LeaveLedgerRow = ({ row, onSave, onViewHistory }: { row: any, onSave: (data: any) => Promise<any>, onViewHistory: () => void }) => {
    const [editData, setEditData] = useState({
        ...row,
        openingBalance: row.openingBalance ?? 0,
        autoCredit: row.autoCredit ?? 1.5,
        takenLeaves: row.takenLeaves ?? 0,
        lateDeductions: row.lateDeductions ?? 0,
        shortLeaveDeductions: row.shortLeaveDeductions ?? 0,
        closingBalance: row.closingBalance ?? 0,
        remarks: row.remarks ?? ''
    });

    const [saving, setSaving] = useState(false);

    // Derived values for live preview
    const opening = parseFloat(editData.openingBalance) || 0;
    const allotted = parseFloat(editData.autoCredit) || 0;
    const taken = parseFloat(editData.takenLeaves) || 0;
    const lateDeds = parseFloat(editData.lateDeductions) || 0;
    const shortDeds = parseFloat(editData.shortLeaveDeductions) || 0;

    // Total deductions = late + short
    const totalDeds = lateDeds + shortDeds;
    const actualBalance = opening + allotted - taken - totalDeds;

    // We show negative leaves separately as per UI requirement, 
    // but the actual 'New Bal' can now be negative if we follow previous fixes.
    // However, to match the visual 'Negative' column, we keep the split display.
    const negativeValue = actualBalance < 0 ? Math.abs(actualBalance) : 0;
    const displayBalance = actualBalance; // Show raw balance

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({ ...editData, closingBalance: actualBalance });
            toast.success('Saved!');
        } catch (err) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr className="hover:bg-secondary-50/50 transition-all group border-b border-secondary-100 last:border-0">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-50 to-secondary-100 text-primary-700 flex items-center justify-center font-black text-xs uppercase shadow-sm border border-primary-100/50">
                        {(row.name?.[0] || row.email?.[0] || 'U')}
                    </div>
                    <div className="flex flex-col">
                        <p className="font-black text-secondary-900 text-sm whitespace-nowrap leading-tight">{row.name || row.email.split('@')[0]}</p>
                        <p className="text-[10px] text-secondary-400 font-bold tracking-tight mt-0.5 uppercase">{row.email.split('@')[0]}</p>
                    </div>
                </div>
            </td>

            {/* Last Balance */}
            <td className="px-4 py-4 text-center">
                <div className="relative group/input">
                    <input
                        type="number" step="0.5"
                        className="w-20 text-center py-2 px-1 text-xs font-black bg-secondary-50 border-secondary-200 rounded-lg focus:ring-2 focus:ring-secondary-300 focus:bg-white transition-all outline-none"
                        value={editData.openingBalance}
                        onChange={e => setEditData({ ...editData, openingBalance: parseFloat(e.target.value) || 0 })}
                    />
                </div>
            </td>

            {/* Allotted (Auto Credit) */}
            <td className="px-4 py-4 text-center">
                <input
                    type="number" step="0.5"
                    className="w-20 text-center py-2 px-1 text-xs font-black bg-emerald-50 border-emerald-100 text-emerald-700 rounded-lg focus:ring-2 focus:ring-emerald-300 focus:bg-white transition-all outline-none"
                    value={editData.autoCredit}
                    onChange={e => setEditData({ ...editData, autoCredit: parseFloat(e.target.value) || 0 })}
                />
            </td>

            {/* Taken Leaves */}
            <td className="px-4 py-4 text-center">
                <input
                    type="number" step="0.5"
                    className="w-20 text-center py-2 px-1 text-xs font-black bg-white border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-400 transition-all outline-none"
                    value={editData.takenLeaves}
                    onChange={e => setEditData({ ...editData, takenLeaves: parseFloat(e.target.value) || 0 })}
                />
            </td>

            {/* Deductions (Late & Short) */}
            <td className="px-4 py-4">
                <div className="flex flex-col gap-1.5 min-w-[80px]">
                    <div className="relative">
                        <input
                            type="number" step="0.5"
                            className="w-full text-center py-1 text-[10px] font-black bg-rose-50 border-rose-100 text-rose-700 rounded-md focus:ring-1 focus:ring-rose-300 outline-none"
                            value={editData.lateDeductions}
                            onChange={e => setEditData({ ...editData, lateDeductions: parseFloat(e.target.value) || 0 })}
                            title="Late Deductions"
                        />
                        <span className="absolute -top-2 left-1 bg-rose-100 text-rose-600 text-[8px] font-black px-1 rounded uppercase tracking-tighter">Late</span>
                    </div>
                    <div className="relative">
                        <input
                            type="number" step="0.5"
                            className="w-full text-center py-1 text-[10px] font-black bg-orange-50 border-orange-100 text-orange-700 rounded-md focus:ring-1 focus:ring-orange-300 outline-none"
                            value={editData.shortLeaveDeductions}
                            onChange={e => setEditData({ ...editData, shortLeaveDeductions: parseFloat(e.target.value) || 0 })}
                            title="Short Leave Deductions"
                        />
                        <span className="absolute -top-2 left-1 bg-orange-100 text-orange-600 text-[8px] font-black px-1 rounded uppercase tracking-tighter">Short</span>
                    </div>
                </div>
            </td>

            {/* Negative / LOP */}
            <td className="px-4 py-4 text-center">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all ${negativeValue > 0 ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-secondary-100 text-secondary-400'}`}>
                    {negativeValue > 0 ? (
                        <>
                            <AlertCircle size={12} strokeWidth={3} />
                            -{negativeValue.toFixed(1)}
                        </>
                    ) : '0.0'}
                </div>
            </td>

            {/* New Balance */}
            <td className="px-4 py-4 text-center">
                <div className={`inline-block font-black text-sm py-2 px-4 rounded-xl text-center min-w-[4rem] shadow-sm border ${displayBalance < 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-primary-50 text-primary-800 border-primary-200'}`}>
                    {displayBalance.toFixed(1)}
                </div>
            </td>

            {/* Remarks */}
            <td className="px-4 py-4">
                <input
                    type="text"
                    className="w-full min-w-[150px] py-2 px-3 text-xs font-medium bg-secondary-50 border-secondary-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                    placeholder="Add remarks..."
                    value={editData.remarks}
                    onChange={e => setEditData({ ...editData, remarks: e.target.value })}
                />
            </td>

            {/* Actions */}
            <td className="px-6 py-4 text-right">
                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`p-2.5 rounded-xl border transition-all ${saving ? 'bg-secondary-100 border-secondary-200 text-secondary-400' : 'bg-white border-primary-200 text-primary-600 hover:bg-primary-600 hover:text-white hover:shadow-lg hover:shadow-primary-100 active:scale-95'}`}
                        title="Save Changes"
                    >
                        {saving ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Save size={18} strokeWidth={2.5} />}
                    </button>
                    <button
                        onClick={onViewHistory}
                        className="p-2.5 rounded-xl border border-secondary-200 bg-white text-secondary-500 hover:bg-secondary-900 hover:text-white hover:border-secondary-900 hover:shadow-lg hover:shadow-secondary-200 transition-all active:scale-95"
                        title="View Yearly History"
                    >
                        <History size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

const LeaveLedgerManager = () => {
    const [ledgerFilter, setLedgerFilter] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const [ledgerSearch, setLedgerSearch] = useState('');
    const { data: manualLedger = [], isLoading, refetch } = useLeaveLedger(ledgerFilter.month, ledgerFilter.year);
    const updateLedgerMutation = useUpdateLeaveLedger();
    const [viewingHistoryEmployee, setViewingHistoryEmployee] = useState<string | null>(null);

    return (
        <div className="card-premium overflow-hidden border border-secondary-100 shadow-2xl bg-white rounded-3xl">
            <div className="p-8 border-b border-secondary-100 flex flex-col xl:flex-row justify-between items-start xl:items-center bg-gradient-to-r from-secondary-50/50 to-white gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-xl shadow-xl shadow-primary-100">
                        <Calendar size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-secondary-900 tracking-tight">
                            Leave Ledger Management
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] text-secondary-500 font-black uppercase tracking-[0.2em]">Systematic balance calculation & bulk operations</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center w-full xl:w-auto">
                    {/* Search & Period Filter Container */}
                    <div className="flex flex-wrap bg-white p-1.5 rounded-2xl shadow-sm border border-secondary-200 w-full md:w-auto">
                        <div className="relative flex items-center border-r border-secondary-100 pr-2 mr-2 group">
                            <Search size={14} className="absolute left-3 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search staff..."
                                className="h-10 pl-9 pr-3 text-xs font-bold w-44 border-none focus:ring-0 rounded-xl bg-secondary-50/50 focus:bg-white transition-all"
                                value={ledgerSearch}
                                onChange={(e) => setLedgerSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    const newMonth = ledgerFilter.month - 1;
                                    if (newMonth < 1) {
                                        setLedgerFilter({ month: 12, year: ledgerFilter.year - 1 });
                                    } else {
                                        setLedgerFilter({ ...ledgerFilter, month: newMonth });
                                    }
                                }}
                                className="p-2.5 hover:bg-secondary-100 text-secondary-600 rounded-xl transition-all active:scale-90"
                                title="Previous Month"
                            >
                                <ChevronDown size={16} strokeWidth={3} className="rotate-90" />
                            </button>

                            <div className="flex items-center gap-1 px-1">
                                <select
                                    className="h-10 px-2 text-xs font-black border-none bg-transparent focus:ring-0 cursor-pointer appearance-none hover:text-primary-600 transition-colors"
                                    value={ledgerFilter.month}
                                    onChange={e => {
                                        const m = parseInt(e.target.value);
                                        const now = new Date();
                                        if (ledgerFilter.year === now.getFullYear() && m > now.getMonth() + 1) {
                                            toast.error('Cannot select future month');
                                            return;
                                        }
                                        setLedgerFilter({ ...ledgerFilter, month: m });
                                    }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const m = i + 1;
                                        const now = new Date();
                                        const isFuture = ledgerFilter.year === now.getFullYear() && m > now.getMonth() + 1;
                                        return (
                                            <option key={m} value={m} disabled={isFuture || ledgerFilter.year > now.getFullYear()}>
                                                {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                                            </option>
                                        );
                                    })}
                                </select>
                                <div className="h-3 w-px bg-secondary-200"></div>
                                <select
                                    className="h-10 px-2 text-xs font-black border-none bg-transparent focus:ring-0 cursor-pointer appearance-none hover:text-primary-600 transition-colors"
                                    value={ledgerFilter.year}
                                    onChange={e => {
                                        const y = parseInt(e.target.value);
                                        const now = new Date();
                                        if (y > now.getFullYear()) {
                                            toast.error('Cannot select future year');
                                            return;
                                        }
                                        // If switching to current year, ensure month is valid
                                        if (y === now.getFullYear() && ledgerFilter.month > now.getMonth() + 1) {
                                            setLedgerFilter({ month: now.getMonth() + 1, year: y });
                                        } else {
                                            setLedgerFilter({ ...ledgerFilter, year: y });
                                        }
                                    }}
                                >
                                    {[2024, 2025, 2026].map(y => (
                                        <option key={y} value={y} disabled={y > new Date().getFullYear()}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={() => {
                                    const newMonth = ledgerFilter.month + 1;
                                    let newYear = ledgerFilter.year;
                                    let nextM = newMonth;

                                    if (newMonth > 12) {
                                        nextM = 1;
                                        newYear = ledgerFilter.year + 1;
                                    }

                                    const now = new Date();
                                    const isFuture = newYear > now.getFullYear() || (newYear === now.getFullYear() && nextM > now.getMonth() + 1);

                                    if (isFuture) {
                                        toast.error('Cannot navigate to future months');
                                        return;
                                    }

                                    setLedgerFilter({ month: nextM, year: newYear });
                                }}
                                disabled={(() => {
                                    const now = new Date();
                                    const nextM = ledgerFilter.month + 1 > 12 ? 1 : ledgerFilter.month + 1;
                                    const nextY = ledgerFilter.month + 1 > 12 ? ledgerFilter.year + 1 : ledgerFilter.year;
                                    return nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth() + 1);
                                })()}
                                className="p-2.5 hover:bg-secondary-100 text-secondary-600 rounded-xl transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Next Month"
                            >
                                <ChevronDown size={16} strokeWidth={3} className="-rotate-90" />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={async () => {
                                if (!confirm('Auto-credit 1.5 leaves to all active employees for this month?')) return;
                                try {
                                    const res = await fetch('/api/hr/leave-ledger/auto-credit', {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                    });
                                    if (res.ok) {
                                        toast.success('Leaves auto-credited successfully!');
                                        refetch();
                                    } else {
                                        toast.error('Failed to auto-credit leaves');
                                    }
                                } catch (err) {
                                    toast.error('Network error');
                                }
                            }}
                            className="flex-1 md:flex-none btn-premium py-2.5 px-5 text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 rounded-2xl transition-all hover:-translate-y-0.5"
                        >
                            <Zap size={14} fill="currentColor" /> Auto-Credit
                        </button>
                        <button
                            onClick={async () => {
                                const res = await fetch(`/api/hr/leave-ledger/export?month=${ledgerFilter.month}&year=${ledgerFilter.year}`, {
                                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                });
                                if (res.ok) {
                                    const blob = await res.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `leave_ledger_${ledgerFilter.month}_${ledgerFilter.year}.csv`;
                                    a.click();
                                }
                            }}
                            className="flex-1 md:flex-none btn-premium py-2.5 px-5 text-xs font-black bg-white border border-secondary-200 text-secondary-700 hover:bg-secondary-900 hover:text-white flex items-center justify-center gap-2 rounded-2xl transition-all hover:-translate-y-0.5"
                        >
                            <Download size={14} /> Export
                        </button>
                        <label className="flex-1 md:flex-none btn-premium py-2.5 px-5 text-xs font-black bg-primary-50 text-primary-700 border border-primary-100 hover:bg-primary-600 hover:text-white flex items-center justify-center gap-2 rounded-2xl transition-all cursor-pointer hover:-translate-y-0.5">
                            <Upload size={14} /> Import
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                        const text = event.target?.result as string;
                                        const lines = text.split('\n');
                                        const headers = lines[0].split(',');
                                        const rows = lines.slice(1).map(line => {
                                            const values = line.split(',');
                                            const obj: any = {};
                                            headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
                                            return obj;
                                        }).filter(r => r['Employee ID']);

                                        try {
                                            const res = await fetch('/api/hr/leave-ledger/import', {
                                                method: 'POST',
                                                headers: {
                                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({ rows, month: ledgerFilter.month, year: ledgerFilter.year })
                                            });
                                            const result = await res.json();
                                            if (res.ok) {
                                                toast.success(`Import successful! Updated: ${result.updated}, Created: ${result.created}`);
                                                refetch();
                                            } else {
                                                toast.error(`Import failed: ${result.message}`);
                                            }
                                        } catch (err) {
                                            toast.error('Failed to connect to server');
                                        }
                                    };
                                    reader.readAsText(file);
                                }}
                            />
                        </label>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                {isLoading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-secondary-400 font-black uppercase tracking-widest text-xs">Loading sync records...</p>
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-secondary-50/50 border-b border-secondary-200">
                                <th className="px-6 py-6 text-left text-[10px] uppercase font-black text-secondary-400 tracking-widest">Employee Details</th>
                                <th className="px-4 py-6 text-center text-[10px] uppercase font-black text-secondary-400 tracking-widest">Opening</th>
                                <th className="px-4 py-6 text-center text-[10px] uppercase font-black text-secondary-400 tracking-widest text-emerald-600 bg-emerald-50/30">Allotted</th>
                                <th className="px-4 py-6 text-center text-[10px] uppercase font-black text-secondary-400 tracking-widest">Taken</th>
                                <th className="px-4 py-6 text-center text-[10px] uppercase font-black text-secondary-400 tracking-widest">Deductions</th>
                                <th className="px-4 py-6 text-center text-[10px] uppercase font-black text-secondary-400 tracking-widest text-rose-600 bg-rose-50/30">LOP Bal</th>
                                <th className="px-4 py-6 text-center text-[10px] uppercase font-black text-secondary-400 tracking-widest bg-primary-50/30 text-primary-600">New Bal</th>
                                <th className="px-4 py-6 text-left text-[10px] uppercase font-black text-secondary-400 tracking-widest">Remarks</th>
                                <th className="px-6 py-6 text-right text-[10px] uppercase font-black text-secondary-400 tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {manualLedger
                                .filter(row =>
                                    (row.name || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                                    (row.email || '').toLowerCase().includes(ledgerSearch.toLowerCase())
                                )
                                .map(row => (
                                    <LeaveLedgerRow
                                        key={row.employeeId}
                                        row={row}
                                        onSave={(data) => updateLedgerMutation.mutateAsync(data)}
                                        onViewHistory={() => setViewingHistoryEmployee(row.employeeId)}
                                    />
                                ))}
                            {manualLedger.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-8 py-32 text-center text-secondary-300 font-black italic uppercase tracking-widest text-sm bg-secondary-50/10">
                                        No employee records found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {viewingHistoryEmployee && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <EmployeeLeaveHistory
                            employeeId={viewingHistoryEmployee}
                            year={ledgerFilter.year}
                            onClose={() => setViewingHistoryEmployee(null)}
                            onUpdate={() => refetch()}
                        />
                    </div>
                </div>
            )}
        </div>

    );
};

export default LeaveLedgerManager;
