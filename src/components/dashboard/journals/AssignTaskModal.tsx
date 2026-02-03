'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { ManuscriptStatus } from '@prisma/client';

interface AssignTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    articleId: string;
    currentStage: ManuscriptStatus;
    onAssign: (assigneeId: string, comments: string, dueDate: string) => Promise<void>;
}

export default function AssignTaskModal({ isOpen, onClose, articleId, currentStage, onAssign }: AssignTaskModalProps) {
    const [users, setUsers] = useState<{ id: string, name: string, role: string }[]>([]);
    const [assigneeId, setAssigneeId] = useState('');
    const [comments, setComments] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Fetch potential assignees (simplified: fetching all relevant staff)
            fetch('/api/users?role=staff') // Assuming this endpoint exists or similar
                .then(res => res.json())
                .then(data => setUsers(data))
                .catch(err => console.error(err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAssign(assigneeId, comments, dueDate);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">Assign Task: <span className="text-primary-600">{currentStage.replace(/_/g, ' ')}</span></h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assign To</label>
                        <select
                            required
                            className="input-premium w-full"
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                        >
                            <option value="">Select User...</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Due Date</label>
                        <input
                            type="date"
                            className="input-premium w-full"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Instructions</label>
                        <textarea
                            className="input-premium w-full h-32"
                            placeholder="Specific instructions for this task..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading || !assigneeId}
                            className="btn-primary px-6 py-2 flex items-center gap-2"
                        >
                            {loading ? 'Assigning...' : <><UserPlus size={18} /> Assign Task</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
