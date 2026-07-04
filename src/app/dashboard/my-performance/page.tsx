'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiTarget, FiTrendingUp, FiTrash2, FiSend, FiPlus, FiSettings, FiEye, FiEyeOff, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
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

// Customizable cards on this page (shown/hidden/reordered via the Customize panel).
const PERF_WIDGETS: { key: string; label: string }[] = [
  { key: 'index', label: 'Performance Index' },
  { key: 'achievement', label: 'Goal Achievement' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'manager', label: 'Manager Rating' },
  { key: 'focus', label: 'KRA Focus' },
  { key: 'goals', label: 'My Goals' },
];
const DEFAULT_ORDER = PERF_WIDGETS.map((w) => w.key);
const LAYOUT_KEY = 'myperf-layout';

export default function MyPerformancePage() {
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [index, setIndex] = useState<IndexData | null>(null);
  const [goals, setGoals] = useState<MyGoal[]>([]);
  const [summary, setSummary] = useState<{ weightedAchievement: number; totalEarned: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [customizing, setCustomizing] = useState(false);
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [hidden, setHidden] = useState<string[]>([]);
  const snapshot = useRef<{ order: string[]; hidden: string[] } | null>(null);

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

  // Load the saved layout (per browser). Reconcile so new/removed cards are handled.
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(LAYOUT_KEY) : null;
      if (!raw) return;
      const p = JSON.parse(raw);
      const known = new Set(DEFAULT_ORDER);
      const savedOrder: string[] = Array.isArray(p.order) ? p.order.filter((k: string) => known.has(k)) : [];
      setOrder([...savedOrder, ...DEFAULT_ORDER.filter((k) => !savedOrder.includes(k))]);
      if (Array.isArray(p.hidden)) setHidden(p.hidden.filter((k: string) => known.has(k)));
    } catch { /* ignore */ }
  }, []);

  const isHidden = (k: string) => hidden.includes(k);
  const toggle = (k: string) => setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]));
  const move = (k: string, dir: -1 | 1) => setOrder((o) => {
    const i = o.indexOf(k); const j = i + dir;
    if (i < 0 || j < 0 || j >= o.length) return o;
    const n = [...o]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const openCustomizer = () => { snapshot.current = { order, hidden }; setCustomizing(true); };
  const cancelCustomizer = () => { if (snapshot.current) { setOrder(snapshot.current.order); setHidden(snapshot.current.hidden); } setCustomizing(false); };
  const saveLayout = () => {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify({ order, hidden })); } catch { /* ignore */ }
    setCustomizing(false);
    toast.success('Layout saved');
  };
  const resetLayout = () => { setOrder(DEFAULT_ORDER); setHidden([]); };

  const componentMap: Record<string, { label: string; value: number; weight: string }> = index ? {
    achievement: { label: 'Goal Achievement', value: index.achievementScore, weight: '45%' },
    attendance: { label: 'Attendance', value: index.attendanceScore, weight: '20%' },
    manager: { label: 'Manager Rating', value: index.managerRatingScore, weight: '20%' },
    focus: { label: 'KRA Focus', value: index.focusScore, weight: '15%' },
  } : {};

  const renderStat = (key: string) => {
    if (key === 'index') {
      return (
        <div key="index" className="bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-2xl p-5 flex flex-col justify-center shadow-sm">
          <span className="text-xs uppercase tracking-wide opacity-80">Performance Index</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold">{index?.overallIndex ?? 0}</span>
            <span className="text-2xl font-bold">{index?.grade}</span>
          </div>
          <span className="text-xs opacity-80 mt-1">{index?.period ?? '—'}</span>
        </div>
      );
    }
    const c = componentMap[key];
    if (!c) return null;
    return (
      <div key={key} className="border border-gray-200 rounded-2xl p-4">
        <div className="flex justify-between text-xs text-gray-400"><span>{c.label}</span><span>{c.weight}</span></div>
        <div className="text-2xl font-semibold text-gray-900 mt-1">{c.value}</div>
        <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, c.value)}%` }} />
        </div>
      </div>
    );
  };

  const visibleStats = order.filter((k) => k !== 'goals' && !isHidden(k));

  return (
    <>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiTrendingUp className="text-indigo-600" /> My Performance
            </h1>
            <p className="text-sm text-gray-500 mt-1">Your targets, daily progress & verification — {periodType.toLowerCase()}.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCustomizer} className="inline-flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <FiSettings size={14} /> Customize
            </button>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
              {GOAL_PERIOD_TYPES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </header>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Stat cards (customizable order/visibility) */}
            {visibleStats.length > 0 && (
              <div className="grid sm:grid-cols-4 gap-4 mb-8">
                {visibleStats.map(renderStat)}
              </div>
            )}

            {/* Goals */}
            {!isHidden('goals') && (
              <>
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
          </>
        )}
      </div>

      {/* Customize drawer */}
      {customizing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={cancelCustomizer}>
          <div className="bg-white shadow-2xl h-full w-full min-w-[320px] sm:w-[38%] sm:max-w-[460px] flex flex-col animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900">Customize widgets</h3>
                <p className="text-xs text-gray-500 mt-0.5">Show/hide and reorder your cards. Changes preview live.</p>
              </div>
              <button onClick={cancelCustomizer} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="px-4 py-4 overflow-y-auto flex-1 space-y-2">
              {order.map((k, i) => {
                const w = PERF_WIDGETS.find((x) => x.key === k);
                if (!w) return null;
                const off = isHidden(k);
                return (
                  <div key={k} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${off ? 'bg-gray-50 border-gray-200' : 'border-gray-200 bg-white'}`}>
                    <div className="flex flex-col">
                      <button onClick={() => move(k, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move up"><FiChevronUp size={14} /></button>
                      <button onClick={() => move(k, 1)} disabled={i === order.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move down"><FiChevronDown size={14} /></button>
                    </div>
                    <span className={`flex-1 text-sm ${off ? 'text-gray-400' : 'text-gray-800'}`}>{w.label}</span>
                    <button onClick={() => toggle(k)} title={off ? 'Show' : 'Hide'} className={`p-1.5 rounded-md ${off ? 'text-gray-400 hover:bg-gray-100' : 'text-indigo-600 hover:bg-indigo-50'}`}>
                      {off ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
              <button onClick={resetLayout} className="text-sm text-gray-500 hover:text-gray-700">Reset</button>
              <div className="flex gap-2">
                <button onClick={cancelCustomizer} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={saveLayout} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
