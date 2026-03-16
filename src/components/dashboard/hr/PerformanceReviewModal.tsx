'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface PerformanceReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export default function PerformanceReviewModal({ isOpen, onClose, onSave }: PerformanceReviewModalProps) {
    const [reviewForm, setReviewForm] = useState({ rating: 0, feedback: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(reviewForm);
        setReviewForm({ rating: 0, feedback: '' }); // Reset after save
    };

    if (!isOpen) return null;

    return (

        (typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                <div className="bg-warning-50 p-6 border-b border-warning-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-warning-900">Performance Review</h3>
                    <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="label-premium bg-warning-50 text-warning-800 px-2 py-1 rounded inline-block mb-2">Rating</label>
                        <div className="flex gap-4">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    type="button"
                                    key={star}
                                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                    className={`text-3xl transition-transform hover:scale-110 ${star <= reviewForm.rating ? 'text-warning-500' : 'text-secondary-200'}`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="label-premium">Feedback & Comments</label>
                        <textarea
                            required
                            className="input-premium h-32"
                            placeholder="Detailed feedback about the employee's performance..."
                            value={reviewForm.feedback}
                            onChange={e => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                        />
                    </div>
                    <div className="pt-4 flex gap-4">
                        <button type="submit" className="btn bg-warning-500 hover:bg-warning-600 text-white flex-1 py-4 text-sm font-black uppercase tracking-widest shadow-lg">Submit Review</button>
                        <button type="button" onClick={onClose} className="btn btn-secondary px-8">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    ,

        document.body

        ) : null)

    );
}
