'use client';

import { useEffect, useState, useCallback } from 'react';
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
        projects: { total: number; active: number; completed: number; revenue: number; };
        tasks: { total: number; pending: number; inProgress: number; completed: number; revenue: number; completionRate: number; };
        timeTracking: { totalHours: number; billableHours: number; nonBillableHours: number; period: string; };
    };
    revenue: { totalRevenue: number; itRevenue: number; paidRevenue: number; unpaidRevenue: number; projectRevenue: number; taskRevenue: number; } | null;
    tasksByPriority: { high: number; medium: number; low: number; };
    tasksByType: { revenue: number; support: number; maintenance: number; urgent: number; serviceRequest: number; };
    recentTasks: Array<{ id: string; title: string; taskCode: string; status: string; priority: string; type: string; project: string | null; assignedTo: string; updatedAt: string; }>;
    view: string;
}

export default function ITManagementDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'my' | 'team' | 'all'>('my');

    const fetchDashboardStats = useCallback(async () => {
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
    }, [view]);

    useEffect(() => { fetchDashboardStats(); }, [fetchDashboardStats]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-success-100 text-success-700';
            case 'IN_PROGRESS': return 'bg-primary-100 text-primary-700';
            case 'PENDING': return 'bg-warning-100 text-warning-700';
            default: return 'bg-secondary-100 text-secondary-600';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH': return 'text-danger-600';
            case 'MEDIUM': return 'text-warning-600';
            case 'LOW': return 'text-success-600';
            default: return 'text-secondary-500';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'REVENUE': return 'bg-success-100 text-success-700';
            case 'SUPPORT': return 'bg-primary-100 text-primary-700';
            case 'MAINTENANCE': return 'bg-warning-100 text-warning-700';
            case 'URGENT': return 'bg-danger-100 text-danger-700';
            default: return 'bg-secondary-100 text-secondary-600';
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-secondary-500 text-sm">Loading dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!stats) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-danger-500" />
                        </div>
                        <p className="text-secondary-600">Failed to load dashboard data</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const billablePct = stats.overview.timeTracking.totalHours > 0
        ? Math.round((stats.overview.timeTracking.billableHours / stats.overview.timeTracking.totalHours) * 100)
        : 0;
    const nonBillablePct = stats.overview.timeTracking.totalHours > 0
        ? Math.round((stats.overview.timeTracking.nonBillableHours / stats.overview.timeTracking.totalHours) * 100)
        : 0;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                                <Target className="h-5 w-5 text-primary-600" />
                            </span>
                            IT Management
                        </h1>
                        <p className="text-secondary-500 mt-1 text-sm">Manage projects, tasks, and track revenue</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard/it-management/services')}
                            className="px-4 py-2.5 rounded-xl border border-primary-200 bg-primary-50 text-primary-600 text-sm font-medium flex items-center gap-2 hover:bg-primary-100 transition-colors"
                        >
                            <Zap className="h-4 w-4" />
                            Manage IT Services
                        </button>

                        <div className="flex gap-1 bg-secondary-100 p-1 rounded-xl">
                            {(['my', 'team', 'all'] as const).map((v) => (
                                <button key={v} onClick={() => setView(v)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${view === v ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                                    title={`${v === 'my' ? 'My' : v === 'team' ? 'Team' : 'All'} tasks`}
                                >
                                    {v === 'my' ? 'My View' : v === 'team' ? 'Team View' : 'All Tasks'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Projects */}
                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                                <FolderKanban className="h-5 w-5 text-primary-600" />
                            </div>
                            <button onClick={() => router.push('/dashboard/it-management/projects')}
                                className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1">
                                View <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        <p className="text-3xl font-bold text-secondary-900">{stats.overview.projects.total}</p>
                        <p className="text-sm font-medium text-secondary-500 mt-1">Total Projects</p>
                        <p className="text-xs text-secondary-400 mt-2">{stats.overview.projects.active} Active · {stats.overview.projects.completed} Done</p>
                    </div>

                    {/* Tasks */}
                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                <ListTodo className="h-5 w-5 text-purple-600" />
                            </div>
                            <button onClick={() => router.push('/dashboard/it-management/tasks')}
                                className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1">
                                View <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        <p className="text-3xl font-bold text-secondary-900">{stats.overview.tasks.inProgress}</p>
                        <p className="text-sm font-medium text-secondary-500 mt-1">Active Tasks</p>
                        <p className="text-xs text-secondary-400 mt-2">{stats.overview.tasks.pending} Pending · {stats.overview.tasks.total} Total</p>
                    </div>

                    {/* Revenue */}
                    {stats.revenue && (
                        <div className="card-premium">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-success-600" />
                                </div>
                                <button onClick={() => router.push('/dashboard/it-management/revenue')}
                                    className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1">
                                    View <ArrowUpRight className="h-3 w-3" />
                                </button>
                            </div>
                            <p className="text-3xl font-bold text-secondary-900">₹{stats.revenue.itRevenue.toLocaleString()}</p>
                            <p className="text-sm font-medium text-secondary-500 mt-1">IT Revenue</p>
                            <p className="text-xs text-secondary-400 mt-2">₹{stats.revenue.paidRevenue.toLocaleString()} Paid</p>
                        </div>
                    )}

                    {/* Completion Rate */}
                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-orange-500" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-secondary-900">{stats.overview.tasks.completionRate}%</p>
                        <p className="text-sm font-medium text-secondary-500 mt-1">Completion Rate</p>
                        <p className="text-xs text-secondary-400 mt-2">{stats.overview.tasks.completed} of {stats.overview.tasks.total} tasks</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Tasks by Priority */}
                    <div className="card-premium">
                        <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-danger-500" /> Tasks by Priority
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: 'High Priority', count: stats.tasksByPriority.high, color: 'bg-danger-500' },
                                { label: 'Medium Priority', count: stats.tasksByPriority.medium, color: 'bg-warning-500' },
                                { label: 'Low Priority', count: stats.tasksByPriority.low, color: 'bg-success-500' },
                            ].map(({ label, count, color }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${color}`}></div>
                                        <span className="text-sm text-secondary-700">{label}</span>
                                    </div>
                                    <span className="text-sm font-bold text-secondary-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tasks by Type */}
                    <div className="card-premium">
                        <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary-500" /> Tasks by Type
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Revenue', count: stats.tasksByType.revenue, color: 'bg-success-500' },
                                { label: 'Support', count: stats.tasksByType.support, color: 'bg-primary-500' },
                                { label: 'Maintenance', count: stats.tasksByType.maintenance, color: 'bg-warning-400' },
                                { label: 'Urgent', count: stats.tasksByType.urgent, color: 'bg-danger-500' },
                                { label: 'Service Requests', count: stats.tasksByType.serviceRequest, color: 'bg-indigo-400' },
                            ].map(({ label, count, color }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${color}`}></div>
                                        <span className="text-sm text-secondary-700">{label}</span>
                                    </div>
                                    <span className="text-sm font-bold text-secondary-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Time Tracking */}
                    <div className="card-premium">
                        <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-500" /> Time Tracking
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-secondary-500">Total Hours</span>
                                    <span className="text-sm font-bold text-secondary-900">{stats.overview.timeTracking.totalHours}h</span>
                                </div>
                                <div className="w-full bg-secondary-100 rounded-full h-1.5">
                                    <div className="bg-purple-500 h-1.5 rounded-full w-full"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-secondary-500">Billable Hours</span>
                                    <span className="text-sm font-bold text-success-600">{stats.overview.timeTracking.billableHours}h</span>
                                </div>
                                <div className="w-full bg-secondary-100 rounded-full h-1.5">
                                    <div className="bg-success-500 h-1.5 rounded-full" style={{ width: `${billablePct}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-secondary-500">Non-Billable</span>
                                    <span className="text-sm font-bold text-secondary-500">{stats.overview.timeTracking.nonBillableHours}h</span>
                                </div>
                                <div className="w-full bg-secondary-100 rounded-full h-1.5">
                                    <div className="bg-secondary-300 h-1.5 rounded-full" style={{ width: `${nonBillablePct}%` }}></div>
                                </div>
                            </div>
                            <p className="text-xs text-secondary-400">{stats.overview.timeTracking.period}</p>
                        </div>
                    </div>
                </div>

                {/* Recent Tasks */}
                <div className="card-premium">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider flex items-center gap-2">
                            <ListTodo className="h-4 w-4 text-primary-500" /> Recent Tasks
                        </h3>
                        <button onClick={() => router.push('/dashboard/it-management/tasks')}
                            className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
                            View All <ArrowUpRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-secondary-100">
                                    {['Task', 'Project', 'Type', 'Priority', 'Status', 'Assigned To'].map((h) => (
                                        <th key={h} className="text-left py-3 px-4 text-xs font-bold text-secondary-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentTasks.map((task) => (
                                    <tr key={task.id} onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}
                                        className="border-b border-secondary-50 hover:bg-secondary-50 cursor-pointer transition-colors">
                                        <td className="py-3 px-4">
                                            <p className="text-sm font-semibold text-secondary-900">{task.title}</p>
                                            <p className="text-xs text-secondary-400">{task.taskCode}</p>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-secondary-500">{task.project || '—'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${getTypeColor(task.type)}`}>{task.type}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs font-bold ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-secondary-500">{task.assignedTo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Projects', sub: 'View all IT projects', icon: FolderKanban, color: 'text-primary-600 bg-primary-50', href: '/dashboard/it-management/projects' },
                        { label: 'Task Board', sub: 'Kanban & list view', icon: ListTodo, color: 'text-purple-600 bg-purple-50', href: '/dashboard/it-management/tasks' },
                        { label: 'Performance', sub: 'Team productivity', icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50', href: '/dashboard/it-management/performance' },
                        { label: 'Revenue', sub: 'Financial tracking', icon: DollarSign, color: 'text-success-600 bg-success-50', href: '/dashboard/it-management/revenue' },
                        { label: 'Asset Inventory', sub: 'Hardware & software', icon: Briefcase, color: 'text-amber-600 bg-amber-50', href: '/dashboard/it/assets' },
                        { label: 'Service Desk', sub: 'Support requests', icon: AlertCircle, color: 'text-danger-600 bg-danger-50', href: '/dashboard/it/tickets' },
                    ].map(({ label, sub, icon: Icon, color, href }) => (
                        <button key={label} onClick={() => router.push(href)}
                            className="card-premium p-4 text-left group hover:border-primary-200 transition-all">
                            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-bold text-secondary-900">{label}</p>
                            <p className="text-xs text-secondary-400 mt-0.5">{sub}</p>
                        </button>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
