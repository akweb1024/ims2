'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban,
    Save,
    X,
    Calendar,
    DollarSign,
    Users,
    AlertCircle,
    Plus,
    Trash2,
    ArrowLeft,
} from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
}

interface Milestone {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    status: string;
}

export default function EditProjectPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'DEVELOPMENT',
        type: 'REVENUE',
        priority: 'MEDIUM',
        status: 'PLANNING',
        isRevenueBased: true,
        estimatedRevenue: 0,
        itDepartmentCut: 30,
        startDate: '',
        endDate: '',
        projectManagerId: '',
        teamLeadId: '',
    });

    const [milestones, setMilestones] = useState<Milestone[]>([]);

    useEffect(() => {
        if (projectId) {
            fetchInitialData();
        }
    }, [projectId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [projectRes, allProjectsRes, usersRes] = await Promise.all([
                fetch(`/api/it/projects/${projectId}`),
                fetch('/api/it/projects?limit=100'), // Added to handle project pagination
                fetch('/api/users?limit=100')
            ]);

            if (projectRes.ok && allProjectsRes.ok && usersRes.ok) {
                const projectData = await projectRes.json();
                // const allProjectsData = await allProjectsRes.json(); // This data is now available if needed
                const usersData = await usersRes.json();

                setUsers(Array.isArray(usersData) ? usersData : (usersData.data || []));

                // Pre-fill form
                setFormData({
                    name: projectData.name || '',
                    description: projectData.description || '',
                    category: projectData.category || 'DEVELOPMENT',
                    type: projectData.type || 'REVENUE',
                    priority: projectData.priority || 'MEDIUM',
                    status: projectData.status || 'PLANNING',
                    isRevenueBased: projectData.isRevenueBased ?? true,
                    estimatedRevenue: projectData.estimatedRevenue || 0,
                    itDepartmentCut: projectData.itDepartmentCut || 30,
                    startDate: projectData.startDate ? projectData.startDate.split('T')[0] : '',
                    endDate: projectData.endDate ? projectData.endDate.split('T')[0] : '',
                    projectManagerId: projectData.projectManagerId || '',
                    teamLeadId: projectData.teamLeadId || '',
                });

                if (projectData.milestones) {
                    setMilestones(projectData.milestones.map((m: any) => ({
                        id: m.id,
                        title: m.title,
                        description: m.description || '',
                        dueDate: m.dueDate ? m.dueDate.split('T')[0] : '',
                        status: m.status || 'PENDING',
                    })));
                }
            } else {
                alert('Failed to load data');
                router.push('/dashboard/it-management/projects');
            }
        } catch (error) {
            console.error('Error fetching project data:', error);
            alert('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Project name is required';
        }

        if (formData.isRevenueBased && formData.estimatedRevenue < 0) {
            newErrors.estimatedRevenue = 'Estimated revenue cannot be negative';
        }

        if (formData.itDepartmentCut < 0 || formData.itDepartmentCut > 100) {
            newErrors.itDepartmentCut = 'IT department cut must be between 0 and 100';
        }

        if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
            newErrors.endDate = 'End date must be after start date';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSaving(true);

        try {
            const response = await fetch(`/api/it/projects/${projectId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    estimatedRevenue: parseFloat(formData.estimatedRevenue.toString()),
                    itDepartmentCut: parseFloat(formData.itDepartmentCut.toString()),
                    startDate: formData.startDate || null,
                    endDate: formData.endDate || null,
                    projectManagerId: formData.projectManagerId || null,
                    teamLeadId: formData.teamLeadId || null,
                    milestones: milestones.map(m => ({
                        id: m.id.startsWith('temp-') ? undefined : m.id,
                        title: m.title,
                        description: m.description,
                        dueDate: m.dueDate || null,
                        status: m.status,
                    })),
                }),
            });

            if (response.ok) {
                router.push(`/dashboard/it-management/projects/${projectId}`);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update project');
            }
        } catch (error) {
            console.error('Failed to update project:', error);
            alert('Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    const addMilestone = () => {
        setMilestones([
            ...milestones,
            {
                id: `temp-${Date.now()}`,
                title: '',
                description: '',
                dueDate: '',
                status: 'PENDING',
            },
        ]);
    };

    const updateMilestone = (id: string, field: string, value: string) => {
        setMilestones(
            milestones.map(m => (m.id === id ? { ...m, [field]: value } : m))
        );
    };

    const removeMilestone = (id: string) => {
        setMilestones(milestones.filter(m => m.id !== id));
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

    return (
        <DashboardLayout>
            <div className="p-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <FolderKanban className="h-8 w-8 text-blue-600" />
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Edit Project
                                </h1>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">
                                Update the details of your IT project
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Basic Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" />
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData({ ...formData, category: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="DEVELOPMENT">Development</option>
                                    <option value="INFRASTRUCTURE">Infrastructure</option>
                                    <option value="SECURITY">Security</option>
                                    <option value="SUPPORT">Support</option>
                                    <option value="RESEARCH">Research</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Priority
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) =>
                                        setFormData({ ...formData, priority: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({ ...formData, status: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="PLANNING">Planning</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="TESTING">Testing</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Settings */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Revenue Settings
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isRevenueBased"
                                    checked={formData.isRevenueBased}
                                    onChange={(e) =>
                                        setFormData({ ...formData, isRevenueBased: e.target.checked })
                                    }
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <label
                                    htmlFor="isRevenueBased"
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    This is a revenue-generating project
                                </label>
                            </div>

                            {formData.isRevenueBased && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Estimated Revenue (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.estimatedRevenue}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    estimatedRevenue: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            IT Department Cut (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.itDepartmentCut}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    itDepartmentCut: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="h-5 w-5 text-purple-600" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Timeline
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) =>
                                        setFormData({ ...formData, startDate: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) =>
                                        setFormData({ ...formData, endDate: e.target.value })
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${errors.endDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                />
                                {errors.endDate && (
                                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" />
                                        {errors.endDate}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Team Assignment */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Team Assignment
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Project Manager
                                </label>
                                <select
                                    value={formData.projectManagerId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, projectManagerId: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Select Project Manager</option>
                                    {users?.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Team Lead
                                </label>
                                <select
                                    value={formData.teamLeadId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, teamLeadId: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Select Team Lead</option>
                                    {users?.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Milestones */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Milestones
                            </h2>
                            <button
                                type="button"
                                onClick={addMilestone}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Add Milestone
                            </button>
                        </div>

                        <div className="space-y-4">
                            {milestones.map((milestone) => (
                                <div
                                    key={milestone.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Title
                                            </label>
                                            <input
                                                type="text"
                                                value={milestone.title}
                                                onChange={(e) =>
                                                    updateMilestone(milestone.id, 'title', e.target.value)
                                                }
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Due Date
                                            </label>
                                            <input
                                                type="date"
                                                value={milestone.dueDate}
                                                onChange={(e) =>
                                                    updateMilestone(milestone.id, 'dueDate', e.target.value)
                                                }
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={milestone.description}
                                                onChange={(e) =>
                                                    updateMilestone(milestone.id, 'description', e.target.value)
                                                }
                                                rows={2}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Status
                                            </label>
                                            <select
                                                value={milestone.status}
                                                onChange={(e) =>
                                                    updateMilestone(milestone.id, 'status', e.target.value)
                                                }
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="PENDING">Pending</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="COMPLETED">Completed</option>
                                                <option value="CANCELLED">Cancelled</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeMilestone(milestone.id)}
                                                className="flex items-center gap-2 px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Remove Milestone
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <X className="h-5 w-5" />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
