'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban,
    ListTodo,
    TrendingUp,
    Clock,
    DollarSign,
    Users,
    AlertCircle,
    CheckCircle2,
    ArrowUpRight,
    Briefcase,
    Target,
    Zap,
} from 'lucide-react';

interface DashboardStats {
    overview: {
        projects: {
            total: number;
            active: number;
            completed: number;
            revenue: number;
        };
        tasks: {
            total: number;
            pending: number;
            inProgress: number;
            completed: number;
            revenue: number;
            completionRate: number;
        };
        timeTracking: {
            totalHours: number;
            billableHours: number;
            nonBillableHours: number;
            period: string;
        };
    };
    revenue: {
        totalRevenue: number;
        itRevenue: number;
        paidRevenue: number;
        unpaidRevenue: number;
        projectRevenue: number;
        taskRevenue: number;
    } | null;
    tasksByPriority: {
        high: number;
        medium: number;
        low: number;
    };
    tasksByType: {
        revenue: number;
        support: number;
        maintenance: number;
        urgent: number;
        serviceRequest: number;
    };
    recentTasks: Array<{
        id: string;
        title: string;
        taskCode: string;
        status: string;
        priority: string;
        type: string;
        project: string | null;
        assignedTo: string;
        updatedAt: string;
    }>;
    view: string;
}

export default function ITManagementDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'my' | 'team' | 'all'>('my');

    useEffect(() => {
        fetchDashboardStats();
    }, [view]);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/it/analytics/dashboard?view=${view}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH':
                return 'text-red-600 dark:text-red-400';
            case 'MEDIUM':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'LOW':
                return 'text-green-600 dark:text-green-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'REVENUE':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'SUPPORT':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'MAINTENANCE':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'URGENT':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Failed to load dashboard data</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            IT Management Dashboard
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage projects, tasks, and track revenue
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Manage Services Link */}
                        <button
                            onClick={() => router.push('/dashboard/it-management/services')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold border border-blue-100 dark:border-blue-800 hover:bg-blue-100 transition-all"
                        >
                            <Zap className="h-4 w-4" />
                            Manage IT Services
                        </button>

                        {/* View Selector */}
                        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            <button
                                onClick={() => setView('my')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'my'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                My View
                            </button>
                            <button
                                onClick={() => setView('team')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'team'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                Team View
                            </button>
                            <button
                                onClick={() => setView('all')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'all'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                All Tasks
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Projects */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Total Projects</p>
                                <p className="text-3xl font-bold mt-2">{stats.overview.projects.total}</p>
                                <p className="text-blue-100 text-sm mt-2">
                                    {stats.overview.projects.active} Active • {stats.overview.projects.completed} Completed
                                </p>
                            </div>
                            <FolderKanban className="h-12 w-12 text-blue-200" />
                        </div>
                    </div>

                    {/* Active Tasks */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Active Tasks</p>
                                <p className="text-3xl font-bold mt-2">{stats.overview.tasks.inProgress}</p>
                                <p className="text-purple-100 text-sm mt-2">
                                    {stats.overview.tasks.pending} Pending • {stats.overview.tasks.total} Total
                                </p>
                            </div>
                            <ListTodo className="h-12 w-12 text-purple-200" />
                        </div>
                    </div>

                    {/* Revenue Generated */}
                    {stats.revenue && (
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">IT Revenue</p>
                                    <p className="text-3xl font-bold mt-2">
                                        ₹{stats.revenue.itRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-green-100 text-sm mt-2">
                                        ₹{stats.revenue.paidRevenue.toLocaleString()} Paid
                                    </p>
                                </div>
                                <DollarSign className="h-12 w-12 text-green-200" />
                            </div>
                        </div>
                    )}

                    {/* Completion Rate */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">Completion Rate</p>
                                <p className="text-3xl font-bold mt-2">{stats.overview.tasks.completionRate}%</p>
                                <p className="text-orange-100 text-sm mt-2">
                                    {stats.overview.tasks.completed} of {stats.overview.tasks.total} tasks
                                </p>
                            </div>
                            <Target className="h-12 w-12 text-orange-200" />
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tasks by Priority */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Tasks by Priority
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                    <span className="text-gray-700 dark:text-gray-300">High Priority</span>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {stats.tasksByPriority.high}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Medium Priority</span>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {stats.tasksByPriority.medium}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Low Priority</span>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {stats.tasksByPriority.low}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tasks by Type */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-blue-500" />
                            Tasks by Type
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Revenue</span>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {stats.tasksByType.revenue}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Support</span>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {stats.tasksByType.support}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Maintenance</span>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {stats.tasksByType.maintenance}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Urgent</span>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {stats.tasksByType.urgent}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Time Tracking */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-purple-500" />
                            Time Tracking
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Hours</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {stats.overview.timeTracking.totalHours}h
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full"
                                        style={{ width: '100%' }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Billable Hours</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                        {stats.overview.timeTracking.billableHours}h
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{
                                            width: `${(stats.overview.timeTracking.billableHours /
                                                stats.overview.timeTracking.totalHours) *
                                                100
                                                }%`,
                                        }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Non-Billable</span>
                                    <span className="font-semibold text-gray-600 dark:text-gray-400">
                                        {stats.overview.timeTracking.nonBillableHours}h
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-gray-400 h-2 rounded-full"
                                        style={{
                                            width: `${(stats.overview.timeTracking.nonBillableHours /
                                                stats.overview.timeTracking.totalHours) *
                                                100
                                                }%`,
                                        }}
                                    ></div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {stats.overview.timeTracking.period}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Recent Tasks */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <ListTodo className="h-5 w-5 text-blue-500" />
                            Recent Tasks
                        </h3>
                        <button
                            onClick={() => router.push('/dashboard/it-management/tasks')}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center gap-1"
                        >
                            View All
                            <ArrowUpRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Task
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Project
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Type
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Priority
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Status
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Assigned To
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}
                                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{task.taskCode}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                            {task.project || '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(task.type)}`}>
                                                {task.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                            {task.assignedTo}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <button
                        onClick={() => router.push('/dashboard/it-management/projects')}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left group"
                    >
                        <FolderKanban className="h-8 w-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Manage Projects</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            View and manage all IT projects
                        </p>
                    </button>

                    <button
                        onClick={() => router.push('/dashboard/it-management/tasks')}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left group"
                    >
                        <ListTodo className="h-8 w-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Task Board</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Manage tasks with Kanban board
                        </p>
                    </button>

                    <button
                        onClick={() => router.push('/dashboard/it-management/performance')}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left group"
                    >
                        <TrendingUp className="h-8 w-8 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Performance</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Team productivity analytics
                        </p>
                    </button>

                    <button
                        onClick={() => router.push('/dashboard/it-management/revenue')}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left group"
                    >
                        <DollarSign className="h-8 w-8 text-green-500 mb-3 group-hover:scale-110 transition-transform" />
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Revenue Tracking</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Track financial performance
                        </p>
                    </button>

                    <button
                        onClick={() => router.push('/dashboard/it/assets')}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left group"
                    >
                        <Briefcase className="h-8 w-8 text-amber-500 mb-3 group-hover:scale-110 transition-transform" />
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Asset Inventory</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Track hardware and software
                        </p>
                    </button>

                    <button
                        onClick={() => router.push('/dashboard/it/tickets')}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left group"
                    >
                        <AlertCircle className="h-8 w-8 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Service Desk</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Handle support requests
                        </p>
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
