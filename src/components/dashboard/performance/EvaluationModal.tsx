
'use client';

import { useState } from 'react';
import { FiX, FiCheck, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Goal } from '@/types/performance';

interface EvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    goal: Goal | null;
    onSuccess: () => void;
}

export default function EvaluationModal({ isOpen, onClose, goal, onSuccess }: EvaluationModalProps) {
    const [formData, setFormData] = useState({
        score: '',
        feedback: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        if (!goal) return;
        if (e) e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/performance/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goalId: goal.id,
                    score: formData.score,
                    feedback: formData.feedback
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success('Evaluation submitted successfully');
                onSuccess();
                onClose();
            } else {
                toast.error(data.error || 'Failed to submit evaluation');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !goal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-secondary-200">
                <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                    <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest">
                        Evaluate Goal
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-secondary-400 transition-colors">
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100">
                        <h4 className="text-xs font-black text-primary-700 uppercase mb-1">{goal?.title}</h4>
                        <p className="text-xs text-primary-600 font-medium">
                            Employee: {goal?.employee?.user?.name}
                        </p>
                        <div className="mt-2 text-[10px] font-bold text-primary-800 bg-white/50 w-fit px-2 py-1 rounded">
                            {goal?.currentValue} / {goal?.targetValue} {goal?.unit} Achieved
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-secondary-400 uppercase ml-1 flex items-center gap-1">
                            <FiStar /> Score (1-10)
                        </label>
                        <input
                            required
                            type="number"
                            min="1"
                            max="10"
                            step="0.1"
                            placeholder="Rating out of 10"
                            value={formData.score}
                            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                            className="input-premium py-2.5 text-xs"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Feedback & Comments</label>
                        <textarea
                            required
                            rows={4}
                            value={formData.feedback}
                            onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                            className="input-premium py-2 text-xs"
                            placeholder="Provide constructive feedback on the goal achievement..."
                        ></textarea>
                    </div>
                </form>

                <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary text-xs p-2.5 px-6">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="btn-primary text-xs p-2.5 px-6 flex items-center gap-2"
                    >
                        {isSubmitting ? 'Submitting...' : <><FiCheck /> Submit Evaluation</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
