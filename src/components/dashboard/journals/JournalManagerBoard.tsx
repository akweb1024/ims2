'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import StageActionModal from './StageActionModal';
import AssignTaskModal from './AssignTaskModal';
import { ManuscriptStatus } from '@prisma/client';

export default function JournalManagerBoard({ initialManuscripts }: { initialManuscripts: any[] }) {
    const router = useRouter();
    const [manuscripts, setManuscripts] = useState(initialManuscripts);
    const [selectedManuscript, setSelectedManuscript] = useState<any>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const handleUpdateStatus = async (status: ManuscriptStatus, comments: string, reason: string) => {
        if (!selectedManuscript) return;

        const res = await fetch(`/api/manuscripts/${selectedManuscript.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, comments, reason })
        });

        if (res.ok) {
            router.refresh(); // Refresh server comp
            // Optimistic update locally
            setManuscripts(prev => prev.map(m => m.id === selectedManuscript.id ? { ...m, manuscriptStatus: status } : m));
        }
    };

    const handleAssignTask = async (assigneeId: string, comments: string, dueDate: string) => {
        if (!selectedManuscript) return;

        const res = await fetch(`/api/manuscripts/${selectedManuscript.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stage: selectedManuscript.manuscriptStatus,
                assigneeId,
                comments,
                dueDate
            })
        });

        if (res.ok) {
            alert('Task assigned successfully');
        }
    };

    return (
        <div>
            {/* Status & Assign Modals */}
            {selectedManuscript && (
                <>
                    <StageActionModal
                        isOpen={isStatusModalOpen}
                        onClose={() => setIsStatusModalOpen(false)}
                        currentStatus={selectedManuscript.manuscriptStatus}
                        onUpdateStatus={handleUpdateStatus}
                    />
                    <AssignTaskModal
                        isOpen={isAssignModalOpen}
                        onClose={() => setIsAssignModalOpen(false)}
                        articleId={selectedManuscript.id}
                        currentStage={selectedManuscript.manuscriptStatus}
                        onAssign={handleAssignTask}
                    />
                </>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Manuscript</th>
                            <th className="px-6 py-4">Current Stage</th>
                            <th className="px-6 py-4">Authors</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {manuscripts.map((m) => (
                            <tr key={m.id} className="hover:bg-gray-50 group transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{m.title}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">{m.manuscriptId || 'No ID'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {m.manuscriptStatus.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex -space-x-2">
                                        {m.authors.slice(0, 3).map((a: any, i: number) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-600" title={a.name}>
                                                {a.name.charAt(0)}
                                            </div>
                                        ))}
                                        {m.authors.length > 3 && (
                                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500">
                                                +{m.authors.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setSelectedManuscript(m); setIsAssignModalOpen(true); }}
                                            className="btn-secondary px-3 py-1.5 text-xs"
                                        >
                                            Assign
                                        </button>
                                        <button
                                            onClick={() => { setSelectedManuscript(m); setIsStatusModalOpen(true); }}
                                            className="btn-primary px-3 py-1.5 text-xs"
                                        >
                                            Update Stage
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
