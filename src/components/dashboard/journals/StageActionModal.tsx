'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { ManuscriptStatus } from '@prisma/client';

interface StageActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStatus: ManuscriptStatus;
    onUpdateStatus: (status: ManuscriptStatus, comments: string, reason: string) => Promise<void>;
}

const NEXT_STAGES: Record<string, ManuscriptStatus[]> = {
    'SUBMITTED': ['INITIAL_REVIEW', 'REJECTED'],
    'INITIAL_REVIEW': ['PLAGIARISM_CHECK', 'REVISION_REQUIRED', 'REJECTED'],
    'PLAGIARISM_CHECK': ['UNDER_REVIEW', 'REVISION_REQUIRED', 'REJECTED'],
    'UNDER_REVIEW': ['QUALITY_CHECK', 'REVISION_REQUIRED', 'REJECTED'],
    'QUALITY_CHECK': ['COPYRIGHT_CHECK', 'REVISION_REQUIRED', 'REJECTED'],
    'COPYRIGHT_CHECK': ['FORMATTING', 'REVISION_REQUIRED'],
    'FORMATTING': ['GALLEY_PROOF', 'REVISION_REQUIRED'],
    'GALLEY_PROOF': ['ACCEPTED', 'REVISION_REQUIRED'],
    'ACCEPTED': ['PUBLISHED'],
    'REVISION_REQUIRED': ['REVISED_SUBMITTED', 'WITHDRAWN'],
    'REVISED_SUBMITTED': ['UNDER_REVIEW', 'INITIAL_REVIEW']
};

export default function StageActionModal({ isOpen, onClose, currentStatus, onUpdateStatus }: StageActionModalProps) {
    const [selectedStatus, setSelectedStatus] = useState<ManuscriptStatus | ''>('');
    const [comments, setComments] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStatus) return;

        setLoading(true);
        try {
            await onUpdateStatus(selectedStatus, comments, reason);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const allowedNextStages = NEXT_STAGES[currentStatus] || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">Update Stage</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Next Stage</label>
                        <select
                            required
                            className="input-premium w-full"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as ManuscriptStatus)}
                        >
                            <option value="">Select Action...</option>
                            {allowedNextStages.map(status => (
                                <option key={status} value={status}>
                                    {status.replace(/_/g, ' ')}
                                </option>
                            ))}
                            {/* Allow explicit jump to specific terminal states if not already included */}
                            {!allowedNextStages.includes('REJECTED') && (
                                <option value="REJECTED" className="text-red-600">REJECT</option>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Action / Reason</label>
                        <input
                            required
                            className="input-premium w-full"
                            placeholder="e.g. Moved to formatting review"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Comments (Internal)</label>
                        <textarea
                            className="input-premium w-full h-32"
                            placeholder="Add detailed notes for history..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading || !selectedStatus}
                            className="btn-primary px-6 py-2 flex items-center gap-2"
                        >
                            {loading ? 'Updating...' : <><Check size={18} /> Update Status</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
