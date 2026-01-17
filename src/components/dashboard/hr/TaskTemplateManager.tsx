'use client';

import { useState, useEffect } from 'react';
import { Award, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
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

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        points: 10,
        departmentId: 'ALL',
        designationId: 'ALL',
        isActive: true,
        calculationType: 'FLAT',
        minThreshold: 1,
        maxThreshold: '',
        pointsPerUnit: 1,
        basePoints: 1,
        perUnitCount: 1
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = '/api/hr/tasks';
            const method = editingTask ? 'PUT' : 'POST';

            // Ensure pointsPerUnit is accurate from base/per helpers
            const finalPointsPerUnit = (formData.basePoints || 1) / (formData.perUnitCount || 1);

            const body = {
                ...(editingTask ? { id: editingTask.id } : {}),
                ...formData,
                pointsPerUnit: finalPointsPerUnit
            };

            // Cleanup helpers not needed by backend (though backend ignores extras)
            // @ts-ignore
            delete body.basePoints;
            // @ts-ignore
            delete body.perUnitCount;

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingTask(null);
                fetchData();
                setFormData({
                    title: '',
                    description: '',
                    points: 10,
                    departmentId: 'ALL',
                    designationId: 'ALL',
                    isActive: true,
                    calculationType: 'FLAT',
                    minThreshold: 1,
                    maxThreshold: '',
                    pointsPerUnit: 1,
                    basePoints: 1,
                    perUnitCount: 1
                });
            } else {
                alert('Failed to save task');
            }
        } catch (error) {
            console.error('Error saving task:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task template?')) return;
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

    const filteredTasks = tasks.filter(t => filterDept === 'ALL' || t.departmentId === filterDept || (!t.departmentId));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900">Task Master</h2>
                    <p className="text-secondary-500">Define gamified tasks and point values for employees</p>
                </div>
                <button
                    onClick={() => {
                        setEditingTask(null);
                        setFormData({
                            title: '',
                            description: '',
                            points: 10,
                            departmentId: 'ALL',
                            designationId: 'ALL',
                            isActive: true,
                            calculationType: 'FLAT',
                            minThreshold: 1,
                            maxThreshold: '',
                            pointsPerUnit: 1,
                            basePoints: 1,
                            perUnitCount: 1
                        });
                        setIsModalOpen(true);
                    }}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} /> Add New Task
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-secondary-100 shadow-sm">
                <span className="text-sm font-bold text-secondary-500">Filter by Department:</span>
                <select
                    className="input w-64"
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                >
                    <option value="ALL">All Departments</option>
                    {departments.filter((d, index, self) => index === self.findIndex(t => t.name === d.name)).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map(task => (
                    <div key={task.id} className="card-premium p-6 group relative border-t-4 border-indigo-500 hover:shadow-lg transition-all">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => {
                                    setEditingTask(task);
                                    const ppu = task.pointsPerUnit || 1;
                                    let bp = ppu;
                                    let puc = 1;
                                    if (ppu < 1 && ppu > 0) {
                                        bp = 1;
                                        puc = Math.round(1 / ppu);
                                    } else if (ppu > 1 && !Number.isInteger(ppu)) {
                                        // Handle cases like 1.5 points per unit -> 3 points per 2 units?
                                        // For now, simplify.
                                    }

                                    setFormData({
                                        title: task.title,
                                        description: task.description || '',
                                        points: task.points,
                                        departmentId: task.departmentId || 'ALL',
                                        designationId: task.designationId || 'ALL',
                                        isActive: task.isActive,
                                        calculationType: task.calculationType || 'FLAT',
                                        minThreshold: task.minThreshold || 1,
                                        maxThreshold: task.maxThreshold || '',
                                        pointsPerUnit: ppu,
                                        basePoints: bp,
                                        perUnitCount: puc
                                    });
                                    setIsModalOpen(true);
                                }}
                                className="p-2 bg-secondary-100 text-secondary-600 rounded-lg hover:bg-secondary-200"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={() => handleDelete(task.id)}
                                className="p-2 bg-danger-50 text-danger-600 rounded-lg hover:bg-danger-100"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg text-secondary-900 pr-8 line-clamp-2">{task.title}</h3>
                            </div>
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

                                {task.department ? (
                                    <span className="badge badge-secondary">{task.department.name}</span>
                                ) : (
                                    <span className="badge badge-outline">All Depts</span>
                                )}
                                {task.designation && (
                                    <span className="badge badge-outline">{task.designation.name}</span>
                                )}
                                {!task.isActive && (
                                    <span className="badge badge-danger">Inactive</span>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-secondary-600 line-clamp-3">{task.description || 'No description provided.'}</p>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="font-black text-xl text-secondary-900">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Calculation Type</label>
                                    <select
                                        className="input"
                                        value={formData.calculationType}
                                        onChange={e => setFormData({ ...formData, calculationType: e.target.value })}
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
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="label">Points</label>
                                                <input
                                                    type="number"
                                                    required
                                                    className="input"
                                                    value={formData.basePoints}
                                                    onChange={e => {
                                                        const bp = parseFloat(e.target.value);
                                                        setFormData({
                                                            ...formData,
                                                            basePoints: bp,
                                                            pointsPerUnit: bp / (formData.perUnitCount || 1)
                                                        });
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center pt-6 font-bold text-secondary-400">/</div>
                                            <div className="flex-1">
                                                <label className="label">Per Units</label>
                                                <input
                                                    type="number"
                                                    required
                                                    className="input"
                                                    min="1"
                                                    value={formData.perUnitCount}
                                                    onChange={e => {
                                                        const puc = parseFloat(e.target.value);
                                                        setFormData({
                                                            ...formData,
                                                            perUnitCount: puc,
                                                            pointsPerUnit: (formData.basePoints || 1) / puc
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-xs text-secondary-500 mt-1">
                                            Outcome: {formData.pointsPerUnit.toFixed(5)} pts/unit
                                        </div>
                                    </div>
                                )}
                            </div>

                            {formData.calculationType === 'SCALED' && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-secondary-50 rounded-xl mb-4">
                                    <div>
                                        <label className="label text-xs">Min Units (to qualify)</label>
                                        <input
                                            type="number"
                                            className="input h-9 text-sm"
                                            value={formData.minThreshold}
                                            onChange={e => setFormData({ ...formData, minThreshold: parseFloat(e.target.value) })}
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
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Status</label>
                                    <select
                                        className="input"
                                        value={formData.isActive ? 'true' : 'false'}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Department</label>
                                    <select
                                        className="input"
                                        value={formData.departmentId}
                                        onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                    >
                                        <option value="ALL">All Departments</option>
                                        {departments.filter((d, index, self) => index === self.findIndex(t => t.name === d.name)).map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Designation</label>
                                    <select
                                        className="input"
                                        value={formData.designationId}
                                        onChange={e => setFormData({ ...formData, designationId: e.target.value })}
                                    >
                                        <option value="ALL">All Designations</option>
                                        {designations.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="Describe criteria for this task..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1 font-bold">Save Task Template</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
