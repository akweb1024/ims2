'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    BarChart3,
    TrendingUp,
    Users,
    Clock,
    Award,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    ChevronRight,
    Search,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
} from 'recharts';

interface PerformanceData {
    members: Array<{
        userId: string;
        name: string;
        email: string;
        designation: string;
        stats: {
            completedTasks: number;
            totalHours: number;
            billableHours: number;
            billablePercentage: number;
            revenueGenerated: number;
        };
    }>;
    trends: Array<{
        month: string;
        year: number;
        completedTasks: number;
        revenue: number;
        hours: number;
    }>;
}

export default function PerformancePage() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState('6'); // 6 months

    useEffect(() => {
        fetchPerformanceData();
    }, [timeRange]);

    const fetchPerformanceData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/it/analytics/performance?months=${timeRange}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    const filteredMembers = data?.members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.designation.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const totalRevenue = data?.trends.reduce((sum, t) => sum + t.revenue, 0) || 0;
    const totalTasks = data?.trends.reduce((sum, t) => sum + t.completedTasks, 0) || 0;
    const totalHours = data?.trends.reduce((sum, t) => sum + t.hours, 0) || 0;

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Award className="h-8 w-8 text-blue-600" />
                            Performance Analytics
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Tracking productivity and efficiency of the IT department
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer dark:text-white px-3"
                        >
                            <option value="3">Last 3 Months</option>
                            <option value="6">Last 6 Months</option>
                            <option value="12">Last 12 Months</option>
                        </select>
                    </div>
                </div>

                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-b-4 border-blue-600">
                        <div className="flex items-center justify-between mb-2">
                            <span className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                <Target className="h-6 w-6 text-blue-600" />
                            </span>
                            <span className="flex items-center text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                12%
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks Completed</p>
                        <p className="text-3xl font-bold dark:text-white mt-1">{totalTasks}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-b-4 border-green-600">
                        <div className="flex items-center justify-between mb-2">
                            <span className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </span>
                            <span className="flex items-center text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                8%
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue Contribution</p>
                        <p className="text-3xl font-bold dark:text-white mt-1">₹{totalRevenue.toLocaleString()}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-b-4 border-purple-600">
                        <div className="flex items-center justify-between mb-2">
                            <span className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                <Clock className="h-6 w-6 text-purple-600" />
                            </span>
                            <span className="flex items-center text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                                <ArrowDownRight className="h-3 w-3 mr-1" />
                                3%
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours Logged</p>
                        <p className="text-3xl font-bold dark:text-white mt-1">{totalHours.toLocaleString()}</p>
                    </div>
                </div>

                {/* Trends Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold dark:text-white mb-6 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Performance Trends
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.trends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: 'none' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar yAxisId="left" dataKey="completedTasks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tasks" />
                                    <Bar yAxisId="right" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold dark:text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                            Hour Logging Trend
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.trends}>
                                    <defs>
                                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: 'none' }}
                                    />
                                    <Area type="monotone" dataKey="hours" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorHours)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Team Ranking */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            Team Achievement Ranking
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search member..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Member</th>
                                    <th className="px-6 py-4 text-center">Tasks Done</th>
                                    <th className="px-6 py-4 text-center">Hours</th>
                                    <th className="px-6 py-4 text-center">Billable %</th>
                                    <th className="px-6 py-4 text-right">Revenue Contrib.</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredMembers.map((member, index) => (
                                    <tr key={member.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{member.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.designation}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-bold text-sm">
                                                {member.stats.completedTasks}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium dark:text-white">
                                            {member.stats.totalHours}h
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="w-32 mx-auto">
                                                <div className="flex justify-between mb-1 text-[10px] font-medium text-gray-500">
                                                    <span>Billable</span>
                                                    <span>{member.stats.billablePercentage}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${member.stats.billablePercentage > 80 ? 'bg-green-500' : member.stats.billablePercentage > 50 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                        style={{ width: `${member.stats.billablePercentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">
                                            ₹{member.stats.revenueGenerated.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-400">
                                            <ChevronRight className="h-5 w-5 ml-auto" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* KPI Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-8 text-white shadow-xl flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-bold mb-2">High Efficiency Badge</h3>
                            <p className="text-indigo-100 opacity-90 max-w-sm">
                                Awarded to department members with over 85% billable ratio and
                                consistency in task delivery.
                            </p>
                        </div>
                        <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                            <Award className="h-10 w-10 text-yellow-300 drop-shadow-lg" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-l-8 border-yellow-500">
                        <h3 className="text-xl font-bold dark:text-white mb-2">Insight of the Month</h3>
                        <p className="text-gray-600 dark:text-gray-400 italic">
                            "The department has seen a 15% increase in task completion efficiency
                            since implementing the new project management workflow. Keep it up!"
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
