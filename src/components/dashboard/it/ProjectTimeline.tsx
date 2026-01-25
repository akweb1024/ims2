'use client';

import { useMemo } from 'react';
import { Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface Milestone {
    id: string;
    name: string;
    dueDate: string;
    status: string;
    completedAt: string | null;
}

interface Task {
    id: string;
    taskCode: string;
    title: string;
    status: string;
    dueDate?: string | null;
    startDate?: string | null;
}

interface ProjectTimelineProps {
    startDate: string | null;
    endDate: string | null;
    milestones: Milestone[];
    tasks: Task[];
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'COMPLETED':
            return '#10b981'; // green
        case 'IN_PROGRESS':
            return '#3b82f6'; // blue
        case 'PENDING':
        case 'PLANNING':
            return '#8b5cf6'; // purple
        case 'ON_HOLD':
            return '#f59e0b'; // amber
        default:
            return '#6b7280'; // gray
    }
};

export default function ProjectTimeline({ startDate, endDate, milestones, tasks }: ProjectTimelineProps) {
    const timelineData = useMemo(() => {
        if (!startDate || !endDate) return null;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate position for each milestone
        const milestonePositions = milestones.map(m => {
            const mDate = new Date(m.dueDate);
            const daysSinceStart = Math.ceil((mDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const position = (daysSinceStart / totalDays) * 100;
            return { ...m, position: Math.max(0, Math.min(100, position)) };
        });

        // Calculate position for tasks with dates
        const taskPositions = tasks
            .filter(t => t.dueDate || t.startDate)
            .map(t => {
                const taskStart = t.startDate ? new Date(t.startDate) : start;
                const taskEnd = t.dueDate ? new Date(t.dueDate) : end;

                const startDays = Math.ceil((taskStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const endDays = Math.ceil((taskEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

                const startPos = (startDays / totalDays) * 100;
                const endPos = (endDays / totalDays) * 100;

                return {
                    ...t,
                    startPosition: Math.max(0, Math.min(100, startPos)),
                    endPosition: Math.max(0, Math.min(100, endPos)),
                    width: Math.max(2, endPos - startPos)
                };
            });

        return {
            start,
            end,
            totalDays,
            milestonePositions,
            taskPositions
        };
    }, [startDate, endDate, milestones, tasks]);

    if (!timelineData) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                    Set project start and end dates to view timeline
                </p>
            </div>
        );
    }

    const { start, end, totalDays, milestonePositions, taskPositions } = timelineData;
    const today = new Date();
    const todayPosition = ((today.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
    const isToday = todayPosition >= 0 && todayPosition <= 100;

    // Generate month markers
    const monthMarkers = [];
    const current = new Date(start);
    while (current <= end) {
        const daysSinceStart = Math.ceil((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const position = (daysSinceStart / totalDays) * 100;
        monthMarkers.push({
            date: new Date(current),
            position: Math.max(0, Math.min(100, position))
        });
        current.setMonth(current.getMonth() + 1);
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Project Timeline
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {totalDays} days • {start.toLocaleDateString()} - {end.toLocaleDateString()}
                </div>
            </div>

            {/* Timeline SVG */}
            <div className="relative">
                {/* Month markers */}
                <div className="flex justify-between mb-2 text-xs text-gray-500 dark:text-gray-400">
                    {monthMarkers.map((marker, i) => (
                        <div key={i} style={{ position: 'absolute', left: `${marker.position}%` }}>
                            {marker.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                        </div>
                    ))}
                </div>

                {/* Main timeline bar */}
                <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-8">
                    {/* Progress indicator (if today is within range) */}
                    {isToday && (
                        <div
                            className="absolute top-0 left-0 h-full bg-blue-500/30"
                            style={{ width: `${todayPosition}%` }}
                        />
                    )}

                    {/* Today marker */}
                    {isToday && (
                        <div
                            className="absolute top-0 h-full w-0.5 bg-red-500"
                            style={{ left: `${todayPosition}%` }}
                        >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-red-500 whitespace-nowrap">
                                Today
                            </div>
                        </div>
                    )}
                </div>

                {/* Milestones */}
                <div className="relative mt-8 space-y-3">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Milestones</h4>
                    {milestonePositions.map((milestone, idx) => (
                        <div key={milestone.id} className="relative">
                            <div
                                className="absolute top-0"
                                style={{ left: `${milestone.position}%`, transform: 'translateX(-50%)' }}
                            >
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-4 h-4 rounded-full border-4 border-white dark:border-gray-800 shadow-lg`}
                                        style={{ backgroundColor: getStatusColor(milestone.status) }}
                                    />
                                    <div className="mt-2 bg-white dark:bg-gray-700 rounded-lg shadow-md p-2 min-w-[120px] text-center border border-gray-200 dark:border-gray-600">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                            {milestone.name}
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                            {new Date(milestone.dueDate).toLocaleDateString()}
                                        </p>
                                        {milestone.status === 'COMPLETED' && milestone.completedAt && (
                                            <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mt-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                <span className="text-[10px]">Done</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tasks */}
                {taskPositions.length > 0 && (
                    <div className="relative mt-24 space-y-2">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Tasks</h4>
                        <div className="relative h-auto min-h-[100px]">
                            {taskPositions.map((task, idx) => (
                                <div
                                    key={task.id}
                                    className="absolute h-6 rounded-md shadow-sm flex items-center px-2 text-white text-xs font-medium cursor-pointer hover:shadow-lg transition-shadow"
                                    style={{
                                        left: `${task.startPosition}%`,
                                        width: `${task.width}%`,
                                        top: `${(idx % 3) * 32}px`,
                                        backgroundColor: getStatusColor(task.status),
                                        minWidth: '60px'
                                    }}
                                    title={`${task.taskCode}: ${task.title}`}
                                >
                                    <span className="truncate">{task.taskCode}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">Completed</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">In Progress</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-gray-600 dark:text-gray-400">Planning</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-gray-600 dark:text-gray-400">On Hold</span>
                </div>
            </div>
        </div>
    );
}
