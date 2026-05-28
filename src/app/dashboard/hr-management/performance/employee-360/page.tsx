'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Activity, BarChart3, Clock3, Target, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { downloadCSV } from '@/lib/csv-utils';

type Scope = 'self' | 'team' | 'company';

export default function EmployeePerformance360Page() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    scope: 'self' as Scope,
    days: 30,
    trendMonths: 6,
    employeeId: '',
  });

  const canTeamScope = useMemo(() => {
    const role = user?.role;
    return ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'].includes(role);
  }, [user]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const payload = await res.json();
      const currentUser = payload?.user;
      setUser(currentUser);
      if (currentUser) {
        const managerLike = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'].includes(currentUser.role);
        setFilters((prev) => ({ ...prev, scope: managerLike ? 'team' : 'self' }));
      }
    } catch {
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('scope', filters.scope);
      params.set('days', String(filters.days));
      params.set('trendMonths', String(filters.trendMonths));
      if (filters.employeeId.trim()) params.set('employeeId', filters.employeeId.trim());

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/hr/performance/employee-360?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to load 360 analytics');
      setData(payload);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const exportCsv = useCallback(() => {
    if (!data?.employees?.length) return;
    const headers = [
      'Employee',
      'Designation',
      'AttendanceRate',
      'ReportsSubmitted',
      'ReportSubmissionRate',
      'AvgKraMatch',
      'AvgKpiProgress',
      'OverallScore',
      'Revenue',
    ];
    const rows = data.employees.map((e: any) => [
      safeCsv(e.name),
      safeCsv(e.designation),
      e.attendance.attendanceRate,
      e.workReports.submittedReports,
      e.workReports.reportSubmissionRate,
      Number(e.workReports.avgKraMatch || 0).toFixed(4),
      e.kpiKra.averageKpiProgress,
      e.latestSnapshot?.overallScore ?? '',
      e.workReports.totalRevenue,
    ]);
    const csv = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
    downloadCSV(csv, `employee-performance-360-${new Date().toISOString().split('T')[0]}.csv`);
  }, [data]);

  const exportPdf = useCallback(async () => {
    if (!data?.employees?.length) return;
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const autoTable = (autoTableModule as any).default;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(16);
    doc.text('Employee Performance 360', 40, 40);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
    doc.text(`Scope: ${filters.scope} | Window: ${filters.days} days`, 40, 72);

    autoTable(doc, {
      startY: 88,
      head: [[
        'Employee',
        'Designation',
        'Attendance%',
        'Reports',
        'Submission%',
        'KRA Match%',
        'KPI%',
        'Score',
        'Revenue',
      ]],
      body: data.employees.map((e: any) => [
        e.name,
        e.designation,
        e.attendance.attendanceRate,
        `${e.workReports.submittedReports}/${e.attendance.expectedWorkingDays}`,
        e.workReports.reportSubmissionRate,
        (Number(e.workReports.avgKraMatch || 0) * 100).toFixed(1),
        e.kpiKra.averageKpiProgress,
        e.latestSnapshot?.overallScore?.toFixed?.(1) || 'N/A',
        `INR ${Number(e.workReports.totalRevenue || 0).toLocaleString()}`,
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`employee-performance-360-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [data, filters.days, filters.scope]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-secondary-900">Employee Performance 360</h1>
            <p className="text-secondary-500">
              Unified attendance, work reports, activities, KPI/KRA progress, trends, and manager insights.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary" onClick={exportCsv} disabled={!data?.employees?.length}>
              Export CSV
            </button>
            <button className="btn btn-primary" onClick={exportPdf} disabled={!data?.employees?.length}>
              Export PDF
            </button>
          </div>
        </div>

        <div className="card-premium p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Scope</label>
              <select
                className="input"
                value={filters.scope}
                onChange={(e) => setFilters((prev) => ({ ...prev, scope: e.target.value as Scope }))}
              >
                <option value="self">Self</option>
                {canTeamScope && <option value="team">Team</option>}
                {canTeamScope && <option value="company">Company</option>}
              </select>
            </div>
            <div>
              <label className="label">Window</label>
              <select
                className="input"
                value={filters.days}
                onChange={(e) => setFilters((prev) => ({ ...prev, days: Number(e.target.value) }))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
            <div>
              <label className="label">Trend Range</label>
              <select
                className="input"
                value={filters.trendMonths}
                onChange={(e) => setFilters((prev) => ({ ...prev, trendMonths: Number(e.target.value) }))}
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn btn-primary w-full" onClick={fetchData}>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="card-premium p-12 text-center text-secondary-500">Loading 360 analytics...</div>
        )}

        {!loading && error && (
          <div className="card-premium p-6 text-danger-600 font-semibold">{error}</div>
        )}

        {!loading && !error && data?.summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard icon={Users} label="Employees" value={data.summary.employeeCount} />
              <MetricCard icon={Clock3} label="Attendance Rate" value={`${data.summary.attendanceRate}%`} />
              <MetricCard icon={Activity} label="Report Submission" value={`${data.summary.reportSubmissionRate}%`} />
              <MetricCard icon={Target} label="Avg KPI Progress" value={`${data.summary.avgKpiProgress}%`} />
              <MetricCard icon={BarChart3} label="Avg Overall Score" value={data.summary.avgOverallScore} />
              <MetricCard icon={TrendingUp} label="Revenue Tagged" value={`₹${Number(data.summary.totalRevenue || 0).toLocaleString()}`} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="card-premium p-4 md:p-6">
                <h3 className="text-lg font-black text-secondary-900 mb-3">Monthly Score Trends</h3>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Overall</th>
                        <th>Attendance</th>
                        <th>Reports</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.monthlyTrends || []).map((row: any) => (
                        <tr key={row.month}>
                          <td>{row.month}</td>
                          <td className="font-bold">{row.overallScore}</td>
                          <td>{row.attendanceScore}%</td>
                          <td>{row.reportSubmissionRate}%</td>
                          <td>₹{Number(row.totalRevenueGenerated || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card-premium p-4 md:p-6">
                <h3 className="text-lg font-black text-secondary-900 mb-3">Manager Insights</h3>
                <div className="space-y-4">
                  <InsightList title="Top Performers" items={data.managerInsights?.topPerformers || []} />
                  <InsightList title="Needs Attention" items={data.managerInsights?.needsAttention || []} />
                  <InsightList title="Most Improved" items={data.managerInsights?.mostImproved || []} />
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="card-premium p-4 md:p-6">
                <h3 className="text-lg font-black text-secondary-900 mb-3">Employee 360 Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Attendance</th>
                        <th>Reports</th>
                        <th>KRA Match</th>
                        <th>KPI</th>
                        <th>Score</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.employees || []).map((e: any) => (
                        <tr key={e.employeeId}>
                          <td>
                            <div className="font-bold">{e.name}</div>
                            <div className="text-xs text-secondary-500">{e.designation}</div>
                          </td>
                          <td>{e.attendance.attendanceRate}%</td>
                          <td>{e.workReports.submittedReports}/{e.attendance.expectedWorkingDays}</td>
                          <td>{(Number(e.workReports.avgKraMatch || 0) * 100).toFixed(1)}%</td>
                          <td>{e.kpiKra.averageKpiProgress}%</td>
                          <td className="font-bold">{e.latestSnapshot?.overallScore?.toFixed?.(1) || 'N/A'}</td>
                          <td>
                            <Link
                              href={`/dashboard/hr-management/performance/employee-360/${e.employeeId}`}
                              className="text-xs font-black text-primary-700 hover:underline"
                            >
                              View Timeline
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card-premium p-4 md:p-6">
                <h3 className="text-lg font-black text-secondary-900 mb-3">Recent Activities</h3>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                  {(data.activities || []).length === 0 && (
                    <p className="text-sm text-secondary-500">No activity found in selected scope.</p>
                  )}
                  {(data.activities || []).map((item: any) => (
                    <div key={item.id} className="rounded-xl border border-secondary-100 p-3 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-wider text-primary-700">{item.type}</p>
                        <p className="text-xs text-secondary-500">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                      <p className="text-sm font-semibold text-secondary-800 mt-1">{item.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function safeCsv(value: unknown) {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="card-premium p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-black text-secondary-500">{label}</p>
        <Icon size={16} className="text-primary-600" />
      </div>
      <p className="mt-2 text-2xl font-black text-secondary-900">{value}</p>
    </div>
  );
}

function InsightList({ title, items }: { title: string; items: any[] }) {
  return (
    <div>
      <h4 className="text-sm font-black text-secondary-800 mb-2">{title}</h4>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-xs text-secondary-500">No entries.</p>}
        {items.map((item) => (
          <div key={`${title}-${item.employeeId}`} className="rounded-lg border border-secondary-100 bg-secondary-50 p-2">
            <p className="text-sm font-bold text-secondary-900">{item.name}</p>
            <p className="text-xs text-secondary-600">
              {Object.entries(item)
                .filter(([key]) => !['employeeId', 'name'].includes(key))
                .map(([key, value]) => `${key}: ${String(value)}`)
                .join(' | ')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
