'use client';

import { useMemo, useState } from 'react';
import type { TwinTracePayload } from '@/lib/digital-twin/trace-types';

interface TracePanelProps {
  trace: TwinTracePayload | null;
  loading?: boolean;
}

type TraceTab = 'activities' | 'behaviors' | 'performance';

const severityClasses: Record<string, string> = {
  INFO: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  SUCCESS: 'bg-green-500/15 text-green-300 border-green-500/30',
  WARNING: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  CRITICAL: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export function TracePanel({ trace, loading = false }: TracePanelProps) {
  const [tab, setTab] = useState<TraceTab>('activities');
  const [expanded, setExpanded] = useState(true);

  const summary = useMemo(() => {
    if (!trace) return { activities: 0, highRisk: 0, health: 0 };
    return {
      activities: trace.activities.length,
      highRisk: trace.behaviors.filter((b) => b.risk === 'HIGH').length,
      health: trace.performance.healthScore,
    };
  }, [trace]);

  return (
    <div className="mb-8">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/25 hover:border-cyan-400/40 transition-all"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-black uppercase tracking-widest text-white">Trace Matrix</span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
            {summary.activities} events
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
            {summary.highRisk} high-risk behaviors
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/40 uppercase tracking-widest">Health {summary.health}</span>
          <span className="text-white/40">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm overflow-hidden">
          <div className="flex border-b border-white/8">
            {[
              ['activities', 'Activities'],
              ['behaviors', 'Behaviors'],
              ['performance', 'Performance'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id as TraceTab)}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  tab === id
                    ? 'bg-cyan-500/15 text-cyan-300 border-b-2 border-cyan-400'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {loading && <div className="text-white/50 text-sm">Loading traces...</div>}

            {!loading && !trace && (
              <div className="text-white/40 text-sm">No trace snapshot available yet.</div>
            )}

            {!loading && trace && tab === 'activities' && (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {trace.activities.map((event) => (
                  <div key={event.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{event.title}</p>
                      <span className={`text-[9px] px-2 py-0.5 border rounded-full font-black ${severityClasses[event.severity] || severityClasses.INFO}`}>
                        {event.severity}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">{event.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-white/35">
                      <span>{new Date(event.at).toLocaleString()}</span>
                      <span>{event.entityType}</span>
                      {event.actorName && <span>By {event.actorName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && trace && tab === 'behaviors' && (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {trace.behaviors.map((behavior) => (
                  <div key={behavior.employeeId} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{behavior.name}</p>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full border font-black ${
                          behavior.risk === 'HIGH'
                            ? 'bg-red-500/15 text-red-300 border-red-500/30'
                            : behavior.risk === 'MEDIUM'
                              ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                              : 'bg-green-500/15 text-green-300 border-green-500/30'
                        }`}
                      >
                        {behavior.risk}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[10px] text-white/55">
                      <span>Score: <strong>{behavior.behaviorScore}</strong></span>
                      <span>Attendance(7d): <strong>{behavior.attendanceDays7d}</strong></span>
                      <span>Reports(7d): <strong>{behavior.workReports7d}</strong></span>
                      <span>Open Tasks: <strong>{behavior.openTasks}</strong></span>
                      <span>Overdue: <strong>{behavior.overdueTasks}</strong></span>
                      <span>Completed(30d): <strong>{behavior.completedTasks30d}</strong></span>
                      <span>KPI: <strong>{behavior.avgKpiProgress.toFixed(0)}%</strong></span>
                      <span>KRA: <strong>{(behavior.avgKraMatch30d * 100).toFixed(0)}%</strong></span>
                      <span>Projects: <strong>{behavior.activeProjects}</strong></span>
                      <span>Think Tank: <strong>{behavior.thinkTankContributions30d}</strong></span>
                      <span>Discipline: <strong>{behavior.disciplineScore.toFixed(0)}</strong></span>
                      <span>Deals: <strong>{behavior.activeDeals}</strong></span>
                      <span>Tickets: <strong>{behavior.activeTickets}</strong></span>
                      <span>Reviews: <strong>{behavior.activeReviews}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && trace && tab === 'performance' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    ['Health Score', trace.performance.healthScore],
                    ['Tasks Done (7d)', trace.performance.tasksCompleted7d],
                    ['Dispatch Delivered (7d)', trace.performance.dispatchDelivered7d],
                    ['Stock Moves (7d)', trace.performance.stockMovements7d],
                    ['Open Deals', trace.performance.openDeals],
                    ['Avg KPI %', trace.performance.avgKpiProgress.toFixed(1)],
                    ['Avg KRA %', (trace.performance.avgKraMatch30d * 100).toFixed(1)],
                    ['Think Tank Active', trace.performance.thinkTankContributors],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-white/35 uppercase tracking-widest">{label}</p>
                      <p className="text-lg font-black text-cyan-300 mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-white/35 uppercase tracking-widest mb-2">Top Contributors (30d)</p>
                  <div className="space-y-2 max-h-[240px] overflow-auto pr-1">
                    {trace.performance.topContributors.length === 0 && (
                      <p className="text-white/40 text-sm">No contributor data in selected period.</p>
                    )}
                    {trace.performance.topContributors.map((row) => (
                      <div key={row.employeeId} className="flex items-center justify-between text-sm border border-white/10 rounded-lg p-2 bg-black/20">
                        <span className="text-white/80 font-semibold">{row.name}</span>
                        <span className="text-white/45">
                          Tasks: <strong className="text-white/80">{row.tasksCompleted30d}</strong> · Revenue: <strong className="text-white/80">{row.revenueGenerated30d.toLocaleString()}</strong> · Rating: <strong className="text-white/80">{row.avgRating30d}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
