'use client';

import { useState, useEffect, useCallback } from 'react';
import { Award, Plus, Edit2, Trash2, CheckCircle, XCircle, Users, Building2, Search, Grid3x3, List, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TaskTemplateManager() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);

    // Filter State
    const [filterDept, setFilterDept] = useState('ALL');
    const [filterDesignation, setFilterDesignation] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterCalculationType, setFilterCalculationType] = useState('ALL');
    const [searchText, setSearchText] = useState('');

    // View State
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Form State with multi-selection support
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        points: 10,
        departmentId: 'ALL',
        designationId: 'ALL',
        departmentIds: [] as string[],  // NEW: Multi-select
        designationIds: [] as string[], // NEW: Multi-select
        selectionMode: 'ALL' as 'ALL' | 'SPECIFIC', // NEW: Selection mode
        isActive: true,
        calculationType: 'FLAT',
        minThreshold: 1,
        maxThreshold: '',
        pointsPerUnit: 1,
        basePoints: 1,
        perUnitCount: 1
    });

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const [tasksRes, deptsRes, desigsRes] = await Promise.all([
                fetch('/api/hr/tasks', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/departments', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/designations', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (tasksRes.ok) setTasks(await tasksRes.json());
            if (deptsRes.ok) setDepartments(await deptsRes.json());
            if (desigsRes.ok) setDesignations(await desigsRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = '/api/hr/tasks';
            const method = editingTask ? 'PUT' : 'POST';

            const finalPointsPerUnit = (formData.basePoints || 1) / (formData.perUnitCount || 1);

            const body: any = {
                ...(editingTask ? { id: editingTask.id } : {}),
                title: formData.title,
                description: formData.description,
                points: formData.points,
                isActive: formData.isActive,
                calculationType: formData.calculationType,
                minThreshold: formData.minThreshold,
                maxThreshold: formData.maxThreshold,
                pointsPerUnit: finalPointsPerUnit
            };

            // Handle department/designation selection
            if (formData.selectionMode === 'ALL') {
                body.departmentId = 'ALL';
                body.designationId = 'ALL';
                body.departmentIds = null;
                body.designationIds = null;
            } else {
                // Multi-select mode
                body.departmentId = null;
                body.designationId = null;
                body.departmentIds = formData.departmentIds.length > 0 ? formData.departmentIds : null;
                body.designationIds = formData.designationIds.length > 0 ? formData.designationIds : null;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingTask(null);
                fetchData();
                resetForm();
            } else {
                const error = await res.json();
                alert(`Error: ${error.error || 'Failed to save task'}`);
            }
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Network error');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            points: 10,
            departmentId: 'ALL',
            designationId: 'ALL',
            departmentIds: [],
            designationIds: [],
            selectionMode: 'ALL',
            isActive: true,
            calculationType: 'FLAT',
            minThreshold: 1,
            maxThreshold: '',
            pointsPerUnit: 1,
            basePoints: 1,
            perUnitCount: 1
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this task template?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/tasks?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const handleEdit = (task: any) => {
        setEditingTask(task);

        // Determine selection mode
        const hasMultipleDepts = task.departmentIds && Array.isArray(task.departmentIds) && task.departmentIds.length > 0;
        const hasMultipleDesigs = task.designationIds && Array.isArray(task.designationIds) && task.designationIds.length > 0;
        const selectionMode = (hasMultipleDepts || hasMultipleDesigs) ? 'SPECIFIC' : 'ALL';

        const ppu = task.pointsPerUnit || 1;
        const bp = ppu >= 1 ? ppu : 1;
        const puc = ppu >= 1 ? 1 : Math.round(1 / ppu);

        setFormData({
            title: task.title,
            description: task.description || '',
            points: task.points,
            departmentId: task.departmentId || 'ALL',
            designationId: task.designationId || 'ALL',
            departmentIds: task.departmentIds || [],
            designationIds: task.designationIds || [],
            selectionMode,
            isActive: task.isActive,
            calculationType: task.calculationType || 'FLAT',
            minThreshold: task.minThreshold || 1,
            maxThreshold: task.maxThreshold || '',
            pointsPerUnit: ppu,
            basePoints: bp,
            perUnitCount: puc
        });
        setIsModalOpen(true);
    };

    const toggleDepartment = (deptId: string) => {
        setFormData(prev => ({
            ...prev,
            departmentIds: prev.departmentIds.includes(deptId)
                ? prev.departmentIds.filter(id => id !== deptId)
                : [...prev.departmentIds, deptId]
        }));
    };

    const toggleDesignation = (desigId: string) => {
        setFormData(prev => ({
            ...prev,
            designationIds: prev.designationIds.includes(desigId)
                ? prev.designationIds.filter(id => id !== desigId)
                : [...prev.designationIds, desigId]
        }));
    };

    const filteredTasks = tasks.filter(task => {
        // Department filter
        if (filterDept !== 'ALL') {
            if (task.departmentIds && Array.isArray(task.departmentIds)) {
                if (!task.departmentIds.includes(filterDept)) return false;
            } else if (task.departmentId !== filterDept && task.departmentId) {
                return false;
            }
        }

        // Designation filter
        if (filterDesignation !== 'ALL') {
            if (task.designationIds && Array.isArray(task.designationIds)) {
                if (!task.designationIds.includes(filterDesignation)) return false;
            } else if (task.designationId !== filterDesignation && task.designationId) {
                return false;
            }
        }

        // Status filter
        if (filterStatus !== 'ALL') {
            if (filterStatus === 'ACTIVE' && !task.isActive) return false;
            if (filterStatus === 'INACTIVE' && task.isActive) return false;
        }

        // Calculation Type filter
        if (filterCalculationType !== 'ALL') {
            if (task.calculationType !== filterCalculationType) return false;
        }

        // Search text filter
        if (searchText.trim()) {
            const searchLower = searchText.toLowerCase();
            const titleMatch = task.title?.toLowerCase().includes(searchLower);
            const descMatch = task.description?.toLowerCase().includes(searchLower);
            if (!titleMatch && !descMatch) return false;
        }

        return true;
    });

    const getTaskDepartmentDisplay = (task: any) => {
        if (task.departmentIds && Array.isArray(task.departmentIds) && task.departmentIds.length > 0) {
            const deptNames = task.departmentIds
                .map((id: string) => departments.find(d => d.id === id)?.name)
                .filter(Boolean);
            return deptNames.length > 0 ? deptNames.join(', ') : 'Selected Depts';
        }
        return task.department?.name || 'All Depts';
    };

    const getTaskDesignationDisplay = (task: any) => {
        if (task.designationIds && Array.isArray(task.designationIds) && task.designationIds.length > 0) {
            const desigNames = task.designationIds
                .map((id: string) => designations.find(d => d.id === id)?.name)
                .filter(Boolean);
            return desigNames.length > 0 ? desigNames.join(', ') : 'Selected Roles';
        }
        return task.designation?.name || 'All Roles';
    };

    if (isLoading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900">Task Templates</h2>
                    <p className="text-secondary-500">Manage gamified task templates for employees</p>
                </div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn btn-primary flex items-center gap-2">
                    <Plus size={18} /> Create Task
                </button>
            </div>

            {/* Enhanced Filters & Search */}
            <div className="card-premium p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Filter className="text-primary-600" size={20} />
                        <h3 className="font-bold text-lg text-secondary-900">Search & Filters</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-secondary-600 font-medium">View:</span>
                        <div className="flex bg-secondary-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded transition-all ${viewMode === 'grid'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-secondary-500 hover:text-secondary-700'}`}
                                title="Grid View"
                            >
                                <Grid3x3 size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded transition-all ${viewMode === 'table'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-secondary-500 hover:text-secondary-700'}`}
                                title="Table View"
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by task title or description..."
                        className="input pl-11 w-full"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                    {searchText && (
                        <button
                            onClick={() => setSearchText('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                            title="Clear search"
                        >
                            <XCircle size={18} />
                        </button>
                    )}
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="label mb-2">Department</label>
                        <select
                            className="input w-full"
                            value={filterDept}
                            onChange={e => setFilterDept(e.target.value)}
                            title="Filter by department"
                        >
                            <option value="ALL">All Departments</option>
                            {departments.filter((d, index, self) => index === self.findIndex(t => t.name === d.name)).map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label mb-2">Designation</label>
                        <select
                            className="input w-full"
                            value={filterDesignation}
                            onChange={e => setFilterDesignation(e.target.value)}
                            title="Filter by designation"
                        >
                            <option value="ALL">All Designations</option>
                            {designations.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label mb-2">Status</label>
                        <select
                            className="input w-full"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            title="Filter by status"
                        >
                            <option value="ALL">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="label mb-2">Calculation Type</label>
                        <select
                            className="input w-full"
                            value={filterCalculationType}
                            onChange={e => setFilterCalculationType(e.target.value)}
                            title="Filter by calculation type"
                        >
                            <option value="ALL">All Types</option>
                            <option value="FLAT">Flat Points</option>
                            <option value="SCALED">Scaled Points</option>
                        </select>
                    </div>
                </div>

                {/* Active Filters Summary */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-secondary-600 font-medium">
                        Showing {filteredTasks.length} of {tasks.length} tasks
                    </span>
                    {(filterDept !== 'ALL' || filterDesignation !== 'ALL' || filterStatus !== 'ALL' || filterCalculationType !== 'ALL' || searchText) && (
                        <button
                            onClick={() => {
                                setFilterDept('ALL');
                                setFilterDesignation('ALL');
                                setFilterStatus('ALL');
                                setFilterCalculationType('ALL');
                                setSearchText('');
                            }}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium underline"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            </div>

            {/* Task Grid */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map(task => (
                        <div key={task.id} className="card-premium p-6 hover:shadow-lg transition-shadow">
                            <div className="flex justify-end gap-2 mb-3">
                                <button
                                    onClick={() => handleEdit(task)}
                                    className="p-2 bg-secondary-100 text-secondary-600 rounded-lg hover:bg-secondary-200"
                                    title="Edit task"
                                    aria-label={`Edit ${task.title}`}
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 bg-danger-50 text-danger-600 rounded-lg hover:bg-danger-100"
                                    title="Delete task"
                                    aria-label={`Delete ${task.title}`}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="mb-4">
                                <h3 className="font-bold text-lg text-secondary-900 pr-8 line-clamp-2">{task.title}</h3>
                                <div className="mt-2 flex gap-2 flex-wrap">
                                    {task.calculationType === 'SCALED' ? (
                                        <span className="badge bg-purple-100 text-purple-700 font-black">
                                            {task.pointsPerUnit < 1
                                                ? `1 pt / ${Math.round(1 / task.pointsPerUnit)} units`
                                                : `${task.pointsPerUnit} pts / unit`
                                            }
                                        </span>
                                    ) : (
                                        <span className="badge bg-indigo-100 text-indigo-700 font-black">{task.points} Points</span>
                                    )}
                                    {task.minThreshold > 1 && (
                                        <span className="badge badge-secondary">Min: {task.minThreshold}</span>
                                    )}
                                    {!task.isActive && (
                                        <span className="badge badge-danger">Inactive</span>
                                    )}
                                </div>
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center gap-2 text-xs">
                                        <Building2 size={12} className="text-secondary-400" />
                                        <span className="text-secondary-600 font-medium">{getTaskDepartmentDisplay(task)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <Users size={12} className="text-secondary-400" />
                                        <span className="text-secondary-600 font-medium">{getTaskDesignationDisplay(task)}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-secondary-600 line-clamp-3">{task.description || 'No description provided.'}</p>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Task</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Points</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-secondary-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-100">
                                {filteredTasks.map(task => (
                                    <tr key={task.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-secondary-900">{task.title}</div>
                                            <div className="text-sm text-secondary-500 line-clamp-1">{task.description || 'No description'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {getTaskDepartmentDisplay(task)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {getTaskDesignationDisplay(task)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.calculationType === 'SCALED' ? (
                                                <span className="badge bg-purple-100 text-purple-700 font-black text-xs">
                                                    {task.pointsPerUnit < 1
                                                        ? `1pt/${Math.round(1 / task.pointsPerUnit)}u`
                                                        : `${task.pointsPerUnit}pt/u`
                                                    }
                                                </span>
                                            ) : (
                                                <span className="badge bg-indigo-100 text-indigo-700 font-black text-xs">{task.points}pts</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-secondary-600 font-medium">
                                                {task.calculationType === 'FLAT' ? 'Flat' : 'Scaled'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.isActive ? (
                                                <span className="badge bg-success-100 text-success-700 text-xs">Active</span>
                                            ) : (
                                                <span className="badge bg-danger-100 text-danger-700 text-xs">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(task)}
                                                    className="p-2 bg-secondary-100 text-secondary-600 rounded-lg hover:bg-secondary-200"
                                                    title="Edit task"
                                                    aria-label={`Edit ${task.title}`}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(task.id)}
                                                    className="p-2 bg-danger-50 text-danger-600 rounded-lg hover:bg-danger-100"
                                                    title="Delete task"
                                                    aria-label={`Delete ${task.title}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredTasks.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-secondary-500 font-medium">No tasks found matching your filters</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="font-black text-xl text-secondary-900">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="label">Task Title</label>
                                <input
                                    required
                                    className="input"
                                    placeholder="e.g. Daily Code Review"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="label">Description</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="Describe the task..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Calculation Type</label>
                                    <select
                                        className="input"
                                        value={formData.calculationType}
                                        onChange={e => setFormData({ ...formData, calculationType: e.target.value })}
                                        title="Calculation Type"
                                    >
                                        <option value="FLAT">Flat Points (Checklist)</option>
                                        <option value="SCALED">Scaled (Per Unit)</option>
                                    </select>
                                </div>
                                {formData.calculationType === 'FLAT' ? (
                                    <div>
                                        <label className="label">Points Value</label>
                                        <input
                                            type="number"
                                            required
                                            className="input"
                                            min="1"
                                            max="1000"
                                            value={formData.points}
                                            onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) })}
                                            placeholder="Enter points value"
                                            title="Points Value"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="label text-xs">Points Calculation</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className="input h-10 text-sm"
                                                placeholder="Points"
                                                min="1"
                                                value={formData.basePoints}
                                                onChange={e => setFormData({ ...formData, basePoints: parseFloat(e.target.value) || 1 })}
                                                title="Base Points"
                                            />
                                            <span className="text-sm font-bold">pts per</span>
                                            <input
                                                type="number"
                                                className="input h-10 text-sm"
                                                placeholder="Units"
                                                min="1"
                                                value={formData.perUnitCount}
                                                onChange={e => setFormData({ ...formData, perUnitCount: parseFloat(e.target.value) || 1 })}
                                                title="Units Count"
                                            />
                                            <span className="text-sm font-bold">units</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {formData.calculationType === 'SCALED' && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-secondary-50 rounded-xl">
                                    <div>
                                        <label className="label text-xs">Min Units (to qualify)</label>
                                        <input
                                            type="number"
                                            className="input h-9 text-sm"
                                            value={formData.minThreshold}
                                            onChange={e => setFormData({ ...formData, minThreshold: parseFloat(e.target.value) })}
                                            placeholder="Min units"
                                            title="Minimum Threshold"
                                        />
                                    </div>
                                    <div>
                                        <label className="label text-xs">Max Units Cap</label>
                                        <input
                                            type="text"
                                            className="input h-9 text-sm"
                                            placeholder="No Cap"
                                            value={formData.maxThreshold}
                                            onChange={e => setFormData({ ...formData, maxThreshold: e.target.value })}
                                            title="Maximum Threshold Cap"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* NEW: Selection Mode */}
                            <div className="border-t pt-4">
                                <label className="label">Assignment Mode</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, selectionMode: 'ALL', departmentIds: [], designationIds: [] })}
                                        className={`p-4 rounded-xl border-2 transition-all ${formData.selectionMode === 'ALL'
                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                            : 'border-secondary-200 hover:border-secondary-300'
                                            }`}
                                    >
                                        <div className="font-bold">All Employees</div>
                                        <div className="text-xs text-secondary-500 mt-1">Visible to everyone</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, selectionMode: 'SPECIFIC' })}
                                        className={`p-4 rounded-xl border-2 transition-all ${formData.selectionMode === 'SPECIFIC'
                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                            : 'border-secondary-200 hover:border-secondary-300'
                                            }`}
                                    >
                                        <div className="font-bold">Specific Groups</div>
                                        <div className="text-xs text-secondary-500 mt-1">Select departments/roles</div>
                                    </button>
                                </div>
                            </div>

                            {/* NEW: Multi-Select for Departments */}
                            {formData.selectionMode === 'SPECIFIC' && (
                                <>
                                    <div>
                                        <label className="label flex items-center gap-2">
                                            <Building2 size={16} />
                                            Departments (select multiple)
                                        </label>
                                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-secondary-50 rounded-xl border border-secondary-200">
                                            {departments.filter((d, index, self) => index === self.findIndex(t => t.name === d.name)).map(dept => (
                                                <label
                                                    key={dept.id}
                                                    className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 transition-all ${formData.departmentIds.includes(dept.id)
                                                        ? 'bg-primary-50 border-primary-500'
                                                        : 'bg-white border-transparent hover:border-secondary-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-primary-600"
                                                        checked={formData.departmentIds.includes(dept.id)}
                                                        onChange={() => toggleDepartment(dept.id)}
                                                    />
                                                    <span className="text-sm font-bold text-secondary-700">{dept.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-secondary-500 mt-2">
                                            {formData.departmentIds.length} department(s) selected
                                        </p>
                                    </div>

                                    {/* NEW: Multi-Select for Designations */}
                                    <div>
                                        <label className="label flex items-center gap-2">
                                            <Users size={16} />
                                            Designations (select multiple)
                                        </label>
                                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-secondary-50 rounded-xl border border-secondary-200">
                                            {designations.map(desig => (
                                                <label
                                                    key={desig.id}
                                                    className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 transition-all ${formData.designationIds.includes(desig.id)
                                                        ? 'bg-indigo-50 border-indigo-500'
                                                        : 'bg-white border-transparent hover:border-secondary-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-indigo-600"
                                                        checked={formData.designationIds.includes(desig.id)}
                                                        onChange={() => toggleDesignation(desig.id)}
                                                    />
                                                    <span className="text-sm font-bold text-secondary-700">{desig.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-secondary-500 mt-2">
                                            {formData.designationIds.length} designation(s) selected
                                        </p>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Status</label>
                                    <select
                                        className="input"
                                        value={formData.isActive ? 'true' : 'false'}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                                        title="Account Status"
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="btn btn-primary flex-1">
                                    <CheckCircle size={18} className="inline mr-2" />
                                    {editingTask ? 'Update Task' : 'Create Task'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary px-8">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
