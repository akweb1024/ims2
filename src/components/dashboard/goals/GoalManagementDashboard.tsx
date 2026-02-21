'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, Plus, TrendingUp, Calendar, Award, Edit, Trash2, Eye } from 'lucide-react';

interface Goal {
    id: string;
    title: string;
    description?: string;
    kra?: string;
    targetValue: number;
    currentValue: number;
    achievementPercentage: number;
    unit: string;
    type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    startDate: string;
    endDate: string;
    status: string;
    visibility: string;
    employee: {
        user: {
            name: string;
            email: string;
        };
    };
    kpi?: {
        title: string;
    };
    reviewer?: {
        name: string;
    };
}

interface GoalManagementDashboardProps {
    employeeId?: string;
    isOwnGoals?: boolean;
}

export default function GoalManagementDashboard({ employeeId, isOwnGoals = false }: GoalManagementDashboardProps) {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<'ALL' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    const fetchGoals = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (employeeId) params.append('employeeId', employeeId);
            if (selectedType !== 'ALL') params.append('type', selectedType);
            if (selectedStatus !== 'ALL') params.append('status', selectedStatus);

            const res = await fetch(`/api/goals?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setGoals(data);
            }
        } catch (error) {
            console.error('Error fetching goals:', error);
        } finally {
            setLoading(false);
        }
    }, [employeeId, selectedType, selectedStatus]);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-green-500';
        if (percentage >= 75) return 'bg-blue-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'IN_PROGRESS': 'bg-blue-100 text-blue-800',
            'COMPLETED': 'bg-green-100 text-green-800',
            'CANCELLED': 'bg-gray-100 text-gray-800',
            'PENDING': 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            'MONTHLY': 'bg-purple-100 text-purple-800',
            'QUARTERLY': 'bg-indigo-100 text-indigo-800',
            'YEARLY': 'bg-pink-100 text-pink-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    const filteredGoals = goals;

    const stats = {
        total: goals.length,
        inProgress: goals.filter(g => g.status === 'IN_PROGRESS').length,
        completed: goals.filter(g => g.status === 'COMPLETED').length,
        avgAchievement: goals.length > 0
            ? (goals.reduce((sum, g) => sum + g.achievementPercentage, 0) / goals.length).toFixed(1)
            : '0'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
                        <Target className="text-primary-600" size={28} />
                        {isOwnGoals ? 'My Goals & KRAs' : 'Team Goals & KRAs'}
                    </h2>
                    <p className="text-sm text-secondary-500 mt-1">
                        Track and manage goals, KRAs, and KPIs
                    </p>
                </div>
                {isOwnGoals && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create Goal
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-premium p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Total Goals</p>
                            <p className="text-2xl font-black text-secondary-900 mt-1">{stats.total}</p>
                        </div>
                        <Target className="text-primary-600" size={32} />
                    </div>
                </div>
                <div className="card-premium p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">In Progress</p>
                            <p className="text-2xl font-black text-blue-600 mt-1">{stats.inProgress}</p>
                        </div>
                        <TrendingUp className="text-blue-600" size={32} />
                    </div>
                </div>
                <div className="card-premium p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Completed</p>
                            <p className="text-2xl font-black text-green-600 mt-1">{stats.completed}</p>
                        </div>
                        <Award className="text-green-600" size={32} />
                    </div>
                </div>
                <div className="card-premium p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Avg Achievement</p>
                            <p className="text-2xl font-black text-purple-600 mt-1">{stats.avgAchievement}%</p>
                        </div>
                        <TrendingUp className="text-purple-600" size={32} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card-premium p-4">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="text-xs font-bold text-secondary-600 uppercase mb-2 block">Period</label>
                        <div className="flex gap-2">
                            {['ALL', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type as any)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedType === type
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-secondary-600 uppercase mb-2 block">Status</label>
                        <div className="flex gap-2">
                            {['ALL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setSelectedStatus(status as any)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedStatus === status
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                                        }`}
                                >
                                    {status.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Goals List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-secondary-500 mt-4">Loading goals...</p>
                </div>
            ) : filteredGoals.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <Target className="mx-auto text-secondary-300" size={64} />
                    <h3 className="text-xl font-bold text-secondary-900 mt-4">No Goals Found</h3>
                    <p className="text-secondary-500 mt-2">
                        {isOwnGoals ? 'Create your first goal to get started!' : 'No goals match the selected filters.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredGoals.map(goal => (
                        <div key={goal.id} className="card-premium p-6 hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-black text-secondary-900">{goal.title}</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTypeBadge(goal.type)}`}>
                                            {goal.type}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBadge(goal.status)}`}>
                                            {goal.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {goal.kra && (
                                        <p className="text-sm text-secondary-600 mb-2">
                                            <span className="font-bold">KRA:</span> {goal.kra}
                                        </p>
                                    )}
                                    {goal.description && (
                                        <p className="text-sm text-secondary-600">{goal.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-3 text-xs text-secondary-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}
                                        </span>
                                        {goal.reviewer && (
                                            <span>Reviewer: {goal.reviewer.name}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingGoal(goal)}
                                        className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                                        title="Edit Goal"
                                    >
                                        <Edit size={18} className="text-secondary-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-secondary-700">Progress</span>
                                    <span className="font-black text-secondary-900">
                                        {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
                                    </span>
                                </div>
                                <div className="w-full bg-secondary-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full ${getProgressColor(goal.achievementPercentage)} transition-all duration-500 rounded-full flex items-center justify-end pr-2`}
                                        style={{ width: `${Math.min(goal.achievementPercentage, 100)}%` }}
                                    >
                                        {goal.achievementPercentage >= 20 && (
                                            <span className="text-xs font-bold text-white">
                                                {goal.achievementPercentage.toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {goal.achievementPercentage < 20 && (
                                    <p className="text-xs font-bold text-secondary-600 text-right">
                                        {goal.achievementPercentage.toFixed(1)}%
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal would go here */}
            {showCreateModal && (
                <CreateGoalModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchGoals();
                    }}
                    employeeId={employeeId}
                />
            )}

            {editingGoal && (
                <EditGoalModal
                    goal={editingGoal}
                    onClose={() => setEditingGoal(null)}
                    onSuccess={() => {
                        setEditingGoal(null);
                        fetchGoals();
                    }}
                />
            )}
        </div>
    );
}

// Placeholder components - to be implemented
function CreateGoalModal({ onClose, onSuccess, employeeId }: any) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        kra: '',
        targetValue: '',
        unit: 'Units',
        type: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        status: 'IN_PROGRESS',
        visibility: 'MANAGER'
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    targetValue: parseFloat(form.targetValue),
                    employeeId
                })
            });

            if (res.ok) {
                onSuccess();
            } else {
                alert('Failed to create goal');
            }
        } catch (error) {
            console.error(error);
            alert('Error creating goal');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
                    <h3 className="font-bold text-lg text-secondary-900">Create New Goal</h3>
                    <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="space-y-4">
                        <div>
                            <label className="label-premium">Goal Title</label>
                            <input
                                required
                                className="input-premium w-full"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. Increase Monthly Revenue"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-premium">Target Value</label>
                                <input
                                    type="number"
                                    required
                                    className="input-premium w-full"
                                    value={form.targetValue}
                                    onChange={e => setForm({ ...form, targetValue: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">Unit</label>
                                <input
                                    required
                                    className="input-premium w-full"
                                    value={form.unit}
                                    onChange={e => setForm({ ...form, unit: e.target.value })}
                                    placeholder="e.g. ₹, Leads, etc"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-premium">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    className="input-premium w-full"
                                    value={form.startDate}
                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">End Date</label>
                                <input
                                    type="date"
                                    required
                                    className="input-premium w-full"
                                    value={form.endDate}
                                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-premium">Type</label>
                                <select
                                    className="input-premium w-full"
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="QUARTERLY">Quarterly</option>
                                    <option value="YEARLY">Yearly</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Visibility</label>
                                <select
                                    className="input-premium w-full"
                                    value={form.visibility}
                                    onChange={e => setForm({ ...form, visibility: e.target.value })}
                                >
                                    <option value="ALL">Public</option>
                                    <option value="SELF">Private</option>
                                    <option value="MANAGER">Manager Only</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="label-premium">KRA (Optional)</label>
                            <input
                                className="input-premium w-full"
                                value={form.kra}
                                onChange={e => setForm({ ...form, kra: e.target.value })}
                                placeholder="Linked KRA"
                            />
                        </div>
                        <div>
                            <label className="label-premium">Description (Optional)</label>
                            <textarea
                                className="input-premium w-full"
                                rows={3}
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={submitting} className="btn btn-primary">
                            {submitting ? 'Creating...' : 'Create Goal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EditGoalModal({ goal, onClose, onSuccess }: any) {
    const [form, setForm] = useState({
        currentValue: goal.currentValue,
        status: goal.status,
        description: goal.description || ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/goals/${goal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentValue: parseFloat(form.currentValue),
                    status: form.status,
                    description: form.description
                })
            });

            if (res.ok) {
                onSuccess();
            } else {
                alert('Failed to update goal');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating goal');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
                    <h3 className="font-bold text-lg text-secondary-900">Update Goal Progress</h3>
                    <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <h4 className="font-bold text-secondary-900">{goal.title}</h4>
                        <p className="text-sm text-secondary-500">Target: {goal.targetValue} {goal.unit}</p>
                    </div>

                    <div>
                        <label className="label-premium">Current Value</label>
                        <input
                            type="number"
                            required
                            className="input-premium w-full"
                            value={form.currentValue}
                            onChange={e => setForm({ ...form, currentValue: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label-premium">Status</label>
                        <select
                            className="input-premium w-full"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                        >
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="PENDING">Pending</option>
                        </select>
                    </div>

                    <div>
                        <label className="label-premium">Notes / Updates</label>
                        <textarea
                            className="input-premium w-full"
                            rows={3}
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Add progress notes..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={submitting} className="btn btn-primary">
                            {submitting ? 'Updating...' : 'Update Progress'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
