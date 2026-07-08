'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useShifts, useEmployees } from '@/hooks/useHR';
import { toast } from 'react-hot-toast';
import { Clock, Plus, Trash2, Edit2, Save, X, Moon, Sun, Star, Users, Search, CheckSquare, Square } from 'lucide-react';

export default function ShiftManager() {
    const { data: shifts, create, update, remove } = useShifts();
    const { data: employees } = useEmployees(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [assigningShift, setAssigningShift] = useState<any>(null);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [assigning, setAssigning] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        gracePeriod: 15,
        isNightShift: false
    });

    const employeeCountByShift = useMemo(() => {
        const counts: Record<string, number> = {};
        (employees || []).forEach((e: any) => {
            if (e.shiftId) counts[e.shiftId] = (counts[e.shiftId] || 0) + 1;
        });
        return counts;
    }, [employees]);

    const handleSave = async () => {
        try {
            if (editingId) {
                await update.mutateAsync({ id: editingId, ...formData });
                setEditingId(null);
            } else {
                await create.mutateAsync(formData);
                setIsAdding(false);
            }
            setFormData({ name: '', startTime: '09:00', endTime: '18:00', gracePeriod: 15, isNightShift: false });
        } catch (err) {
            alert('Failed to save shift');
        }
    };

    const handleEdit = (shift: any) => {
        setEditingId(shift.id);
        setFormData({
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            gracePeriod: shift.gracePeriod,
            isNightShift: shift.isNightShift
        });
        setIsAdding(true);
    };

    const handleSetDefault = async (shift: any) => {
        try {
            await update.mutateAsync({ id: shift.id, isDefault: true });
            toast.success(`"${shift.name}" is now the default shift for employees with no assignment.`);
        } catch {
            toast.error('Failed to set default shift');
        }
    };

    const openAssignModal = (shift: any) => {
        setAssigningShift(shift);
        setEmployeeSearch('');
        setSelectedEmployeeIds((employees || []).filter((e: any) => e.shiftId === shift.id).map((e: any) => e.id));
    };

    const filteredEmployees = useMemo(() => {
        const q = employeeSearch.trim().toLowerCase();
        if (!q) return employees || [];
        return (employees || []).filter((e: any) =>
            (e.user?.name || '').toLowerCase().includes(q) ||
            (e.user?.email || '').toLowerCase().includes(q) ||
            (e.designation || '').toLowerCase().includes(q)
        );
    }, [employees, employeeSearch]);

    const allFilteredSelected = filteredEmployees.length > 0 && filteredEmployees.every((e: any) => selectedEmployeeIds.includes(e.id));

    const toggleSelectAllFiltered = () => {
        const filteredIds = filteredEmployees.map((e: any) => e.id);
        setSelectedEmployeeIds((prev) =>
            allFilteredSelected
                ? prev.filter((id) => !filteredIds.includes(id))
                : Array.from(new Set([...prev, ...filteredIds]))
        );
    };

    const handleApplyAssignment = async () => {
        if (!assigningShift) return;
        setAssigning(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/hr/shifts/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ shiftId: assigningShift.id, employeeIds: selectedEmployeeIds }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to assign shift');
            toast.success(`${data.updated} employee(s) now on "${assigningShift.name}".`);
            setAssigningShift(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to assign shift');
        } finally {
            setAssigning(false);
        }
    };

    const toggleEmployee = (id: string) => {
        setSelectedEmployeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-secondary-900 tracking-tight">Shift Definitions</h3>
                    <p className="text-secondary-500 text-sm font-medium">Manage working hours and grace periods for your workforce.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-primary-100 transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                        <Plus size={16} /> Define New Shift
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="card-premium p-8 border-2 border-primary-100 bg-primary-50/10">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="font-black text-secondary-900 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Clock className="text-primary-600" size={18} />
                            {editingId ? 'Edit Shift' : 'New Shift Configuration'}
                        </h4>
                        <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-secondary-400 hover:text-secondary-620">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 space-y-4">
                            <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">Shift Name</label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="input w-full bg-white border-secondary-200 focus:ring-primary-500 font-bold"
                                placeholder="e.g. Morning Standard"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">Start Time</label>
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    className="input w-full bg-white border-secondary-200 focus:ring-primary-500 font-bold"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">End Time</label>
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    className="input w-full bg-white border-secondary-200 focus:ring-primary-500 font-bold"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">Grace (Mins)</label>
                                <input
                                    type="number"
                                    value={formData.gracePeriod}
                                    onChange={e => setFormData({ ...formData, gracePeriod: parseInt(e.target.value) || 0 })}
                                    className="input w-full bg-white border-secondary-200 focus:ring-primary-500 font-bold"
                                />
                            </div>
                            <div className="flex flex-col justify-center gap-2">
                                <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">Shift Type</label>
                                <button
                                    onClick={() => setFormData({ ...formData, isNightShift: !formData.isNightShift })}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-xs ${formData.isNightShift ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-orange-600 border-orange-200'}`}
                                >
                                    {formData.isNightShift ? <><Moon size={14} /> Night Shift</> : <><Sun size={14} /> Day Shift</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-8 gap-4">
                        <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="btn bg-secondary-100 text-secondary-600 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                        <button onClick={handleSave} className="btn bg-primary-600 text-white px-10 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary-100 flex items-center gap-2">
                            <Save size={16} /> {editingId ? 'Update Shift' : 'Create Shift'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shifts?.map((shift: any) => (
                    <div key={shift.id} className={`card-premium group hover:border-primary-300 transition-all p-6 relative overflow-hidden ${shift.isDefault ? 'ring-2 ring-amber-300' : ''}`}>
                        <div className={`absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity ${shift.isNightShift ? 'text-indigo-600' : 'text-orange-500'}`}>
                            {shift.isNightShift ? <Moon size={80} /> : <Sun size={80} />}
                        </div>

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-lg font-black text-secondary-900 tracking-tight flex items-center gap-2">
                                    {shift.name}
                                    {shift.isDefault && (
                                        <span className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                            <Star size={10} fill="currentColor" /> Default
                                        </span>
                                    )}
                                </h4>
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1 ${shift.isNightShift ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {shift.isNightShift ? 'Overnight' : 'Regular Day'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(shift)} className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => remove.mutate(shift.id)} className="p-2 text-secondary-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 justify-between border-t border-secondary-50 pt-6">
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Time Range</p>
                                <p className="text-xl font-black text-secondary-900">{shift.startTime} – {shift.endTime}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Grace</p>
                                <p className="text-xl font-black text-primary-600">{shift.gracePeriod}m</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-secondary-50">
                            <button
                                onClick={() => openAssignModal(shift)}
                                className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-secondary-600 bg-secondary-50 hover:bg-secondary-100 px-3 py-2 rounded-xl transition-all"
                            >
                                <Users size={12} /> {employeeCountByShift[shift.id] || 0} Assigned
                            </button>
                            {!shift.isDefault && (
                                <button
                                    onClick={() => handleSetDefault(shift)}
                                    title="Make this the default for employees with no shift assigned"
                                    className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-xl transition-all"
                                >
                                    <Star size={12} /> Set Default
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {shifts?.length === 0 && !isAdding && (
                    <div className="col-span-full py-20 bg-secondary-50/50 rounded-[2.5rem] border-4 border-dashed border-secondary-100 flex flex-col items-center text-center">
                        <Clock size={48} className="text-secondary-200 mb-4" />
                        <h4 className="text-xl font-black text-secondary-900 tracking-tight">No shifts defined yet.</h4>
                        <p className="text-secondary-500 max-w-xs mt-2 font-medium">Define your first shift to start assigning work schedules to your team.</p>
                        <button onClick={() => setIsAdding(true)} className="mt-6 text-primary-600 font-bold uppercase tracking-widest text-[10px] hover:underline">Add One Now</button>
                    </div>
                )}
            </div>

            {/* Assign Employees Modal — portal to document.body so this fixed-position overlay
                is positioned against the real viewport, not whichever ancestor (e.g. an
                animate-in wrapper) happens to establish a transform containing block. */}
            {assigningShift && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] my-auto flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-start shrink-0">
                            <div>
                                <h4 className="font-black text-secondary-900 text-lg">Assign to &quot;{assigningShift.name}&quot;</h4>
                                <p className="text-secondary-500 text-xs font-medium mt-1">
                                    A standing assignment — stays in effect until changed, and drives lateness automatically ({assigningShift.startTime}–{assigningShift.endTime}, {assigningShift.gracePeriod}m grace).
                                </p>
                            </div>
                            <button onClick={() => setAssigningShift(null)} className="text-secondary-400 hover:text-secondary-600 shrink-0 ml-4">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-secondary-100 shrink-0 space-y-3">
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400" />
                                <input
                                    type="text"
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    placeholder="Search by name, email, or designation…"
                                    className="input w-full bg-secondary-50 border-secondary-200 focus:ring-primary-500 pl-10 text-sm"
                                    autoFocus
                                />
                                {employeeSearch && (
                                    <button
                                        onClick={() => setEmployeeSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={toggleSelectAllFiltered}
                                    disabled={filteredEmployees.length === 0}
                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 disabled:opacity-40"
                                >
                                    {allFilteredSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                                    {allFilteredSelected ? 'Clear' : 'Select all'} {employeeSearch ? `(${filteredEmployees.length} shown)` : `(${filteredEmployees.length})`}
                                </button>
                                <span className="text-[10px] font-black uppercase tracking-widest text-secondary-400">
                                    {selectedEmployeeIds.length} selected
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {filteredEmployees.map((emp: any) => {
                                const checked = selectedEmployeeIds.includes(emp.id);
                                const currentShiftName = shifts?.find((s: any) => s.id === emp.shiftId)?.name;
                                return (
                                    <label
                                        key={emp.id}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${checked ? 'bg-primary-50 border border-primary-200' : 'hover:bg-secondary-50 border border-transparent'}`}
                                    >
                                        <input type="checkbox" checked={checked} onChange={() => toggleEmployee(emp.id)} className="w-4 h-4 accent-primary-600 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-secondary-900 truncate">{emp.user?.name || emp.user?.email}</p>
                                            <p className="text-[10px] text-secondary-400 truncate">{emp.designation || 'No designation'}</p>
                                        </div>
                                        {currentShiftName && currentShiftName !== assigningShift.name && (
                                            <span className="text-[9px] font-black uppercase text-secondary-400 bg-secondary-50 px-2 py-0.5 rounded shrink-0">
                                                Currently: {currentShiftName}
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                            {employeeSearch && filteredEmployees.length === 0 && (
                                <p className="text-center text-secondary-400 text-sm py-8">No employees match &quot;{employeeSearch}&quot;.</p>
                            )}
                            {!employeeSearch && (!employees || employees.length === 0) && (
                                <p className="text-center text-secondary-400 text-sm py-8">No employees found.</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-secondary-100 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setAssigningShift(null)} className="btn bg-secondary-100 text-secondary-600 px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                                Cancel
                            </button>
                            <button
                                onClick={handleApplyAssignment}
                                disabled={assigning}
                                className="btn bg-primary-600 text-white px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary-100 disabled:opacity-50"
                            >
                                {assigning ? 'Applying…' : `Apply to ${selectedEmployeeIds.length} Employee(s)`}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
