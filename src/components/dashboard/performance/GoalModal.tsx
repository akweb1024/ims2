
'use client';

import { useState, useEffect } from 'react';
import { FiX, FiCheck, FiTarget } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Goal } from '@/types/performance';

interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    goal: Goal | null;
    onSuccess: () => void;
    period: string;
}

export default function GoalModal({ isOpen, onClose, goal, onSuccess, period }: GoalModalProps) {
    const [formData, setFormData] = useState<Partial<Goal>>({
        title: '',
        description: '',
        targetValue: 0,
        currentValue: 0,
        unit: '',
        type: period,
        startDate: '',
        endDate: '',
        employeeId: '',
        kra: ''
    });
    const [employees, setEmployees] = useState<any[]>([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (goal) {
            setFormData({
                ...goal,
                startDate: goal.startDate ? new Date(goal.startDate).toISOString().split('T')[0] : '',
                endDate: goal.endDate ? new Date(goal.endDate).toISOString().split('T')[0] : ''
            });
        } else {
            setFormData({
                title: '',
                description: '',
                targetValue: 0,
                currentValue: 0,
                unit: '',
                type: period,
                startDate: '',
                endDate: '',
                employeeId: '',
                kra: ''
            });
        }
    }, [goal, period, isOpen]);

    useEffect(() => {
        const fetchEmployees = async () => {
            setIsLoadingEmployees(true);
            try {
                const res = await fetch('/api/staff-management/employees');
                const data = await res.json();
                if (res.ok) setEmployees(data);
            } catch (error) {
                console.error('Failed to fetch employees');
            } finally {
                setIsLoadingEmployees(false);
            }
        };
        if (isOpen) fetchEmployees();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const method = goal ? 'PATCH' : 'POST';
            const res = await fetch('/api/performance/goals', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    id: goal?.id
                })
            });

            if (res.ok) {
                toast.success(goal ? 'Goal updated' : 'Goal assigned');
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to save goal');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-secondary-200">
                <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                    <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest">
                        {goal ? 'Edit Goal/Target' : 'Assign New Goal/Target'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-secondary-400 transition-colors">
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Goal/KRA Title</label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="input-premium py-2.5 text-xs"
                            placeholder="e.g. Monthly Sales Outreach"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Description</label>
                        <textarea
                            rows={2}
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input-premium py-2 text-xs"
                            placeholder="Optional details about the goal..."
                        ></textarea>
                    </div>

                    {!goal && (
                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Assign To Employee</label>
                            <select
                                required
                                value={formData.employeeId}
                                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                className="input-premium py-2.5 text-xs"
                            >
                                <option value="">Select Employee</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>{emp.user?.name || emp.user?.email}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Goal Type</label>
                        <select
                            required
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="input-premium py-2.5 text-xs"
                        >
                            <option value="MONTHLY">Monthly</option>
                            <option value="QUARTERLY">Quarterly</option>
                            <option value="YEARLY">Yearly</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Target Value</label>
                            <input
                                required
                                type="number"
                                value={formData.targetValue}
                                onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) })}
                                className="input-premium py-2.5 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Unit</label>
                            <input
                                required
                                type="text"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="input-premium py-2.5 text-xs"
                                placeholder="Calls, Sales, %"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Start Date</label>
                            <input
                                required
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="input-premium py-2.5 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">End Date</label>
                            <input
                                required
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="input-premium py-2.5 text-xs"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-secondary-100 bg-secondary-50 -mx-6 -mb-6 px-6 py-4 flex items-center justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs p-2.5 px-6">Cancel</button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary text-xs p-2.5 px-6 flex items-center gap-2 shadow-lg hover:shadow-primary-600/20"
                        >
                            {isSubmitting ? 'Saving...' : <><FiCheck /> {goal ? 'Update Goal' : 'Assign Goal'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
