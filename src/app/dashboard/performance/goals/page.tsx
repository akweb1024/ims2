
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    FiTarget,
    FiPlus,
    FiCheckCircle,
    FiClock,
    FiActivity,
    FiFilter,
    FiSearch
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import GoalList from '@/components/dashboard/performance/GoalList';
import GoalModal from '@/components/dashboard/performance/GoalModal';
import EvaluationModal from '@/components/dashboard/performance/EvaluationModal';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Goal } from '@/types/performance';

export default function GoalsPage() {
    const { data: session } = useSession();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('MONTHLY');
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const user = session?.user as any;
    const userRole = user?.role;
    const isManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

    const fetchGoals = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/performance/goals?type=${activeTab}`);
            const data = await res.json();
            if (res.ok) {
                setGoals(data);
            } else {
                toast.error(data.error || 'Failed to fetch goals');
            }
        } catch (error) {
            toast.error('An error occurred while fetching goals');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (session) {
            fetchGoals();
        }
    }, [fetchGoals, session]);

    const handleCreateGoal = () => {
        setSelectedGoal(null);
        setIsGoalModalOpen(true);
    };

    const handleEditGoal = (goal: any) => {
        setSelectedGoal(goal);
        setIsGoalModalOpen(true);
    };

    const handleEvaluateGoal = (goal: any) => {
        setSelectedGoal(goal);
        setIsEvalModalOpen(true);
    };

    const filteredGoals = goals.filter(goal =>
        goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        goal.employee?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout userRole={userRole || 'EMPLOYEE'}>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
                            <FiTarget className="text-primary-600" /> Goal Management
                        </h1>
                        <p className="text-secondary-500 text-sm font-medium">Track and evaluate performance targets</p>
                    </div>
                    {isManager && (
                        <button
                            onClick={handleCreateGoal}
                            className="btn-primary flex items-center gap-2"
                        >
                            <FiPlus /> Assign New Goal
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-secondary-100 rounded-xl w-fit">
                    {['MONTHLY', 'QUARTERLY', 'YEARLY'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-secondary-500 hover:text-secondary-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search by title or employee name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-premium pl-10 h-10 text-sm"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <GoalList
                        goals={filteredGoals}
                        onEdit={handleEditGoal}
                        onEvaluate={handleEvaluateGoal}
                        isManager={isManager}
                    />
                )}

                {isGoalModalOpen && (
                    <GoalModal
                        isOpen={isGoalModalOpen}
                        onClose={() => setIsGoalModalOpen(false)}
                        goal={selectedGoal}
                        onSuccess={fetchGoals}
                        period={activeTab}
                    />
                )}

                {isEvalModalOpen && (
                    <EvaluationModal
                        isOpen={isEvalModalOpen}
                        onClose={() => setIsEvalModalOpen(false)}
                        goal={selectedGoal}
                        onSuccess={fetchGoals}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
