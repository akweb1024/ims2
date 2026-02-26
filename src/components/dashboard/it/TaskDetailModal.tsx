'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, AlignLeft, CheckSquare, Clock, AlertCircle, Link as LinkIcon, Save, Trash2, Rocket, Zap, ShieldCheck } from 'lucide-react';

interface Task {
    id: string;
    taskCode: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    type: string;
    dueDate: string | null;
    estimatedHours: number | null;
    progressPercent: number;
    assignedToId: string | null;
    projectId: string | null;
    dependencies: string[];
}

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId?: string;
    task?: Task;
    onSuccess: () => void;
    allUsers: any[];
    allProjects: any[];
    otherTasks?: Task[];
}

const STATUSES = [
    { value: 'PENDING', label: 'To Do', color: 'bg-slate-400' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
    { value: 'UNDER_REVIEW', label: 'Review', color: 'bg-amber-500' },
    { value: 'COMPLETED', label: 'Done', color: 'bg-emerald-500' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'bg-rose-500' },
];

const PRIORITIES = [
    { value: 'LOW', label: 'Low', color: 'text-emerald-600 bg-emerald-50' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-amber-600 bg-amber-50' },
    { value: 'HIGH', label: 'High', color: 'text-orange-600 bg-orange-50' },
    { value: 'CRITICAL', label: 'Critical', color: 'text-rose-600 bg-rose-50' },
];

export default function TaskDetailModal({
    isOpen,
    onClose,
    taskId,
    task: initialTask,
    onSuccess,
    allUsers,
    allProjects,
    otherTasks = []
}: TaskDetailModalProps) {
    const [task, setTask] = useState<Task | null>(initialTask || null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('PENDING');
    const [priority, setPriority] = useState('MEDIUM');
    const [dueDate, setDueDate] = useState('');
    const [assignedToId, setAssignedToId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');
    const [progressPercent, setProgressPercent] = useState('0');
    const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

    const populateForm = useCallback((data: Task) => {
        setTitle(data.title);
        setDescription(data.description || '');
        setStatus(data.status);
        setPriority(data.priority);
        setDueDate(data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '');
        setAssignedToId(data.assignedToId || '');
        setProjectId(data.projectId || '');
        setEstimatedHours(data.estimatedHours?.toString() || '');
        setProgressPercent(data.progressPercent.toString());
        setSelectedDependencies(data.dependencies || []);
    }, []);

    const fetchTaskDetails = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/it/tasks/${taskId}`);
            if (res.ok) {
                const data = await res.json();
                setTask(data);
                populateForm(data);
            }
        } catch (error) {
            console.error('Failed to fetch task:', error);
        } finally {
            setLoading(false);
        }
    }, [taskId, populateForm]);

    useEffect(() => {
        if (isOpen && taskId && !initialTask) {
            fetchTaskDetails();
        } else if (isOpen && initialTask) {
            populateForm(initialTask);
        }
    }, [isOpen, taskId, initialTask, fetchTaskDetails, populateForm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                title,
                description,
                status,
                priority,
                dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                assignedToId: assignedToId || null,
                projectId: projectId || null,
                estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
                progressPercent: parseInt(progressPercent),
                dependencies: selectedDependencies
            };

            const res = await fetch(`/api/it/tasks/${task?.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert('Failed to update task');
            }
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Error updating task');
        } finally {
            setSaving(false);
        }
    };

    const toggleDependency = (depId: string) => {
        if (selectedDependencies.includes(depId)) {
            setSelectedDependencies(selectedDependencies.filter(id => id !== depId));
        } else {
            setSelectedDependencies([...selectedDependencies, depId]);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-5xl bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header Section */}
                        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
                                    <Rocket className="h-6 w-6 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Engineering Task</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{task?.taskCode || 'ID-PENDING'}</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                                        {title || 'Untranslated Mission'}
                                    </h2>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="absolute top-8 right-8 p-2 hover:bg-white hover:shadow-lg rounded-xl transition-all text-slate-400 hover:text-slate-900"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
                                <div className="h-10 w-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Decrypting Task Data...</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
                                {/* Main Editor Column */}
                                <div className="lg:col-span-8 space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            <Zap className="h-3 w-3" /> Mission Definition
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full bg-slate-100/50 border-none rounded-2xl px-6 py-4 text-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300 transition-all"
                                            placeholder="Enter task heading..."
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            <AlignLeft className="h-3 w-3" /> Detailed Intelligence
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={8}
                                            className="w-full bg-slate-100/50 border-none rounded-2xl px-6 py-4 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300 transition-all resize-none"
                                            placeholder="Document technical requirements and scope..."
                                        />
                                    </div>

                                    {/* Dependencies Section */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <LinkIcon className="h-3 w-3" /> System Dependencies
                                            </label>
                                            <span className="text-[10px] font-bold text-slate-400">{selectedDependencies.length} Linked</span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {selectedDependencies.map(depId => {
                                                const depTask = otherTasks.find(t => t.id === depId);
                                                return (
                                                    <motion.div 
                                                        layout
                                                        key={depId} 
                                                        className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm"
                                                    >
                                                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                                        <span className="text-[10px] font-black text-slate-700">{depTask?.taskCode || 'TASK'}</span>
                                                        <button onClick={() => toggleDependency(depId)} className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-500">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </motion.div>
                                                );
                                            })}
                                            <select
                                                className="bg-blue-50 border-none text-[10px] font-black text-blue-600 rounded-xl px-3 py-1.5 focus:ring-0 cursor-pointer"
                                                onChange={(e) => {
                                                    if (e.target.value) toggleDependency(e.target.value);
                                                    e.target.value = '';
                                                }}
                                            >
                                                <option value="">+ Link Dependency</option>
                                                {otherTasks
                                                    .filter(t => t.id !== task?.id && !selectedDependencies.includes(t.id))
                                                    .map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.taskCode}: {t.title.substring(0, 20)}...
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* sidebar settings Column */}
                                <div className="lg:col-span-4 space-y-8">
                                    {/* Operational Status */}
                                    <div className="bg-slate-900 rounded-[2rem] p-8 shadow-xl shadow-slate-200 space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Task Lifecycle</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {STATUSES.map(s => (
                                                    <button
                                                        key={s.value}
                                                        type="button"
                                                        onClick={() => setStatus(s.value)}
                                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all ${status === s.value ? 'bg-white text-slate-900 shadow-lg scale-[1.02]' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                                    >
                                                        <div className={`h-2 w-2 rounded-full ${s.color}`} />
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prioritization</label>
                                            <div className="flex flex-wrap gap-2">
                                                {PRIORITIES.map(p => (
                                                    <button
                                                        key={p.value}
                                                        type="button"
                                                        onClick={() => setPriority(p.value)}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${priority === p.value ? `${p.color} border-current ring-2 ring-current/20` : 'bg-slate-800 border-transparent text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Resource & Timeline */}
                                    <div className="space-y-6 px-2">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <User className="h-3 w-3" /> Personnel
                                            </label>
                                            <select
                                                value={assignedToId}
                                                onChange={(e) => setAssignedToId(e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 shadow-sm focus:ring-blue-500/20"
                                            >
                                                <option value="">Unassigned</option>
                                                {allUsers.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    <Calendar className="h-3 w-3" /> Deadline
                                                </label>
                                                <input
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 shadow-sm focus:ring-blue-500/20"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    <Clock className="h-3 w-3" /> Capacity (Hrs)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={estimatedHours}
                                                    onChange={(e) => setEstimatedHours(e.target.value)}
                                                    placeholder="0.0"
                                                    className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 shadow-sm focus:ring-blue-500/20"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <span>Mission Progress</span>
                                                <span className="text-blue-600">{progressPercent}%</span>
                                            </div>
                                            <div className="relative h-6 flex items-center">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={progressPercent}
                                                    onChange={(e) => setProgressPercent(e.target.value)}
                                                    className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-4 space-y-3">
                                        <button
                                            onClick={handleSubmit}
                                            disabled={saving}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <><Save className="h-5 w-5" /> Commit Changes</>
                                            )}
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="w-full bg-white border border-slate-200 text-slate-600 font-black py-4 rounded-[1.5rem] hover:bg-slate-50 transition-all"
                                        >
                                            Abort
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
