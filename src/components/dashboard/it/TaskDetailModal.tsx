'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, User, AlignLeft, CheckSquare, Clock, AlertCircle, Link as LinkIcon, Save, Trash2 } from 'lucide-react';

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
    taskId?: string; // If provided, load task data. If not, it's a new task (optional support)
    task?: Task; // Pass task object directly to avoid initial fetch delay
    onSuccess: () => void;
    allUsers: any[];
    allProjects: any[];
    otherTasks?: Task[]; // For dependency selection
}

const STATUSES = [
    { value: 'PENDING', label: 'To Do' },
    { value: 'PLANNING', label: 'Planning' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'TESTING', label: 'Testing' },
    { value: 'UNDER_REVIEW', label: 'Review' },
    { value: 'COMPLETED', label: 'Done' },
    { value: 'ON_HOLD', label: 'On Hold' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITIES = [
    { value: 'LOW', label: 'Low', color: 'text-green-600' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
    { value: 'HIGH', label: 'High', color: 'text-orange-600' },
    { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' },
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

    // Toggle dependency
    const toggleDependency = (depId: string) => {
        if (selectedDependencies.includes(depId)) {
            setSelectedDependencies(selectedDependencies.filter(id => id !== depId));
        } else {
            setSelectedDependencies([...selectedDependencies, depId]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all text-left">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                            <CheckSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {task?.taskCode || 'Edit Task'}
                            </h2>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-md">
                                {title}
                            </h1>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column: Form Fields */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Title & Description */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                                        <AlignLeft className="h-4 w-4" /> Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={5}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Add more details to this task..."
                                    />
                                </div>
                            </div>

                            {/* Dependencies Section */}
                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-gray-500" /> Dependencies
                                </h3>

                                {selectedDependencies.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {selectedDependencies.map(depId => {
                                            const depTask = otherTasks.find(t => t.id === depId);
                                            return (
                                                <div key={depId} className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-2 py-1 rounded text-xs font-medium">
                                                    <AlertCircle className="h-3 w-3" />
                                                    {depTask ? depTask.taskCode : depId.substring(0, 6)}
                                                    <button onClick={() => toggleDependency(depId)} className="hover:text-red-500">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="relative">
                                    <select
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                        onChange={(e) => {
                                            if (e.target.value) toggleDependency(e.target.value);
                                            e.target.value = '';
                                        }}
                                    >
                                        <option value="">+ Add Dependency (Blocks this task)</option>
                                        {otherTasks
                                            .filter(t => t.id !== task?.id && !selectedDependencies.includes(t.id))
                                            .map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.taskCode} - {t.title.substring(0, 30)}...
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {saving ? 'Saving...' : <><Save className="h-5 w-5" /> Save Changes</>}
                            </button>

                        </div>

                        {/* Right Column: Meta & Settings */}
                        <div className="space-y-6">

                            {/* Status & Priority */}
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium"
                                    >
                                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Priority</label>
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium"
                                    >
                                        {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Assignments */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1">
                                        <User className="h-4 w-4" /> Assignee
                                    </label>
                                    <select
                                        value={assignedToId}
                                        onChange={(e) => setAssignedToId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">Unassigned</option>
                                        {allUsers.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1">
                                        <Calendar className="h-4 w-4" /> Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1">
                                        <Clock className="h-4 w-4" /> Est. Hours
                                    </label>
                                    <input
                                        type="number"
                                        value={estimatedHours}
                                        onChange={(e) => setEstimatedHours(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1">
                                        Progress ({progressPercent}%)
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="10"
                                        value={progressPercent}
                                        onChange={(e) => setProgressPercent(e.target.value)}
                                        className="w-full accent-blue-600"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
