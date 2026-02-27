'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Target, Flag, Eye, Save, Briefcase, CheckSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CreateWorkPlanModalProps {
    onClose: () => void;
    onSuccess: () => void;
    employeeId?: string;
}

export default function CreateWorkPlanModal({ onClose, onSuccess, employeeId }: CreateWorkPlanModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        agenda: '',
        strategy: '',
        priority: 'MEDIUM',
        estimatedHours: '',
        visibility: 'MANAGER',
        projectId: '',
        taskId: '',
    });

    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            try {
                const [projRes, taskRes] = await Promise.all([
                    fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } }),
                ]);

                if (projRes.ok) setProjects(await projRes.json());
                if (taskRes.ok) setTasks(await taskRes.json());
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
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            const payload = {
                ...formData,
                employeeId: employeeId || user.employeeId, // Fallback to current user if not provided
            };

            const token = localStorage.getItem('token');
            const res = await fetch('/api/work-agenda', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to create work plan');
            }

            toast.success('Work plan created successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                    <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                        <Calendar className="text-primary-600" size={24} />
                        Plan New Work
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
                                    placeholder="e.g. 4"
                                    value={formData.estimatedHours}
                                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Key Agenda</label>
                        <textarea
                            required
                            className="w-full p-4 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 min-h-[100px] resize-none"
                            placeholder="What are your main objectives for the day?"
                            value={formData.agenda}
                            onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Strategy / Notes (Optional)</label>
                        <textarea
                            className="w-full p-4 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 min-h-[80px] resize-none"
                            placeholder="Rough plan or strategy..."
                            value={formData.strategy}
                            onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Priority</label>
                            <div className="relative">
                                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <select
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 bg-white"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="HIGH">High Priority</option>
                                    <option value="MEDIUM">Medium Priority</option>
                                    <option value="LOW">Low Priority</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase tracking-widest">Visibility</label>
                            <div className="relative">
                                <Eye className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <select
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900 bg-white"
                                    value={formData.visibility}
                                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                                >
                                    <option value="MANAGER">Manager Only</option>
                                    <option value="public">Public (Team)</option>
                                    <option value="PRIVATE">Private</option>
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
                                        <option key={p.id} value={p.id}>{p.title}</option>
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
                                            <option key={t.id} value={t.id}>{t.title}</option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
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
                            Save Work Plan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
