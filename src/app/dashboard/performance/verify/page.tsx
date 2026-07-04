'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiShield, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { kraFetch, type KraProof, type KraGoalVerification } from '@/lib/kra/client';
import { DimensionBadge, StatusBadge, VerificationTimeline } from '@/components/dashboard/kra/badges';

interface VerifyGoal {
  id: string;
  title: string;
  dimension: string | null;
  unit: string;
  targetValue: number;
  currentValue: number;
  achievementPercentage: number;
  status: string;
  dueDate: string | null;
  proofs: KraProof[];
  verifications: KraGoalVerification[];
  employee: { id: string; user: { name: string | null; email: string | null } | null };
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function VerifyPage() {
  const [goals, setGoals] = useState<VerifyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kraFetch<{ goals: VerifyGoal[] }>('/api/kra/verify');
      setGoals(data.goals || []);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (goal: VerifyGoal, decision: 'APPROVE' | 'REJECT', comment?: string) => {
    const level = goal.status === 'SUBMITTED' ? 'TL' : 'MANAGER';
    if (decision === 'REJECT' && !comment) {
      comment = window.prompt('Reason for rejection?') || undefined;
      if (!comment) return;
    }
    setBusyId(goal.id);
    try {
      await kraFetch('/api/kra/verify', { method: 'POST', body: JSON.stringify({ goalId: goal.id, level, decision, comment }) });
      toast.success(decision === 'APPROVE' ? `Approved (${level})` : 'Rejected');
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusyId(null); }
  };

  return (
    <>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiShield className="text-indigo-600" /> Goal Verification
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review submitted goals. TL approves first, then Manager gives final approval.</p>
        </header>

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
        ) : goals.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <FiCheckCircle className="mx-auto text-emerald-300" size={28} />
            <p className="text-gray-500 mt-2">Nothing awaiting your verification. All caught up! 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((g) => (
              <div key={g.id} className="border border-gray-200 rounded-2xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DimensionBadge dimension={g.dimension} />
                      <StatusBadge status={g.status} />
                      <span className="text-xs text-gray-400">{g.status === 'SUBMITTED' ? 'Needs TL approval' : 'Needs Manager approval'}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1">{g.title}</h3>
                    <p className="text-xs text-gray-500">
                      {g.employee?.user?.name ?? g.employee?.user?.email ?? 'Employee'} · {g.currentValue}/{g.targetValue} {g.unit} ({Math.round(g.achievementPercentage)}%) · due {fmtDate(g.dueDate)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-none">
                    <button onClick={() => act(g, 'APPROVE')} disabled={busyId === g.id}
                      className="inline-flex items-center gap-1 bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                      <FiCheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => act(g, 'REJECT')} disabled={busyId === g.id}
                      className="inline-flex items-center gap-1 bg-white text-rose-600 ring-1 ring-inset ring-rose-200 text-sm px-3 py-1.5 rounded-lg hover:bg-rose-50 disabled:opacity-50">
                      <FiXCircle size={14} /> Reject
                    </button>
                  </div>
                </div>

                {/* Proofs */}
                {g.proofs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {g.proofs.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 rounded-lg bg-gray-50 ring-1 ring-inset ring-gray-200 px-2 py-1 text-xs text-gray-600">
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                            <FiExternalLink size={11} /> Proof link
                          </a>
                        ) : (
                          <span>{p.note || 'Note proof'}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                <VerificationTimeline verifications={g.verifications} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
