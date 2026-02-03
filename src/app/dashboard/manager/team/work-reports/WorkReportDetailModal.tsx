'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { X, MessageSquare, CheckCircle, XCircle, User, Calendar, Building, Clock } from 'lucide-react';
import { updateWorkReportStatus, addWorkReportComment } from './actions';

interface WorkReportComment {
    id: string;
    content: string;
    createdAt: Date;
    author: {
        name: string | null;
        email: string | null;
    };
}

interface WorkReport {
    id: string;
    content: string | null;
    date: Date;
    status: string;
    hoursSpent: number | null;
    tasksCompleted: number;
    companyName: string;
    employee: {
        user: {
            name: string | null;
            email: string | null;
        };
    };
    comments: WorkReportComment[];
}

interface WorkReportDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: WorkReport | null;
}

export default function WorkReportDetailModal({
    isOpen,
    onClose,
    report,
}: WorkReportDetailModalProps) {
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !report) return null;

    const handleAction = async (status: string) => {
        setLoading(true);
        try {
            const res = await updateWorkReportStatus(report.id, status, comment);
            if (res.success) {
                onClose();
                setComment('');
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!comment.trim()) return;
        setLoading(true);
        try {
            const res = await addWorkReportComment(report.id, comment);
            if (res.success) {
                setComment('');
                // Ideally refresh data here, but for now we rely on parent revalidation
            } else {
                alert('Failed to add comment');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
            case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200">
                            {report.employee.user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{report.employee.user.name}</h2>
                            <p className="text-xs text-gray-500">{report.employee.user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{format(new Date(report.date), 'EEEE, MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span>{report.companyName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{report.hoursSpent ? `${report.hoursSpent} Hours` : 'N/A'}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${getStatusColor(report.status)}`}>
                            <span className="font-semibold">{report.status}</span>
                        </div>
                    </div>

                    {/* Report Content */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Report Content</h3>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {report.content || 'No content provided.'}
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" /> Discussion
                        </h3>

                        <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {report.comments.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No comments yet.</p>
                            ) : (
                                report.comments.map((c) => (
                                    <div key={c.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-gray-700">{c.author.name}</span>
                                            <span className="text-[10px] text-gray-400">{format(new Date(c.createdAt), 'MMM d, HH:mm')}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{c.content}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Comment Input */}
                        <div className="flex gap-2">
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Add a comment or feedback..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={() => handleAction('REJECTED')}
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <button
                        onClick={() => handleAction('APPROVED')}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <CheckCircle className="h-4 w-4" /> Approve Report
                    </button>
                </div>
            </div>
        </div>
    );
}
