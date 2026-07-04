'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Scale, AlertTriangle, CheckCircle2, Info, Ban } from 'lucide-react';
import { inr } from '@/lib/format';

interface Grade { id: string; code: string; name: string; minCtc: number | null; midCtc: number | null; maxCtc: number | null }
interface Check { key: string; severity: 'BLOCK' | 'WARN' | 'INFO' | 'OK'; message: string }
interface Result {
    ok: boolean; needsException: boolean; needsJustification: boolean; needsEquityReview: boolean;
    band: string; compaRatio: number | null; compaBucket: { label: string };
    peer: { count: number; max: number | null }; checks: Check[];
}

const sev = {
    BLOCK: { icon: Ban, cls: 'bg-red-50 border-red-200 text-red-800' },
    WARN: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-800' },
    INFO: { icon: Info, cls: 'bg-sky-50 border-sky-200 text-sky-800' },
    OK: { icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
} as const;

export default function FitmentPage() {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [gradeId, setGradeId] = useState('');
    const [ctc, setCtc] = useState('');
    const [isNewHire, setIsNewHire] = useState(true);
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}` }), []);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/hr/grades', { headers: authHeaders() });
                if (res.ok) setGrades((await res.json()).grades || []);
            } catch { /* ignore */ }
        })();
    }, [authHeaders]);

    const grade = grades.find((g) => g.id === gradeId);

    const evaluate = async () => {
        setError(null); setResult(null); setBusy(true);
        try {
            const res = await fetch('/api/hr/fitment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ gradeId: gradeId || undefined, proposedMonthlyCtc: ctc === '' ? null : Number(ctc), isNewHire }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Evaluation failed');
            setResult(d.result);
        } catch (e: any) { setError(e.message); }
        finally { setBusy(false); }
    };

    const verdict = result && (
        !result.ok ? { cls: 'bg-red-100 text-red-800', text: 'Blocked — resolve the items below before approving.' }
            : result.needsException ? { cls: 'bg-amber-100 text-amber-800', text: 'Allowed with exception approval + justification.' }
                : result.needsJustification || result.needsEquityReview ? { cls: 'bg-amber-100 text-amber-800', text: 'Allowed — record the noted justification/review.' }
                    : { cls: 'bg-emerald-100 text-emerald-800', text: 'Clean fitment — within band and equity.' }
    );

    return (
        <DashboardLayout>
            <div className="p-6 max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Scale className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Salary Fitment Check</h1>
                        <p className="text-sm text-gray-500">Check a proposed monthly CTC against its grade band, midpoint, compa-ratio and internal equity before making an offer.</p>
                    </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

                <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-sm md:col-span-1">
                            <span className="text-gray-600">Grade</span>
                            <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                <option value="">Select grade…</option>
                                {grades.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.name}</option>)}
                            </select>
                        </label>
                        <label className="text-sm">
                            <span className="text-gray-600">Proposed monthly CTC</span>
                            <input type="number" min={0} value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="e.g. 35000" className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" />
                        </label>
                        <label className="text-sm flex items-end gap-2 pb-2">
                            <input type="checkbox" checked={isNewHire} onChange={(e) => setIsNewHire(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
                            <span className="text-gray-600">New hire</span>
                        </label>
                    </div>

                    {grade && (
                        <p className="text-xs text-gray-500">Band for {grade.code}: {inr(grade.minCtc)} · <span className="font-semibold">mid {inr(grade.midCtc)}</span> · {inr(grade.maxCtc)}</p>
                    )}

                    <div className="flex justify-end">
                        <button onClick={evaluate} disabled={busy} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2">{busy ? 'Checking…' : 'Check fitment'}</button>
                    </div>
                </section>

                {result && (
                    <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        {verdict && <div className={`rounded-lg px-4 py-3 text-sm font-medium ${verdict.cls}`}>{verdict.text}</div>}

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-lg border border-gray-100 p-3">
                                <div className="text-xs text-gray-500">Band</div>
                                <div className="font-semibold text-gray-900">{result.band.replace(/_/g, ' ').toLowerCase()}</div>
                            </div>
                            <div className="rounded-lg border border-gray-100 p-3">
                                <div className="text-xs text-gray-500">Compa-ratio</div>
                                <div className="font-semibold text-gray-900">{result.compaRatio != null ? `${result.compaRatio.toFixed(2)} · ${result.compaBucket.label}` : '—'}</div>
                            </div>
                            <div className="rounded-lg border border-gray-100 p-3">
                                <div className="text-xs text-gray-500">Same-grade peers</div>
                                <div className="font-semibold text-gray-900">{result.peer.count} · max {inr(result.peer.max)}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {result.checks.map((c, i) => {
                                const S = sev[c.severity];
                                const Icon = S.icon;
                                return (
                                    <div key={i} className={`flex items-start gap-2 text-sm rounded-lg border px-3 py-2 ${S.cls}`}>
                                        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>{c.message}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </DashboardLayout>
    );
}
