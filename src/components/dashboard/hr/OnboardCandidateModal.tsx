'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle2, Info, Ban, UserPlus } from 'lucide-react';
import { useRecruitmentOnboarding } from '@/hooks/useRecruitment';
import { inr } from '@/lib/format';

interface Grade { id: string; code: string; name: string; minCtc: number | null; midCtc: number | null; maxCtc: number | null }
interface Check { key: string; severity: 'BLOCK' | 'WARN' | 'INFO' | 'OK'; message: string }
interface Result { ok: boolean; needsException: boolean; needsJustification: boolean; needsEquityReview: boolean; band: string; compaRatio: number | null; compaBucket: { label: string }; peer: { count: number; max: number | null }; checks: Check[] }

const sev = {
    BLOCK: { icon: Ban, cls: 'bg-red-50 border-red-200 text-red-800' },
    WARN: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-800' },
    INFO: { icon: Info, cls: 'bg-sky-50 border-sky-200 text-sky-800' },
    OK: { icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
} as const;

const ROLES = ['EXECUTIVE', 'EMPLOYEE', 'TEAM_LEADER', 'MANAGER', 'HR', 'HR_MANAGER'];

export default function OnboardCandidateModal({ app, onClose, onDone }: { app: any; onClose: () => void; onDone?: () => void }) {
    const { onboardCandidate } = useRecruitmentOnboarding();
    const [grades, setGrades] = useState<Grade[]>([]);
    const [gradeId, setGradeId] = useState('');
    const [ctc, setCtc] = useState('');
    const [role, setRole] = useState('EXECUTIVE');
    const [result, setResult] = useState<Result | null>(null);
    const [checking, setChecking] = useState(false);
    const [ack, setAck] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}` }), []);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/hr/grades', { headers: authHeaders() });
                if (res.ok) setGrades((await res.json()).grades || []);
            } catch { /* ignore */ }
        })();
    }, [authHeaders]);

    // Any change to the inputs invalidates a prior fitment result.
    useEffect(() => { setResult(null); setAck(false); }, [gradeId, ctc]);

    const grade = grades.find((g) => g.id === gradeId);

    const checkFitment = async () => {
        setError(null); setChecking(true);
        try {
            const res = await fetch('/api/hr/fitment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ gradeId: gradeId || undefined, proposedMonthlyCtc: ctc === '' ? null : Number(ctc), isNewHire: true }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Fitment check failed');
            setResult(d.result);
        } catch (e: any) { setError(e.message); }
        finally { setChecking(false); }
    };

    const needsAck = !!result && result.ok && (result.needsException || result.needsJustification || result.needsEquityReview);
    // Gate: must run a passing fitment check; acknowledge any exception/justification.
    const canOnboard = !!result && result.ok && (!needsAck || ack) && !busy;

    const onboard = async () => {
        setError(null); setBusy(true);
        try {
            await onboardCandidate.mutateAsync({
                applicationId: app.id,
                role,
                designation: app.jobPosting?.title || 'New Hire',
                companyId: app.jobPosting?.companyId,
                baseSalary: ctc === '' ? undefined : ctc,
                gradeId: gradeId || undefined,
            });
            onDone?.();
            onClose();
        } catch (e: any) { setError(e.message || 'Onboarding failed'); }
        finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-semibold text-gray-900">Onboard {app.applicantName}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-xs text-gray-500">Set the grade and offer, then run the salary-fitment check (§40) before onboarding.</p>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

                <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">
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
                    <label className="text-sm col-span-2">
                        <span className="text-gray-600">System role</span>
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </label>
                </div>
                {grade && <p className="text-xs text-gray-500">Band for {grade.code}: {inr(grade.minCtc)} · mid {inr(grade.midCtc)} · {inr(grade.maxCtc)}</p>}

                <button onClick={checkFitment} disabled={checking} className="w-full border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 text-sm font-medium rounded-lg px-4 py-2">
                    {checking ? 'Checking fitment…' : 'Check fitment'}
                </button>

                {result && (
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded border border-gray-100 p-2"><div className="text-gray-500">Band</div><div className="font-semibold">{result.band.replace(/_/g, ' ').toLowerCase()}</div></div>
                            <div className="rounded border border-gray-100 p-2"><div className="text-gray-500">Compa</div><div className="font-semibold">{result.compaRatio != null ? result.compaRatio.toFixed(2) : '—'}</div></div>
                            <div className="rounded border border-gray-100 p-2"><div className="text-gray-500">Peers</div><div className="font-semibold">{result.peer.count} · {inr(result.peer.max)}</div></div>
                        </div>
                        {result.checks.map((c, i) => {
                            const S = sev[c.severity]; const Icon = S.icon;
                            return <div key={i} className={`flex items-start gap-2 text-xs rounded-lg border px-3 py-2 ${S.cls}`}><Icon className="w-4 h-4 mt-0.5 shrink-0" /><span>{c.message}</span></div>;
                        })}
                        {needsAck && (
                            <label className="flex items-start gap-2 text-xs text-gray-700 mt-1">
                                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-indigo-600" />
                                <span>I have obtained the required exception approval and recorded the salary justification.</span>
                            </label>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                    <button onClick={onClose} className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">Cancel</button>
                    <button onClick={onboard} disabled={!canOnboard} title={!result ? 'Run the fitment check first' : !result.ok ? 'Resolve the blocking items' : undefined} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> {busy ? 'Onboarding…' : 'Onboard'}
                    </button>
                </div>
            </div>
        </div>
    );
}
