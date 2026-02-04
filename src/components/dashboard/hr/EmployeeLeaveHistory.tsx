import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useEmployeeLeaveHistory, useUpdateLeaveLedger } from '@/hooks/useHR';
import { toast } from 'react-hot-toast';

interface Props {
    employeeId: string;
    year: number;
    onClose: () => void;
    onUpdate?: () => void; // Callback to refresh parent list
}

const EmployeeLeaveHistory = ({ employeeId, year: initialYear, onClose, onUpdate }: Props) => {
    const [year, setYear] = useState(initialYear);
    const { data: history = [], refetch, isLoading } = useEmployeeLeaveHistory(employeeId, year);
    const updateLedgerMutation = useUpdateLeaveLedger();
    const [editingMonth, setEditingMonth] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Helper row component for individual month editing
    const HistoryRow = ({ row }: { row: any }) => {
        const isEditing = editingMonth === row.month;
        const [editData, setEditData] = useState({ ...row });
        const [isSaving, setIsSaving] = useState(false);

        useEffect(() => {
            setEditData({ ...row });
        }, [row, isEditing]);

        // Auto-calc preview
        const opening = parseFloat(editData.openingBalance) || 0;
        const auto = parseFloat(editData.autoCredit) || 0;
        const taken = parseFloat(editData.takenLeaves) || 0;
        const late = parseFloat(editData.lateDeductions) || 0;
        // We calculate short deduction dynamically if balance < 0
        const rawBalance = opening + auto - taken - late;
        let calculatedShort = 0;
        let calculatedClosing = 0;

        if (rawBalance < 0) {
            calculatedShort = Math.abs(rawBalance);
            calculatedClosing = 0;
        } else {
            calculatedShort = 0; // Or keep manual? Based on backend logic we reset. 
            // Ideally we'd allow manual 'short' too, but user said "negative will be deducted". 
            // So we display the computed short deduction.
            calculatedClosing = rawBalance;
        }

        const handleSave = async () => {
            setIsSaving(true);
            try {
                // Ensure we send the calculated short deduction
                await updateLedgerMutation.mutateAsync({
                    ...editData,
                    shortLeaveDeductions: calculatedShort,
                    closingBalance: calculatedClosing,
                    employeeId: row.employeeId,
                    month: row.month,
                    year: row.year
                });
                toast.success(`Updated ${new Date(0, row.month - 1).toLocaleString('default', { month: 'short' })}`);
                setEditingMonth(null);
                await refetch();
                if (onUpdate) onUpdate();
            } catch (err) {
                toast.error('Failed to update');
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <tr className={`border-b border-secondary-100 transition-colors ${isEditing ? 'bg-primary-50/50' : 'hover:bg-secondary-50/50'}`}>
                <td className="p-4 pl-6 font-bold text-secondary-500 text-xs uppercase">
                    {new Date(0, row.month - 1).toLocaleString('default', { month: 'long' })}
                </td>
                <td className="p-4 text-center border-r border-secondary-50">
                    <span className="font-mono text-secondary-500 text-xs">{row.openingBalance}</span>
                </td>
                <td className="p-4 text-center border-r border-secondary-50">
                    {isEditing ? (
                        <input
                            type="number" step="0.5"
                            className="w-16 p-1 text-center text-xs border border-primary-200 rounded font-bold text-emerald-600 bg-white"
                            value={editData.autoCredit}
                            onChange={e => setEditData({ ...editData, autoCredit: parseFloat(e.target.value) || 0 })}
                        />
                    ) : (
                        <span className="font-mono font-bold text-emerald-600 text-xs">+{row.autoCredit}</span>
                    )}
                </td>
                {/* Breakdowns */}
                <td className="p-4 border-r border-secondary-50">
                    <div className="grid grid-cols-3 gap-2 text-center items-center">
                        {/* Authorized (Taken) */}
                        {isEditing ? (
                            <input
                                title="Authorized Leaves"
                                type="number" step="0.5"
                                className="w-full p-1 text-center text-xs border border-secondary-300 rounded text-secondary-900 bg-white"
                                value={editData.takenLeaves}
                                onChange={e => setEditData({ ...editData, takenLeaves: parseFloat(e.target.value) || 0 })}
                            />
                        ) : (
                            <span className="text-secondary-700 font-bold text-xs">{row.takenLeaves}</span>
                        )}

                        {/* Unauthorized (Calculated Short) */}
                        <span className={`text-xs font-bold ${isEditing ? (calculatedShort > 0 ? 'text-rose-600' : 'text-gray-300') : (row.shortLeaveDeductions > 0 ? 'text-rose-600' : 'text-gray-300')}`}>
                            {isEditing ? (calculatedShort > 0 ? `-${calculatedShort.toFixed(1)}` : '-') : (row.shortLeaveDeductions > 0 ? `-${row.shortLeaveDeductions}` : '-')}
                        </span>

                        {/* Late Deduction */}
                        {isEditing ? (
                            <input
                                title="Late Deduction"
                                type="number" step="0.1"
                                className="w-full p-1 text-center text-xs border border-amber-200 rounded text-amber-700 bg-amber-50"
                                value={editData.lateDeductions}
                                onChange={e => setEditData({ ...editData, lateDeductions: parseFloat(e.target.value) || 0 })}
                            />
                        ) : (
                            <span className={`text-xs ${row.lateDeductions > 0 ? 'text-amber-600 font-bold' : 'text-gray-300'}`}>
                                {row.lateDeductions > 0 ? `-${row.lateDeductions}` : '-'}
                            </span>
                        )}
                    </div>
                </td>

                <td className="p-4 text-center bg-indigo-50/30">
                    <span className={`font-black text-sm ${isEditing ? 'text-indigo-600' : 'text-indigo-900'}`}>
                        {isEditing ? calculatedClosing : row.closingBalance}
                    </span>
                </td>
                <td className="p-4">
                    {isEditing ? (
                        <input
                            type="text"
                            className="w-full text-xs p-1 border border-secondary-200 rounded"
                            placeholder="Remarks..."
                            value={editData.remarks || ''}
                            onChange={e => setEditData({ ...editData, remarks: e.target.value })}
                        />
                    ) : (
                        <span className="text-xs text-secondary-500 italic truncate max-w-[150px] block">{row.remarks}</span>
                    )}
                </td>
                <td className="p-4 text-right">
                    {isEditing ? (
                        <div className="flex gap-2 justify-end">
                            <button disabled={isSaving} onClick={handleSave} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded font-bold hover:bg-indigo-700 shadow-sm">
                                {isSaving ? '...' : 'Save'}
                            </button>
                            <button disabled={isSaving} onClick={() => setEditingMonth(null)} className="text-xs bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded font-bold hover:bg-slate-50">
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setEditingMonth(row.month)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-indigo-50 text-indigo-600 transition-colors">
                            <span className="sr-only">Edit</span>
                            ✏️
                        </button>
                    )}
                </td>
            </tr>
        );
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/20">
                <div className="p-6 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                            <span className="text-2xl">📅</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Leave Ledger History</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    onClick={() => setYear(year - 1)}
                                    className="p-1 rounded-full hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 transition-colors"
                                >
                                    ◀
                                </button>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                                    {year}
                                </span>
                                <button
                                    onClick={() => setYear(year + 1)}
                                    className="p-1 rounded-full hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 transition-colors"
                                >
                                    ▶
                                </button>
                                <span className="text-sm text-slate-500 font-medium ml-2">
                                    {history[0]?.name || 'Employee Ledger'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white border border-indigo-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 flex items-center justify-center text-slate-400 transition-all duration-200 shadow-sm"
                    >
                        ✕
                        <span className="text-2xl font-light">×</span>
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-secondary-200 shadow-sm">
                                <th className="p-4 pl-6 font-black text-secondary-400 text-xxs uppercase tracking-wider w-32">Month</th>
                                <th className="p-4 text-center font-black text-secondary-400 text-xxs uppercase tracking-wider w-20 border-r border-secondary-100">Last Bal</th>
                                <th className="p-4 text-center font-black text-secondary-400 text-xxs uppercase tracking-wider w-20 border-r border-secondary-100">Allotted</th>
                                <th className="p-4 text-center font-black text-secondary-400 text-xxs uppercase tracking-wider border-r border-secondary-100">
                                    <div className="flex flex-col">
                                        <span>Taken</span>
                                        <div className="flex justify-between text-[9px] text-secondary-400 mt-1 px-2">
                                            <span>Auth</span>
                                            <span>Unauth</span>
                                            <span>Late</span>
                                        </div>
                                    </div>
                                </th>
                                <th className="p-4 text-center font-black text-indigo-400 text-xxs uppercase tracking-wider w-24 bg-indigo-50/30">New Bal</th>
                                <th className="p-4 font-black text-secondary-400 text-xxs uppercase tracking-wider w-48">Remarks</th>
                                <th className="p-4 text-right font-black text-secondary-400 text-xxs uppercase tracking-wider w-24 pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {isLoading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading ledger...</td></tr>
                            ) : (
                                (() => {
                                    const now = new Date();
                                    const currentYear = now.getFullYear();
                                    const currentMonth = now.getMonth() + 1;

                                    const displayedHistory = history.filter((row: any) => {
                                        // Show all for past years
                                        if (row.year < currentYear) return true;
                                        // Verify functionality for current year
                                        if (row.year === currentYear) {
                                            return row.month < currentMonth;
                                        }
                                        // Hide future years
                                        return false;
                                    });

                                    if (displayedHistory.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={7} className="p-12 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                                        <span className="text-4xl mb-2">🍂</span>
                                                        <span className="font-medium">No records found for this period</span>
                                                        <span className="text-xs mt-1 text-slate-300">Future months are hidden until completed</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return displayedHistory.map((row: any) => (
                                        <HistoryRow key={`${row.year}-${row.month}`} row={row} />
                                    ));
                                })()
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-indigo-50/50 border-t border-indigo-100 text-center">
                    <p className="text-xs text-indigo-500 font-medium flex items-center justify-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                        <span>Making changes to past months triggers an automatic recursive recalculation for the entire year.</span>
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EmployeeLeaveHistory;
