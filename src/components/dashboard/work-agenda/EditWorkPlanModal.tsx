'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Flag, Eye, Save, Trash2, CheckCircle2, Briefcase, CheckSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WorkPlan {
    id: string;
    date: string;
    agenda: string;
    strategy?: string;
    priority: string;
    estimatedHours?: number;
    completionStatus: string;
    visibility: string;
    projectId?: string;
    taskId?: string;
    project?: { id: string; title: string };
    task?: { id: string; title: string };
}

interface EditWorkPlanModalProps {
    plan: WorkPlan;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditWorkPlanModal({ plan, onClose, onSuccess }: EditWorkPlanModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: plan.date.split('T')[0],
        agenda: plan.agenda,
        strategy: plan.strategy || '',
        priority: plan.priority,
        estimatedHours: plan.estimatedHours || '',
        completionStatus: plan.completionStatus,
        visibility: plan.visibility || 'MANAGER',
        projectId: plan.projectId || '',
        taskId: plan.taskId || '',
    });

    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [projRes, taskRes] = await Promise.all([
                    fetch('/api/it/projects'),
                    fetch('/api/it/tasks?view=my'),
                ]);

                if (projRes.ok) {
                    const data = await projRes.json();
                    setProjects(Array.isArray(data) ? data : (data.data || []));
                }
                if (taskRes.ok) {
                    const data = await taskRes.json();
                    setTasks(Array.isArray(data) ? data : (data.data || []));
                }
            } catch (error) {
                console.error('Failed to fetch projects/tasks', error);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);

            const payload = {
                id: plan.id,
                ...formData,
                estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours.toString()) : null,
            };

            const res = await fetch(`/api/work-agenda/${plan.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to update work plan');
            }

            toast.success('Work plan updated');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this work plan?')) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/work-agenda/${plan.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('Failed to delete work plan');
            }

            toast.success('Work plan deleted');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                    <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                        <CheckCircle2 className="text-primary-600" size={24} />
                        Update Work Plan
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-200 rounded-full transition-colors text-secondary-500 hover:text-secondary-900">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <input
                                    type="date"
                                    required
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Est. Hours</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900"
                                    value={formData.estimatedHours}
                                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Agenda</label>
                        <textarea
                            required
                            className="w-full p-4 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 min-h-[100px] resize-none"
                            value={formData.agenda}
                            onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Strategy / Notes</label>
                        <textarea
                            className="w-full p-4 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 min-h-[80px] resize-none"
                            value={formData.strategy}
                            onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Status</label>
                            <div className="relative">
                                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <select
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 bg-white"
                                    value={formData.completionStatus}
                                    onChange={(e) => setFormData({ ...formData, completionStatus: e.target.value })}
                                >
                                    <option value="PLANNED">Planned</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Priority</label>
                            <div className="relative">
                                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <select
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 bg-white"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="HIGH">High</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="LOW">Low</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Project (Optional)</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <select
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 bg-white"
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value, taskId: '' })}
                                >
                                    <option value="">None</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name || p.title || p.projectCode}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Linked Task (Optional)</label>
                            <div className="relative">
                                <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <select
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 bg-white"
                                    value={formData.taskId}
                                    onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                                >
                                    <option value="">None</option>
                                    {tasks
                                        .filter(t => !formData.projectId || t.projectId === formData.projectId)
                                        .map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.taskCode ? `[${t.taskCode}] ` : ''}{t.title}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-between gap-3 border-t border-secondary-100 mt-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-4 py-3 rounded-xl text-danger-600 font-bold hover:bg-danger-50 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={18} /> Delete
                        </button>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl text-secondary-600 font-bold hover:bg-secondary-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <span className="animate-spin">⏳</span> : <Save size={18} />}
                                Update Plan
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
