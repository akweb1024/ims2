'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Quote } from 'lucide-react';

interface MilestoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onSuccess: () => void;
    milestone?: {
        id: string;
        name: string;
        description: string | null;
        dueDate: string;
        paymentAmount: number | null;
        status: string;
        isPaid: boolean;
    };
}

export default function MilestoneModal({ isOpen, onClose, projectId, onSuccess, milestone }: MilestoneModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('0');
    const [status, setStatus] = useState('PENDING');
    const [isPaid, setIsPaid] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (milestone) {
            setName(milestone.name);
            setDescription(milestone.description || '');
            setDueDate(milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : '');
            setPaymentAmount(milestone.paymentAmount?.toString() || '0');
            setStatus(milestone.status);
            setIsPaid(milestone.isPaid);
        } else {
            setName('');
            setDescription('');
            setDueDate('');
            setPaymentAmount('0');
            setStatus('PENDING');
            setIsPaid(false);
        }
    }, [milestone, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = milestone
                ? `/api/it/milestones/${milestone.id}`
                : `/api/it/projects/${projectId}/milestones`;

            const method = milestone ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    dueDate,
                    paymentAmount: parseFloat(paymentAmount),
                    status,
                    isPaid: milestone ? isPaid : false
                }),
            });

            if (response.ok) {
                onSuccess();
                onClose();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save milestone');
            }
        } catch (error) {
            console.error('Error saving milestone:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all">
            <div className="card-premium w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 p-0 hover:shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-secondary-100 dark:border-secondary-800 bg-secondary-50/30">
                    <h2 className="text-xl font-black text-secondary-900 dark:text-white flex items-center gap-2">
                        <Quote className="h-5 w-5 text-primary-500" />
                        {milestone ? 'Edit Milestone' : 'Add New Milestone'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full transition-all"
                    >
                        <X className="h-5 w-5 text-secondary-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="label-premium">
                            Milestone Name
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-premium"
                            placeholder="e.g. Beta Version Release"
                        />
                    </div>

                    <div>
                        <label className="label-premium">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input-premium min-h-[100px]"
                            rows={3}
                            placeholder="Detail what this milestone covers..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="label-premium">
                                Due Date
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                                <input
                                    type="date"
                                    required
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="input-premium pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label-premium">
                                Payment Amount (₹)
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="input-premium pl-10"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="label-premium">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="input-premium"
                        >
                            <option value="PENDING">PENDING</option>
                            <option value="PLANNING">PLANNING</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="TESTING">TESTING</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="ON_HOLD">ON HOLD</option>
                        </select>
                    </div>

                    {milestone && (
                        <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-800/50">
                            <span className="text-xs font-black uppercase text-primary-700 dark:text-primary-400">Milestone Paid?</span>
                            <button
                                type="button"
                                onClick={() => setIsPaid(!isPaid)}
                                className={`w-12 h-6 rounded-full transition-all relative ${isPaid ? 'bg-success-500' : 'bg-secondary-300 dark:bg-secondary-600'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isPaid ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    )}

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary flex-1 shadow-primary-500/20"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                milestone ? 'Update Milestone' : 'Create Milestone'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
