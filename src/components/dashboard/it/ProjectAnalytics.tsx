'use client';

import { useMemo } from 'react';
import { TrendingUp, DollarSign, Target, Activity, Globe, ShieldCheck, Zap } from 'lucide-react';

interface Project {
    id: string;
    status: string;
    isRevenueBased: boolean;
    itRevenueEarned: number;
    estimatedRevenue: number;
    itDepartmentCut: number;
    website?: { id: string; status: string } | null;
    stats: {
        totalTasks: number;
        completedTasks: number;
        inProgressTasks: number;
        completionRate: number;
    };
}

interface ProjectAnalyticsProps {
    projects: Project[];
}

export default function ProjectAnalytics({ projects }: ProjectAnalyticsProps) {
    const analytics = useMemo(() => {
        const total = projects.length;
        const byStatus = {
            PLANNING: projects.filter(p => p.status === 'PLANNING').length,
            IN_PROGRESS: projects.filter(p => p.status === 'IN_PROGRESS').length,
            TESTING: projects.filter(p => p.status === 'TESTING').length,
            COMPLETED: projects.filter(p => p.status === 'COMPLETED').length,
            ON_HOLD: projects.filter(p => p.status === 'ON_HOLD').length,
        };

        const totalRevenue = projects
            .filter(p => p.isRevenueBased)
            .reduce((sum, p) => sum + p.itRevenueEarned, 0);

        const totalEstimated = projects
            .filter(p => p.isRevenueBased)
            .reduce((sum, p) => sum + (p.estimatedRevenue * p.itDepartmentCut / 100), 0);

        const avgCompletion = total > 0
            ? projects.reduce((sum, p) => sum + p.stats.completionRate, 0) / total
            : 0;

        const totalTasks = projects.reduce((sum, p) => sum + p.stats.totalTasks, 0);
        const completedTasks = projects.reduce((sum, p) => sum + p.stats.completedTasks, 0);

        // Website Health Metrics
        const linkedWebsites = projects.filter(p => p.website);
        const upCount = linkedWebsites.filter(p => p.website?.status === 'UP').length;
        const downCount = linkedWebsites.filter(p => p.website?.status === 'DOWN').length;
        const webHealth = linkedWebsites.length > 0 ? (upCount / linkedWebsites.length) * 100 : 0;

        return {
            total,
            byStatus,
            totalRevenue,
            totalEstimated,
            avgCompletion,
            totalTasks,
            completedTasks,
            revenueProgress: totalEstimated > 0 ? (totalRevenue / totalEstimated) * 100 : 0,
            webStats: {
                total: linkedWebsites.length,
                up: upCount,
                down: downCount,
                health: webHealth
            }
        };
    }, [projects]);

    const statusColors: Record<string, string> = {
        PLANNING: 'bg-purple-500',
        IN_PROGRESS: 'bg-blue-500',
        TESTING: 'bg-orange-500',
        COMPLETED: 'bg-green-500',
        ON_HOLD: 'bg-yellow-500',
    };

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Activity className="h-8 w-8 opacity-80" />
                        <span className="text-3xl font-bold">{analytics.total}</span>
                    </div>
                    <p className="text-blue-100 text-sm font-medium">Total Projects</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Target className="h-8 w-8 opacity-80" />
                        <span className="text-3xl font-bold">{Math.round(analytics.avgCompletion)}%</span>
                    </div>
                    <p className="text-green-100 text-sm font-medium">Avg Completion</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="h-8 w-8 opacity-80" />
                        <span className="text-3xl font-bold">{analytics.completedTasks}/{analytics.totalTasks}</span>
                    </div>
                    <p className="text-purple-100 text-sm font-medium">Tasks Completed</p>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign className="h-8 w-8 opacity-80" />
                        <span className="text-2xl font-bold">₹{(analytics.totalRevenue / 1000).toFixed(0)}K</span>
                    </div>
                    <p className="text-amber-100 text-sm font-medium">IT Revenue Earned</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Status Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Project Status Distribution
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(analytics.byStatus).map(([status, count]) => {
                            const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                            return (
                                <div key={status}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {status.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {count} ({Math.round(percentage)}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${statusColors[status]}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Revenue Progress */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Revenue Performance
                    </h3>

                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Earned</span>
                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                ₹{analytics.totalRevenue.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Target</span>
                            <span className="text-lg font-medium text-gray-500 dark:text-gray-400">
                                ₹{analytics.totalEstimated.toLocaleString()}
                            </span>
                        </div>

                        <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                                style={{ width: `${Math.min(100, analytics.revenueProgress)}%` }}
                            />
                        </div>
                        <p className="text-center text-sm font-bold text-gray-700 dark:text-gray-300 mt-2">
                            {Math.round(analytics.revenueProgress)}% of Target
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {projects.filter(p => p.isRevenueBased).length}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Revenue Projects</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                    {projects.filter(p => !p.isRevenueBased).length}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Non-Revenue</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Infrastructure Intelligence */}
            {analytics.webStats.total > 0 && (
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                        <Globe className="h-64 w-64" />
                    </div>
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-4 bg-blue-600 rounded-2xl">
                                <ShieldCheck className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-widest text-white leading-none">Infrastructure Health</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Uptime Intelligence</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fleet Uptime</span>
                                        <span className={`text-4xl font-black ${analytics.webStats.health > 99 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                            {Math.round(analytics.webStats.health)}%
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${analytics.webStats.health > 99 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                            style={{ width: `${analytics.webStats.health}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-8">
                                    <div className="space-y-1">
                                        <p className="text-3xl font-black text-white">{analytics.webStats.up}</p>
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Now
                                        </p>
                                    </div>
                                    <div className="space-y-1 border-l border-white/10 pl-8">
                                        <p className="text-3xl font-black text-white">{analytics.webStats.down}</p>
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Offline
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'SEO Rank', score: 85, icon: TrendingUp, color: 'text-blue-400' },
                                    { label: 'Security', score: 98, icon: ShieldCheck, color: 'text-emerald-400' },
                                    { label: 'Answer Gen', score: 72, icon: Zap, color: 'text-purple-400' },
                                    { label: 'Geo Reach', score: 64, icon: Globe, color: 'text-amber-400' },
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all text-center">
                                        <item.icon className={`h-6 w-6 mx-auto mb-4 ${item.color}`} />
                                        <p className="text-2xl font-black text-white mb-1">{item.score}</p>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
