import { useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import AchievementSection from '@/components/dashboard/AchievementSection';

interface StaffWorkReportsProps {
    workReports: any[];
    todayAttendance: any;
    user: any;
    onDataRefresh: () => void;
}

export default function StaffWorkReports({ workReports, todayAttendance, user, onDataRefresh }: StaffWorkReportsProps) {

    // Find today's report for the Achievement Section
    const todayReport = workReports.find(r => {
        const rd = new Date(r.date);
        const td = new Date();
        return rd.getDate() === td.getDate() && rd.getMonth() === td.getMonth() && rd.getFullYear() === td.getFullYear();
    }) || {
        revenueGenerated: 0,
        tasksCompleted: 0,
        ticketsResolved: 0,
        selfRating: 5,
        keyOutcome: "Activity in progress..."
    };

    const handleCommentSubmit = async (reportId: string, content: string, inputElement: HTMLInputElement) => {
        if (!content) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/hr/work-reports/comments', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportId, content })
            });
            if (res.ok) {
                inputElement.value = '';
                onDataRefresh();
            }
        } catch (error) {
            console.error('Failed to post comment', error);
        }
    };

    const handleEditReport = async (report: any) => {
        const newContent = prompt("Update your report content:", report.content);
        if (newContent !== null) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch('/api/hr/work-reports', {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: report.id, content: newContent })
                });
                if (res.ok) onDataRefresh();
                else alert("Failed to update");
            } catch (err) {
                console.error(err);
                alert("An error occurred");
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                {/* Todays Realtime Achievement Preview */}
                <AchievementSection report={todayReport} />

                <div className="card-premium p-8 text-center bg-gradient-to-br from-primary-50 to-white border-2 border-primary-100 border-dashed">
                    <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </div>
                    <h3 className="text-2xl font-black text-secondary-900 mb-2">Submit Daily Work Report</h3>
                    <p className="text-secondary-500 mb-6 max-w-md mx-auto">Click below to access the detailed reporting tool. Track your revenue, meetings, and daily achievements.</p>
                    {!todayAttendance?.checkIn && (
                        <p className="text-[10px] text-warning-600 font-bold uppercase mb-4 flex items-center justify-center gap-1">
                            <span>⚠️</span> Not Checked-in
                        </p>
                    )}
                    <Link href="/dashboard/staff-portal/submit-report" className="btn btn-primary px-8 py-3 text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all inline-block">
                        Open Reporting Tool
                    </Link>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
                {workReports.length === 0 ? (
                    <div className="card-premium p-12 text-center">
                        <div className="w-16 h-16 bg-secondary-50 text-secondary-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-secondary-900">No Reports Yet</h3>
                        <p className="text-secondary-500 text-sm">Your submitted work reports will appear here for review.</p>
                    </div>
                ) : workReports.map(report => (
                    <div key={report.id} className="card-premium p-6 hover:shadow-lg transition-all border-l-4 border-primary-500">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-secondary-900">{report.title}</h4>
                            <span className="text-[10px] uppercase font-bold text-secondary-400"><FormattedDate date={report.date} /></span>
                        </div>
                        <div className="bg-secondary-50/50 p-4 rounded-xl mb-4 border border-secondary-100">
                            <p className="text-secondary-600 text-sm whitespace-pre-wrap leading-relaxed">{report.content}</p>
                        </div>

                        {/* Advanced Metrics Display */}
                        <div className="bg-secondary-50 p-3 rounded-xl mb-4 text-xs space-y-2 border border-secondary-100">
                            <div className="flex justify-between">
                                <span className="text-secondary-500 font-bold uppercase">Impact Area</span>
                                <span className="font-black text-primary-700">{report.category || 'GENERAL'}</span>
                            </div>
                            {report.keyOutcome && (
                                <div className="flex justify-between">
                                    <span className="text-secondary-500 font-bold uppercase">Key Outcome</span>
                                    <span className="font-bold text-secondary-900">{report.keyOutcome}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-4 text-xs pt-2 border-t border-secondary-100">
                            <div className="flex flex-wrap gap-2">
                                <span className="text-secondary-400 font-bold">⏱️ {report.hoursSpent}h</span>
                                {report.selfRating && <span className="text-secondary-400 font-bold">⚡ {report.selfRating}/10</span>}
                                {report.revenueGenerated > 0 && <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded">₹{report.revenueGenerated.toLocaleString()}</span>}
                                {report.tasksCompleted > 0 && <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">{report.tasksCompleted} Tasks</span>}
                                {report.ticketsResolved > 0 && <span className="text-rose-600 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded">{report.ticketsResolved} Tickets</span>}
                                {report.chatsHandled > 0 && <span className="text-blue-600 font-bold text-[10px] bg-blue-50 px-2 py-0.5 rounded">{report.chatsHandled} Chats</span>}
                                {report.followUpsCompleted > 0 && <span className="text-cyan-600 font-bold text-[10px] bg-cyan-50 px-2 py-0.5 rounded">{report.followUpsCompleted} Followups</span>}
                            </div>
                            <span className={`badge ${report.status === 'APPROVED' ? 'badge-success' : 'badge-secondary'}`}>{report.status}</span>
                        </div>
                        {report.managerComment && (
                            <div className="mt-4 p-3 bg-secondary-50 rounded-lg text-xs border-l-2 border-warning-400">
                                <p className="font-bold text-secondary-500 mb-1">MANAGER COMMENT:</p>
                                <p className="text-secondary-700 italic">{report.managerComment}</p>
                            </div>
                        )}

                        {/* Comments / Clarification Thread */}
                        <div className="mt-6 space-y-3 pt-4 border-t border-secondary-50">
                            <h5 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Clarification Thread</h5>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                {report.comments?.map((comment: any) => (
                                    <div key={comment.id} className="bg-white p-3 rounded-xl border border-secondary-50 shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[10px] font-black ${comment.authorId === user?.id ? 'text-primary-600' : 'text-indigo-600'}`}>
                                                {comment.author?.email?.split('@')[0]} {comment.authorId === user?.id ? '(You)' : '(Manager)'}
                                            </span>
                                            <span className="text-[8px] font-bold text-secondary-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-[11px] text-secondary-700 leading-normal">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add clarification..."
                                    className="input text-[11px] py-1.5 flex-1"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCommentSubmit(report.id, (e.target as HTMLInputElement).value, e.target as HTMLInputElement);
                                        }
                                    }}
                                    title="Add a comment"
                                />
                            </div>
                        </div>

                        {/* Edit Option for non-evaluated reports */}
                        {report.status === 'SUBMITTED' && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => handleEditReport(report)}
                                    className="text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-tighter bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 transition-all shadow-sm"
                                    title="Edit this report"
                                >
                                    Edit Report details
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
