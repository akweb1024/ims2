'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type Metric = {
  id: string;
  scope: string;
  key: string;
  name: string;
  sourceModule: string;
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
};

type EventRow = {
  id: string;
  metricKey: string;
  metricScope: string;
  value: number;
  baselineValue?: number | null;
  severity: string;
  sourceModule: string;
  capturedAt: string;
};

type CronStatus = {
  ranAt: string;
  cadence: string | null;
  processedCompanies: number;
  rollups: number;
  anomalies: number;
  employeeSnapshots: number;
  companySnapshots: number;
};

export default function PerformanceObservabilityPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [metricsRes, eventsRes] = await Promise.all([
        fetch('/api/performance-observability/metrics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/performance-observability/events?limit=120', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const cronRes = await fetch('/api/performance-observability/cron-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (metricsRes.ok) {
        const json = await metricsRes.json();
        setMetrics(json.data || []);
      }
      if (eventsRes.ok) {
        const json = await eventsRes.json();
        setEvents(json.data || []);
      }
      if (cronRes.ok) {
        const json = await cronRes.json();
        setCronStatus(json.data || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runPhase2 = async () => {
    setRunning(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/performance-observability/jobs/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await load();
    } finally {
      setRunning(false);
    }
  };

  const stats = useMemo(() => {
    const warning = events.filter((e) => e.severity === 'WARNING').length;
    const critical = events.filter((e) => e.severity === 'CRITICAL').length;
    const anomaly = events.filter((e) => e.sourceModule === 'OBS_ANOMALY').length;
    return { warning, critical, anomaly };
  }, [events]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Performance Observability</h1>
              <p className="text-sm text-slate-500 mt-1">Micro monitoring for employee + company performance, connected with Digital Twin traces.</p>
            </div>
            <button
              onClick={runPhase2}
              disabled={running}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider disabled:opacity-60"
            >
              {running ? 'Running...' : 'Run Phase 2 Jobs'}
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Last Cron Run</div>
            {!cronStatus ? (
              <div className="text-xs text-emerald-800 mt-1">No cron run recorded yet.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mt-2 text-[11px] text-emerald-900">
                <div><span className="font-bold">At:</span> {new Date(cronStatus.ranAt).toLocaleString()}</div>
                <div><span className="font-bold">Cadence:</span> {cronStatus.cadence || '-'}</div>
                <div><span className="font-bold">Companies:</span> {cronStatus.processedCompanies}</div>
                <div><span className="font-bold">Rollups:</span> {cronStatus.rollups}</div>
                <div><span className="font-bold">Anomalies:</span> {cronStatus.anomalies}</div>
                <div><span className="font-bold">Emp Snap:</span> {cronStatus.employeeSnapshots}</div>
                <div><span className="font-bold">Co Snap:</span> {cronStatus.companySnapshots}</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
            <MetricCard label="Metrics" value={String(metrics.length)} />
            <MetricCard label="Signals" value={String(events.length)} />
            <MetricCard label="Warnings" value={String(stats.warning)} />
            <MetricCard label="Critical" value={String(stats.critical)} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-3">KPI Contracts</h2>
            <div className="max-h-[420px] overflow-auto space-y-2">
              {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
              {!loading && metrics.length === 0 ? <p className="text-sm text-slate-500">No KPI definitions yet.</p> : null}
              {metrics.map((metric) => (
                <div key={metric.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="text-xs font-black text-slate-800">{metric.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">{metric.key}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{metric.scope} · {metric.sourceModule}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-3">Recent Signals</h2>
            <div className="max-h-[420px] overflow-auto space-y-2">
              {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
              {!loading && events.length === 0 ? <p className="text-sm text-slate-500">No signal events yet.</p> : null}
              {events.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-slate-800">{event.metricKey}</div>
                    <span className={`text-[10px] font-black ${event.severity === 'CRITICAL' ? 'text-rose-600' : event.severity === 'WARNING' ? 'text-amber-600' : 'text-slate-500'}`}>{event.severity}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {event.metricScope} · {event.value}
                    {event.baselineValue !== null && event.baselineValue !== undefined ? ` (baseline ${event.baselineValue})` : ''}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{event.sourceModule} · {new Date(event.capturedAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-xs text-blue-800">
          Next: we can add drill-down charts + intervention playbooks and embed the anomaly stream in `/dashboard/digital-twin`.
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-black text-slate-900 mt-1">{value}</div>
    </div>
  );
}
