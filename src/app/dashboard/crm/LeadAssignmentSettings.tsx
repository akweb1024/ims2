'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Clock3, RefreshCcw, RotateCcw, UserRound } from 'lucide-react';

type Executive = {
  id: string;
  name?: string | null;
  email: string;
};

type AssignmentState = {
  currentCursorUserId: string | null;
  currentExecutive: Executive | null;
  nextExecutive: Executive | null;
  executives: Executive[];
  lastChangedAt: string | null;
  lastChangedBy: Executive | null;
  lastAutoRotationAt: string | null;
  lastAutoRotationBy: Executive | null;
  events: Array<{
    id: string;
    action: string;
    createdAt: string;
    user: Executive | null;
    changes?: any;
    targetExecutive?: Executive | null;
  }>;
};

export default function LeadAssignmentSettings() {
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [savingNext, setSavingNext] = useState(false);
  const [state, setState] = useState<AssignmentState | null>(null);
  const [selectedNextExecutive, setSelectedNextExecutive] = useState('');

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/lead-assignment');
      if (res.ok) {
        const data = await res.json();
        setState(data);
        setSelectedNextExecutive(data.nextExecutive?.id || '');
      }
    } catch (error) {
      console.error('Failed to fetch lead assignment state', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      setUserRole(parsed.role || '');
    }
  }, []);

  useEffect(() => {
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole)) return;
    fetchState();
  }, [fetchState, userRole]);

  const handleReset = async () => {
    if (!confirm('Reset the round-robin cursor? The next new lead will go to the first executive in the order shown.')) return;

    setResetting(true);
    try {
      const res = await fetch('/api/crm/lead-assignment', {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to reset cursor');
      }

      await fetchState();
    } catch (error) {
      console.error(error);
      alert('Failed to reset the assignment cursor');
    } finally {
      setResetting(false);
    }
  };

  const handleSetNextExecutive = async () => {
    if (!selectedNextExecutive) return;

    setSavingNext(true);
    try {
      const res = await fetch('/api/crm/lead-assignment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nextExecutiveUserId: selectedNextExecutive,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update next executive');
      }

      await fetchState();
    } catch (error) {
      console.error(error);
      alert('Failed to update the next executive');
    } finally {
      setSavingNext(false);
    }
  };

  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole)) return null;

  const formatExecutiveLabel = (executive?: Executive | null, fallback?: string) =>
    executive?.name || executive?.email || fallback || 'Not available';

  const formatTimestamp = (value: string | null) =>
    value ? new Date(value).toLocaleString() : null;

  const getEventLabel = (action: string) => {
    const labels: Record<string, string> = {
      AUTO_ROTATE_LEAD_ASSIGNMENT: 'Auto-rotation',
      SET_NEXT_LEAD_EXECUTIVE: 'Manual next executive set',
      RESET_LEAD_ASSIGNMENT_CURSOR: 'Cursor reset',
    };

    return labels[action] || action.replaceAll('_', ' ').toLowerCase();
  };

  const getEventBadgeClasses = (action: string) => {
    const classes: Record<string, string> = {
      AUTO_ROTATE_LEAD_ASSIGNMENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      SET_NEXT_LEAD_EXECUTIVE: 'bg-primary-50 text-primary-700 border-primary-200',
      RESET_LEAD_ASSIGNMENT_CURSOR: 'bg-amber-50 text-amber-700 border-amber-200',
    };

    return classes[action] || 'bg-secondary-50 text-secondary-700 border-secondary-200';
  };

  const getEventRowClasses = (action: string) => {
    const classes: Record<string, string> = {
      AUTO_ROTATE_LEAD_ASSIGNMENT: 'border-emerald-100 bg-emerald-50/30',
      SET_NEXT_LEAD_EXECUTIVE: 'border-primary-100 bg-primary-50/30',
      RESET_LEAD_ASSIGNMENT_CURSOR: 'border-amber-100 bg-amber-50/30',
    };

    return classes[action] || 'border-secondary-100 bg-white';
  };

  const getLatestEventRowClasses = (action: string) => {
    const classes: Record<string, string> = {
      AUTO_ROTATE_LEAD_ASSIGNMENT: 'border-emerald-200 bg-emerald-50/70',
      SET_NEXT_LEAD_EXECUTIVE: 'border-primary-200 bg-primary-50/70',
      RESET_LEAD_ASSIGNMENT_CURSOR: 'border-amber-200 bg-amber-50/70',
    };

    return classes[action] || 'border-secondary-200 bg-secondary-50/70';
  };

  const currentExecutiveLabel = formatExecutiveLabel(state?.currentExecutive, 'No lead assigned yet');
  const nextExecutiveLabel = formatExecutiveLabel(state?.nextExecutive, 'No active executives found');
  const executiveCount = state?.executives.length || 0;
  const hasExecutives = executiveCount > 0;
  const lastManualChange = formatTimestamp(state?.lastChangedAt || null);
  const lastAutoRotation = formatTimestamp(state?.lastAutoRotationAt || null);

  return (
    <div className="bg-white p-7 rounded-[2.5rem] border border-secondary-100 shadow-xl shadow-secondary-100/40 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-secondary-400 mb-2">Lead Assignment</p>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-black text-secondary-950">Round-robin control</h3>
            {hasExecutives && (
              <span className="inline-flex items-center rounded-full border border-secondary-200 bg-secondary-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-secondary-600">
                {executiveCount} executives active
              </span>
            )}
          </div>
          <p className="text-sm text-secondary-500 mt-2">
            New leads rotate across active executives only. Review who is up next, adjust the queue when needed, and keep the assignment flow predictable for the team.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={fetchState}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 text-sm font-bold text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
          <button
            onClick={handleReset}
            disabled={resetting || loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 text-sm font-bold text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          >
            <RotateCcw size={16} />
            {resetting ? 'Resetting...' : 'Reset cursor'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-secondary-100 bg-secondary-50/60 px-4 py-5 text-sm text-secondary-500">
          Loading assignment status...
        </div>
      ) : !state ? (
        <div className="rounded-2xl border border-danger-100 bg-danger-50/50 px-4 py-5 text-sm text-danger-600">
          Could not load assignment status.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
            <div className="rounded-[2rem] border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-emerald-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary-500 mb-2">Queue snapshot</p>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-secondary-500">Next new lead goes to</div>
                  <div className="mt-1 text-xl font-black text-secondary-950 break-words">{nextExecutiveLabel}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-secondary-500">
                    <ArrowRight size={14} className="text-primary-500" />
                    Rotation continues automatically after this assignment.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
                  <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Current cursor</div>
                    <div className="mt-1 text-sm font-bold text-secondary-900 break-words">{currentExecutiveLabel}</div>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Rotation size</div>
                    <div className="mt-1 text-sm font-bold text-secondary-900">{executiveCount} active</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-secondary-100 bg-secondary-50/60 p-5">
              <div className="flex items-center gap-2 text-secondary-900">
                <Clock3 size={16} className="text-secondary-500" />
                <p className="text-sm font-bold">Recent timeline</p>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Last manual change</div>
                  <div className="mt-1 text-sm font-bold text-secondary-900">
                    {lastManualChange ? `${formatExecutiveLabel(state.lastChangedBy, 'System')} on ${lastManualChange}` : 'No manual changes yet'}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Last auto-rotation</div>
                  <div className="mt-1 text-sm font-bold text-secondary-900">
                    {lastAutoRotation ? `${formatExecutiveLabel(state.lastAutoRotationBy, 'System')} on ${lastAutoRotation}` : 'No automatic rotation yet'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
            <div className="space-y-6">
              <div className="rounded-2xl border border-secondary-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400">Manual override</p>
                    <p className="text-xs text-secondary-500 mt-1">Choose who should receive the very next lead, then let the round-robin continue from there.</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={selectedNextExecutive}
                    onChange={(e) => setSelectedNextExecutive(e.target.value)}
                    className="input flex-1"
                  >
                    <option value="">Select executive</option>
                    {state.executives.map((executive) => (
                      <option key={executive.id} value={executive.id}>
                        {executive.name || executive.email}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSetNextExecutive}
                    disabled={!selectedNextExecutive || savingNext || loading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50"
                  >
                    {savingNext ? 'Saving...' : 'Set next executive'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-secondary-100 bg-secondary-50/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCcw size={16} className="text-secondary-400" />
                  <p className="text-sm font-bold text-secondary-900">Executive order</p>
                </div>
                <p className="text-xs text-secondary-500 mb-3">Top to bottom is the live round-robin sequence. The highlighted row shows where the queue is now and who receives the next lead.</p>
                {!hasExecutives ? (
                  <div className="rounded-2xl border border-secondary-100 bg-white px-4 py-5 text-sm text-secondary-500">
                    No active executives are available for auto-assignment.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {state.executives.map((executive, index) => {
                      const isCurrent = executive.id === state.currentCursorUserId;
                      const isNext = executive.id === state.nextExecutive?.id;
                      return (
                        <div
                          key={executive.id}
                          className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                            isCurrent
                              ? 'border-primary-200 bg-primary-50'
                              : isNext
                                ? 'border-emerald-200 bg-emerald-50/50'
                                : 'border-secondary-100 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-secondary-100 text-secondary-700 flex items-center justify-center text-xs font-black">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-bold text-secondary-900">{executive.name || executive.email}</div>
                              <div className="text-xs text-secondary-500">{executive.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {isCurrent && (
                              <div className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary-600">
                                <UserRound size={12} />
                                Last assigned
                              </div>
                            )}
                            {isNext && (
                              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                                Next lead
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <RefreshCcw size={16} className="text-secondary-400" />
              <p className="text-sm font-bold text-secondary-900">Recent assignment activity</p>
            </div>
            <p className="text-xs text-secondary-500 mb-3">A quick history of the latest 10 queue changes, including manual overrides, resets, and automatic rotations.</p>
            {state.events.length === 0 ? (
              <div className="rounded-2xl border border-secondary-100 bg-secondary-50/50 px-4 py-5 text-sm text-secondary-500">
                No assignment activity yet.
              </div>
            ) : (
              <div className="space-y-2">
                {state.events.map((event, index) => (
                  <div
                    key={event.id}
                    className={`rounded-2xl border px-4 py-3 transition-all ${
                      index === 0
                        ? getLatestEventRowClasses(event.action)
                        : getEventRowClasses(event.action)
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${getEventBadgeClasses(event.action)}`}>
                            {getEventLabel(event.action)}
                          </span>
                          {index === 0 && (
                            <span className="inline-flex items-center rounded-full border border-secondary-900 bg-secondary-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white">
                              Latest
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-secondary-500">
                          {formatExecutiveLabel(event.user, 'System')} on {new Date(event.createdAt).toLocaleString()}
                        </div>
                        {event.targetExecutive && (
                          <div className="text-xs text-secondary-600 mt-1">
                            Executive: {formatExecutiveLabel(event.targetExecutive)}
                          </div>
                        )}
                      </div>
                      {event.changes?.nextExecutiveUserId && (
                        <div className="text-xs font-bold text-primary-600">
                          Next executive set
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
