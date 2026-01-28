'use client';

import { useState } from 'react';
import { X, Star, Save, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useInterviewMutations } from '@/hooks/useRecruitment';

interface InterviewFeedbackModalProps {
    interview: any;
    onClose: () => void;
}

export default function InterviewFeedbackModal({ interview, onClose }: InterviewFeedbackModalProps) {
    const { updateFeedback } = useInterviewMutations();
    const [rating, setRating] = useState(0);
    const [result, setResult] = useState('PENDING'); // PENDING, PASSED, REJECTED, HOLD
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error('Please provide a rating');
            return;
        }
        if (!feedback.trim()) {
            toast.error('Please provide feedback comments');
            return;
        }

        setSubmitting(true);
        try {
            await updateFeedback.mutateAsync({
                id: interview.id,
                rating,
                result,
                feedback
            });
            toast.success('Feedback submitted successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to submit feedback');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Interview Feedback</h3>
                        <p className="text-gray-500 text-sm font-medium">Candidate: <span className="text-primary-600">{interview.application?.applicantName || 'Unknown'}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Rating */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overall Rating</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`p-2 rounded-xl transition-all ${rating >= star ? 'bg-amber-100 text-amber-500 scale-110' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'}`}
                                >
                                    <Star size={24} fill={rating >= star ? "currentColor" : "none"} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Result */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Interview Outcome</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['PASSED', 'REJECTED', 'HOLD'].map((res) => (
                                <button
                                    key={res}
                                    onClick={() => setResult(res)}
                                    className={`py-3 rounded-xl border-2 font-bold text-xs transition-all ${result === res
                                            ? res === 'PASSED' ? 'border-green-500 bg-green-50 text-green-700'
                                                : res === 'REJECTED' ? 'border-red-500 bg-red-50 text-red-700'
                                                    : 'border-orange-500 bg-orange-50 text-orange-700'
                                            : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                                        }`}
                                >
                                    {res}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Feedback */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={14} /> detailed comments
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full h-32 bg-gray-50 border-none rounded-xl p-4 font-medium focus:ring-2 focus:ring-primary-500 resize-none"
                            placeholder="Strengths, weaknesses, technical/cultural fit notes..."
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-gray-900">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitting ? 'Submitting...' : <><Save size={16} /> Submit Feedback</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
