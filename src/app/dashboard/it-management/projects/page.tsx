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
import ProjectAnalytics from '@/components/dashboard/it/ProjectAnalytics';

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
    itDepartmentCut: number;
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
    const [viewMode, setViewMode] = useState<'grid' | 'analytics'>('grid');

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
                return <CheckCircle2 className="h-4 w-4 text-success-500" />;
            case 'IN_PROGRESS':
                return <TrendingUp className="h-4 w-4 text-primary-500" />;
            case 'ON_HOLD':
                return <Pause className="h-4 w-4 text-warning-500" />;
            default:
                return <AlertCircle className="h-4 w-4 text-secondary-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-success-100 text-success-700';
            case 'IN_PROGRESS': return 'bg-primary-100 text-primary-700';
            case 'ON_HOLD': return 'bg-warning-100 text-warning-700';
            case 'PLANNING': return 'bg-purple-100 text-purple-700';
            case 'TESTING': return 'bg-orange-100 text-orange-700';
            default: return 'bg-secondary-100 text-secondary-600';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'REVENUE': return 'bg-success-50 text-success-700 border-success-200';
            case 'SUPPORT': return 'bg-primary-50 text-primary-700 border-primary-200';
            case 'MAINTENANCE': return 'bg-warning-50 text-warning-700 border-warning-200';
            default: return 'bg-secondary-50 text-secondary-600 border-secondary-200';
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                                <FolderKanban className="h-5 w-5 text-primary-600" />
                            </span>
                            IT Projects
                        </h1>
                        <p className="text-secondary-500 mt-1 text-sm">Manage all IT projects and track progress</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex gap-1 bg-secondary-100 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'grid'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-secondary-500 hover:text-secondary-700'
                                    }`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('analytics')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'analytics'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-secondary-500 hover:text-secondary-700'
                                    }`}
                            >
                                Analytics
                            </button>
                        </div>

                        <button
                            onClick={() => router.push('/dashboard/it-management/projects/new')}
                            className="btn btn-primary text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            New Project
                        </button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="card-premium">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                            <input
                                type="text"
                                placeholder="Search projects by name, code or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-premium pl-10"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all duration-200 ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-600' : 'border-secondary-200 text-secondary-500 hover:bg-secondary-50'}`}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                    </div>

                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-secondary-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label-premium">Status</label>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-premium" title="Filter by Status">
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
                                <label className="label-premium">Type</label>
                                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-premium" title="Filter by Type">
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

                {/* Content */}
                {viewMode === 'analytics' ? (
                    <ProjectAnalytics projects={filteredProjects} />
                ) : loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
                            <p className="text-secondary-500 text-sm">Loading projects...</p>
                        </div>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="card-premium flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-secondary-100 flex items-center justify-center mx-auto mb-4">
                            <FolderKanban className="h-8 w-8 text-secondary-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-secondary-900 mb-2">No projects found</h3>
                        <p className="text-secondary-500 text-sm mb-6">
                            {searchTerm || statusFilter || typeFilter
                                ? 'Try adjusting your filters'
                                : 'Get started by creating your first project'}
                        </p>
                        {!searchTerm && !statusFilter && !typeFilter && (
                            <button onClick={() => router.push('/dashboard/it-management/projects/new')} className="btn btn-primary text-sm">
                                <Plus className="h-4 w-4" />
                                Create Project
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => router.push(`/dashboard/it-management/projects/${project.id}`)}
                                className="card-premium p-0 cursor-pointer hover:border-primary-200 hover:shadow-[0_8px_30px_rgba(37,99,235,0.08)] group transition-all duration-200 overflow-hidden"
                            >
                                <div className="p-5 border-b border-secondary-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        {getStatusIcon(project.status)}
                                        <span className="text-xs font-semibold text-secondary-400 tracking-widest uppercase">{project.projectCode}</span>
                                    </div>
                                    <h3 className="text-base font-bold text-secondary-900 group-hover:text-primary-600 transition-colors leading-snug mb-2">
                                        {project.name}
                                    </h3>
                                    {project.description && (
                                        <p className="text-sm text-secondary-500 line-clamp-2 mb-3">{project.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(project.status)}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${getTypeColor(project.type)}`}>
                                            {project.type}
                                        </span>
                                        {project.isRevenueBased && (
                                            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-success-50 text-success-700">
                                                💰 Revenue
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-medium text-secondary-500">Progress</span>
                                            <span className="text-xs font-bold text-primary-600">{project.stats.completionRate}%</span>
                                        </div>
                                        <div className="w-full bg-secondary-100 rounded-full h-1.5">
                                            <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${project.stats.completionRate}%` }}></div>
                                        </div>
                                        <p className="text-xs text-secondary-400 mt-1">{project.stats.completedTasks} / {project.stats.totalTasks} tasks done</p>
                                    </div>

                                    {project.isRevenueBased && (
                                        <div className="bg-success-50 rounded-xl p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-success-600" />
                                                <span className="text-xs font-semibold text-success-900">IT Revenue</span>
                                            </div>
                                            <span className="text-sm font-bold text-success-600">₹{project.itRevenueEarned.toLocaleString()}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-secondary-400">
                                        {project.projectManager && (
                                            <div className="flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5" />
                                                <span>{project.projectManager.name}</span>
                                            </div>
                                        )}
                                        {project.endDate && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{new Date(project.endDate).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Summary */}
                {!loading && filteredProjects.length > 0 && viewMode === 'grid' && (
                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider">Project Summary</h3>
                            <Clock className="h-4 w-4 text-secondary-400" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                            <div>
                                <p className="text-3xl font-bold text-secondary-900">{filteredProjects.length}</p>
                                <p className="text-xs text-secondary-500 mt-1 font-medium uppercase tracking-wide">Total</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-primary-600">{filteredProjects.filter((p) => p.status === 'IN_PROGRESS').length}</p>
                                <p className="text-xs text-secondary-500 mt-1 font-medium uppercase tracking-wide">In Progress</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-success-600">{filteredProjects.filter((p) => p.status === 'COMPLETED').length}</p>
                                <p className="text-xs text-secondary-500 mt-1 font-medium uppercase tracking-wide">Completed</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-secondary-800">₹{filteredProjects.reduce((sum, p) => sum + p.itRevenueEarned, 0).toLocaleString()}</p>
                                <p className="text-xs text-secondary-500 mt-1 font-medium uppercase tracking-wide">IT Revenue</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
