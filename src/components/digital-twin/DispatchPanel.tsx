'use client';

import { useState } from 'react';
import { EmployeeTwin, InventoryTwin } from '@/lib/digital-twin/twin-engine';

interface DispatchPanelProps {
    employees: EmployeeTwin[];
    inventory: InventoryTwin[];
    preselectedEmployeeId?: string;
    preselectedItemId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

const statusColors: Record<string, string> = {
    ACTIVE: 'text-green-400',
    OVERLOADED: 'text-red-400',
    OFFLINE_ALERT: 'text-yellow-400',
    OFFLINE: 'text-gray-400',
    CRITICAL: 'text-red-400',
    WARNING: 'text-yellow-400',
    HEALTHY: 'text-green-400',
};

export const DispatchPanel = ({ 
    employees, 
    inventory, 
    preselectedEmployeeId,
    preselectedItemId,
    onClose, 
    onSuccess 
}: DispatchPanelProps) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(preselectedEmployeeId || '');
    const [selectedItemId, setSelectedItemId] = useState(preselectedItemId || '');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const availableEmployees = employees.filter(e => e.status === 'ACTIVE' || e.status === 'OFFLINE_ALERT');
    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    const selectedItem = inventory.find(i => i.id === selectedItemId);

    const handleDispatch = async () => {
        if (!selectedEmployee || !selectedItem) {
            setError('Please select both an employee and an inventory item.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/digital-twin/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedEmployee.userId,
                    inventoryItemId: selectedItem.id,
                    notes: notes || undefined,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Dispatch failed');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div 
                className="relative w-full max-w-lg bg-[#0a0a0a] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-6 border-b border-white/5">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            ⚡
                        </div>
                        <h2 className="text-lg font-black text-white tracking-tight">Smart Dispatch</h2>
                    </div>
                    <p className="text-white/40 text-xs pl-11">Create an operational thread between a personnel node and a physical asset.</p>
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white/80 transition-colors text-xl">✕</button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Select Employee */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                            1. Select Personnel Node
                        </label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {availableEmployees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => setSelectedEmployeeId(emp.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 ${
                                        selectedEmployeeId === emp.id 
                                            ? 'bg-indigo-500/20 border-indigo-500 text-white' 
                                            : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{emp.name}</p>
                                            <p className="text-[10px] text-white/40">{emp.taskCount} active tasks</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold ${statusColors[emp.status]}`}>{emp.status}</span>
                                </button>
                            ))}
                            {availableEmployees.length === 0 && (
                                <p className="text-white/30 text-sm italic text-center py-4">No available personnel nodes found.</p>
                            )}
                        </div>
                    </div>

                    {/* Select Item */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                            2. Select Asset To Dispatch
                        </label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {inventory.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedItemId(item.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 ${
                                        selectedItemId === item.id 
                                            ? 'bg-indigo-500/20 border-indigo-500 text-white' 
                                            : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70'
                                    }`}
                                >
                                    <div>
                                        <p className="font-semibold text-sm">{item.name}</p>
                                        <p className="text-[10px] font-mono text-indigo-400">{item.sku}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold ${statusColors[item.status]}`}>{item.status}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    {selectedEmployee && selectedItem && (
                        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">Dispatch Preview</p>
                            <p className="text-white font-semibold">
                                <span className="text-indigo-400">{selectedEmployee.name}</span>
                                <span className="text-white/40 mx-2">→</span>
                                <span className="text-indigo-300">[DISPATCH] Restock {selectedItem.name}</span>
                            </p>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g., Check shelf 3A first..."
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-medium hover:border-white/20 hover:text-white/70 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDispatch}
                        disabled={!selectedEmployee || !selectedItem || loading}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/20"
                    >
                        {loading ? 'Dispatching...' : '⚡ Execute Dispatch'}
                    </button>
                </div>
            </div>
        </div>
    );
};
