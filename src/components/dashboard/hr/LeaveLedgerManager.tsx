import { useState } from 'react';
import { useLeaveLedger, useUpdateLeaveLedger } from '@/hooks/useHR';
import { ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
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

    // Derived state for negative indicator (visual only, logic is in backend/save)
    const opening = parseFloat(editData.openingBalance) || 0;
    const allotted = parseFloat(editData.autoCredit) || 0;
    const taken = parseFloat(editData.takenLeaves) || 0;
    const lateDeds = parseFloat(editData.lateDeductions) || 0;
    const shortDeds = parseFloat(editData.shortLeaveDeductions) || 0;
    const actualBalance = opening + allotted - taken - lateDeds - shortDeds;
    const negativeLeaves = actualBalance < 0 ? Math.abs(actualBalance) : 0;

    // Update closing balance in editData whenever inputs change to show preview
    // Note: We don't automatically setEditData here to avoid infinite loops if not careful, 
    // but we can render the calculated value or existing value.
    // Ideally, the user inputs 'Taken' and we calculate 'Closing'. 
    // The previous implementation had a useEffect for this.

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Recalculate strict closing before saving to ensure consistency
            const finalClosing = Math.max(0, actualBalance);
            await onSave({ ...editData, closingBalance: finalClosing });
            toast.success('Saved!');
        } catch (err) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr className="hover:bg-secondary-50/30 transition-colors group">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary-200 text-secondary-600 flex items-center justify-center font-bold text-xs uppercase">
                        {(row.name?.[0] || row.email?.[0] || 'U')}
                    </div>
                    <div>
                        <p className="font-bold text-secondary-900 text-sm whitespace-nowrap">{row.name || row.email.split('@')[0]}</p>
                        <p className="text-[10px] text-secondary-400 font-medium">{row.email}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <input
                    type="number" step="0.5"
                    className="input py-1 text-center w-16 text-xs font-bold bg-secondary-50 border-secondary-200 focus:bg-white"
                    value={editData.openingBalance}
                    onChange={e => setEditData({ ...editData, openingBalance: parseFloat(e.target.value) || 0 })}
                    title="Opening Balance"
                />
            </td>
            <td className="px-6 py-4">
                <input
                    type="number" step="0.5"
                    className="input py-1 text-center w-16 text-xs font-bold bg-emerald-50 border-emerald-200 text-emerald-700 focus:bg-white"
                    value={editData.autoCredit}
                    onChange={e => setEditData({ ...editData, autoCredit: parseFloat(e.target.value) || 0 })}
                    title="Monthly Credit"
                />
            </td>
            <td className="px-6 py-4">
                <input
                    type="number" step="0.5"
                    className="input py-1 text-center w-16 text-xs font-bold bg-white border-secondary-200 focus:border-primary-500"
                    value={editData.takenLeaves}
                    onChange={e => setEditData({ ...editData, takenLeaves: parseFloat(e.target.value) || 0 })}
                    title="Taken Leaves"
                />
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                    <input
                        type="number" step="0.5"
                        className="input py-0.5 w-14 text-center text-[10px] font-bold bg-rose-50 border-rose-200 text-rose-700"
                        value={editData.lateDeductions}
                        onChange={e => setEditData({ ...editData, lateDeductions: parseFloat(e.target.value) || 0 })}
                        title="Late Deductions"
                    />
                    <input
                        type="number" step="0.5"
                        className="input py-0.5 w-14 text-center text-[10px] font-bold bg-orange-50 border-orange-200 text-orange-700"
                        value={editData.shortLeaveDeductions}
                        onChange={e => setEditData({ ...editData, shortLeaveDeductions: parseFloat(e.target.value) || 0 })}
                        title="Short Leave Deductions"
                    />
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <div className={`text-xs font-black ${negativeLeaves > 0 ? 'text-rose-600 bg-rose-100 px-2 py-1 rounded' : 'text-secondary-300'}`}>
                    {negativeLeaves > 0 ? `-${negativeLeaves.toFixed(1)}` : '-'}
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <div className="font-black text-sm text-secondary-900 bg-secondary-100 py-1 px-3 rounded text-center min-w-[3rem]">
                    {Math.max(0, actualBalance).toFixed(1)}
                </div>
            </td>
            <td className="px-6 py-4">
                <input
                    type="text"
                    className="input py-1 text-xs w-full min-w-[120px]"
                    placeholder="..."
                    value={editData.remarks}
                    onChange={e => setEditData({ ...editData, remarks: e.target.value })}
                />
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`p-1.5 rounded transition-colors ${saving ? 'bg-secondary-100 text-secondary-400' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}
                        title="Save Changes"
                    >
                        {saving ? '⏳' : '💾'}
                    </button>
                    <button
                        onClick={onViewHistory}
                        className="p-1.5 rounded bg-secondary-50 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-900 transition-colors"
                        title="View Yearly History"
                    >
                        📅
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
        <div className="card-premium overflow-hidden border border-secondary-100 shadow-xl bg-white">
            <div className="p-8 border-b border-secondary-100 flex flex-col md:flex-row justify-between items-center bg-secondary-50/30 gap-6">
                <div>
                    <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center text-sm shadow-lg shadow-primary-200">🗓️</span>
                        Leave Ledger Management
                    </h3>
                    <p className="text-[10px] text-secondary-500 font-black uppercase tracking-[0.2em] mt-1 pl-10">Systematic balance calculation & bulk import/export</p>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex bg-white p-1 rounded-2xl shadow-inner border border-secondary-100">
                        <div className="relative border-r border-secondary-100 pr-2 mr-2">
                            <input
                                type="text"
                                placeholder="Search employee..."
                                className="input h-full py-2 px-3 text-xs w-48 border-none focus:ring-0"
                                value={ledgerSearch}
                                onChange={(e) => setLedgerSearch(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => {
                                const newMonth = ledgerFilter.month - 1;
                                if (newMonth < 1) {
                                    setLedgerFilter({ month: 12, year: ledgerFilter.year - 1 });
                                } else {
                                    setLedgerFilter({ ...ledgerFilter, month: newMonth });
                                }
                            }}
                            className="p-2 hover:bg-secondary-50 text-secondary-500 rounded-lg transition-colors"
                            title="Previous Month"
                        >
                            <ChevronDown size={14} className="rotate-90" />
                        </button>

                        <div className="flex items-center bg-white border border-secondary-200 rounded-lg px-2">
                            <select
                                className="input py-2 px-2 text-xs font-bold border-none bg-transparent focus:ring-0 cursor-pointer"
                                value={ledgerFilter.month}
                                onChange={e => setLedgerFilter({ ...ledgerFilter, month: parseInt(e.target.value) })}
                                title="Filter Ledger by Month"
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                            <div className="h-4 w-px bg-secondary-200 mx-2"></div>
                            <select
                                className="input py-2 px-2 text-xs font-bold border-none bg-transparent focus:ring-0 cursor-pointer"
                                value={ledgerFilter.year}
                                onChange={e => setLedgerFilter({ ...ledgerFilter, year: parseInt(e.target.value) })}
                                title="Filter Ledger by Year"
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => {
                                const newMonth = ledgerFilter.month + 1;
                                if (newMonth > 12) {
                                    setLedgerFilter({ month: 1, year: ledgerFilter.year + 1 });
                                } else {
                                    setLedgerFilter({ ...ledgerFilter, month: newMonth });
                                }
                            }}
                            className="p-2 hover:bg-secondary-50 text-secondary-500 rounded-lg transition-colors"
                            title="Next Month"
                        >
                            <ChevronDown size={14} className="-rotate-90" />
                        </button>
                    </div>

                    <div className="flex gap-2">
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
                            className="btn bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 py-2 px-4 text-xs font-bold flex items-center gap-2"
                        >
                            <span>⚡</span> Auto-Credit
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
                            className="btn btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-2"
                        >
                            <span>📥</span> Export CSV
                        </button>
                        <label className="btn btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer">
                            <span>📤</span> Import CSV
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
                                                alert(`Import successful! Updated: ${result.updated}, Created: ${result.created}`);
                                                refetch();
                                            } else {
                                                alert(`Import failed: ${result.message}`);
                                            }
                                        } catch (err) {
                                            alert('Failed to connect to server');
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
                {isLoading ? <div className="p-10 text-center animate-pulse">Loading ledger...</div> : (
                    <table className="table w-full border-collapse">
                        <thead className="bg-secondary-50/50">
                            <tr className="text-[10px] uppercase font-black text-secondary-400 tracking-wider">
                                <th className="px-6 py-5 text-left">Staff Details</th>
                                <th className="px-6 py-5 text-center">Last Bal</th>
                                <th className="px-6 py-5 text-center">Allotted</th>
                                <th className="px-6 py-5 text-center">Taken</th>
                                <th className="px-6 py-5 text-center">Deductions</th>
                                <th className="px-6 py-5 text-center">Neg.</th>
                                <th className="px-6 py-5 text-center">New Bal</th>
                                <th className="px-6 py-5 text-left">Remarks</th>
                                <th className="px-6 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
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
                                    <td colSpan={9} className="px-8 py-20 text-center text-secondary-400 font-bold italic bg-secondary-50/20">
                                        No employee records found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {viewingHistoryEmployee && (
                <EmployeeLeaveHistory
                    employeeId={viewingHistoryEmployee}
                    year={ledgerFilter.year}
                    onClose={() => setViewingHistoryEmployee(null)}
                    onUpdate={() => refetch()}
                />
            )}
        </div>
    );
};

export default LeaveLedgerManager;
