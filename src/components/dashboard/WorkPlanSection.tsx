'use client';

import { useState } from 'react';
import { Target } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import { formatToISTTime } from '@/lib/date-utils';

interface WorkPlanSectionProps {
    plans: any[];
    onPlanSubmitted: () => void;
    user: any;
}

export default function WorkPlanSection({ plans, onPlanSubmitted, user }: WorkPlanSectionProps) {
    const [submitting, setSubmitting] = useState(false);
    const [commenting, setCommenting] = useState<string | null>(null);

    const handlePlanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const payload = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/work-plans', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Work Plan shared successfully!');
                (e.target as HTMLFormElement).reset();
                onPlanSubmitted();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleComment = async (planId: string, content: string) => {
        if (!content.trim()) return;
        setCommenting(planId);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/work-plans/comments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ workPlanId: planId, content })
            });

            if (res.ok) {
                onPlanSubmitted();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCommenting(null);
        }
    };

    // Pre-calculate tomorrow's date for defaults
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                {/* JD & KRA Reference */}
                {user?.employeeProfile && (
                    <div className="card-premium p-6 mb-6 bg-secondary-900 text-white border-0">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span>📋</span> Your KRA & JD
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Current Role</p>
                                <p className="text-sm font-bold">{user.employeeProfile.designation || 'Staff Member'}</p>
                            </div>
                            {user.employeeProfile.kra && (
                                <div>
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Key Responsibility Areas</p>
                                    <ul className="text-xs space-y-1 text-secondary-200 list-disc pl-4">
                                        {user.employeeProfile.kra.split('\n').map((k: string, i: number) => (
                                            <li key={i}>{k}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="card-premium p-6">
                    <h3 className="text-xl font-bold text-secondary-900 mb-6">Plan Tomorrow</h3>
                    <form onSubmit={handlePlanSubmit} className="space-y-4">
                        <div>
                            <label className="label">Target Date</label>
                            <input type="date" name="date" defaultValue={tomorrowStr} className="input" required />
                        </div>
                        <div>
                            <label className="label">Next Day Work Agenda</label>
                            <textarea
                                name="agenda"
                                className="input min-h-[120px]"
                                placeholder="What are your primary objectives for tomorrow?"
                                required
                            ></textarea>
                        </div>
                        <div>
                            <label className="label">Strategy & Approach</label>
                            <textarea
                                name="strategy"
                                className="input min-h-[80px]"
                                placeholder="How do you plan to achieve these goals?"
                            ></textarea>
                        </div>
                        <button disabled={submitting} type="submit" className="btn btn-primary w-full py-4 mt-4 font-bold rounded-2xl">
                            {submitting ? 'Sharing...' : '🚀 Share Work Plan'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <h3 className="text-xl font-bold text-secondary-900">Work Plans Feed</h3>
                {plans.length === 0 ? (
                    <div className="card-premium p-12 text-center text-secondary-500 italic">
                        No work plans shared yet. Be the first to start the day with a strategy!
                    </div>
                ) : (
                    plans.map(plan => (
                        <div key={plan.id} className="card-premium p-6 hover:border-primary-200 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-black text-primary-600">
                                        {plan.employee.user.name?.[0].toUpperCase() || plan.employee.user.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-secondary-900">{plan.employee.user.name || plan.employee.user.email}</h4>
                                        <p className="text-xs text-secondary-500">Plan for <FormattedDate date={plan.date} /></p>
                                    </div>
                                </div>
                                <span className="badge badge-success">{plan.status}</span>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-amber-50 p-4 rounded-xl border-l-4 border-amber-400 shadow-sm relative overflow-hidden">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Target size={12} /> Agenda
                                    </p>
                                    <p className="text-sm font-medium text-secondary-900 whitespace-pre-wrap leading-relaxed">{plan.agenda}</p>
                                </div>
                                {plan.strategy && (
                                    <div className="bg-primary-50/50 p-4 rounded-2xl border border-primary-50">
                                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1">Strategy</p>
                                        <p className="text-sm text-secondary-800 whitespace-pre-wrap">{plan.strategy}</p>
                                    </div>
                                )}
                            </div>

                            {/* Comments Section */}
                            <div className="border-t border-secondary-100 pt-6 mt-6">
                                <h5 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-4">Communication & Feedback</h5>
                                <div className="space-y-4 mb-4">
                                    {plan.comments?.map((comment: any) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center text-[10px] font-bold text-secondary-600 shrink-0">
                                                {comment.user.name?.[0].toUpperCase() || comment.user.email[0].toUpperCase()}
                                            </div>
                                            <div className="bg-secondary-50 p-3 rounded-2xl flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-bold text-secondary-900">{comment.user.name || comment.user.email}</span>
                                                    <span className="text-[8px] text-secondary-400">{formatToISTTime(comment.createdAt)}</span>
                                                </div>
                                                <p className="text-xs text-secondary-700">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        id={`comment-${plan.id}`}
                                        className="input text-xs py-2"
                                        placeholder="Add a reply or give feedback..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleComment(plan.id, e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                    />
                                    <button
                                        disabled={commenting === plan.id}
                                        onClick={() => {
                                            const input = document.getElementById(`comment-${plan.id}`) as HTMLInputElement;
                                            handleComment(plan.id, input.value);
                                            input.value = '';
                                        }}
                                        className="btn btn-primary px-4 text-xs font-bold"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
