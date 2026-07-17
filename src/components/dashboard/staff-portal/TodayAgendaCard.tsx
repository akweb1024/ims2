'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, PlayCircle } from 'lucide-react';

type TaskItem = {
  id: string;
  agenda: string;
  priority: string;
  completionStatus: string;
  estimatedHours: number;
  linkedGoalTitle?: string | null;
  linkedKpiId?: string | null;
  mandatory?: boolean;
  blockerReason?: string | null;
  blockerOwner?: string | null;
};

export default function TodayAgendaCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employee, setEmployee] = useState<any>(null);
  const [blockingTask, setBlockingTask] = useState<TaskItem | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockOwner, setBlockOwner] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  const fetchTodayAgenda = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/hr/work-agenda/today?employeeId=self&scope=self', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to load agenda');
      const current = payload?.employees?.[0] || null;
      if (!current || (Array.isArray(current.tasks) && current.tasks.length === 0)) {
        await fetch('/api/hr/work-agenda/generate-today', {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scope: 'self' }),
        });
        const retry = await fetch('/api/hr/work-agenda/today?employeeId=self&scope=self', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const retryPayload = await retry.json().catch(() => ({}));
        setEmployee(retryPayload?.employees?.[0] || null);
      } else {
        setEmployee(current);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load agenda');
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAgenda();
  }, []);

  const tasks: TaskItem[] = useMemo(() => employee?.tasks || [], [employee]);
  const plannedHours = Number(employee?.guardRails?.plannedHours || 0);
  const blockers = Number(employee?.guardRails?.unresolvedBlockers || 0);
  const overload = Boolean(employee?.guardRails?.overload);
  const completed = Number(employee?.progress?.completed || 0);
  const total = Number(employee?.progress?.total || 0);

  const updateTask = async (taskId: string, patch: any) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/hr/work-agenda/${taskId}`, {
      method: 'PATCH',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error || payload?.message || 'Update failed');
    }
  };

  const onStart = async (taskId: string) => {
    try {
      await updateTask(taskId, { completionStatus: 'IN_PROGRESS' });
      await fetchTodayAgenda();
    } catch (e: any) {
      alert(e?.message || 'Failed to start task');
    }
  };

  const onComplete = async (taskId: string) => {
    try {
      await updateTask(taskId, { completionStatus: 'COMPLETED', blockerReason: null });
      await fetchTodayAgenda();
    } catch (e: any) {
      alert(e?.message || 'Failed to complete task');
    }
  };

  const openBlockModal = (task: TaskItem) => {
    setBlockReason(task.blockerReason || '');
    setBlockOwner(task.blockerOwner || '');
    setBlockingTask(task);
  };

  const submitBlock = async () => {
    if (!blockingTask || !blockReason.trim()) return;
    setBlockSubmitting(true);
    try {
      await updateTask(blockingTask.id, {
        completionStatus: 'BLOCKED',
        blockerReason: blockReason.trim(),
        blockerOwner: blockOwner.trim() || null,
      });
      setBlockingTask(null);
      await fetchTodayAgenda();
    } catch (e: any) {
      alert(e?.message || 'Failed to mark blocked');
    } finally {
      setBlockSubmitting(false);
    }
  };

  return (
    <div className="card-premium p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-black text-secondary-900">Today Agenda</h3>
          <p className="text-xs text-secondary-500 font-semibold">
            Pre-defined tasks aligned to your goals and KPIs.
          </p>
        </div>
        <button className="btn btn-secondary text-xs" onClick={fetchTodayAgenda}>Refresh</button>
      </div>

      {loading && <p className="text-sm text-secondary-500">Loading today agenda...</p>}
      {!loading && error && <p className="text-sm text-danger-600 font-semibold">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Metric label="Completed" value={`${completed}/${total}`} />
            <Metric label="Planned Hrs" value={plannedHours.toFixed(1)} />
            <Metric label="Blockers" value={blockers} />
            <Metric label="Guard" value={overload ? 'Overload' : 'Balanced'} danger={overload} />
          </div>

          {tasks.length === 0 ? (
            <p className="text-sm text-secondary-500">No agenda generated for today yet.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="rounded-xl border border-secondary-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-secondary-900">
                        {t.agenda} {t.mandatory ? <span className="text-[10px] text-danger-600 uppercase">Mandatory</span> : null}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {t.priority} | {t.estimatedHours || 0}h {t.linkedGoalTitle ? `| Goal: ${t.linkedGoalTitle}` : ''} {t.linkedKpiId ? '| KPI linked' : ''}
                      </p>
                      {t.blockerReason ? (
                        <p className="text-xs text-danger-600 mt-1">
                          Blocker: {t.blockerReason}
                          {t.blockerOwner ? <span className="text-secondary-500"> — can be unblocked by {t.blockerOwner}</span> : null}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-secondary-100 font-black">{t.completionStatus}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="btn btn-secondary text-xs py-1.5 px-3" onClick={() => onStart(t.id)}>
                      <PlayCircle size={14} /> Start
                    </button>
                    <button className="btn btn-primary text-xs py-1.5 px-3" onClick={() => onComplete(t.id)}>
                      <CheckCircle2 size={14} /> Complete
                    </button>
                    <button className="btn bg-danger-50 text-danger-700 border border-danger-200 text-xs py-1.5 px-3" onClick={() => openBlockModal(t)}>
                      <AlertTriangle size={14} /> Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {blockingTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h4 className="text-lg font-black text-secondary-900 mb-1">Block task</h4>
            <p className="text-xs text-secondary-500 mb-4 truncate" title={blockingTask.agenda}>{blockingTask.agenda}</p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-black text-secondary-500 block mb-1">Why is this task blocked?</label>
                <textarea
                  className="input h-24 w-full"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Calling system is down, waiting on client asset..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-black text-secondary-500 block mb-1">Who can unblock you? (optional)</label>
                <input
                  className="input w-full"
                  value={blockOwner}
                  onChange={(e) => setBlockOwner(e.target.value)}
                  placeholder="e.g. IT support, Priya (design)"
                />
              </div>
              <p className="text-[11px] text-secondary-500">Your manager will be notified with this reason.</p>
              <div className="flex gap-2 pt-1">
                <button
                  className="btn btn-primary text-xs flex-1"
                  disabled={!blockReason.trim() || blockSubmitting}
                  onClick={submitBlock}
                >
                  {blockSubmitting ? 'Blocking...' : 'Mark Blocked'}
                </button>
                <button className="btn btn-secondary text-xs" onClick={() => setBlockingTask(null)} disabled={blockSubmitting}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-secondary-100 bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider font-black text-secondary-500">{label}</p>
      <p className={`text-lg font-black mt-1 ${danger ? 'text-danger-600' : 'text-secondary-900'}`}>{value}</p>
    </div>
  );
}
