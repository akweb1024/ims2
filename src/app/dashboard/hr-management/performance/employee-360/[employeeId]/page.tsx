'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EmployeePerformanceTimelinePage() {
  const params = useParams<{ employeeId: string }>();
  const router = useRouter();
  const employeeId = params?.employeeId;

  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const endpoint = useMemo(() => {
    const p = new URLSearchParams();
    p.set('employeeId', employeeId || '');
    p.set('days', String(days));
    return `/api/hr/performance/employee-360/timeline?${p.toString()}`;
  }, [employeeId, days]);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to load timeline');
        if (active) setData(payload);
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load timeline');
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [endpoint, employeeId]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button className="text-sm font-bold text-primary-600 hover:underline" onClick={() => router.back()}>
              Back
            </button>
            <h1 className="text-3xl font-black text-secondary-900 mt-1">Employee Timeline</h1>
            <p className="text-secondary-500">
              Detailed attendance and work-report chronology.
            </p>
          </div>
          <div className="w-52">
            <label className="label">Window</label>
            <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {loading && <div className="card-premium p-8 text-secondary-500">Loading timeline...</div>}
        {!loading && error && <div className="card-premium p-6 text-danger-600 font-semibold">{error}</div>}

        {!loading && !error && data && (
          <>
            <div className="card-premium p-4 md:p-6">
              <h2 className="text-lg font-black text-secondary-900">{data.employee?.name}</h2>
              <p className="text-sm text-secondary-500">{data.employee?.designation} | {data.employee?.email}</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                <Metric label="Attendance Days" value={data.summary?.attendanceDays || 0} />
                <Metric label="Present Days" value={data.summary?.presentDays || 0} />
                <Metric label="Late Days" value={data.summary?.lateDays || 0} />
                <Metric label="Reports" value={data.summary?.reportsSubmitted || 0} />
                <Metric label="Approved" value={data.summary?.reportsApproved || 0} />
              </div>
            </div>

            <div className="card-premium p-4 md:p-6">
              <h3 className="text-lg font-black text-secondary-900 mb-4">Chronological Timeline</h3>
              <div className="space-y-3">
                {(data.timeline || []).map((item: any, idx: number) => (
                  <div key={`${item.type}-${idx}`} className="rounded-xl border border-secondary-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-wider font-black text-primary-700">{item.type}</p>
                      <p className="text-xs text-secondary-500">{new Date(item.at).toLocaleString()}</p>
                    </div>
                    {item.type === 'ATTENDANCE' ? (
                      <p className="text-sm text-secondary-800 mt-1">
                        {item.payload.status} | In: {item.payload.checkIn ? new Date(item.payload.checkIn).toLocaleTimeString() : '-'} | Out: {item.payload.checkOut ? new Date(item.payload.checkOut).toLocaleTimeString() : '-'} | Late: {item.payload.lateMinutes || 0} mins
                      </p>
                    ) : (
                      <div className="mt-1 text-sm text-secondary-800">
                        <p className="font-bold">{item.payload.title}</p>
                        <p>Status: {item.payload.status} | Tasks: {item.payload.tasksCompleted || 0} | Hours: {item.payload.hoursSpent || 0}</p>
                        {item.payload.managerComment && (
                          <p className="text-xs text-secondary-600 mt-1">Manager: {item.payload.managerComment}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-secondary-100 p-3 bg-white">
      <p className="text-[10px] font-black uppercase tracking-wider text-secondary-500">{label}</p>
      <p className="text-xl font-black text-secondary-900 mt-1">{value}</p>
    </div>
  );
}

