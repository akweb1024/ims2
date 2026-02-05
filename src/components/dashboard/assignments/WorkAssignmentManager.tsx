'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, User, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    estimatedEffort?: number;
    actualEffort?: number;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    assignedBy?: {
        id: string;
        name: string;
        email: string;
    };
    createdAt: string;
}

interface WorkAssignmentManagerProps {
    userId?: string;
    view?: 'received' | 'assigned' | 'all';
    canAssign?: boolean;
}

export default function WorkAssignmentManager({ userId, view = 'received', canAssign = false }: WorkAssignmentManagerProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedView, setSelectedView] = useState(view);
    const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
    const [selectedPriority, setSelectedPriority] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, [userId, selectedView, selectedStatus, selectedPriority]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (userId) params.append('assigneeId', userId);
            if (selectedView !== 'all') params.append('view', selectedView);
            if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
            if (selectedPriority !== 'ALL') params.append('priority', selectedPriority);

            const res = await fetch(`/api/work-assignments?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            'HIGH': 'text-red-600 bg-red-100 border-red-200',
            'MEDIUM': 'text-yellow-600 bg-yellow-100 border-yellow-200',
            'LOW': 'text-green-600 bg-green-100 border-green-200'
        };
        return colors[priority] || 'text-gray-600 bg-gray-100 border-gray-200';
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'PENDING': 'text-orange-600 bg-orange-100',
            'IN_PROGRESS': 'text-blue-600 bg-blue-100',
            'COMPLETED': 'text-green-600 bg-green-100',
            'CANCELLED': 'text-gray-600 bg-gray-100'
        };
        return colors[status] || 'text-gray-600 bg-gray-100';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle2 size={16} className="text-green-600" />;
            case 'IN_PROGRESS':
                return <Clock size={16} className="text-blue-600" />;
            case 'PENDING':
                return <AlertCircle size={16} className="text-orange-600" />;
            default:
                return <AlertCircle size={16} className="text-gray-600" />;
        }
    };

    const isOverdue = (dueDate: string, status: string) => {
        return new Date(dueDate) < new Date() && status !== 'COMPLETED' && status !== 'CANCELLED';
    };

    const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        overdue: tasks.filter(t => isOverdue(t.dueDate, t.status)).length
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
                        <ClipboardList className="text-primary-600" size={28} />
                        Work Assignments
                    </h2>
                    <p className="text-sm text-secondary-500 mt-1">
                        Manage and track work assignments
                    </p>
                </div>
                {canAssign && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Assign Task
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="card-premium p-4">
                    <p className="text-xs font-bold text-secondary-500 uppercase">Total</p>
                    <p className="text-2xl font-black text-secondary-900 mt-1">{stats.total}</p>
                </div>
                <div className="card-premium p-4">
                    <p className="text-xs font-bold text-secondary-500 uppercase">Pending</p>
                    <p className="text-2xl font-black text-orange-600 mt-1">{stats.pending}</p>
                </div>
                <div className="card-premium p-4">
                    <p className="text-xs font-bold text-secondary-500 uppercase">In Progress</p>
                    <p className="text-2xl font-black text-blue-600 mt-1">{stats.inProgress}</p>
                </div>
                <div className="card-premium p-4">
                    <p className="text-xs font-bold text-secondary-500 uppercase">Completed</p>
                    <p className="text-2xl font-black text-green-600 mt-1">{stats.completed}</p>
                </div>
                <div className="card-premium p-4">
                    <p className="text-xs font-bold text-secondary-500 uppercase">Overdue</p>
                    <p className="text-2xl font-black text-red-600 mt-1">{stats.overdue}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card-premium p-4">
                <div className="flex flex-wrap gap-4">
                    {canAssign && (
                        <div>
                            <label className="text-xs font-bold text-secondary-600 uppercase mb-2 block">View</label>
                            <div className="flex gap-2">
                                {['received', 'assigned', 'all'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setSelectedView(v as any)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedView === v
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                                            }`}
                                    >
                                        {v.charAt(0).toUpperCase() + v.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold text-secondary-600 uppercase mb-2 block">Status</label>
                        <div className="flex gap-2">
                            {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map(status => (
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
                    <div>
                        <label className="text-xs font-bold text-secondary-600 uppercase mb-2 block">Priority</label>
                        <div className="flex gap-2">
                            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => (
                                <button
                                    key={priority}
                                    onClick={() => setSelectedPriority(priority as any)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedPriority === priority
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                                        }`}
                                >
                                    {priority}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tasks List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-secondary-500 mt-4">Loading assignments...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <ClipboardList className="mx-auto text-secondary-300" size={64} />
                    <h3 className="text-xl font-bold text-secondary-900 mt-4">No Assignments Found</h3>
                    <p className="text-secondary-500 mt-2">No tasks match the selected filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {tasks.map(task => {
                        const overdue = isOverdue(task.dueDate, task.status);
                        return (
                            <div
                                key={task.id}
                                className={`card-premium p-6 hover:shadow-lg transition-shadow ${overdue ? 'border-l-4 border-red-500' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {getStatusIcon(task.status)}
                                            <h3 className="text-lg font-black text-secondary-900">{task.title}</h3>
                                            <span className={`px-2 py-1 rounded border text-xs font-bold ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(task.status)}`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                            {overdue && (
                                                <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-bold">
                                                    OVERDUE
                                                </span>
                                            )}
                                        </div>
                                        {task.description && (
                                            <p className="text-sm text-secondary-600 mb-2">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-secondary-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                Due: {new Date(task.dueDate).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User size={14} />
                                                {task.user.name}
                                            </span>
                                            {task.assignedBy && (
                                                <span>Assigned by: {task.assignedBy.name}</span>
                                            )}
                                            {task.estimatedEffort && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    Est: {task.estimatedEffort}h
                                                </span>
                                            )}
                                            {task.actualEffort && (
                                                <span>Actual: {task.actualEffort}h</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div>Create Assignment Modal</div>
            )}
        </div>
    );
}
