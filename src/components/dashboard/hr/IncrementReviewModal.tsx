'use client';

import { useState } from 'react';
import { X, TrendingUp, Target, Award, Save } from 'lucide-react';

interface IncrementReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    incrementRecord: any;
}

export default function IncrementReviewModal({ isOpen, onClose, onSave, incrementRecord }: IncrementReviewModalProps) {
    const [reviewForm, setReviewForm] = useState({
        type: 'MONTHLY',
        period: '',
        revenueAchievement: 0,
        kraProgress: '',
        kpiProgress: {},
        comments: '',
        status: 'COMPLETED'
    });

    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(reviewForm);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-8 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black flex items-center gap-2">
                            <TrendingUp size={24} />
                            Performance Review
                        </h3>
                        <p className="text-primary-100 text-xs font-bold uppercase tracking-widest mt-1">
                            Linking achievements to salary increment
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label-premium">Review Type</label>
                            <select
                                className="input-premium"
                                value={reviewForm.type}
                                onChange={e => setReviewForm({ ...reviewForm, type: e.target.value })}
                            >
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Quarterly</option>
                                <option value="YEARLY">Yearly</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-premium">Review Period</label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="e.g. Jan 2024 / Q1 2024"
                                value={reviewForm.period}
                                onChange={e => setReviewForm({ ...reviewForm, period: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-secondary-100">
                        <h4 className="font-bold text-sm text-secondary-900 flex items-center gap-2 uppercase tracking-wider">
                            <Award size={16} className="text-warning-500" />
                            Targets & Achievements
                        </h4>
                        <div>
                            <label className="label-premium flex justify-between">
                                Revenue Achievement
                                <span className="text-secondary-400 font-bold">Target: ₹{(incrementRecord?.monthlyTotalTarget || 0).toLocaleString()}</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400 font-bold">₹</span>
                                <input
                                    type="number"
                                    className="input-premium pl-8"
                                    placeholder="0"
                                    value={reviewForm.revenueAchievement}
                                    onChange={e => setReviewForm({ ...reviewForm, revenueAchievement: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-secondary-100">
                        <h4 className="font-bold text-sm text-secondary-900 flex items-center gap-2 uppercase tracking-wider">
                            <Target size={16} className="text-indigo-500" />
                            KRA Progress
                        </h4>
                        <div>
                            <label className="label-premium">Detailed Updates</label>
                            <textarea
                                className="input-premium h-24"
                                placeholder="Describe progress on Key Responsibility Areas..."
                                value={reviewForm.kraProgress}
                                onChange={e => setReviewForm({ ...reviewForm, kraProgress: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-secondary-100">
                        <label className="label-premium">Overall Comments</label>
                        <textarea
                            className="input-premium h-24"
                            placeholder="General performance notes..."
                            value={reviewForm.comments}
                            onChange={e => setReviewForm({ ...reviewForm, comments: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 border-t border-secondary-100 flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary flex-1 py-4 text-sm font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                        >
                            {loading ? 'Saving...' : <><Save size={18} /> Save Review</>}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary px-8 font-bold"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
