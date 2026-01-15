'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Calendar, ArrowUp, ArrowDown, CheckCircle2, Clock } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface RevenueData {
    summary: {
        totalRevenue: number;
        itRevenue: number;
        paidRevenue: number;
        unpaidRevenue: number;
        totalProjects: number;
        totalTasks: number;
        completedProjects: number;
        completedTasks: number;
    };
    breakdown: {
        projects: {
            total: number;
            itRevenue: number;
            count: number;
            completed: number;
        };
        tasks: {
            total: number;
            itRevenue: number;
            count: number;
            completed: number;
            paid: number;
            unpaid: number;
        };
    };
    monthly: Array<{
        month: number;
        monthName: string;
        projectRevenue: number;
        taskRevenue: number;
        totalRevenue: number;
        projectsCount: number;
        tasksCount: number;
    }>;
    topProjects: Array<{
        id: string;
        name: string;
        code: string;
        revenue: number;
        status: string;
    }>;
    topTasks: Array<{
        id: string;
        title: string;
        code: string;
        revenue: number;
        status: string;
        isPaid: boolean;
        project: string;
    }>;
    year: number;
}

export default function RevenuePage() {
    const [data, setData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchRevenueData();
    }, [selectedYear]);

    const fetchRevenueData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/it/revenue/overview?year=${selectedYear}`);
            if (response.ok) {
                const revenueData = await response.json();
                setData(revenueData);
            }
        } catch (error) {
            console.error('Failed to fetch revenue data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <DollarSign className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Failed to load revenue data</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const maxMonthlyRevenue = Math.max(...data.monthly.map(m => m.totalRevenue));

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-green-600" />
                            Revenue Analytics
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Track IT department revenue and performance
                        </p>
                    </div>

                    {/* Year Selector */}
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                    >
                        {[2024, 2025, 2026, 2027].map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total IT Revenue */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm font-medium">Total IT Revenue</p>
                                <p className="text-3xl font-bold mt-2">₹{(data.summary.itRevenue || 0).toLocaleString()}</p>
                                <p className="text-green-100 text-sm mt-2">
                                    From ₹{(data.summary.totalRevenue || 0).toLocaleString()} total
                                </p>
                            </div>
                            <DollarSign className="h-12 w-12 text-green-200" />
                        </div>
                    </div>

                    {/* Paid Revenue */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Paid Revenue</p>
                                <p className="text-3xl font-bold mt-2">₹{(data.summary.paidRevenue || 0).toLocaleString()}</p>
                                <p className="text-blue-100 text-sm mt-2">
                                    {(data.breakdown.tasks.paid || 0)} tasks paid
                                </p>
                            </div>
                            <CheckCircle2 className="h-12 w-12 text-blue-200" />
                        </div>
                    </div>

                    {/* Unpaid Revenue */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">Unpaid Revenue</p>
                                <p className="text-3xl font-bold mt-2">₹{(data.summary.unpaidRevenue || 0).toLocaleString()}</p>
                                <p className="text-orange-100 text-sm mt-2">
                                    {(data.breakdown.tasks.unpaid || 0)} tasks pending
                                </p>
                            </div>
                            <Clock className="h-12 w-12 text-orange-200" />
                        </div>
                    </div>

                    {/* Completion Rate */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Completion Rate</p>
                                <p className="text-3xl font-bold mt-2">
                                    {data.summary.totalTasks > 0 ? Math.round(((data.summary.completedTasks || 0) / (data.summary.totalTasks || 0)) * 100) : 0}%
                                </p>
                                <p className="text-purple-100 text-sm mt-2">
                                    {(data.summary.completedTasks || 0)} / {(data.summary.totalTasks || 0)} tasks
                                </p>
                            </div>
                            <TrendingUp className="h-12 w-12 text-purple-200" />
                        </div>
                    </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Projects Revenue */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Projects Revenue
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {(data.breakdown.projects.count || 0)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">IT Revenue</p>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        ₹{(data.breakdown.projects.itRevenue || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                        {(data.breakdown.projects.completed || 0)}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                                        ₹{(data.breakdown.projects.total || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tasks Revenue */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Tasks Revenue
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {(data.breakdown.tasks.count || 0)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">IT Revenue</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        ₹{(data.breakdown.tasks.itRevenue || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                        {(data.breakdown.tasks.completed || 0)}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
                                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                        {(data.breakdown.tasks.paid || 0)}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Unpaid</p>
                                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                        {(data.breakdown.tasks.unpaid || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monthly Revenue Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-green-500" />
                            Monthly Revenue Trends ({selectedYear})
                        </h3>
                    </div>

                    {/* Bar Chart */}
                    <div className="space-y-3">
                        {data.monthly.map((month) => (
                            <div key={month.month} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300 w-12">
                                        {month.monthName}
                                    </span>
                                    <div className="flex-1 mx-4">
                                        <div className="flex gap-1 h-8">
                                            {/* Project Revenue */}
                                            <div
                                                className="bg-blue-500 rounded-l hover:bg-blue-600 transition-colors flex items-center justify-center text-white text-xs font-medium"
                                                style={{
                                                    width: `${(month.projectRevenue / maxMonthlyRevenue) * 100}%`,
                                                    minWidth: month.projectRevenue > 0 ? '30px' : '0',
                                                }}
                                                title={`Projects: ₹${month.projectRevenue.toLocaleString()}`}
                                            >
                                                {month.projectRevenue > 0 && '₹' + (month.projectRevenue / 1000).toFixed(0) + 'k'}
                                            </div>
                                            {/* Task Revenue */}
                                            <div
                                                className="bg-green-500 rounded-r hover:bg-green-600 transition-colors flex items-center justify-center text-white text-xs font-medium"
                                                style={{
                                                    width: `${(month.taskRevenue / maxMonthlyRevenue) * 100}%`,
                                                    minWidth: month.taskRevenue > 0 ? '30px' : '0',
                                                }}
                                                title={`Tasks: ₹${month.taskRevenue.toLocaleString()}`}
                                            >
                                                {month.taskRevenue > 0 && '₹' + (month.taskRevenue / 1000).toFixed(0) + 'k'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white w-24 text-right">
                                        ₹{(month.totalRevenue || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Project Revenue</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Task Revenue</span>
                        </div>
                    </div>
                </div>

                {/* Top Revenue Sources */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Projects */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            Top Revenue Projects
                        </h3>
                        <div className="space-y-3">
                            {data.topProjects.slice(0, 5).map((project, index) => (
                                <div
                                    key={project.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">
                                                {project.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{project.code}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600 dark:text-green-400">
                                            ₹{(project.revenue || 0).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{project.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Tasks */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Top Revenue Tasks
                        </h3>
                        <div className="space-y-3">
                            {data.topTasks.slice(0, 5).map((task, index) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {task.code} • {task.project}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600 dark:text-green-400">
                                            ₹{(task.revenue || 0).toLocaleString()}
                                        </p>
                                        <p className="text-xs">
                                            {task.isPaid ? (
                                                <span className="text-blue-600 dark:text-blue-400">✓ Paid</span>
                                            ) : (
                                                <span className="text-orange-600 dark:text-orange-400">⏳ Unpaid</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
