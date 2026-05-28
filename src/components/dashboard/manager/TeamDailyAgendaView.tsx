'use client';

import { useEffect, useState } from 'react';

export default function TeamDailyAgendaView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [scheduler, setScheduler] = useState<any>(null);
  const [reassignTargetTaskId, setReassignTargetTaskId] = useState<string | null>(null);
  const [reassignSearch, setReassignSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/hr/work-agenda/today?scope=team', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to load team agendas');
      setData(payload);

      const schedulerRes = await fetch('/api/hr/work-agenda/scheduler-status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (schedulerRes.ok) {
        const schedulerPayload = await schedulerRes.json().catch(() => ({}));
        setScheduler(schedulerPayload?.scheduler || null);
      } else {
        setScheduler(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load team agendas');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const regenerate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/hr/work-agenda/generate-today', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scope: 'team', forceRegenerate: false }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || payload?.message || 'Generation failed');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Generation failed');
    }
  };

  const patchTask = async (taskId: string, patch: any) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/hr/work-agenda/${taskId}`, {
      method: 'PATCH',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || payload?.message || 'Update failed');
  };

  const markMandatory = async (taskId: string, mandatory: boolean) => {
    try {
      await patchTask(taskId, { mandatory });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  };

  const removeTask = async (taskId: string) => {
    if (!confirm('Remove this task from today agenda?')) return;
    try {
      await patchTask(taskId, { completionStatus: 'CANCELLED' });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  };

  const reprioritize = async (taskId: string) => {
    const priority = prompt('New priority (HIGH/MEDIUM/LOW)');
    if (!priority) return;
    try {
      await patchTask(taskId, { priority: priority.toUpperCase() });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  };

  const reassignTask = async (taskId: string, currentEmployeeId: string) => {
    const toEmployeeId = reassignSearch.trim();
    if (!toEmployeeId || toEmployeeId === currentEmployeeId) return;
    try {
      await patchTask(taskId, { employeeId: toEmployeeId });
      setReassignTargetTaskId(null);
      setReassignSearch('');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  };

  const teamEmployeeOptions = (data?.employees || []).map((e: any) => ({
    employeeId: e.employeeId,
    label: `${e.name} (${e.designation})`,
  }));

  const filteredReassignOptions = teamEmployeeOptions.filter((e: any) =>
    e.label.toLowerCase().includes(reassignSearch.toLowerCase()) ||
    e.employeeId.toLowerCase().includes(reassignSearch.toLowerCase())
  );

  if (loading) return <div className="p-6 text-secondary-500">Loading team daily agenda...</div>;
  if (error) return <div className="p-6 text-danger-600 font-semibold">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-secondary-900">Team Daily Agenda</h3>
          <p className="text-xs text-secondary-500">Transparency on generated tasks, progress, blockers, and overload.</p>
        </div>
        <button className="btn btn-primary text-xs" onClick={regenerate}>Generate Today Agenda</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Employees" value={data?.employees?.length || 0} />
        <Metric label="Tasks" value={data?.summary?.totalTasks || 0} />
        <Metric label="Completed" value={data?.summary?.completed || 0} />
        <Metric label="Blocked" value={data?.summary?.blocked || 0} />
        <Metric label="Overload" value={data?.summary?.overloadEmployees || 0} />
      </div>

      {scheduler ? (
        <div className="card-premium p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-secondary-500">Scheduler Status</p>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold text-secondary-700">
            <div>State: <span className="font-black">{scheduler.started ? 'Running' : 'Stopped'}</span></div>
            <div>Last Run Date: <span className="font-black">{scheduler.lastRunDate || 'N/A'}</span></div>
            <div>Generated: <span className="font-black">{scheduler.lastSummary?.generated ?? 0}</span></div>
            <div>Skipped: <span className="font-black">{scheduler.lastSummary?.skipped ?? 0}</span></div>
          </div>
          {scheduler.lastError ? (
            <p className="mt-2 text-xs font-bold text-danger-600">Last error: {scheduler.lastError}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {(data?.employees || []).map((emp: any) => (
          <div key={emp.employeeId} className="card-premium p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-black text-secondary-900">{emp.name}</p>
                <p className="text-xs text-secondary-500">{emp.designation} | Completion: {emp.progress.completionRate}%</p>
                <div className="mt-1">
                  {emp.sync?.status === 'FRESH' ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-success-50 text-success-700 border border-success-200">
                      Sync: Fresh
                    </span>
                  ) : emp.sync?.status === 'STALE' ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      Sync: Stale (KPI updated after agenda generation)
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-secondary-100 text-secondary-700 border border-secondary-200">
                      Sync: No KPI
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs font-bold text-secondary-600">
                Hours: {Number(emp.guardRails.plannedHours || 0).toFixed(1)} {emp.guardRails.overload ? '(Overload)' : ''}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Source</th>
                    <th>Mandatory</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emp.tasks.map((t: any) => (
                    <tr key={t.id}>
                      <td>
                        <div className="font-semibold">{t.agenda}</div>
                        {t.blockerReason ? <div className="text-xs text-danger-600">Blocker: {t.blockerReason}</div> : null}
                      </td>
                      <td>{t.completionStatus}</td>
                      <td>{t.priority}</td>
                      <td>{t.sourceType}</td>
                      <td>{t.mandatory ? 'Yes' : 'No'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary text-[10px] py-1 px-2" onClick={() => reprioritize(t.id)}>Priority</button>
                          <button className="btn btn-secondary text-[10px] py-1 px-2" onClick={() => markMandatory(t.id, !t.mandatory)}>
                            {t.mandatory ? 'Unmark' : 'Mandatory'}
                          </button>
                          <button
                            className="btn btn-secondary text-[10px] py-1 px-2"
                            onClick={() => {
                              setReassignTargetTaskId(t.id);
                              setReassignSearch('');
                            }}
                          >
                            Reassign
                          </button>
                          <button className="btn bg-danger-50 text-danger-700 border border-danger-200 text-[10px] py-1 px-2" onClick={() => removeTask(t.id)}>Remove</button>
                        </div>
                        {reassignTargetTaskId === t.id ? (
                          <div className="mt-2 p-2 border border-secondary-200 rounded-lg bg-secondary-50">
                            <input
                              className="input h-8 text-xs w-full"
                              placeholder="Search employee by name or profile id..."
                              value={reassignSearch}
                              onChange={(e) => setReassignSearch(e.target.value)}
                            />
                            <div className="mt-2 max-h-28 overflow-y-auto space-y-1">
                              {filteredReassignOptions.map((option: any) => (
                                <button
                                  key={option.employeeId}
                                  className="w-full text-left text-xs font-semibold px-2 py-1 rounded hover:bg-white border border-transparent hover:border-secondary-200"
                                  onClick={() => setReassignSearch(option.employeeId)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <button className="btn btn-primary text-[10px] py-1 px-2" onClick={() => reassignTask(t.id, emp.employeeId)}>Confirm</button>
                              <button className="btn btn-secondary text-[10px] py-1 px-2" onClick={() => { setReassignTargetTaskId(null); setReassignSearch(''); }}>Cancel</button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-secondary-100 bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider font-black text-secondary-500">{label}</p>
      <p className="text-lg font-black text-secondary-900 mt-1">{value}</p>
    </div>
  );
}
