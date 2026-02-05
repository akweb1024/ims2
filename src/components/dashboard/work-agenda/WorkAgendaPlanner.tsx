'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, CheckCircle, XCircle, Edit, Link as LinkIcon } from 'lucide-react';

interface WorkPlan {
    id: string;
    date: string;
    agenda: string;
    strategy?: string;
    priority: string;
    estimatedHours?: number;
    actualHours?: number;
    completionStatus: string;
    linkedGoal?: {
        id: string;
        title: string;
        type: string;
    };
    employee: {
        user: {
            name: string;
            email: string;
        };
    };
}

interface WorkAgendaPlannerProps {
    employeeId?: string;
    isOwnAgenda?: boolean;
}

export default function WorkAgendaPlanner({ employeeId, isOwnAgenda = false }: WorkAgendaPlannerProps) {
    const [workPlans, setWorkPlans] = useState<WorkPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<WorkPlan | null>(null);

    useEffect(() => {
        fetchWorkPlans();
    }, [employeeId, selectedDate]);

    const fetchWorkPlans = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (employeeId) params.append('employeeId', employeeId);

            // Fetch plans for the week
            const date = new Date(selectedDate);
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            params.append('startDate', startOfWeek.toISOString().split('T')[0]);
            params.append('endDate', endOfWeek.toISOString().split('T')[0]);

            const res = await fetch(`/api/work-agenda?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setWorkPlans(data);
            }
        } catch (error) {
            console.error('Error fetching work plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            'HIGH': 'text-red-600 bg-red-100',
            'MEDIUM': 'text-yellow-600 bg-yellow-100',
            'LOW': 'text-green-600 bg-green-100'
        };
        return colors[priority] || 'text-gray-600 bg-gray-100';
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'PLANNED': 'text-blue-600 bg-blue-100',
            'IN_PROGRESS': 'text-purple-600 bg-purple-100',
            'COMPLETED': 'text-green-600 bg-green-100',
            'CANCELLED': 'text-gray-600 bg-gray-100'
        };
        return colors[status] || 'text-gray-600 bg-gray-100';
    };

    const getWeekDays = () => {
        const date = new Date(selectedDate);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());

        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const getPlansForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return workPlans.filter(plan => plan.date.split('T')[0] === dateStr);
    };

    const weekDays = getWeekDays();
    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
                        <Calendar className="text-primary-600" size={28} />
                        {isOwnAgenda ? 'My Work Agenda' : 'Team Work Agenda'}
                    </h2>
                    <p className="text-sm text-secondary-500 mt-1">
                        Plan and track daily work activities
                    </p>
                </div>
                {isOwnAgenda && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Plan Work
                    </button>
                )}
            </div>

            {/* Week Navigation */}
            <div className="card-premium p-4">
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => {
                            const date = new Date(selectedDate);
                            date.setDate(date.getDate() - 7);
                            setSelectedDate(date.toISOString().split('T')[0]);
                        }}
                        className="btn btn-secondary"
                    >
                        ← Previous Week
                    </button>
                    <div className="text-center">
                        <p className="text-sm font-bold text-secondary-600">Week of</p>
                        <p className="text-lg font-black text-secondary-900">
                            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            const date = new Date(selectedDate);
                            date.setDate(date.getDate() + 7);
                            setSelectedDate(date.toISOString().split('T')[0]);
                        }}
                        className="btn btn-secondary"
                    >
                        Next Week →
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-secondary-500 mt-4">Loading work plans...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {weekDays.map((day, index) => {
                        const dateStr = day.toISOString().split('T')[0];
                        const plans = getPlansForDate(day);
                        const isToday = dateStr === todayStr;
                        const isPast = day < new Date(todayStr);

                        return (
                            <div
                                key={index}
                                className={`card-premium p-4 ${isToday ? 'ring-2 ring-primary-600' : ''} ${isPast ? 'opacity-60' : ''}`}
                            >
                                <div className="mb-3">
                                    <p className="text-xs font-bold text-secondary-500 uppercase">
                                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </p>
                                    <p className={`text-lg font-black ${isToday ? 'text-primary-600' : 'text-secondary-900'}`}>
                                        {day.getDate()}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {plans.length === 0 ? (
                                        <p className="text-xs text-secondary-400 italic">No plans</p>
                                    ) : (
                                        plans.map(plan => (
                                            <div
                                                key={plan.id}
                                                className="p-2 bg-secondary-50 rounded-lg border border-secondary-100 hover:shadow-md transition-shadow cursor-pointer"
                                                onClick={() => setEditingPlan(plan)}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <p className="text-xs font-bold text-secondary-900 line-clamp-2">
                                                        {plan.agenda}
                                                    </p>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(plan.priority)}`}>
                                                        {plan.priority[0]}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(plan.completionStatus)}`}>
                                                        {plan.completionStatus.split('_')[0]}
                                                    </span>
                                                    {plan.estimatedHours && (
                                                        <span className="text-[10px] text-secondary-500 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {plan.estimatedHours}h
                                                        </span>
                                                    )}
                                                    {plan.linkedGoal && (
                                                        <LinkIcon size={10} className="text-primary-600" />
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detailed List View */}
            <div className="card-premium p-6">
                <h3 className="text-lg font-black text-secondary-900 mb-4">Detailed View</h3>
                {workPlans.length === 0 ? (
                    <div className="text-center py-8">
                        <Calendar className="mx-auto text-secondary-300" size={48} />
                        <p className="text-secondary-500 mt-2">No work plans for this week</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {workPlans.map(plan => (
                            <div key={plan.id} className="p-4 bg-secondary-50 rounded-lg border border-secondary-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-black text-secondary-900">{plan.agenda}</p>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(plan.priority)}`}>
                                                {plan.priority}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(plan.completionStatus)}`}>
                                                {plan.completionStatus.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-secondary-500">
                                            {new Date(plan.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setEditingPlan(plan)}
                                        className="p-2 hover:bg-secondary-200 rounded-lg transition-colors"
                                    >
                                        <Edit size={16} className="text-secondary-600" />
                                    </button>
                                </div>
                                {plan.strategy && (
                                    <p className="text-xs text-secondary-600 mb-2">{plan.strategy}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-secondary-500">
                                    {plan.estimatedHours && (
                                        <span>Estimated: {plan.estimatedHours}h</span>
                                    )}
                                    {plan.actualHours && (
                                        <span>Actual: {plan.actualHours}h</span>
                                    )}
                                    {plan.linkedGoal && (
                                        <span className="flex items-center gap-1 text-primary-600">
                                            <LinkIcon size={12} />
                                            Linked to: {plan.linkedGoal.title}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                <div>Create Work Plan Modal</div>
            )}
            {editingPlan && (
                <div>Edit Work Plan Modal</div>
            )}
        </div>
    );
}
