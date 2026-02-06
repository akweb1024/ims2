import { FiEdit2, FiCheckCircle, FiActivity, FiUser, FiTarget } from 'react-icons/fi';
import { Goal } from '@/types/performance';

interface GoalListProps {
    goals: Goal[];
    onEdit: (goal: Goal) => void;
    onEvaluate: (goal: Goal) => void;
    isManager: boolean;
}

export default function GoalList({ goals, onEdit, onEvaluate, isManager }: GoalListProps) {
    if (goals.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-secondary-200 p-12 text-center">
                <FiTarget className="mx-auto h-12 w-12 text-secondary-300 mb-4" />
                <h3 className="text-lg font-bold text-secondary-900">No goals found</h3>
                <p className="text-secondary-500 max-w-xs mx-auto text-sm">Assign targets or set self-goals to get started.</p>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-success-50 text-success-700 border-success-100';
            case 'REVIEWED': return 'bg-primary-50 text-primary-700 border-primary-100';
            case 'IN_PROGRESS': return 'bg-warning-50 text-warning-700 border-warning-100';
            default: return 'bg-secondary-50 text-secondary-700 border-secondary-100';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {goals.map((goal) => (
                <div key={goal.id} className="bg-white rounded-2xl border border-secondary-200 p-5 hover:shadow-xl transition-all group flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between mb-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(goal.status)}`}>
                                {goal.status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                                {goal.type}
                            </span>
                        </div>

                        <h3 className="font-bold text-secondary-900 mb-1 group-hover:text-primary-600 transition-colors">
                            {goal.title}
                        </h3>
                        {goal.employee?.user?.name && (
                            <div className="flex items-center gap-2 text-xs text-secondary-500 mb-3">
                                <FiUser className="text-secondary-400" /> {goal.employee.user.name}
                            </div>
                        )}
                        <p className="text-xs text-secondary-600 line-clamp-2 mb-4">
                            {goal.description || 'No description provided.'}
                        </p>

                        {/* Progress */}
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-secondary-500">Progress</span>
                                <span className="text-primary-600">{goal.achievementPercentage?.toFixed(1) || 0}%</span>
                            </div>
                            <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 transition-all duration-500 rounded-full"
                                    style={{ width: `${Math.min(goal.achievementPercentage || 0, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-secondary-900">{goal.currentValue} {goal.unit}</span>
                                <span className="text-secondary-400">Target: {goal.targetValue} {goal.unit}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-secondary-100">
                        {isManager ? (
                            <>
                                <button
                                    onClick={() => onEdit(goal)}
                                    className="flex-1 py-2 px-3 rounded-lg bg-secondary-50 text-secondary-700 text-xs font-bold hover:bg-secondary-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FiEdit2 /> Edit
                                </button>
                                {goal.status === 'COMPLETED' && (
                                    <button
                                        onClick={() => onEvaluate(goal)}
                                        className="flex-1 py-2 px-3 rounded-lg bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FiCheckCircle /> Evaluate
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={() => onEdit(goal)}
                                className="w-full py-2 px-3 rounded-lg bg-primary-50 text-primary-700 text-xs font-bold hover:bg-primary-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <FiActivity /> Update Progress
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
