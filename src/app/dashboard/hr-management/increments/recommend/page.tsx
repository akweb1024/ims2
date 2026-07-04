'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, Info, Ban } from 'lucide-react';

interface Note { key: string; severity: 'BLOCK' | 'WARN' | 'INFO' | 'OK'; message: string }
interface Rec { mode: string; minPct: number | null; maxPct: number | null; recommendedPct: number | null; equityCorrection: boolean; moderatedForHighCompa: boolean; notes: Note[] }
interface Ctx { employeeName?: string | null; grade?: { code: string; name: string; midCtc: number | null } | null; baseSalary?: number | null; rating?: string | null; ratingPeriod?: string | null; compaRatio?: number | null }

const inr = (n: number | null | undefined) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);
const sev = {
    BLOCK: { icon: Ban, cls: 'bg-red-50 border-red-200 text-red-800' },
    WARN: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-800' },
    INFO: { icon: Info, cls: 'bg-sky-50 border-sky-200 text-sky-800' },
    OK: { icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
} as const;

export default function IncrementRecommendPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [employeeId, setEmployeeId] = useState('');
    const [promotion, setPromotion] = useState(false);
    const [underPip, setUnderPip] = useState(false);
    const [rec, setRec] = useState<Rec | null>(null);
    const [ctx, setCtx] = useState<Ctx | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}` }), []);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/hr/employees', { headers: authHeaders() });
                if (res.ok) {
                    const d = await res.json();
                    const list = Array.isArray(d) ? d : (d.employees || d.data || []);
                    setEmployees(list.map((e: any) => ({ id: e.id, name: e.name || e.user?.name || e.email || 'Unknown' })));
                }
            } catch { /* ignore */ }
        })();
    }, [authHeaders]);

    const evaluate = async () => {
        if (!employeeId) { setError('Pick an employee.'); return; }
        setError(null); setRec(null); setCtx(null); setBusy(true);
        try {
            const res = await fetch('/api/hr/increment-recommendation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ employeeId, promotion, underPipOrNotice: underPip }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Failed');
            setRec(d.recommendation); setCtx(d.context);
        } catch (e: any) { setError(e.message); }
        finally { setBusy(false); }
    };

    return (
        <>
            <div className="p-6 max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <TrendingUp className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Increment Recommendation</h1>
                        <p className="text-sm text-gray-500">Suggests an increment % from performance rating × compa-ratio (§41), moderating for band position and blocking under PIP/notice.</p>
                    </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

                <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-sm md:col-span-2">
                            <span className="text-gray-600">Employee</span>
                            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                <option value="">Select employee…</option>
                                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </label>
                        <label className="text-sm flex items-center gap-2">
                            <input type="checkbox" checked={promotion} onChange={(e) => setPromotion(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
                            <span className="text-gray-600">Being promoted</span>
                        </label>
                        <label className="text-sm flex items-center gap-2">
                            <input type="checkbox" checked={underPip} onChange={(e) => setUnderPip(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
                            <span className="text-gray-600">Under PIP / notice / disciplinary</span>
                        </label>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={evaluate} disabled={busy} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2">{busy ? 'Calculating…' : 'Recommend'}</button>
                    </div>
                </section>

                {rec && (
                    <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <div className="flex items-baseline justify-between flex-wrap gap-2">
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Recommended</div>
                                <div className="text-3xl font-bold text-gray-900">{rec.recommendedPct != null ? `${rec.recommendedPct}%` : '—'}</div>
                                {rec.minPct != null && <div className="text-xs text-gray-500">Band {rec.minPct}–{rec.maxPct}% · mode {rec.mode.toLowerCase()}</div>}
                            </div>
                            {ctx && (
                                <div className="text-right text-xs text-gray-600 space-y-0.5">
                                    <div>Rating: <span className="font-semibold">{ctx.rating || '—'}</span>{ctx.ratingPeriod ? ` (${ctx.ratingPeriod})` : ''}</div>
                                    <div>Compa-ratio: <span className="font-semibold">{ctx.compaRatio != null ? ctx.compaRatio.toFixed(2) : '—'}</span></div>
                                    <div>Grade: {ctx.grade ? `${ctx.grade.code} · mid ${inr(ctx.grade.midCtc)}` : '—'} · Salary {inr(ctx.baseSalary)}</div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {rec.notes.map((n, i) => {
                                const S = sev[n.severity]; const Icon = S.icon;
                                return <div key={i} className={`flex items-start gap-2 text-sm rounded-lg border px-3 py-2 ${S.cls}`}><Icon className="w-4 h-4 mt-0.5 shrink-0" /><span>{n.message}</span></div>;
                            })}
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}
