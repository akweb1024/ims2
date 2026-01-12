'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

interface Goal {
    id: string;
    title: string;
    description?: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    type: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
    startDate: string;
    endDate: string;
    employeeId: string;
    employee?: {
        designation?: string;
        user?: {
            name: string;
        };
    };
    kpiId?: string;
}

interface Employee {
    id: string;
    user?: {
        name: string;
    };
    designation?: string;
}

export default function GoalManager({ employees }: { employees: Employee[] }) {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        targetValue: 0,
        currentValue: 0,
        unit: 'Units',
        type: 'MONTHLY' as Goal['type'],
        startDate: '',
        endDate: '',
        employeeId: '',
        kpiId: ''
    });

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        try {
            const res = await fetch('/api/hr/performance/goals');
            if (res.ok) setGoals(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = selectedGoal ? 'PATCH' : 'POST';
            const body = selectedGoal ? { ...formData, id: selectedGoal.id } : formData;

            const res = await fetch('/api/hr/performance/goals', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowModal(false);
                fetchGoals();
                setSelectedGoal(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'MONTHLY': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'QUARTERLY': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'HALF_YEARLY': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'YEARLY': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-secondary-50 text-secondary-700 border-secondary-100';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900">Goal Tracking (KRA/KPI Breakdown)</h2>
                    <p className="text-secondary-500">Monitor monthly, quarterly, and yearly objectives.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedGoal(null);
                        setFormData({
                            title: '', description: '', targetValue: 0, currentValue: 0,
                            unit: 'Units', type: 'MONTHLY', startDate: '', endDate: '',
                            employeeId: '', kpiId: ''
                        });
                        setShowModal(true);
                    }}
                    className="btn btn-primary shadow-xl flex items-center gap-2"
                >
                    <Target size={18} />
                    New Goal
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center font-bold text-secondary-400">Loading goals...</div>
                ) : goals.length === 0 ? (
                    <div className="col-span-full py-20 text-center font-bold text-secondary-400 bg-secondary-50 rounded-3xl border-2 border-dashed border-secondary-200">
                        No goals tracked yet. Start by creating one!
                    </div>
                ) : goals.map(goal => {
                    const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
                    const isOverdue = progress < 100 && new Date(goal.endDate) < new Date();

                    return (
                        <div key={goal.id} className="card-premium group hover:border-primary-300 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-1 text-[10px] font-black rounded-lg border ${getTypeColor(goal.type)}`}>
                                    {goal.type}
                                </span>
                                {isOverdue ? (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase">
                                        <AlertCircle size={12} /> Overdue
                                    </span>
                                ) : progress >= 100 ? (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase">
                                        <CheckCircle size={12} /> Achieved
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase">
                                        <Clock size={12} /> In Progress
                                    </span>
                                )}
                            </div>

                            <h3 className="font-bold text-secondary-900 mb-1">{goal.title}</h3>
                            <p className="text-xs text-secondary-500 mb-4 line-clamp-2">{goal.description}</p>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-secondary-900 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                                    {goal.employee?.user?.name?.[0] || 'U'}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-secondary-900 leading-none">{goal.employee?.user?.name || 'Assigned Staff'}</p>
                                    <p className="text-[9px] font-bold text-secondary-400">{goal.employee?.designation}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-secondary-400">Progress</span>
                                    <span className="text-primary-600">{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                                </div>
                                <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : progress > 70 ? 'bg-primary-500' : progress > 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-secondary-50 flex justify-between items-center">
                                <div className="flex items-center gap-1 text-[9px] font-bold text-secondary-400 uppercase">
                                    <Calendar size={12} />
                                    <FormattedDate date={goal.endDate} />
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedGoal(goal);
                                        setFormData({
                                            title: goal.title,
                                            description: goal.description || '',
                                            targetValue: goal.targetValue,
                                            currentValue: goal.currentValue,
                                            unit: goal.unit,
                                            type: goal.type,
                                            startDate: new Date(goal.startDate).toISOString().split('T')[0],
                                            endDate: new Date(goal.endDate).toISOString().split('T')[0],
                                            employeeId: goal.employeeId,
                                            kpiId: goal.kpiId || ''
                                        });
                                        setShowModal(true);
                                    }}
                                    className="text-[10px] font-black text-primary-600 hover:underline"
                                >
                                    Update Progress
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-primary-900 p-6 text-white bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                            <h3 className="text-xl font-black">{selectedGoal ? 'Update Goal' : 'Create New Goal'}</h3>
                            <p className="text-primary-200 text-xs">Define objective and target for tracking.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label">Objective Title</label>
                                <input
                                    className="input"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Q1 Sales Target"
                                />
                            </div>
                            <div>
                                <label className="label">Employee</label>
                                <select
                                    className="input"
                                    required
                                    value={formData.employeeId}
                                    onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                                >
                                    <option value="">Select Staff</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.user?.name} ({e.designation})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Target Value</label>
                                    <input
                                        type="number"
                                        className="input"
                                        required
                                        value={formData.targetValue}
                                        onChange={e => setFormData({ ...formData, targetValue: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Current Progress</label>
                                    <input
                                        type="number"
                                        className="input"
                                        required
                                        value={formData.currentValue}
                                        onChange={e => setFormData({ ...formData, currentValue: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Goal Type</label>
                                    <select
                                        className="input"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as Goal['type'] })}
                                    >
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="QUARTERLY">Quarterly</option>
                                        <option value="HALF_YEARLY">Half Yearly</option>
                                        <option value="YEARLY">Yearly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Unit</label>
                                    <input
                                        className="input"
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="e.g., INR, Units, %"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Start Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        required
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">End Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        required
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn border-secondary-200">Cancel</button>
                                <button type="submit" className="flex-1 btn btn-primary">Save Goal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
