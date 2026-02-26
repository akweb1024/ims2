'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [showNewModal, setShowNewModal] = useState(false);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (task: any) => {
        const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: nextStatus })
            });

            if (res.ok) {
                setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
            }
        } catch (err) {
            alert('Failed to update task');
        }
    };

    const deleteTask = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setTasks(tasks.filter(t => t.id !== id));
            }
        } catch (err) {
            alert('Failed to delete task');
        }
    };

    const handleNewTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const payload = {
            title: formData.get('title'),
            description: formData.get('description'),
            dueDate: formData.get('dueDate'),
            priority: formData.get('priority'),
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowNewModal(false);
                fetchTasks();
                form.reset();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create task');
            }
        } catch (err) {
            alert('Network error');
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'ALL') return true;
        return t.status === filter;
    });

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'URGENT': return 'text-danger-600 bg-red-100';
            case 'HIGH': return 'text-warning-600 bg-orange-100';
            case 'MEDIUM': return 'text-primary-600 bg-blue-100';
            default: return 'text-secondary-500 bg-secondary-100';
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Task Management</h1>
                        <p className="text-secondary-600">Keep track of follow-ups, renewals, and daily goals</p>
                    </div>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="btn btn-primary px-6"
                    >
                        + Create Task
                    </button>
                </div>

                {/* Filters */}
                <div className="flex space-x-2 border-b border-secondary-200 pb-1">
                    {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${filter === f ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-600'
                                }`}
                        >
                            {f.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* Task List */}
                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="card-premium py-12 text-center text-secondary-400">
                            No tasks found in this category.
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <div key={task.id} className={`card-premium group hover:border-primary-200 transition-all ${task.status === 'COMPLETED' ? 'opacity-60' : ''}`}>
                                <div className="flex items-start gap-4">
                                    <button
                                        onClick={() => toggleStatus(task)}
                                        className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'COMPLETED' ? 'bg-success-500 border-success-500 text-white' : 'border-secondary-300 hover:border-primary-500'
                                            }`}
                                    >
                                        {task.status === 'COMPLETED' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className={`font-bold text-lg ${task.status === 'COMPLETED' ? 'line-through text-secondary-400' : 'text-secondary-900'}`}>
                                                {task.title}
                                            </h4>
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                                <button
                                                    onClick={() => deleteTask(task.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-danger-400 hover:text-danger-600 transition-opacity"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-secondary-600 text-sm mb-3">{task.description}</p>
                                        <div className="flex items-center text-xs font-bold text-secondary-400 space-x-4">
                                            <div className="flex items-center">
                                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Due: <span className="ml-1"><FormattedDate date={task.dueDate} /></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* New Task Modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-secondary-900 mb-6">Create New Task</h2>
                        <form onSubmit={handleNewTask} className="space-y-4">
                            <div>
                                <label className="label">Task Title</label>
                                <input name="title" type="text" className="input" required placeholder="e.g. Call Harvard for renewal" />
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea name="description" className="input h-24" placeholder="Briefly describe what needs to be done..."></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Due Date</label>
                                    <input name="dueDate" type="date" className="input" required />
                                </div>
                                <div>
                                    <label className="label">Priority</label>
                                    <select name="priority" className="input">
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary px-8">
                                    Save Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
