'use client';

import { useState, useCallback, useEffect } from 'react';
import { Calendar, Loader2, CheckCircle2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { releaseState, type ReleaseState } from '@/lib/publication/workload';

interface Issue {
    id: string;
    issueNumber: number;
    month: string | null;
    title: string | null;
    status: string;
    isComplete: boolean;
    plannedReleaseAt: string | null;
    expectedManuscripts: number;
    volume: { volumeNumber: number; year: number };
    readyArticles: number;
    _count: { articles: number };
}

const RISK_PILL: Record<ReleaseState, string> = {
    ON_TIME: 'bg-success-50 text-success-700',
    AT_RISK: 'bg-warning-50 text-warning-700',
    OVERDUE: 'bg-danger-50 text-danger-600',
};

const toDateInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

// Completion for the risk pill: production-ready (galley/published) articles vs
// expected — the same basis the workload view uses.
function riskFor(issue: Issue, draft: string): { state: ReleaseState; days: number | null } {
    const completion = issue.expectedManuscripts > 0
        ? Math.round((issue.readyArticles / issue.expectedManuscripts) * 100)
        : (issue.isComplete ? 100 : 0);
    const r = releaseState({
        plannedReleaseAt: draft || null,
        completion,
        isComplete: issue.isComplete,
        status: issue.status,
        now: new Date(),
    });
    return { state: r.releaseState, days: r.daysToRelease };
}

export default function IssuesReleasePanel({ journals }: { journals: any[] }) {
    const [journalId, setJournalId] = useState<string>(journals[0]?.id ?? '');
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(false);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    const load = useCallback(async (jid: string) => {
        if (!jid) { setIssues([]); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/production/issues?journalId=${jid}`);
            if (!res.ok) throw new Error('Failed to load issues');
            const data: Issue[] = await res.json();
            setIssues(data);
            setDrafts(Object.fromEntries(data.map((i) => [i.id, toDateInput(i.plannedReleaseAt)])));
        } catch (e: any) {
            toast.error(e.message || 'Could not load issues');
            setIssues([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(journalId); }, [journalId, load]);

    const save = async (issue: Issue) => {
        const value = drafts[issue.id] ?? '';
        setSavingId(issue.id);
        try {
            const res = await fetch(`/api/production/issues/${issue.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plannedReleaseAt: value || null }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Save failed (${res.status})`);
            }
            const updated = await res.json();
            setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, plannedReleaseAt: updated.plannedReleaseAt } : i)));
            toast.success(value ? 'Release date set' : 'Release date cleared');
        } catch (e: any) {
            toast.error(e.message || 'Could not save');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-xl font-black text-secondary-900">Issue Release Schedule</h3>
                    <p className="text-secondary-500 text-sm font-medium">Set a planned release date per issue to drive on-time / at-risk / overdue tracking.</p>
                </div>
                <select
                    value={journalId}
                    onChange={(e) => setJournalId(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-secondary-200 bg-white font-bold text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    {journals.length === 0 && <option value="">No journals</option>}
                    {journals.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-secondary-400">
                    <Loader2 className="animate-spin mr-2" size={18} /> Loading issues…
                </div>
            ) : issues.length === 0 ? (
                <div className="card-premium p-12 text-center text-secondary-400">
                    <BookOpen className="mx-auto mb-3 opacity-40" size={28} />
                    <p className="font-bold text-secondary-500">No issues for this journal yet.</p>
                </div>
            ) : (
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-secondary-400 border-b border-secondary-100">
                                    <th className="px-5 py-3">Issue</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Articles</th>
                                    <th className="px-5 py-3">Planned release</th>
                                    <th className="px-5 py-3">Risk</th>
                                    <th className="px-5 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {issues.map((issue) => {
                                    const draft = drafts[issue.id] ?? '';
                                    const dirty = draft !== toDateInput(issue.plannedReleaseAt);
                                    const risk = riskFor(issue, draft);
                                    return (
                                        <tr key={issue.id} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/40">
                                            <td className="px-5 py-3">
                                                <p className="font-black text-secondary-900">Vol {issue.volume.volumeNumber} · Issue {issue.issueNumber}</p>
                                                <p className="text-[11px] text-secondary-400">{issue.month || issue.volume.year}{issue.title ? ` · ${issue.title}` : ''}</p>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md bg-secondary-100 text-secondary-600">
                                                    {issue.status.replace('_', ' ').toLowerCase()}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <p className="tabular-nums text-secondary-600 font-bold">
                                                    {issue.readyArticles}/{issue.expectedManuscripts || '—'} <span className="text-[10px] font-black uppercase text-secondary-400">ready</span>
                                                </p>
                                                <p className="text-[11px] text-secondary-400 tabular-nums">{issue._count.articles} total</p>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={15} className="text-secondary-400" />
                                                    <input
                                                        type="date"
                                                        value={draft}
                                                        onChange={(e) => setDrafts((d) => ({ ...d, [issue.id]: e.target.value }))}
                                                        className="px-2.5 py-1.5 rounded-lg border border-secondary-200 bg-white text-secondary-700 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full ${RISK_PILL[risk.state]}`}>
                                                    {risk.state.replace('_', ' ').toLowerCase()}
                                                    {risk.state === 'OVERDUE' && risk.days != null ? ` ${Math.abs(risk.days)}d` : ''}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => save(issue)}
                                                    disabled={!dirty || savingId === issue.id}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary-600 text-white hover:bg-primary-700"
                                                >
                                                    {savingId === issue.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                    Save
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
