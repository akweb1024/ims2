'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ListTodo,
    Save,
    X,
    Calendar,
    DollarSign,
    User,
    AlertCircle,
    FolderKanban,
    ArrowLeft,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    projectCode: string;
}

interface UserType {
    id: string;
    name: string;
    email: string;
}

export default function EditTaskPage() {
    const router = useRouter();
    const params = useParams();
    const taskId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        projectId: '',
        category: 'DEVELOPMENT',
        type: 'REVENUE',
        priority: 'MEDIUM',
        status: 'PENDING',
        isRevenueBased: true,
        estimatedValue: 0,
        itRevenueEarned: 0,
        isPaid: false,
        assignedToId: '',
        dueDate: '',
        progressPercent: 0,
        tags: '',
    });

    useEffect(() => {
        if (taskId) {
            fetchInitialData();
        }
    }, [taskId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [taskRes, projectsRes, usersRes] = await Promise.all([
                fetch(`/api/it/tasks/${taskId}`),
                fetch('/api/it/projects'),
                fetch('/api/users?limit=100')
            ]);

            if (taskRes.ok && projectsRes.ok && usersRes.ok) {
                const taskData = await taskRes.json();
                const projectsData = await projectsRes.json();
                const usersData = await usersRes.json();

                setProjects(Array.isArray(projectsData) ? projectsData : (projectsData.data || []));
                setUsers(Array.isArray(usersData) ? usersData : (usersData.data || []));

                // Pre-fill form
                setFormData({
                    title: taskData.title || '',
                    description: taskData.description || '',
                    projectId: taskData.projectId || '',
                    category: taskData.category || 'DEVELOPMENT',
                    type: taskData.type || 'REVENUE',
                    priority: taskData.priority || 'MEDIUM',
                    status: taskData.status || 'PENDING',
                    isRevenueBased: taskData.isRevenueBased ?? true,
                    estimatedValue: taskData.estimatedValue || 0,
                    itRevenueEarned: taskData.itRevenueEarned || 0,
                    isPaid: taskData.isPaid || false,
                    assignedToId: taskData.assignedToId || '',
                    dueDate: taskData.dueDate ? taskData.dueDate.split('T')[0] : '',
                    progressPercent: taskData.progressPercent || 0,
                    tags: Array.isArray(taskData.tags) ? taskData.tags.join(', ') : (taskData.tags || ''),
                });
            } else {
                alert('Failed to load data');
                router.push('/dashboard/it-management/tasks');
            }
        } catch (error) {
            console.error('Error fetching task data:', error);
            alert('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Task title is required';
        }

        if (formData.isRevenueBased && formData.estimatedValue < 0) {
            newErrors.estimatedValue = 'Estimated value cannot be negative';
        }

        if (formData.progressPercent < 0 || formData.progressPercent > 100) {
            newErrors.progressPercent = 'Progress must be between 0 and 100';
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
            const response = await fetch(`/api/it/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    projectId: formData.projectId || null,
                    estimatedValue: parseFloat(formData.estimatedValue.toString()),
                    itRevenueEarned: parseFloat(formData.itRevenueEarned.toString()),
                    assignedToId: formData.assignedToId || null,
                    dueDate: formData.dueDate || null,
                    progressPercent: parseInt(formData.progressPercent.toString()),
                    tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                }),
            });

            if (response.ok) {
                router.push(`/dashboard/it-management/tasks/${taskId}`);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update task');
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('Failed to update task');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-4xl mx-auto">
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
                                <ListTodo className="h-8 w-8 text-purple-600" />
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Edit Task
                                </h1>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">
                                Update the details of your IT task
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

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Task Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                />
                                {errors.title && (
                                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" />
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Project
                                </label>
                                <select
                                    value={formData.projectId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, projectId: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">No Project (Standalone Task)</option>
                                    {projects?.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.projectCode} - {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) =>
                                            setFormData({ ...formData, category: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="ENHANCEMENT">Enhancement</option>
                                        <option value="BUG_FIX">Bug Fix</option>
                                        <option value="FEATURE">Feature</option>
                                        <option value="DOCUMENTATION">Documentation</option>
                                        <option value="TESTING">Testing</option>
                                        <option value="DEPLOYMENT">Deployment</option>
                                        <option value="GENERAL">General</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Type
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) =>
                                            setFormData({ ...formData, type: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="REVENUE">Revenue</option>
                                        <option value="SUPPORT">Support</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                        <option value="URGENT">Urgent</option>
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
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) =>
                                            setFormData({ ...formData, status: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="TESTING">Testing</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Progress (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.progressPercent}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                progressPercent: parseInt(e.target.value) || 0,
                                            })
                                        }
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white ${errors.progressPercent ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        min="0"
                                        max="100"
                                    />
                                    {errors.progressPercent && (
                                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4" />
                                            {errors.progressPercent}
                                        </p>
                                    )}
                                </div>
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
                                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                />
                                <label
                                    htmlFor="isRevenueBased"
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    This is a revenue-generating task
                                </label>
                            </div>

                            {formData.isRevenueBased && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Estimated Value (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.estimatedValue}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    estimatedValue: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            IT Revenue Earned (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.itRevenueEarned}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    itRevenueEarned: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="isPaid"
                                            checked={formData.isPaid}
                                            onChange={(e) =>
                                                setFormData({ ...formData, isPaid: e.target.checked })
                                            }
                                            className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                        />
                                        <label
                                            htmlFor="isPaid"
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            Mark as Paid
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assignment & Timeline */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Assignment & Timeline
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Assign To
                                </label>
                                <select
                                    value={formData.assignedToId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, assignedToId: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Unassigned</option>
                                    {users?.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) =>
                                        setFormData({ ...formData, dueDate: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Tags
                        </h2>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) =>
                                setFormData({ ...formData, tags: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                            placeholder="e.g., frontend, bug, urgent (comma separated)"
                        />
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
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
