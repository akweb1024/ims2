'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    LifeBuoy,
    Plus,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Zap,
    MessageSquare,
    Loader2,
} from 'lucide-react';

interface Task {
    id: string;
    taskCode: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    type: string;
    estimatedValue: number;
    itRevenueEarned: number;
    createdAt: string;
    assignedTo?: {
        name: string;
    };
}

export default function MyITServicesPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            // Using existing API which defaults to "my tasks" view
            const response = await fetch('/api/it/tasks?view=my&type=SERVICE_REQUEST');
            if (response.ok) {
                const data = await response.json();
                setTasks(data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id: string) => {
        if (!confirm('Are you sure you want to accept this service as completed? This will credit revenue points to the IT department.')) {
            return;
        }

        try {
            const response = await fetch(`/api/it/tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'COMPLETED',
                    statusComment: 'Service accepted by requester'
                }),
            });

            if (response.ok) {
                fetchTasks();
            } else {
                alert('Failed to accept service');
            }
        } catch (error) {
            console.error('Error accepting service:', error);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'UNDER_REVIEW': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-500 animate-pulse';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'PENDING': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
            case 'CANCELLED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return ['PENDING', 'IN_PROGRESS'].includes(task.status);
        if (filter === 'REVIEW') return task.status === 'UNDER_REVIEW';
        if (filter === 'COMPLETED') return task.status === 'COMPLETED';
        return true;
    });

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Zap className="h-8 w-8 text-blue-600" />
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                My IT Service Requests
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                            Track your requests and approve completed services
                        </p>
                    </div>
                    <Link
                        href="/dashboard/it-services/request"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all w-fit"
                    >
                        <Plus className="h-5 w-5" />
                        New Service Request
                    </Link>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Requests</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">In Progress</p>
                        <p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 border-amber-200 dark:border-amber-900/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Awaiting My Approval</p>
                        <p className="text-2xl font-bold text-amber-500">{tasks.filter(t => t.status === 'UNDER_REVIEW').length}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Completed</p>
                        <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
                    {['ALL', 'PENDING', 'REVIEW', 'COMPLETED'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filter === f
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 shadow-sm'
                                }`}
                        >
                            {f === 'REVIEW' ? 'Action Needed' : f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                        <p className="text-gray-500">Loading your requests...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                        <LifeBuoy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Service Requests Found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">You haven&apos;t submitted any IT service requests yet.</p>
                        <Link
                            href="/dashboard/it-services/request"
                            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Submit Your First Request
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border transition-all ${task.status === 'UNDER_REVIEW'
                                    ? 'border-amber-400 shadow-amber-100 dark:shadow-none bg-amber-50/10'
                                    : 'border-gray-100 dark:border-gray-700'
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                {task.taskCode}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(task.status)}`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                            {task.priority === 'URGENT' && (
                                                <span className="bg-red-100 text-red-700 dark:bg-red-900/30 text-[10px] px-2 py-0.5 rounded-full font-bold">URGENT</span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">
                                            {task.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                                            {task.description}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                Created: {new Date(task.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Assigned: {task.assignedTo?.name || 'Waiting for IT...'}
                                            </div>
                                            {task.status === 'COMPLETED' && (
                                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                                    <Zap className="h-3.5 w-3.5" />
                                                    {task.itRevenueEarned} points credited
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        {task.status === 'UNDER_REVIEW' && (
                                            <button
                                                onClick={() => handleAccept(task.id)}
                                                className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg shadow-green-200 dark:shadow-none hover:scale-105 transition-all"
                                            >
                                                <CheckCircle2 className="h-5 w-5" />
                                                Accept & Complete
                                            </button>
                                        )}
                                        <Link
                                            href={`/dashboard/it-management/tasks/${task.id}`}
                                            className="flex items-center justify-center gap-2 px-6 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                                        >
                                            View Details
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
