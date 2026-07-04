'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Inbox, FileText, Flag, ShieldCheck, RefreshCw, Check, X, ExternalLink } from 'lucide-react';
import { useWorkReports, useWorkReportMutations } from '@/hooks/useHR';
import WorkReportValidator from '@/components/dashboard/hr/WorkReportValidator';
import { kraFetch } from '@/lib/kra/client';
import FormattedDate from '@/components/common/FormattedDate';

/**
 * Unified Review Inbox — everything awaiting a manager's action in one place:
 *   1. Work reports pending validation      (WorkReport status=SUBMITTED)
 *   2. KRA numbers needing review           (MetricContribution PENDING/FLAGGED)
 *   3. Goals awaiting verification          (EmployeeGoal SUBMITTED/TL_VERIFIED)
 * Reuses the existing role-scoped APIs — no new endpoints.
 */

interface Contribution {
    id: string;
    date: string;
    reportedValue: number;
    status: 'PENDING' | 'FLAGGED';
    note?: string | null;
    metric?: { name: string; unit: string | null; dataSource: string | null };
    employee?: { user?: { name: string | null } };
}

interface VerifyGoal {
    id: string;
    title: string;
    status: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    dueDate?: string | null;
    proofs?: { proofUrl?: string | null; note?: string | null }[];
    employee?: { user?: { name: string | null } };
}

type TabId = 'reports' | 'numbers' | 'goals';

