'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Plus,
    Search,
    Filter,
    FolderKanban,
    Calendar,
    DollarSign,
    Users,
    Clock,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Pause,
} from 'lucide-react';

interface Project {
    id: string;
    projectCode: string;
    name: string;
    description: string | null;
    category: string;
    type: string;
    status: string;
    priority: string;
    isRevenueBased: boolean;
    estimatedRevenue: number;
    actualRevenue: number;
    itRevenueEarned: number;
    startDate: string | null;
    endDate: string | null;
    projectManager: {
        id: string;
        name: string;
        email: string;
    } | null;
    teamLead: {
        id: string;
        name: string;
        email: string;
    } | null;
    stats: {
        totalTasks: number;
        completedTasks: number;
        inProgressTasks: number;
        completionRate: number;
    };
}

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (typeFilter) params.append('type', typeFilter);

            const response = await fetch(`/api/it/projects?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const filteredProjects = projects.filter((project) =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'IN_PROGRESS':
                return <TrendingUp className="h-5 w-5 text-blue-500" />;
            case 'ON_HOLD':
                return <Pause className="h-5 w-5 text-yellow-500" />;
            default:
                return <AlertCircle className="h-5 w-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'ON_HOLD':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'PLANNING':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'TESTING':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'REVENUE':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
            case 'SUPPORT':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'MAINTENANCE':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <FolderKanban className="h-8 w-8 text-blue-600" />
                            IT Projects
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage all IT projects and track progress
                        </p>
                    </div>

                    <button
                        onClick={() => router.push('/dashboard/it-management/projects/new')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus className="h-5 w-5" />
                        New Project
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                        >
                            <Filter className="h-5 w-5" />
                            Filters
                        </button>
                    </div>

                    {/* Filter Options */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Status
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    title="Filter by Status"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="PLANNING">Planning</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="TESTING">Testing</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Type
                                </label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    title="Filter by Type"
                                >
                                    <option value="">All Types</option>
                                    <option value="REVENUE">Revenue</option>
                                    <option value="SUPPORT">Support</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="ENHANCEMENT">Enhancement</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Projects Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                        <FolderKanban className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No projects found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {searchTerm || statusFilter || typeFilter
                                ? 'Try adjusting your filters'
                                : 'Get started by creating your first project'}
                        </p>
                        {!searchTerm && !statusFilter && !typeFilter && (
                            <button
                                onClick={() => router.push('/dashboard/it-management/projects/new')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2"
                            >
                                <Plus className="h-5 w-5" />
                                Create Project
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => router.push(`/dashboard/it-management/projects/${project.id}`)}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500 group"
                            >
                                {/* Project Header */}
                                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {getStatusIcon(project.status)}
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {project.projectCode}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {project.name}
                                            </h3>
                                        </div>
                                    </div>

                                    {project.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                            {project.description}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(project.type)}`}>
                                            {project.type}
                                        </span>
                                        {project.isRevenueBased && (
                                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                💰 Revenue
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Project Stats */}
                                <div className="p-6 space-y-4">
                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Progress
                                            </span>
                                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                {project.stats.completionRate}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all"
                                                style={{ width: `${project.stats.completionRate}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {project.stats.completedTasks} / {project.stats.totalTasks} tasks
                                            </span>
                                        </div>
                                    </div>

                                    {/* Revenue Info */}
                                    {project.isRevenueBased && (
                                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    <span className="text-sm font-medium text-green-900 dark:text-green-300">
                                                        IT Revenue
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                    ₹{project.itRevenueEarned.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Team Info */}
                                    <div className="flex items-center gap-4 text-sm">
                                        {project.projectManager && (
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {project.projectManager.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Timeline */}
                                    {project.startDate && project.endDate && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {new Date(project.startDate).toLocaleDateString()} -{' '}
                                                {new Date(project.endDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Summary Stats */}
                {!loading && filteredProjects.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Summary
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {filteredProjects.length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {filteredProjects.filter((p) => p.status === 'IN_PROGRESS').length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {filteredProjects.filter((p) => p.status === 'COMPLETED').length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    ₹
                                    {filteredProjects
                                        .reduce((sum, p) => sum + p.itRevenueEarned, 0)
                                        .toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">IT Revenue</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
