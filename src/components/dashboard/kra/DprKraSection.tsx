'use client';

/**
 * KRA progress section for the daily report (DPR).
 * Self-contained: fetches the employee's current-month KRA targets, lets them
 * enter today's incremental progress, and saves to /api/kra/contributions
 * (which validates + rolls up into the targets). Safe to drop into any page.
 */
import { useCallback, useEffect, useState } from 'react';
import { FiTarget } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { kraFetch } from '@/lib/kra/client';

interface Goal {
  id: string;
  metricId: string | null;
  title: string;
  unit: string;
  target: number;
  current: number;
  remaining: number;
  overflow: number;
  ratePerUnit: number | null;
  earned: number;
}

export default function DprKraSection() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [todays, setTodays] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kraFetch<{ goals: Goal[] }>('/api/kra/my?periodType=MONTHLY');
      setGoals(data.goals || []);
    } catch (e: any) {
      // Non-fatal — DPR works even if KRA can't load.
      console.error('KRA load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const entries = goals
      .filter((g) => g.metricId && todays[g.id] && Number(todays[g.id]) > 0)
      .map((g) => ({ metricId: g.metricId as string, value: Number(todays[g.id]) }));
    if (entries.length === 0) { toast.error('Kisi KRA ke aaj ke progress daalein'); return; }
    setBusy(true);
    try {
      const res = await kraFetch<{ summary: { autoVerified: number; pending: number; flagged: number } }>(
        '/api/kra/contributions',
        { method: 'POST', body: JSON.stringify({ entries }) }
      );
      const s = res.summary;
      toast.success(`KRA updated — ${s.autoVerified} verified, ${s.pending} manager review pending`);
      setTodays({});
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (loading) return null;
  if (goals.length === 0) return null; // No KRA assigned → don't clutter the DPR.

  return (
    <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4 my-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
        <FiTarget className="text-indigo-600" /> Aaj ka KRA progress
      </h3>
      <p className="text-xs text-gray-500 mb-3">Aaj jitna kaam kiya wo daalein (incremental). Manager validate karega.</p>

      <div className="space-y-2">
        {goals.map((g) => (
          <div key={g.id} className="grid grid-cols-12 gap-2 items-center bg-white rounded-lg p-2">
            <div className="col-span-5">
              <div className="text-sm font-medium text-gray-900">{g.title}</div>
              <div className="text-xs text-gray-400">
                Done {g.current}/{g.target} {g.unit}
                {g.ratePerUnit ? ` · ₹${Math.round(g.earned).toLocaleString('en-IN')}` : ''}
              </div>
            </div>
            <div className="col-span-4 text-xs">
              {g.overflow > 0 ? (
                <span className="text-green-600 font-medium">+{g.overflow} {g.unit} over 🎉</span>
              ) : (
                <span className="text-gray-600 font-medium">{g.remaining} {g.unit} left</span>
              )}
            </div>
            <input
              type="number"
              min="0"
              className="col-span-3 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={`+ aaj`}
              value={todays[g.id] ?? ''}
              onChange={(e) => setTodays((p) => ({ ...p, [g.id]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="mt-3 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Update KRA progress'}
      </button>
    </div>
  );
}