export default function ReviewInboxPage() {
    const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useWorkReports({ status: 'SUBMITTED' });
    const { updateStatus, addComment } = useWorkReportMutations();

    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [goals, setGoals] = useState<VerifyGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [tab, setTab] = useState<TabId | null>(null);

    const loadQueues = useCallback(async () => {
        setLoading(true);
        try {
            const [contribRes, goalsRes] = await Promise.all([
                kraFetch<{ contributions: Contribution[] }>('/api/kra/contributions?status=PENDING,FLAGGED'),
                kraFetch<{ goals: VerifyGoal[] }>('/api/kra/verify'),
            ]);
            setContributions(contribRes.contributions || []);
            setGoals(goalsRes.goals || []);
        } catch (e: any) {
            toast.error(e.message || 'Failed to load review queues');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadQueues(); }, [loadQueues]);

    // Land on the first queue that actually has work.
    useEffect(() => {
        if (tab !== null || loading || reportsLoading) return;
        if (reports.length > 0) setTab('reports');
        else if (contributions.length > 0) setTab('numbers');
        else if (goals.length > 0) setTab('goals');
        else setTab('reports');
    }, [tab, loading, reportsLoading, reports.length, contributions.length, goals.length]);

    const handleApproveReport = async (
        id: string, approvedTaskIds: string[], rejectedTaskIds: string[],
        managerComment: string, managerRating: number, evaluation?: any, allowMandatoryOverride?: boolean
    ) => {
        await updateStatus.mutateAsync({
            id, status: 'APPROVED', approvedTaskIds, rejectedTaskIds,
            managerComment, managerRating, evaluation, allowMandatoryOverride,
        });
        toast.success('Report approved');
        refetchReports();
    };

    const handleAddComment = async (reportId: string, content: string) => {
        await addComment.mutateAsync({ reportId, content });
        toast.success('Comment added');
    };

    const reviewContribution = async (c: Contribution, action: 'APPROVE' | 'REJECT') => {
        let note: string | undefined;
        if (action === 'REJECT') {
            note = window.prompt('Reason for rejection?') || undefined;
            if (!note) return;
        }
        setBusyId(c.id);
        try {
            await kraFetch('/api/kra/contributions', {
                method: 'PATCH',
                body: JSON.stringify({ id: c.id, action, note }),
            });
            toast.success(action === 'APPROVE' ? 'Number approved' : 'Number rejected');
            setContributions((prev) => prev.filter((x) => x.id !== c.id));
        } catch (e: any) {
            toast.error(e.message || 'Review failed');
        } finally {
            setBusyId(null);
        }
    };

    const verifyGoal = async (goal: VerifyGoal, decision: 'APPROVE' | 'REJECT') => {
        const level = goal.status === 'SUBMITTED' ? 'TL' : 'MANAGER';
        let comment: string | undefined;
        if (decision === 'REJECT') {
            comment = window.prompt('Reason for rejection?') || undefined;
            if (!comment) return;
        }
        setBusyId(goal.id);
        try {
            await kraFetch('/api/kra/verify', {
                method: 'POST',
                body: JSON.stringify({ goalId: goal.id, level, decision, comment }),
            });
            toast.success(decision === 'APPROVE' ? `Goal approved (${level})` : 'Goal rejected');
            setGoals((prev) => prev.filter((g) => g.id !== goal.id));
        } catch (e: any) {
            toast.error(e.message || 'Verification failed');
        } finally {
            setBusyId(null);
        }
    };

    const tabs = useMemo(() => ([
        { id: 'reports' as TabId, label: 'Work Reports', icon: <FileText size={15} />, count: reports.length },
        { id: 'numbers' as TabId, label: 'KRA Numbers', icon: <Flag size={15} />, count: contributions.length },
        { id: 'goals' as TabId, label: 'Goal Verification', icon: <ShieldCheck size={15} />, count: goals.length },
    ]), [reports.length, contributions.length, goals.length]);

    const totalPending = reports.length + contributions.length + goals.length;
    const isLoading = loading || reportsLoading;

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-3">
                        <Inbox className="text-primary-600" /> Review Inbox
                    </h1>
                    <p className="text-secondary-500 font-medium mt-1">
                        Everything awaiting your action — daily reports, flagged numbers and goal verifications.
                    </p>
                </div>
                <button
                    onClick={() => { refetchReports(); loadQueues(); }}
                    className="p-3 bg-white border border-secondary-200 rounded-xl text-secondary-400 hover:text-primary-600 hover:border-primary-200 transition-all"
                    aria-label="Refresh queues"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </header>

            {/* Queue tabs with live counts */}
            <div className="flex flex-wrap gap-2">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                            tab === t.id
                                ? 'bg-secondary-900 text-white border-secondary-900 shadow-md'
                                : 'bg-white text-secondary-600 border-secondary-200 hover:border-secondary-300'
                        }`}
                    >
                        {t.icon} {t.label}
                        <span className={`min-w-[1.5rem] text-center px-1.5 py-0.5 rounded-full text-[11px] font-black ${
                            t.count > 0
                                ? (tab === t.id ? 'bg-white text-secondary-900' : 'bg-primary-600 text-white')
                                : (tab === t.id ? 'bg-white/20 text-white' : 'bg-secondary-100 text-secondary-400')
                        }`}>
                            {t.count}
                        </span>
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Loading your review queues…</div>
            ) : totalPending === 0 ? (
                <div className="card-premium p-16 text-center border border-secondary-100">
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-xl font-black text-secondary-900">All caught up</h2>
                    <p className="text-secondary-500 font-medium mt-1">No reports, numbers or goals are waiting for your review.</p>
                </div>
            ) : (
                <>
                    {tab === 'reports' && (
                        reports.length === 0
                            ? <QueueClear label="No work reports awaiting validation." />
                            : <WorkReportValidator reports={reports} onApprove={handleApproveReport} onAddComment={handleAddComment} />
                    )}

                    {tab === 'numbers' && (
                        contributions.length === 0
                            ? <QueueClear label="No KRA numbers need your review." />
                            : (
                                <div className="card-premium border border-secondary-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-[10px] uppercase font-black text-secondary-400 border-b border-secondary-100">
                                                    <th className="p-4">Date</th>
                                                    <th className="p-4">Employee</th>
                                                    <th className="p-4">Metric</th>
                                                    <th className="p-4 text-right">Reported</th>
                                                    <th className="p-4">Status</th>
                                                    <th className="p-4">Note</th>
                                                    <th className="p-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-secondary-50">
                                                {contributions.map((c) => (
                                                    <tr key={c.id} className="hover:bg-secondary-50/50">
                                                        <td className="p-4 whitespace-nowrap text-secondary-600"><FormattedDate date={c.date} /></td>
                                                        <td className="p-4 font-bold text-secondary-900">{c.employee?.user?.name || '—'}</td>
                                                        <td className="p-4 text-secondary-700">{c.metric?.name || '—'}</td>
                                                        <td className="p-4 text-right font-black text-secondary-900">
                                                            {c.reportedValue} <span className="text-secondary-400 font-medium">{c.metric?.unit || ''}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                                                                c.status === 'FLAGGED' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                            }`}>{c.status}</span>
                                                        </td>
                                                        <td className="p-4 text-xs text-secondary-500 max-w-[16rem]">{c.note || '—'}</td>
                                                        <td className="p-4">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => reviewContribution(c, 'APPROVE')}
                                                                    disabled={busyId === c.id}
                                                                    className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40"
                                                                    aria-label="Approve"
                                                                ><Check size={15} /></button>
                                                                <button
                                                                    onClick={() => reviewContribution(c, 'REJECT')}
                                                                    disabled={busyId === c.id}
                                                                    className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40"
                                                                    aria-label="Reject"
                                                                ><X size={15} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                    )}

                    {tab === 'goals' && (
                        goals.length === 0
                            ? <QueueClear label="No goals are awaiting verification." />
                            : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {goals.map((g) => {
                                        const latestProof = g.proofs?.[0];
                                        const level = g.status === 'SUBMITTED' ? 'TL' : 'MANAGER';
                                        return (
                                            <div key={g.id} className="card-premium p-5 border border-secondary-100 space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-black text-secondary-900">{g.title}</p>
                                                        <p className="text-xs text-secondary-500 font-bold mt-0.5">{g.employee?.user?.name || '—'}</p>
                                                    </div>
                                                    <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 whitespace-nowrap">
                                                        {level} stage
                                                    </span>
                                                </div>
                                                <p className="text-sm text-secondary-600">
                                                    <span className="font-black text-secondary-900">{g.currentValue}</span> / {g.targetValue} {g.unit}
                                                </p>
                                                {latestProof?.proofUrl && (
                                                    <a href={latestProof.proofUrl} target="_blank" rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800">
                                                        View proof <ExternalLink size={12} />
                                                    </a>
                                                )}
                                                {latestProof?.note && <p className="text-xs text-secondary-500 italic">“{latestProof.note}”</p>}
                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={() => verifyGoal(g, 'APPROVE')}
                                                        disabled={busyId === g.id}
                                                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 disabled:opacity-40"
                                                    >Approve</button>
                                                    <button
                                                        onClick={() => verifyGoal(g, 'REJECT')}
                                                        disabled={busyId === g.id}
                                                        className="flex-1 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 text-xs font-black hover:bg-rose-50 disabled:opacity-40"
                                                    >Reject</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                    )}
                </>
            )}
        </div>
    );
}

function QueueClear({ label }: { label: string }) {
    return (
        <div className="card-premium p-12 text-center border border-secondary-100 text-secondary-400 font-bold">
            {label}
        </div>
    );
}
