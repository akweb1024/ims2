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

const EmployeeLeaveHistory = ({ employeeId, year, onClose, onUpdate }: Props) => {
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

        const handleSave = async () => {
            setIsSaving(true);
            try {
                await updateLedgerMutation.mutateAsync({
                    ...editData,
                    employeeId: row.employeeId,
                    month: row.month,
                    year: row.year
                });
                toast.success(`Updated ${new Date(0, row.month - 1).toLocaleString('default', { month: 'short' })}`);
                setEditingMonth(null);
                await refetch(); // Refetch to see cascading updates
                if (onUpdate) onUpdate();
            } catch (err) {
                toast.error('Failed to update');
            } finally {
                setIsSaving(false);
            }
        };

        // Auto-calc preview
        const opening = parseFloat(editData.openingBalance) || 0;
        const auto = parseFloat(editData.autoCredit) || 0;
        const taken = parseFloat(editData.takenLeaves) || 0;
        const late = parseFloat(editData.lateDeductions) || 0;
        const short = parseFloat(editData.shortLeaveDeductions) || 0;
        const calcClosing = Math.max(0, opening + auto - taken - late - short);

        return (
            <tr className={`border-b border-secondary-100 transition-colors ${isEditing ? 'bg-primary-50/50' : 'hover:bg-secondary-50/50'}`}>
                <td className="p-3 font-bold text-secondary-500 text-xs uppercase">
                    {new Date(0, row.month - 1).toLocaleString('default', { month: 'long' })}
                </td>
                <td className="p-3 text-center">
                    {isEditing ? (
                        <span className="text-secondary-400 font-mono text-xs" title="Opening balance is calculated from previous month closing">
                            {row.openingBalance}
                        </span>
                    ) : (
                        <span className="font-mono font-bold text-secondary-600 text-sm">{row.openingBalance}</span>
                    )}
                </td>
                <td className="p-3 text-center">
                    {isEditing ? (
                        <input
                            type="number" step="0.5"
                            className="w-16 p-1 text-center text-xs border border-primary-200 rounded font-bold text-primary-700 bg-white"
                            value={editData.autoCredit}
                            onChange={e => setEditData({ ...editData, autoCredit: parseFloat(e.target.value) || 0 })}
                        />
                    ) : (
                        <span className="font-mono font-bold text-emerald-600 text-sm">+{row.autoCredit}</span>
                    )}
                </td>
                <td className="p-3 text-center bg-secondary-50/30">
                    {isEditing ? (
                        <input
                            type="number" step="0.5"
                            className="w-16 p-1 text-center text-xs border border-secondary-300 rounded font-bold text-secondary-900 bg-white"
                            value={editData.takenLeaves}
                            onChange={e => setEditData({ ...editData, takenLeaves: parseFloat(e.target.value) || 0 })}
                        />
                    ) : (
                        <span className={`font-mono font-bold text-sm ${row.takenLeaves > 0 ? 'text-amber-600' : 'text-secondary-300'}`}>
                            {row.takenLeaves}
                        </span>
                    )}
                </td>
                <td className="p-3 text-center">
                    {isEditing ? (
                        <div className="flex gap-1 justify-center">
                            <input title="Late Deductions" type="number" step="0.1" className="w-12 text-center text-xs border rounded bg-rose-50" value={editData.lateDeductions} onChange={e => setEditData({ ...editData, lateDeductions: parseFloat(e.target.value) || 0 })} />
                            <input title="Short Leave Deductions" type="number" step="0.1" className="w-12 text-center text-xs border rounded bg-orange-50" value={editData.shortLeaveDeductions} onChange={e => setEditData({ ...editData, shortLeaveDeductions: parseFloat(e.target.value) || 0 })} />
                        </div>
                    ) : (
                        <span className="text-xs text-secondary-400">
                            {row.lateDeductions + row.shortLeaveDeductions > 0 ? `-${(row.lateDeductions + row.shortLeaveDeductions).toFixed(1)}` : '-'}
                        </span>
                    )}
                </td>
                <td className="p-3 text-center">
                    {isEditing ? (
                        <span className="font-black text-primary-700 text-sm">{calcClosing}</span>
                    ) : (
                        <span className="font-black text-secondary-900 text-sm">{row.closingBalance}</span>
                    )}
                </td>
                <td className="p-3">
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
                <td className="p-3 text-right">
                    {isEditing ? (
                        <div className="flex gap-2 justify-end">
                            <button disabled={isSaving} onClick={handleSave} className="text-xs bg-primary-600 text-white px-3 py-1 rounded font-bold hover:bg-primary-700">
                                {isSaving ? '...' : 'Save'}
                            </button>
                            <button disabled={isSaving} onClick={() => setEditingMonth(null)} className="text-xs bg-secondary-200 text-secondary-600 px-3 py-1 rounded font-bold hover:bg-secondary-300">
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setEditingMonth(row.month)} className="text-xs text-primary-600 hover:text-primary-800 font-bold underline">
                            Edit
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
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                                    {year}
                                </span>
                                <span className="text-sm text-slate-500 font-medium">
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
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-0 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="py-32 flex flex-col items-center justify-center gap-4 text-indigo-400/50 animate-pulse">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">⏳</div>
                            <span className="font-bold text-sm tracking-widest uppercase">Syncing Ledger...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                <tr className="text-[11px] font-black uppercase text-slate-500 tracking-widest">
                                    <th className="p-5 pl-8 w-1/12 bg-slate-50">Month</th>
                                    <th className="p-5 text-center w-1/12 bg-slate-50">Opening</th>
                                    <th className="p-5 text-center w-1/12 bg-slate-50">Credit</th>
                                    <th className="p-5 text-center w-1/12 bg-slate-50">Taken</th>
                                    <th className="p-5 text-center w-2/12 bg-slate-50">Deductions</th>
                                    <th className="p-5 text-center w-1/12 bg-slate-50 text-indigo-600">Closing</th>
                                    <th className="p-5 w-3/12 bg-slate-50">Remarks</th>
                                    <th className="p-5 w-1/12 text-right bg-slate-50 pr-8">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {history.map((row, idx) => (
                                    <HistoryRow key={row.month} row={row} />
                                ))}
                            </tbody>
                        </table>
                    )}
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
