'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiTarget, FiTrendingUp, FiTrash2, FiSend, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { kraFetch, GOAL_PERIOD_TYPES, type MyGoal } from '@/lib/kra/client';
import { DimensionBadge, StatusBadge, OnTrackPill, VerificationTimeline, PendingHint } from '@/components/dashboard/kra/badges';

interface IndexData {
  period: string;
  overallIndex: number;
  grade: string;
  achievementScore: number;
  attendanceScore: number;
  managerRatingScore: number;
  focusScore: number;
}

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function MyPerformancePage() {
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [index, setIndex] = useState<IndexData | null>(null);
  const [goals, setGoals] = useState<MyGoal[]>([]);
  const [summary, setSummary] = useState<{ weightedAchievement: number; totalEarned: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [perf, my] = await Promise.all([
        kraFetch<{ index: IndexData }>(`/api/kra/performance?self=1&periodType=${periodType}`).catch(() => ({ index: null as unknown as IndexData })),
        kraFetch<{ goals: MyGoal[]; summary: { weightedAchievement: number; totalEarned: number } }>(`/api/kra/my?periodType=${periodType}`),
      ]);
      setIndex(perf.index);
      setGoals(my.goals || []);
      setSummary(my.summary || null);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, [periodType]);
  useEffect(() => { load(); }, [load]);

  const components = index ? [
    { label: 'Goal Achievement', value: index.achievementScore, weight: '45%' },
    { label: 'Attendance', value: index.attendanceScore, weight: '20%' },
    { label: 'Manager Rating', value: index.managerRatingScore, weight: '20%' },
    { label: 'KRA Focus', value: index.focusScore, weight: '15%' },
  ] : [];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiTrendingUp className="text-indigo-600" /> My Performance
            </h1>
            <p className="text-sm text-gray-500 mt-1">Your targets, daily progress & verification — {periodType.toLowerCase()}.</p>
          </div>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
            {GOAL_PERIOD_TYPES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </header>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Index hero */}
            <div className="grid sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <span className="text-xs uppercase tracking-wide opacity-80">Performance Index</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-4xl font-bold">{index?.overallIndex ?? 0}</span>
                  <span className="text-2xl font-bold">{index?.grade}</span>
                </div>
                <span className="text-xs opacity-80 mt-1">{index?.period ?? '—'}</span>
              </div>
              {components.map((c) => (
                <div key={c.label} className="border border-gray-200 rounded-2xl p-4">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{c.label}</span><span>{c.weight}</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">{c.value}</div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, c.value)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Goals */}
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <FiTarget className="text-indigo-600" /> My Goals
              {summary && (
                <span className="text-sm font-normal text-gray-400">
                  · {summary.weightedAchievement}% overall{summary.totalEarned ? ` · earned ${fmtINR(summary.totalEarned)}` : ''}
                </span>
              )}
            </h2>

            {goals.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                <FiTarget className="mx-auto text-gray-300" size={28} />
                <p className="text-gray-500 mt-2">No goals assigned for this period. Talk to your manager to get started.</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                {goals.map((g) => <GoalCard key={g.id} goal={g} onChanged={load} />)}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function GoalCard({ goal, onChanged }: { goal: MyGoal; onChanged: () => void }) {
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofNote, setProofNote] = useState('');

  const pct = Math.min(100, goal.achievementPercentage);
  const barColor = goal.overflow > 0 ? 'bg-emerald-500' : goal.pace.onTrack ? 'bg-indigo-500' : 'bg-amber-500';

  const log = async () => {
    const num = Number(value);
    if (!goal.metricId) { toast.error('This goal has no metric to log against'); return; }
    if (!Number.isFinite(num) || num === 0) { toast.error('Enter a valid value'); return; }
    setBusy(true);
    try {
      await kraFetch('/api/kra/log', { method: 'POST', body: JSON.stringify({ goalId: goal.id, value: num, note: note || undefined }) });
      toast.success('Progress logged ✅');
      setValue(''); setNote('');
      onChanged();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const removeLog = async (logId: string) => {
    setBusy(true);
    try {
      await kraFetch('/api/kra/log', { method: 'DELETE', body: JSON.stringify({ logId }) });
      toast.success('Log removed');
      onChanged();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await kraFetch('/api/kra/submit', { method: 'POST', body: JSON.stringify({ goalId: goal.id, proofUrl: proofUrl || undefined, proofNote: proofNote || undefined }) });
      toast.success('Submitted for verification 🚀');
      setShowSubmit(false); setProofUrl(''); setProofNote('');
      onChanged();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="border border-gray-200 rounded-2xl p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <DimensionBadge dimension={goal.dimension} />
            <StatusBadge status={goal.status} />
          </div>
          <h3 className="font-semibold text-gray-900 mt-1 truncate">{goal.title}</h3>
          <p className="text-xs text-gray-400">
            {goal.current} / {goal.target} {goal.unit}
            {goal.dataSource ? ` · ${goal.dataSource}` : ''}
          </p>
        </div>
        <div className="text-right flex-none">
          <div className={`text-lg font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-gray-900'}`}>{Math.round(goal.achievementPercentage)}%</div>
          {goal.overflow > 0
            ? <span className="text-xs font-semibold text-emerald-600">+{goal.overflow} {goal.unit} 🎉</span>
            : <span className="text-xs text-gray-400">{goal.remaining} {goal.unit} left</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>

      {/* Pace rollup */}
      <div className="flex items-center justify-between mt-2 text-[11px] text-gray-500">
        <OnTrackPill onTrack={goal.pace.onTrack} />
        <span>{goal.pace.remainingDays}d left · pace {goal.pace.pacePerDay}/d · need {goal.pace.neededPerRemainingDay}/d</span>
      </div>

      {goal.ratePerUnit ? (
        <p className="text-xs text-gray-500 mt-2">{fmtINR(goal.ratePerUnit)}/{goal.unit} · earned <span className="font-semibold text-gray-800">{fmtINR(goal.earned)}</span></p>
      ) : null}

      {/* Log chips */}
      {goal.logs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {goal.logs.map((l) => (
            <span key={l.id} className="group inline-flex items-center gap-1 rounded-full bg-gray-50 ring-1 ring-inset ring-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
              +{l.reportedValue} <span className="text-gray-400">{fmtDate(l.date)}</span>
              {!goal.locked && l.source === 'MANUAL' && (
                <button onClick={() => removeLog(l.id)} disabled={busy} className="ml-0.5 text-gray-300 hover:text-rose-500" aria-label="Delete log">
                  <FiTrash2 size={10} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Verification trail */}
      <VerificationTimeline verifications={goal.verifications} />

      {/* Actions */}
      <div className="mt-auto pt-3">
        {goal.locked ? (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            {goal.status === 'MANAGER_VERIFIED' ? '🔒 Verified & locked.' : <><PendingHint>Locked — awaiting verification.</PendingHint></>}
          </p>
        ) : (
          <>
            {!goal.metricId ? (
              <p className="text-xs text-gray-400">Manual-rated KRA — no daily logging.</p>
            ) : (
              <div className="flex gap-2">
                <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={`Add ${goal.unit}`}
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button onClick={log} disabled={busy} className="inline-flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  <FiPlus size={14} /> Log
                </button>
              </div>
            )}

            {/* Submit for verification */}
            {!showSubmit ? (
              <button onClick={() => setShowSubmit(true)} className="mt-2 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
                <FiSend size={14} /> Submit for verification
              </button>
            ) : (
              <div className="mt-3 rounded-xl bg-gray-50 p-3 space-y-2">
                <input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="Proof link (https://…)"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <textarea value={proofNote} onChange={(e) => setProofNote(e.target.value)} placeholder="Proof note (optional)" rows={2}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <div className="flex gap-2">
                  <button onClick={submit} disabled={busy} className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {busy ? '…' : 'Confirm submit'}
                  </button>
                  <button onClick={() => setShowSubmit(false)} className="text-sm text-gray-500 px-2">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
