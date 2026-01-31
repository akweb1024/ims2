
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Goal {
    id: string;
    title: string;
    targetValue: number;
    currentValue: number;
    unit: string;
}

interface KPI {
    id: string;
    title: string;
    target: number;
    unit: string;
}

interface PerformanceEvaluationFormProps {
    employeeId: string;
    employeeName: string;
    period: string; // e.g., "JAN-2025"
    periodType: 'MONTHLY' | 'QUARTERLY';
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function PerformanceEvaluationForm({
    employeeId,
    employeeName,
    period,
    periodType,
    initialData,
    onSuccess,
    onCancel
}: PerformanceEvaluationFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [kpis, setKpis] = useState<KPI[]>([]);

    // Scores state: { [itemId]: score/value }
    const [scores, setScores] = useState<Record<string, number>>({});
    const [rating, setRating] = useState<number>(0);
    const [feedback, setFeedback] = useState('');
    const [status, setStatus] = useState('DRAFT');

    useEffect(() => {
        // initialize from initialData if present
        if (initialData) {
            setScores(initialData.scores || {});
            setFeedback(initialData.feedback || '');
            setRating(initialData.rating || 0);
            setStatus(initialData.status || 'DRAFT');
        }
    }, [initialData]);

    useEffect(() => {
        async function fetchData() {
            // TODO: Replace with actual API calls to fetch Employee Goals/KPIs
            // For now, we'll try to fetch from a hypothetical endpoint or mock it effectively
            // Since we don't have a direct "get active goals" API validated in this session,
            // I will assume we might need to create one or pass it in. 
            // For this step, I'll fetch from the generic employee details endpoint if available, 
            // or just fetch all goals for the employee.

            try {
                // Re-using the employee details fetch or a specific goals endpoint
                const res = await fetch(`/api/hr/employees/${employeeId}/goals`);
                if (res.ok) {
                    const data = await res.json();
                    setGoals(data.goals || []);
                    setKpis(data.kpis || []);
                }
            } catch (err) {
                console.error('Failed to fetch goals', err);
            }
        }
        fetchData();
    }, [employeeId]);

    const handleSubmit = async (submitStatus: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/hr/performance/evaluation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId,
                    period,
                    periodType,
                    scores,
                    feedback,
                    rating,
                    status: submitStatus
                })
            });

            if (!res.ok) throw new Error('Failed to save evaluation');

            router.refresh();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            alert('Error saving evaluation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-100">
            <h3 className="text-lg font-bold text-secondary-900 mb-4">
                Evaluate {employeeName} - <span className="text-primary-600">{period}</span>
            </h3>

            <div className="space-y-6">
                {/* Goals Section */}
                <div>
                    <h4 className="text-sm font-semibold text-secondary-700 mb-3 uppercase tracking-wider">Goals & Targets</h4>
                    {goals.length === 0 && <p className="text-sm text-secondary-400 italic">No active goals found for this period.</p>}
                    <div className="space-y-3">
                        {goals.map(goal => (
                            <div key={goal.id} className="flex items-center justify-between bg-secondary-50 p-3 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-secondary-900">{goal.title}</p>
                                    <p className="text-xs text-secondary-500">Target: {goal.targetValue} {goal.unit}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-secondary-500">Achieved:</span>
                                    <input
                                        type="number"
                                        className="w-24 px-2 py-1 rounded border border-secondary-200 text-sm"
                                        value={scores[goal.id] || ''}
                                        onChange={(e) => setScores(prev => ({ ...prev, [goal.id]: parseFloat(e.target.value) }))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Qualitative Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Overall Rating (1-10)</label>
                        <input
                            type="number"
                            min="0" max="10"
                            className="w-full px-4 py-2 rounded-xl border border-secondary-200 outline-none focus:ring-2 focus:ring-primary-500"
                            value={rating}
                            onChange={(e) => setRating(parseFloat(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
                        <select
                            className="w-full px-4 py-2 rounded-xl border border-secondary-200 outline-none focus:ring-2 focus:ring-primary-500"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            disabled // controlled by buttons
                        >
                            <option value="DRAFT">Draft</option>
                            <option value="SUBMITTED">Submitted</option>
                            <option value="APPROVED">Approved</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Management Feedback</label>
                    <textarea
                        rows={4}
                        className="w-full px-4 py-2 rounded-xl border border-secondary-200 outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter comprehensive feedback..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                    ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleSubmit('DRAFT')}
                        disabled={loading}
                        className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={() => handleSubmit('SUBMITTED')}
                        disabled={loading}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-all"
                    >
                        {loading ? 'Submitting...' : 'Submit Evaluation'}
                    </button>
                </div>
            </div>
        </div>
    );
}
