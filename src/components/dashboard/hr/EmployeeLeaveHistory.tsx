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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50 rounded-t-2xl">
                    <div>
                        <h3 className="text-xl font-black text-secondary-900">Leave Ledger History</h3>
                        <p className="text-sm text-secondary-500 font-medium">
                            {history[0]?.name || 'Employee'} • {year}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-secondary-100 flex items-center justify-center text-secondary-500 font-bold transition-colors">
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    {isLoading ? (
                        <div className="py-20 text-center text-secondary-400 font-bold animate-pulse">Loading ledger history...</div>
                    ) : (
                        <div className="border border-secondary-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr className="text-[10px] font-black uppercase text-secondary-400 tracking-wider">
                                        <th className="p-3">Month</th>
                                        <th className="p-3 text-center">Opening</th>
                                        <th className="p-3 text-center">Credit</th>
                                        <th className="p-3 text-center">Taken</th>
                                        <th className="p-3 text-center">Deductions</th>
                                        <th className="p-3 text-center">Closing</th>
                                        <th className="p-3">Remarks</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(row => (
                                        <HistoryRow key={row.month} row={row} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-secondary-50/50 border-t border-secondary-100 text-[10px] text-center text-secondary-400 font-medium rounded-b-2xl">
                    💡 Tip: Updating a past month (e.g., Jan) will automatically recalculate balances for all subsequent months (Feb-Dec).
                </div>
            </div>
        </div>
    );
};

export default EmployeeLeaveHistory;
