'use client';

import { useCallback, useEffect, useState } from 'react';

type Review = any;

const HR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'];

const STATUS_BADGE: Record<string, string> = {
    PENDING: 'bg-warning-50 text-warning-700',
    RECOMMENDED: 'bg-primary-50 text-primary-700',
    CONFIRMED: 'bg-success-50 text-success-700',
    EXTENDED: 'bg-secondary-100 text-secondary-700',
    REJECTED: 'bg-danger-50 text-danger-700',
};

const FILTERS = ['OPEN', 'PENDING', 'RECOMMENDED', 'ALL'] as const;

function fmtDate(d?: string | null) {
    return d ? new Date(d).toLocaleDateString() : '—';
}

export default function ProbationConfirmations() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>('OPEN');
    const [userRole, setUserRole] = useState('');
    const [busyId, setBusyId] = useState('');

    const canDecide = HR_ROLES.includes(userRole);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const statusParam = filter === 'ALL' || filter === 'OPEN' ? '' : `?status=${filter}`;
            const res = await fetch(`/api/hr/confirmations${statusParam}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = res.ok ? await res.json() : [];
            let rows: Review[] = Array.isArray(data) ? data : [];
            // "Open" = still awaiting a decision.
            if (filter === 'OPEN') rows = rows.filter((r) => ['PENDING', 'RECOMMENDED'].includes(r.status));
            setReviews(rows);
        } catch {
            setReviews([]);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (u) { try { setUserRole(JSON.parse(u)?.role || ''); } catch { /* ignore */ } }
    }, []);

    useEffect(() => { load(); }, [load]);

    const patch = async (id: string, payload: any) => {
        setBusyId(id);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const res = await fetch(`/api/hr/confirmations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message || data?.error || 'Action failed');
            await load();
        } catch (e: any) {
            alert(e?.message || 'Action failed');
        } finally {
            setBusyId('');
        }
    };

    const recommend = (id: string, recommendation: 'CONFIRM' | 'EXTEND' | 'TERMINATE') => {
        const note = prompt(`Note for "${recommendation}" recommendation (optional):`) || '';
        patch(id, { action: 'recommend', recommendation, note });
    };

    const decide = (id: string, decision: 'CONFIRMED' | 'REJECTED' | 'EXTENDED') => {
        let newProbationEndDate: string | undefined;
        if (decision === 'EXTENDED') {
            const input = prompt('New probation end date (YYYY-MM-DD):') || '';
            if (!input.trim()) return;
            newProbationEndDate = input.trim();
        }
        const note = prompt(`Note for this decision (optional):`) || '';
        patch(id, { action: 'decide', decision, note, newProbationEndDate });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900">Probation Confirmations</h2>
                    <p className="text-sm text-secondary-500">Manager recommendation → HR sign-off before an employee is confirmed.</p>
                </div>
                <div className="flex bg-secondary-100/60 p-1 rounded-xl">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-900'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-16 text-center text-secondary-400 font-bold">Loading confirmations…</div>
            ) : reviews.length === 0 ? (
                <div className="py-16 text-center text-secondary-400 font-bold bg-secondary-50/50 rounded-3xl border border-dashed border-secondary-200">
                    No confirmation reviews in this view.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {reviews.map((r) => {
                        const emp = r.employee || {};
                        const snap = r.kraSnapshot || {};
                        const idx = snap.latestIndex || null;
                        const kra = snap.kra || null;
                        const open = ['PENDING', 'RECOMMENDED'].includes(r.status);
                        return (
                            <div key={r.id} className="card-premium p-5 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-black text-secondary-900 truncate">{emp.user?.name || emp.user?.email || 'Unknown'}</h3>
                                        <p className="text-xs text-secondary-500">{emp.designation || '—'} · joined {fmtDate(emp.dateOfJoining)}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${STATUS_BADGE[r.status] || 'bg-secondary-100 text-secondary-700'}`}>{r.status}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-secondary-50 rounded-lg p-2">
                                        <p className="text-[9px] uppercase tracking-widest font-black text-secondary-400">Probation Ends</p>
                                        <p className="font-bold text-secondary-800">{fmtDate(r.probationEndDate)}</p>
                                    </div>
                                    <div className="bg-secondary-50 rounded-lg p-2">
                                        <p className="text-[9px] uppercase tracking-widest font-black text-secondary-400">Performance</p>
                                        <p className="font-bold text-secondary-800">
                                            {idx ? `${idx.letterRating || '—'} · ${Math.round(idx.overallIndex || 0)}` : 'No index yet'}
                                            {kra ? ` · KRA ${kra.achievedKraGoals}/${kra.totalKraGoals}` : ''}
                                        </p>
                                    </div>
                                </div>

                                {r.managerRecommendation && (
                                    <p className="text-xs text-secondary-600">
                                        <span className="font-black uppercase tracking-widest text-[9px] text-secondary-400">Manager</span>{' '}
                                        {r.managerRecommendation}{r.managerNote ? ` — ${r.managerNote}` : ''}
                                    </p>
                                )}
                                {r.hrDecision && (
                                    <p className="text-xs text-secondary-600">
                                        <span className="font-black uppercase tracking-widest text-[9px] text-secondary-400">HR</span>{' '}
                                        {r.hrDecision}{r.hrNote ? ` — ${r.hrNote}` : ''}{r.newProbationEndDate ? ` (until ${fmtDate(r.newProbationEndDate)})` : ''}
                                    </p>
                                )}

                                {open && (
                                    <div className="flex flex-wrap gap-2 border-t border-secondary-100 pt-3">
                                        <div className="flex gap-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-secondary-400 self-center mr-1">Recommend</span>
                                            <button disabled={busyId === r.id} onClick={() => recommend(r.id, 'CONFIRM')} className="text-[10px] font-bold text-success-600 hover:bg-success-50 px-2 py-1 rounded">Confirm</button>
                                            <button disabled={busyId === r.id} onClick={() => recommend(r.id, 'EXTEND')} className="text-[10px] font-bold text-secondary-600 hover:bg-secondary-100 px-2 py-1 rounded">Extend</button>
                                            <button disabled={busyId === r.id} onClick={() => recommend(r.id, 'TERMINATE')} className="text-[10px] font-bold text-danger-600 hover:bg-danger-50 px-2 py-1 rounded">Terminate</button>
                                        </div>
                                        {canDecide && (
                                            <div className="flex gap-1 ml-auto">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-secondary-400 self-center mr-1">HR Decide</span>
                                                <button disabled={busyId === r.id} onClick={() => decide(r.id, 'CONFIRMED')} className="text-[10px] font-black text-white bg-success-600 hover:bg-success-700 px-2 py-1 rounded">Confirm</button>
                                                <button disabled={busyId === r.id} onClick={() => decide(r.id, 'EXTENDED')} className="text-[10px] font-black text-white bg-secondary-700 hover:bg-secondary-800 px-2 py-1 rounded">Extend</button>
                                                <button disabled={busyId === r.id} onClick={() => decide(r.id, 'REJECTED')} className="text-[10px] font-black text-white bg-danger-600 hover:bg-danger-700 px-2 py-1 rounded">Reject</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
