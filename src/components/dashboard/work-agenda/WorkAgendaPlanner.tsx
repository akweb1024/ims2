'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, CheckCircle2, AlertCircle, Eye, User, Target, Link as LinkIcon, Edit, Briefcase, CheckSquare, Zap, ChevronDown, ChevronUp, Award, TrendingUp, DollarSign } from 'lucide-react';
import CreateWorkPlanModal from './CreateWorkPlanModal';
import EditWorkPlanModal from './EditWorkPlanModal';
import { toast } from 'react-hot-toast';

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
    project?: {
        id: string;
        title: string;
    };
    task?: {
        id: string;
        title: string;
        status: string;
    };
    employee: {
        user: {
            name: string;
            email: string;
        };
    };
    visibility: string;
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
    const [kpiDefaults, setKpiDefaults] = useState<any[]>([]);
    const [kpiPanelOpen, setKpiPanelOpen] = useState(true);
    const [addingKpi, setAddingKpi] = useState<string | null>(null);
    const [kpiFiscalYear, setKpiFiscalYear] = useState<string>('');
    const [revenueTarget, setRevenueTarget] = useState<{
        monthly: number;
        yearly: number;
        actualThisMonth: number;
        achievementPct: number | null;
        month: string;
        year: number;
    } | null>(null);

    const fetchWorkPlans = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
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

            const res = await fetch(`/api/work-agenda?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWorkPlans(data);
            }
        } catch (error) {
            console.error('Error fetching work plans:', error);
        } finally {
            setLoading(false);
        }
    }, [employeeId, selectedDate]);

    // Fetch KPI defaults + revenue target from active increment
    useEffect(() => {
        const fetchKpiDefaults = async () => {
            try {
                const token = localStorage.getItem('token');
                const params = new URLSearchParams();
                if (employeeId) params.append('employeeId', employeeId);
                const res = await fetch(`/api/work-agenda/kpi-defaults?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setKpiDefaults(data.kpiTasks || []);
                    setKpiFiscalYear(data.fiscalYear || '');
                    if (data.revenueTarget && data.revenueTarget.monthly > 0) {
                        setRevenueTarget(data.revenueTarget);
                    }
                }
            } catch (error) {
                console.error('Error fetching KPI defaults:', error);
            }
        };
        fetchKpiDefaults();
    }, [employeeId]);

    // Quick-add a KPI as a work plan for the given date
    const handleAddKpiToAgenda = async (kpi: any, date: string) => {
        if (!isOwnAgenda) return;
        setAddingKpi(kpi.id + date);
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await fetch('/api/work-agenda', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    employeeId: employeeId || user.employeeId,
                    date,
                    agenda: kpi.title,
                    strategy: `KPI Task • ${kpi.points} pts${kpi.calculationType === 'SCALED' ? ' (Scaled)' : ''}`,
                    priority: 'HIGH',
                    visibility: 'MANAGER',
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed');
            }
            toast.success(`"${kpi.title}" added to agenda`);
            fetchWorkPlans();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setAddingKpi(null);
        }
    };

    useEffect(() => {
        fetchWorkPlans();
    }, [fetchWorkPlans]);

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

            {/* Revenue Target Panel */}
            {revenueTarget && revenueTarget.monthly > 0 && (
                <div className="card-premium border-l-4 border-success-400 bg-gradient-to-br from-white to-success-50/20 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-success-100 flex items-center justify-center">
                                <DollarSign size={16} className="text-success-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-secondary-900 text-sm">Revenue Target</h3>
                                <p className="text-[11px] text-secondary-500">{revenueTarget.month} {revenueTarget.year}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-secondary-400 uppercase font-bold tracking-wider">Monthly Target</p>
                            <p className="text-xl font-black text-secondary-900">₹{revenueTarget.monthly.toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-secondary-600">
                                Achieved: <span className="text-success-700">₹{revenueTarget.actualThisMonth.toLocaleString('en-IN')}</span>
                            </span>
                            <span className={`${
                                (revenueTarget.achievementPct || 0) >= 100 ? 'text-success-600' :
                                (revenueTarget.achievementPct || 0) >= 75 ? 'text-warning-600' : 'text-danger-600'
                            }`}>
                                {revenueTarget.achievementPct ?? 0}%
                            </span>
                        </div>
                        <div className="h-3 bg-secondary-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                    (revenueTarget.achievementPct || 0) >= 100 ? 'bg-success-500' :
                                    (revenueTarget.achievementPct || 0) >= 75 ? 'bg-warning-500' : 'bg-danger-500'
                                }`}
                                style={{ width: `${Math.min(100, revenueTarget.achievementPct || 0)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-secondary-400">
                            <span>₹0</span>
                            <span className="flex items-center gap-1">
                                <TrendingUp size={10} />
                                Gap: ₹{Math.max(0, revenueTarget.monthly - revenueTarget.actualThisMonth).toLocaleString('en-IN')}
                            </span>
                            <span>₹{revenueTarget.monthly.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Defaults Panel */}
            {kpiDefaults.length > 0 && (
                <div className="card-premium border-l-4 border-warning-400 bg-gradient-to-br from-white to-warning-50/20">
                    <button
                        className="w-full p-4 flex justify-between items-center"
                        onClick={() => setKpiPanelOpen(v => !v)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-warning-100 flex items-center justify-center">
                                <Award size={16} className="text-warning-600" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-secondary-900 text-sm">Daily KPI Defaults</h3>
                                <p className="text-[11px] text-secondary-500">
                                    FY{kpiFiscalYear} • {kpiDefaults.length} KPI tasks — click <Zap size={10} className="inline text-warning-500" /> to add to today&apos;s agenda
                                </p>
                            </div>
                        </div>
                        {kpiPanelOpen ? <ChevronUp size={18} className="text-secondary-500" /> : <ChevronDown size={18} className="text-secondary-500" />}
                    </button>

                    {kpiPanelOpen && (
                        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {kpiDefaults.map((kpi) => {
                                const todayKey = kpi.id + selectedDate;
                                const alreadyAdded = workPlans.some(p =>
                                    p.date.split('T')[0] === selectedDate && p.agenda === kpi.title
                                );
                                return (
                                    <div key={kpi.id} className="bg-white rounded-xl border border-secondary-100 p-3 flex items-center justify-between gap-3 hover:border-warning-300 hover:shadow-sm transition-all">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-secondary-900 truncate">{kpi.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-warning-700 bg-warning-50 px-1.5 py-0.5 rounded">
                                                    {kpi.points} pts
                                                </span>
                                                <span className="text-[10px] text-secondary-400 uppercase">{kpi.calculationType}</span>
                                            </div>
                                        </div>
                                        {isOwnAgenda && (
                                            <button
                                                title={alreadyAdded ? 'Already added today' : `Add to ${selectedDate}`}
                                                disabled={!!addingKpi || alreadyAdded}
                                                onClick={() => handleAddKpiToAgenda(kpi, selectedDate)}
                                                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                                    alreadyAdded
                                                        ? 'bg-success-50 text-success-600 cursor-default'
                                                        : addingKpi === todayKey
                                                        ? 'bg-warning-100 text-warning-600 animate-pulse'
                                                        : 'bg-warning-500 text-white hover:bg-warning-600 shadow-sm'
                                                }`}
                                            >
                                                {alreadyAdded ? <CheckCircle2 size={14} /> : addingKpi === todayKey ? <Clock size={14} /> : <Zap size={14} />}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

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
                                                    {(plan.linkedGoal || plan.project || plan.task) && (
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
                                    {plan.project && (
                                        <span className="flex items-center gap-1 text-primary-600">
                                            <Briefcase size={12} />
                                            Project: {plan.project.title}
                                        </span>
                                    )}
                                    {plan.task && (
                                        <span className="flex items-center gap-1 text-indigo-600">
                                            <CheckSquare size={12} />
                                            Task: {plan.task.title}
                                        </span>
                                    )}
                                    {plan.linkedGoal && (
                                        <span className="flex items-center gap-1 text-success-600">
                                            <LinkIcon size={12} />
                                            Goal: {plan.linkedGoal.title}
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
                <CreateWorkPlanModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={fetchWorkPlans}
                    employeeId={employeeId}
                />
            )}
            {editingPlan && (
                <EditWorkPlanModal
                    plan={editingPlan}
                    onClose={() => setEditingPlan(null)}
                    onSuccess={fetchWorkPlans}
                />
            )}
        </div>
    );
}
