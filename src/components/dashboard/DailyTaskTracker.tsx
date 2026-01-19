'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Award, TrendingUp, Target, Clock, Calendar } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    points: number;
    pointsPerUnit?: number;
    calculationType: 'FLAT' | 'SCALED';
    minThreshold?: number;
    maxThreshold?: number;
    category?: string;
}

interface CompletedTask {
    taskId: string;
    quantity?: number;
    completedAt: Date;
}

export default function DailyTaskTracker() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
    const [scaledValues, setScaledValues] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [todayPoints, setTodayPoints] = useState(0);

    useEffect(() => {
        fetchTasks();
        fetchTodayProgress();
    }, []);

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/tasks/my-tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodayProgress = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/tasks/today-progress', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCompletedTasks(data.completedTasks || []);
                setTodayPoints(data.totalPoints || 0);

                // Populate scaled values
                const values: Record<string, number> = {};
                data.completedTasks?.forEach((ct: CompletedTask) => {
                    if (ct.quantity) {
                        values[ct.taskId] = ct.quantity;
                    }
                });
                setScaledValues(values);
            }
        } catch (err) {
            console.error('Failed to fetch today progress:', err);
        }
    };

    const isTaskCompleted = (taskId: string) => {
        return completedTasks.some(ct => ct.taskId === taskId);
    };

    const handleToggleTask = async (task: Task) => {
        const isCompleted = isTaskCompleted(task.id);

        if (isCompleted) {
            // Uncheck task
            await removeTaskCompletion(task.id);
        } else {
            // Check task
            if (task.calculationType === 'SCALED') {
                const quantity = scaledValues[task.id] || 0;
                if (quantity === 0) {
                    alert('Please enter quantity before marking as complete');
                    return;
                }
                if (task.minThreshold && quantity < task.minThreshold) {
                    alert(`Minimum ${task.minThreshold} units required`);
                    return;
                }
            }
            await markTaskComplete(task);
        }
    };

    const markTaskComplete = async (task: Task) => {
        try {
            const token = localStorage.getItem('token');
            const quantity = task.calculationType === 'SCALED' ? (scaledValues[task.id] || 0) : undefined;

            const res = await fetch('/api/hr/tasks/mark-complete', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    taskId: task.id,
                    quantity
                })
            });

            if (res.ok) {
                const data = await res.json();
                setCompletedTasks(prev => [...prev, {
                    taskId: task.id,
                    quantity,
                    completedAt: new Date()
                }]);
                setTodayPoints(prev => prev + data.pointsEarned);
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to mark task as complete');
            }
        } catch (err) {
            console.error('Error marking task complete:', err);
            alert('Failed to mark task as complete');
        }
    };

    const removeTaskCompletion = async (taskId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/tasks/unmark-complete', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ taskId })
            });

            if (res.ok) {
                const data = await res.json();
                setCompletedTasks(prev => prev.filter(ct => ct.taskId !== taskId));
                setTodayPoints(prev => prev - data.pointsDeducted);
            }
        } catch (err) {
            console.error('Error removing task completion:', err);
        }
    };

    const calculateTaskPoints = (task: Task) => {
        if (!isTaskCompleted(task.id)) return 0;

        if (task.calculationType === 'SCALED') {
            const quantity = scaledValues[task.id] || 0;
            const effectiveQty = task.maxThreshold && quantity > task.maxThreshold
                ? task.maxThreshold
                : quantity;
            return Math.floor(effectiveQty * (task.pointsPerUnit || 0));
        }
        return task.points;
    };

    const completedCount = completedTasks.length;
    const totalTasks = tasks.length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    if (loading) {
        return (
            <div className="card-premium p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-secondary-200 rounded w-1/4"></div>
                    <div className="h-20 bg-secondary-200 rounded"></div>
                    <div className="h-20 bg-secondary-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-premium p-4 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-secondary-400 uppercase">Today&apos;s Tasks</p>
                            <p className="text-2xl font-black text-secondary-900">{completedCount}/{totalTasks}</p>
                        </div>
                        <Target className="text-indigo-500" size={32} />
                    </div>
                </div>

                <div className="card-premium p-4 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-secondary-400 uppercase">Points Earned</p>
                            <p className="text-2xl font-black text-purple-600">{todayPoints}</p>
                        </div>
                        <Award className="text-purple-500" size={32} />
                    </div>
                </div>

                <div className="card-premium p-4 border-l-4 border-success-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-secondary-400 uppercase">Completion</p>
                            <p className="text-2xl font-black text-success-600">{completionPercentage}%</p>
                        </div>
                        <TrendingUp className="text-success-500" size={32} />
                    </div>
                </div>

                <div className="card-premium p-4 border-l-4 border-amber-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-secondary-400 uppercase">Date</p>
                            <p className="text-sm font-black text-secondary-900">{new Date().toLocaleDateString()}</p>
                        </div>
                        <Calendar className="text-amber-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="card-premium p-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-secondary-900">Daily Progress</h3>
                    <span className="text-sm font-bold text-secondary-500">{completedCount} of {totalTasks} completed</span>
                </div>
                <div className="w-full bg-secondary-100 h-2 rounded-full overflow-hidden mb-2">
                    <div
                        className="bg-primary-500 h-full transition-all duration-500"
                        style={{ width: `${completionPercentage}%` } as React.CSSProperties}
                    />
                </div>
            </div>

            {/* Task List */}
            <div className="card-premium p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-xl text-secondary-900 flex items-center gap-2">
                        <Clock className="text-primary-500" size={24} />
                        My Tasks for Today
                    </h3>
                </div>

                {tasks.length === 0 ? (
                    <div className="text-center py-12 text-secondary-400">
                        <Target size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No tasks assigned yet</p>
                        <p className="text-sm">Check back later or contact your manager</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map(task => {
                            const isCompleted = isTaskCompleted(task.id);
                            const taskPoints = calculateTaskPoints(task);

                            return (
                                <div
                                    key={task.id}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${isCompleted
                                        ? 'bg-success-50/50 border-success-500 shadow-md'
                                        : 'bg-white border-secondary-200 hover:border-indigo-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => handleToggleTask(task)}
                                            className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isCompleted
                                                ? 'bg-success-500 border-success-500 text-white'
                                                : 'border-secondary-300 hover:border-indigo-500'
                                                }`}
                                            title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                                        >
                                            {isCompleted ? <CheckCircle size={16} /> : <Circle size={16} />}
                                        </button>

                                        {/* Task Details */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div className="flex-1">
                                                    <h4 className={`font-bold text-base mb-1 ${isCompleted ? 'text-success-900 line-through' : 'text-secondary-900'
                                                        }`}>
                                                        {task.title}
                                                    </h4>
                                                    {task.description && (
                                                        <p className="text-sm text-secondary-600">{task.description}</p>
                                                    )}
                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                    {task.calculationType === 'SCALED' ? (
                                                        <span className="badge bg-purple-100 text-purple-700 text-xs font-black">
                                                            {task.pointsPerUnit && task.pointsPerUnit < 1
                                                                ? `1pt/${Math.round(1 / task.pointsPerUnit)}u`
                                                                : `${task.pointsPerUnit || 1}pt/u`
                                                            }
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-indigo-100 text-indigo-700 text-xs font-black">
                                                            {task.points} pts
                                                        </span>
                                                    )}
                                                    {isCompleted && taskPoints > 0 && (
                                                        <span className="text-xs font-black text-success-600">
                                                            +{taskPoints} pts earned
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Scaled Task Input */}
                                            {task.calculationType === 'SCALED' && (
                                                <div className="mt-3 flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        className="input py-2 px-3 h-10 text-sm w-32"
                                                        placeholder="Quantity"
                                                        min="0"
                                                        value={scaledValues[task.id] || ''}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setScaledValues(prev => ({ ...prev, [task.id]: val }));
                                                        }}
                                                        disabled={isCompleted}
                                                        title="Enter quantity"
                                                    />
                                                    <div className="text-xs text-secondary-500">
                                                        {task.minThreshold && task.minThreshold > 1 && (
                                                            <span className="mr-3">Min: {task.minThreshold}</span>
                                                        )}
                                                        {task.maxThreshold && (
                                                            <span>Max: {task.maxThreshold}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {task.category && (
                                                <div className="mt-2">
                                                    <span className="badge bg-secondary-100 text-secondary-600 text-xs">
                                                        {task.category}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
