'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Grid3x3, List, Award, Clock, DollarSign, Target, AlertCircle, MessageSquare } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

interface WorkReportValidatorProps {
    reports: any[];
    onApprove: (reportId: string, approvedTaskIds: string[], rejectedTaskIds: string[], managerComment: string, managerRating: number) => Promise<void>;
    onAddComment: (reportId: string, content: string) => Promise<void>;
}

export default function WorkReportValidator({ reports, onApprove, onAddComment }: WorkReportValidatorProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [showValidationModal, setShowValidationModal] = useState(false);

    // Validation state for selected report
    const [approvedTaskIds, setApprovedTaskIds] = useState<string[]>([]);
    const [rejectedTaskIds, setRejectedTaskIds] = useState<string[]>([]);
    const [managerComment, setManagerComment] = useState('');
    const [managerRating, setManagerRating] = useState(5);
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const openValidationModal = (report: any) => {
        setSelectedReport(report);

        // By default, all tasks are approved
        const taskIds = report.tasksSnapshot?.map((t: any) => t.id) || [];
        setApprovedTaskIds(taskIds);
        setRejectedTaskIds([]);
        setManagerComment('');
        setManagerRating(report.selfRating || 5);
        setShowValidationModal(true);
    };

    const toggleTaskApproval = (taskId: string) => {
        if (approvedTaskIds.includes(taskId)) {
            // Move to rejected
            setApprovedTaskIds(prev => prev.filter(id => id !== taskId));
            setRejectedTaskIds(prev => [...prev, taskId]);
        } else {
            // Move to approved
            setRejectedTaskIds(prev => prev.filter(id => id !== taskId));
            setApprovedTaskIds(prev => [...prev, taskId]);
        }
    };

    const approveAllTasks = () => {
        const taskIds = selectedReport?.tasksSnapshot?.map((t: any) => t.id) || [];
        setApprovedTaskIds(taskIds);
        setRejectedTaskIds([]);
    };

    const rejectAllTasks = () => {
        const taskIds = selectedReport?.tasksSnapshot?.map((t: any) => t.id) || [];
        setApprovedTaskIds([]);
        setRejectedTaskIds(taskIds);
    };

    const handleSubmitValidation = async () => {
        if (!selectedReport) return;

        setSubmitting(true);
        try {
            await onApprove(
                selectedReport.id,
                approvedTaskIds,
                rejectedTaskIds,
                managerComment,
                managerRating
            );
            setShowValidationModal(false);
            setSelectedReport(null);
        } catch (error) {
            console.error('Validation failed:', error);
            alert('Failed to submit validation');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddComment = async (reportId: string) => {
        if (!commentText.trim()) return;

        try {
            await onAddComment(reportId, commentText);
            setCommentText('');
        } catch (error) {
            console.error('Failed to add comment:', error);
        }
    };

    const calculateApprovedPoints = () => {
        if (!selectedReport?.tasksSnapshot) return 0;

        return selectedReport.tasksSnapshot
            .filter((t: any) => approvedTaskIds.includes(t.id))
            .reduce((sum: number, t: any) => sum + (t.points || 0), 0);
    };

    return (
        <div className="space-y-6">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-secondary-900">Work Report Validation</h3>
                    <p className="text-sm text-secondary-500">Review and approve employee work reports</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-secondary-600 font-medium">View:</span>
                    <div className="flex bg-secondary-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded transition-all ${viewMode === 'grid'
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-secondary-500 hover:text-secondary-700'}`}
                            title="Grid View"
                        >
                            <Grid3x3 size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded transition-all ${viewMode === 'table'
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-secondary-500 hover:text-secondary-700'}`}
                            title="Table View"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reports.map(report => (
                        <div key={report.id} className="card-premium group relative hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-2">
                                    <span className={`px-2 py-1 text-[10px] font-black rounded ${report.status === 'APPROVED' ? 'bg-success-50 text-success-700' :
                                        report.status === 'REVIEWED' ? 'bg-indigo-50 text-indigo-700' :
                                            'bg-warning-50 text-warning-700'
                                        }`}>
                                        {report.status}
                                    </span>
                                    <span className="px-2 py-1 text-[10px] font-black rounded bg-secondary-50 text-secondary-600 uppercase tracking-tighter">
                                        {report.category}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-secondary-400 uppercase">
                                    <FormattedDate date={report.date} />
                                </span>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-secondary-900 text-white rounded-xl flex items-center justify-center font-black text-sm">
                                    {(report.employee?.user?.email?.[0] || 'E').toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-secondary-900 leading-tight">
                                        {report.employee?.user?.name || report.employee?.user?.email?.split('@')[0]}
                                    </p>
                                    <p className="text-[10px] font-bold text-secondary-400 uppercase">
                                        {report.employee?.designation}
                                    </p>
                                </div>
                            </div>

                            <h4 className="font-bold text-secondary-900 mb-2">{report.title}</h4>
                            <p className="text-sm text-secondary-600 line-clamp-3 mb-4">{report.content}</p>

                            {/* Metrics */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {report.pointsEarned > 0 && (
                                    <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black border border-purple-200 flex items-center gap-1">
                                        <Award size={12} />
                                        {report.pointsEarned} Points
                                    </span>
                                )}
                                {report.hoursSpent > 0 && (
                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-200 flex items-center gap-1">
                                        <Clock size={12} />
                                        {report.hoursSpent} Hrs
                                    </span>
                                )}
                                {report.revenueGenerated > 0 && (
                                    <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black border border-amber-200 flex items-center gap-1">
                                        <DollarSign size={12} />
                                        ₹{report.revenueGenerated.toLocaleString()}
                                    </span>
                                )}
                                {report.tasksCompleted > 0 && (
                                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                                        <Target size={12} />
                                        {report.tasksCompleted} Tasks
                                    </span>
                                )}
                            </div>

                            {/* Tasks Preview */}
                            {report.tasksSnapshot && report.tasksSnapshot.length > 0 && (
                                <div className="bg-secondary-50 p-3 rounded-xl mb-4">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase mb-2">
                                        Completed Tasks ({report.tasksSnapshot.length})
                                    </p>
                                    <div className="space-y-1">
                                        {report.tasksSnapshot.slice(0, 3).map((task: any) => (
                                            <div key={task.id} className="flex items-center justify-between text-xs">
                                                <span className="text-secondary-700 font-medium truncate">{task.title}</span>
                                                <span className="text-primary-600 font-black ml-2">+{Math.floor(task.points)}pts</span>
                                            </div>
                                        ))}
                                        {report.tasksSnapshot.length > 3 && (
                                            <p className="text-[10px] text-secondary-400 italic">
                                                +{report.tasksSnapshot.length - 3} more tasks...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={() => openValidationModal(report)}
                                className="btn btn-primary w-full py-2 text-sm font-black"
                                disabled={report.status === 'APPROVED'}
                            >
                                {report.status === 'APPROVED' ? '✓ Validated' : 'Validate Report'}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Report</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Tasks</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Points</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-secondary-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-100">
                                {reports.map(report => (
                                    <tr key={report.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-secondary-900 text-white rounded-lg flex items-center justify-center font-black text-xs">
                                                    {(report.employee?.user?.email?.[0] || 'E').toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-secondary-900 text-sm">
                                                        {report.employee?.user?.name || report.employee?.user?.email?.split('@')[0]}
                                                    </p>
                                                    <p className="text-[10px] text-secondary-400">
                                                        {report.employee?.designation}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-secondary-900 text-sm">{report.title}</p>
                                            <p className="text-xs text-secondary-500 line-clamp-1">{report.content}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            <FormattedDate date={report.date} />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {report.tasksSnapshot?.length || 0} tasks
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="badge bg-purple-100 text-purple-700 font-black">
                                                {report.pointsEarned || 0} pts
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge text-xs ${report.status === 'APPROVED' ? 'bg-success-100 text-success-700' :
                                                report.status === 'REVIEWED' ? 'bg-indigo-100 text-indigo-700' :
                                                    'bg-warning-100 text-warning-700'
                                                }`}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openValidationModal(report)}
                                                className={`btn text-xs py-1 px-4 ${report.status === 'APPROVED'
                                                    ? 'bg-secondary-100 text-secondary-400 cursor-not-allowed'
                                                    : 'btn-primary'
                                                    }`}
                                                disabled={report.status === 'APPROVED'}
                                            >
                                                {report.status === 'APPROVED' ? 'Validated' : 'Validate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Validation Modal */}
            {showValidationModal && selectedReport && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-secondary-100 bg-gradient-to-r from-primary-600 to-indigo-600 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-2xl mb-1">Validate Work Report</h3>
                                    <p className="text-primary-100 text-sm">
                                        {selectedReport.employee?.user?.name || selectedReport.employee?.user?.email} • <FormattedDate date={selectedReport.date} />
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowValidationModal(false)}
                                    className="text-white/80 hover:text-white p-2"
                                    title="Close"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            {/* Report Summary */}
                            <div className="bg-secondary-50 p-4 rounded-xl">
                                <h4 className="font-bold text-secondary-900 mb-2">{selectedReport.title}</h4>
                                <p className="text-sm text-secondary-600 whitespace-pre-wrap">{selectedReport.content}</p>
                            </div>

                            {/* Tasks Validation Section */}
                            {selectedReport.tasksSnapshot && selectedReport.tasksSnapshot.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-lg text-secondary-900 flex items-center gap-2">
                                            <Target className="text-primary-600" size={20} />
                                            Task Validation ({selectedReport.tasksSnapshot.length} tasks)
                                        </h4>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={approveAllTasks}
                                                className="btn bg-success-50 text-success-700 hover:bg-success-100 text-xs py-1 px-3"
                                            >
                                                ✓ Approve All
                                            </button>
                                            <button
                                                onClick={rejectAllTasks}
                                                className="btn bg-danger-50 text-danger-700 hover:bg-danger-100 text-xs py-1 px-3"
                                            >
                                                ✗ Reject All
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {selectedReport.tasksSnapshot.map((task: any) => {
                                            const isApproved = approvedTaskIds.includes(task.id);
                                            const isRejected = rejectedTaskIds.includes(task.id);

                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={() => toggleTaskApproval(task.id)}
                                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isApproved
                                                        ? 'bg-success-50/50 border-success-500'
                                                        : isRejected
                                                            ? 'bg-danger-50/50 border-danger-500'
                                                            : 'bg-white border-secondary-200 hover:border-secondary-300'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isApproved
                                                                ? 'bg-success-500 border-success-500 text-white'
                                                                : isRejected
                                                                    ? 'bg-danger-500 border-danger-500 text-white'
                                                                    : 'border-secondary-300'
                                                                }`}>
                                                                {isApproved && <CheckCircle size={14} />}
                                                                {isRejected && <XCircle size={14} />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <h5 className="font-bold text-secondary-900">{task.title}</h5>
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        {task.calculationType === 'SCALED' ? (
                                                                            <>
                                                                                <span className="badge bg-purple-100 text-purple-700 text-[10px]">
                                                                                    {task.quantity} units
                                                                                </span>
                                                                                <span className="text-xs font-black text-primary-600">
                                                                                    +{Math.floor(task.points)} pts
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <span className="badge bg-indigo-100 text-indigo-700 text-[10px]">
                                                                                {task.points} pts
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {task.validationMessage && (
                                                                    <p className="text-xs text-secondary-500 mt-1 italic">
                                                                        {task.validationMessage}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Points Summary */}
                                    <div className="bg-primary-50 p-4 rounded-xl border border-primary-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-primary-600 uppercase">Approved Points</p>
                                                <p className="text-2xl font-black text-primary-700">{Math.floor(calculateApprovedPoints())} pts</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-primary-600">
                                                    {approvedTaskIds.length} approved • {rejectedTaskIds.length} rejected
                                                </p>
                                                <p className="text-xs text-primary-500">
                                                    of {selectedReport.tasksSnapshot.length} total tasks
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Manager Feedback */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-lg text-secondary-900">Manager Feedback</h4>

                                <div>
                                    <label className="label">Rating (1-10)</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={managerRating}
                                        onChange={e => setManagerRating(parseInt(e.target.value))}
                                        className="w-full"
                                        title="Manager Rating Scale"
                                    />
                                    <div className="flex justify-between text-xs text-secondary-500 mt-1">
                                        <span>Poor</span>
                                        <span className="text-2xl font-black text-primary-600">{managerRating}/10</span>
                                        <span>Excellent</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Comments</label>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        placeholder="Add your feedback..."
                                        value={managerComment}
                                        onChange={e => setManagerComment(e.target.value)}
                                        title="Manager Feedback Comments"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-secondary-100 bg-secondary-50 flex gap-3">
                            <button
                                onClick={handleSubmitValidation}
                                disabled={submitting}
                                className="btn btn-primary flex-1 py-3 font-black"
                            >
                                {submitting ? 'Submitting...' : '✓ Approve & Submit Validation'}
                            </button>
                            <button
                                onClick={() => setShowValidationModal(false)}
                                className="btn btn-secondary px-8 py-3"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
