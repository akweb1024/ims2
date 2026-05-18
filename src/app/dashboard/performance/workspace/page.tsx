'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type TabKey = 'goals' | 'kpis' | 'tasks' | 'review';

const TAB_LABELS: Record<TabKey, string> = {
  goals: 'Goals',
  kpis: 'KPIs',
  tasks: 'Task Templates',
  review: 'Monthly Review',
};

function toTab(value: string | null): TabKey {
  if (value === 'kpis' || value === 'tasks' || value === 'review' || value === 'goals') return value;
  return 'goals';
}

export default function PerformanceWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>('goals');
  const [userRole, setUserRole] = useState<string>('EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [goals, setGoals] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [goalDraft, setGoalDraft] = useState<any>(null);
  const [kpiDraft, setKpiDraft] = useState<any>(null);
  const [taskDraft, setTaskDraft] = useState<any>(null);
  const [goalFilters, setGoalFilters] = useState({ employeeId: 'ALL', period: 'ALL', status: 'ALL' });
  const [kpiFilters, setKpiFilters] = useState({ employeeId: 'ALL', period: 'ALL', status: 'ALL' });
  const [taskFilters, setTaskFilters] = useState({ employeeId: 'ALL', period: 'ALL', status: 'ALL' });
  const [reviewFilters, setReviewFilters] = useState({ employeeId: 'ALL', period: 'ALL', status: 'ALL' });

  useEffect(() => {
    const urlTab = toTab(searchParams.get('tab'));
    setActiveTab(urlTab);
    setGoalFilters({
      employeeId: searchParams.get('goalsEmployee') || 'ALL',
      period: searchParams.get('goalsPeriod') || 'ALL',
      status: searchParams.get('goalsStatus') || 'ALL',
    });
    setKpiFilters({
      employeeId: searchParams.get('kpisEmployee') || 'ALL',
      period: searchParams.get('kpisPeriod') || 'ALL',
      status: searchParams.get('kpisStatus') || 'ALL',
    });
    setTaskFilters({
      employeeId: searchParams.get('tasksEmployee') || 'ALL',
      period: searchParams.get('tasksPeriod') || 'ALL',
      status: searchParams.get('tasksStatus') || 'ALL',
    });
    setReviewFilters({
      employeeId: searchParams.get('reviewEmployee') || 'ALL',
      period: searchParams.get('reviewPeriod') || 'ALL',
      status: searchParams.get('reviewStatus') || 'ALL',
    });
  }, [searchParams]);

  const updateUrlFilters = useCallback((next: {
    tab?: TabKey;
    goals?: { employeeId: string; period: string; status: string };
    kpis?: { employeeId: string; period: string; status: string };
    tasks?: { employeeId: string; period: string; status: string };
    review?: { employeeId: string; period: string; status: string };
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextTab = next.tab || activeTab;
    params.set('tab', nextTab);

    const g = next.goals || goalFilters;
    const k = next.kpis || kpiFilters;
    const t = next.tasks || taskFilters;
    const r = next.review || reviewFilters;

    params.set('goalsEmployee', g.employeeId);
    params.set('goalsPeriod', g.period);
    params.set('goalsStatus', g.status);

    params.set('kpisEmployee', k.employeeId);
    params.set('kpisPeriod', k.period);
    params.set('kpisStatus', k.status);

    params.set('tasksEmployee', t.employeeId);
    params.set('tasksPeriod', t.period);
    params.set('tasksStatus', t.status);

    params.set('reviewEmployee', r.employeeId);
    params.set('reviewPeriod', r.period);
    params.set('reviewStatus', r.status);

    router.replace(`/dashboard/performance/workspace?${params.toString()}`);
  }, [activeTab, goalFilters, kpiFilters, taskFilters, reviewFilters, router, searchParams]);

  const clearFiltersForTab = useCallback((tab: TabKey) => {
    if (tab === 'goals') {
      const next = { employeeId: 'ALL', period: 'ALL', status: 'ALL' };
      setGoalFilters(next);
      updateUrlFilters({ goals: next });
      return;
    }
    if (tab === 'kpis') {
      const next = { employeeId: 'ALL', period: 'ALL', status: 'ALL' };
      setKpiFilters(next);
      updateUrlFilters({ kpis: next });
      return;
    }
    if (tab === 'tasks') {
      const next = { employeeId: 'ALL', period: 'ALL', status: 'ALL' };
      setTaskFilters(next);
      updateUrlFilters({ tasks: next });
      return;
    }
    const next = { employeeId: 'ALL', period: 'ALL', status: 'ALL' };
    setReviewFilters(next);
    updateUrlFilters({ review: next });
  }, [updateUrlFilters]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user?.role) setUserRole(user.role);
      } catch {
      }
    }
  }, []);

  const authHeaders = useMemo<HeadersInit>(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);
  }, []);

  const loadGoals = useCallback(async () => {
    const res = await fetch('/api/hr/performance/goals', { headers: authHeaders });
    if (!res.ok) throw new Error('Failed to load goals');
    setGoals(await res.json());
  }, [authHeaders]);

  const loadEmployees = useCallback(async () => {
    const res = await fetch('/api/hr/employees', { headers: authHeaders });
    if (!res.ok) throw new Error('Failed to load employees');
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
  }, [authHeaders]);

  const loadKpis = useCallback(async () => {
    const res = await fetch('/api/hr/performance/kpis', { headers: authHeaders });
    if (!res.ok) throw new Error('Failed to load KPIs');
    setKpis(await res.json());
  }, [authHeaders]);

  const loadTaskTemplates = useCallback(async () => {
    const res = await fetch('/api/hr/tasks', { headers: authHeaders });
    if (!res.ok) throw new Error('Failed to load task templates');
    setTaskTemplates(await res.json());
  }, [authHeaders]);

  const loadMonthly = useCallback(async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const res = await fetch(`/api/hr/performance/monthly?month=${month}&year=${year}`, { headers: authHeaders });
    if (!res.ok) throw new Error('Failed to load monthly review');
    const data = await res.json();
    setSnapshots(Array.isArray(data) ? data : []);
  }, [authHeaders]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadGoals(), loadKpis(), loadTaskTemplates(), loadMonthly(), loadEmployees()]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  }, [loadGoals, loadKpis, loadMonthly, loadTaskTemplates, loadEmployees]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openNewGoal = () => setGoalDraft({
    employeeId: employees[0]?.id || '',
    title: '',
    description: '',
    targetValue: 0,
    currentValue: 0,
    unit: 'units',
    type: 'MONTHLY',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    status: 'IN_PROGRESS',
  });

  const openEditGoal = (goal: any) => setGoalDraft({
    id: goal.id,
    employeeId: goal.employeeId,
    title: goal.title || '',
    description: goal.description || '',
    targetValue: goal.targetValue ?? 0,
    currentValue: goal.currentValue ?? 0,
    unit: goal.unit || 'units',
    type: goal.type || 'MONTHLY',
    startDate: new Date(goal.startDate).toISOString().slice(0, 10),
    endDate: new Date(goal.endDate).toISOString().slice(0, 10),
    status: goal.status || 'IN_PROGRESS',
  });

  const openNewKpi = () => setKpiDraft({
    employeeId: employees[0]?.id || '',
    title: '',
    target: 0,
    current: 0,
    unit: 'units',
    period: 'MONTHLY',
    category: 'GENERAL',
  });

  const openEditKpi = (kpi: any) => setKpiDraft({
    id: kpi.id,
    employeeId: kpi.employeeId,
    title: kpi.title || '',
    target: kpi.target ?? 0,
    current: kpi.current ?? 0,
    unit: kpi.unit || 'units',
    period: kpi.period || 'MONTHLY',
    category: kpi.category || 'GENERAL',
  });

  const openNewTaskTemplate = () => setTaskDraft({
    title: '',
    description: '',
    points: 10,
    frequency: 'DAILY',
    targetValue: 1,
    targetUnit: 'COUNT',
    isActive: true,
    employeeId: '',
  });

  const openEditTaskTemplate = (task: any) => setTaskDraft({
    id: task.id,
    title: task.title || '',
    description: task.description || '',
    points: task.points ?? 10,
    frequency: task.frequency || 'DAILY',
    targetValue: task.targetValue ?? 1,
    targetUnit: task.targetUnit || 'COUNT',
    isActive: task.isActive !== false,
    employeeId: task.employeeId || '',
  });

  const saveGoal = async () => {
    if (!goalDraft) return;
    if (!goalDraft.employeeId || !goalDraft.title || !goalDraft.unit || !goalDraft.type || !goalDraft.startDate || !goalDraft.endDate) {
      setFormError('Please fill all required goal fields.');
      return;
    }
    if (Number(goalDraft.targetValue) < 0 || Number(goalDraft.currentValue) < 0) {
      setFormError('Target and current values must be zero or greater.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const method = goalDraft.id ? 'PATCH' : 'POST';
      const payload = {
        ...(goalDraft.id ? { id: goalDraft.id } : {}),
        employeeId: goalDraft.employeeId,
        title: goalDraft.title,
        description: goalDraft.description,
        targetValue: Number(goalDraft.targetValue),
        currentValue: Number(goalDraft.currentValue),
        unit: goalDraft.unit,
        type: goalDraft.type,
        startDate: goalDraft.startDate,
        endDate: goalDraft.endDate,
        status: goalDraft.status,
      };
      const res = await fetch('/api/hr/performance/goals', {
        method,
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save goal');
      setGoalDraft(null);
      await loadGoals();
      setNotice({ type: 'success', message: 'Goal saved successfully.' });
    } catch (e: any) {
      setError(e?.message || 'Failed to save goal');
      setNotice({ type: 'error', message: e?.message || 'Failed to save goal.' });
    } finally {
      setSaving(false);
    }
  };

  const saveKpi = async () => {
    if (!kpiDraft) return;
    if (!kpiDraft.employeeId || !kpiDraft.title || !kpiDraft.unit || !kpiDraft.period) {
      setFormError('Please fill all required KPI fields.');
      return;
    }
    if (Number(kpiDraft.target) < 0 || Number(kpiDraft.current) < 0) {
      setFormError('Target and current values must be zero or greater.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        ...(kpiDraft.id ? { id: kpiDraft.id } : {}),
        employeeId: kpiDraft.employeeId,
        title: kpiDraft.title,
        target: Number(kpiDraft.target),
        current: Number(kpiDraft.current),
        unit: kpiDraft.unit,
        period: kpiDraft.period,
        category: kpiDraft.category,
      };
      const res = await fetch('/api/hr/performance/kpis', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save KPI');
      setKpiDraft(null);
      await loadKpis();
      setNotice({ type: 'success', message: 'KPI saved successfully.' });
    } catch (e: any) {
      setError(e?.message || 'Failed to save KPI');
      setNotice({ type: 'error', message: e?.message || 'Failed to save KPI.' });
    } finally {
      setSaving(false);
    }
  };

  const saveTaskTemplate = async () => {
    if (!taskDraft) return;
    if (!taskDraft.title || !taskDraft.frequency || !taskDraft.targetUnit) {
      setFormError('Please fill all required task template fields.');
      return;
    }
    if (Number(taskDraft.points) < 0 || Number(taskDraft.targetValue) < 0) {
      setFormError('Points and target value must be zero or greater.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const method = taskDraft.id ? 'PUT' : 'POST';
      const payload = {
        ...(taskDraft.id ? { id: taskDraft.id } : {}),
        title: taskDraft.title,
        description: taskDraft.description,
        points: Number(taskDraft.points),
        frequency: taskDraft.frequency,
        targetValue: Number(taskDraft.targetValue),
        targetUnit: taskDraft.targetUnit,
        isActive: taskDraft.isActive,
        employeeId: taskDraft.employeeId || null,
      };
      const res = await fetch('/api/hr/tasks', {
        method,
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save task template');
      setTaskDraft(null);
      await loadTaskTemplates();
      setNotice({ type: 'success', message: 'Task template saved successfully.' });
    } catch (e: any) {
      setError(e?.message || 'Failed to save task template');
      setNotice({ type: 'error', message: e?.message || 'Failed to save task template.' });
    } finally {
      setSaving(false);
    }
  };

  const goalRows = goals.filter((g) => {
    const employeeMatch = goalFilters.employeeId === 'ALL' || g.employeeId === goalFilters.employeeId;
    const periodMatch = goalFilters.period === 'ALL' || g.type === goalFilters.period;
    const statusMatch = goalFilters.status === 'ALL' || g.status === goalFilters.status;
    return employeeMatch && periodMatch && statusMatch;
  });

  const kpiRows = kpis.filter((k) => {
    const employeeMatch = kpiFilters.employeeId === 'ALL' || k.employeeId === kpiFilters.employeeId;
    const periodMatch = kpiFilters.period === 'ALL' || k.period === kpiFilters.period;
    const statusMatch = kpiFilters.status === 'ALL' || (k.current >= k.target ? 'ON_TRACK' : 'NEEDS_ATTENTION') === kpiFilters.status;
    return employeeMatch && periodMatch && statusMatch;
  });

  const taskRows = taskTemplates.filter((t) => {
    const employeeMatch = taskFilters.employeeId === 'ALL' || (taskFilters.employeeId === 'UNASSIGNED' ? !t.employeeId : t.employeeId === taskFilters.employeeId);
    const periodMatch = taskFilters.period === 'ALL' || t.frequency === taskFilters.period;
    const statusMatch = taskFilters.status === 'ALL' || (taskFilters.status === 'ACTIVE' ? t.isActive : !t.isActive);
    return employeeMatch && periodMatch && statusMatch;
  });

  const reviewRows = snapshots.filter((s) => {
    const employeeMatch = reviewFilters.employeeId === 'ALL' || s.employeeId === reviewFilters.employeeId;
    const periodValue = `${s.month}/${s.year}`;
    const periodMatch = reviewFilters.period === 'ALL' || periodValue === reviewFilters.period;
    const statusMatch = reviewFilters.status === 'ALL' || s.performanceGrade === reviewFilters.status;
    return employeeMatch && periodMatch && statusMatch;
  });

  return (
    <DashboardLayout userRole={userRole}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-secondary-900">Performance Workspace</h1>
            <p className="text-sm text-secondary-500">One place for Goal, KPI, Task Template, and Monthly Review tracking.</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'goals' && <button onClick={openNewGoal} className="btn btn-primary text-sm">New Goal</button>}
            {activeTab === 'kpis' && <button onClick={openNewKpi} className="btn btn-primary text-sm">New KPI</button>}
            {activeTab === 'tasks' && <button onClick={openNewTaskTemplate} className="btn btn-primary text-sm">New Template</button>}
            <button onClick={loadAll} className="btn btn-secondary text-sm">Refresh</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                updateUrlFilters({ tab });
              }}
              className={`h-10 px-3 rounded-lg text-sm font-bold border ${
                activeTab === tab
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-secondary-700 border-secondary-200 hover:border-primary-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {loading && (
          <div className="card-premium p-8 text-center text-secondary-500 font-bold">Loading workspace data...</div>
        )}

        {error && !loading && (
          <div className="card-premium p-4 border border-danger-200 text-danger-700 text-sm font-bold">{error}</div>
        )}
        {notice && (
          <div className={`card-premium p-3 text-sm font-bold flex items-center justify-between ${
            notice.type === 'success' ? 'border border-success-200 text-success-700' : 'border border-danger-200 text-danger-700'
          }`}>
            <span>{notice.message}</span>
            <button className="text-xs underline" onClick={() => setNotice(null)}>Dismiss</button>
          </div>
        )}

        {!loading && !error && activeTab === 'goals' && (
          <div className="card-premium overflow-x-auto">
            <div className="p-3 border-b border-secondary-100 grid grid-cols-1 md:grid-cols-4 gap-2">
              <select className="input" value={goalFilters.employeeId} onChange={(e) => {
                const next = { ...goalFilters, employeeId: e.target.value };
                setGoalFilters(next);
                updateUrlFilters({ goals: next });
              }}>
                <option value="ALL">All Employees</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
              </select>
              <select className="input" value={goalFilters.period} onChange={(e) => {
                const next = { ...goalFilters, period: e.target.value };
                setGoalFilters(next);
                updateUrlFilters({ goals: next });
              }}>
                <option value="ALL">All Periods</option>
                {['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="input" value={goalFilters.status} onChange={(e) => {
                const next = { ...goalFilters, status: e.target.value };
                setGoalFilters(next);
                updateUrlFilters({ goals: next });
              }}>
                <option value="ALL">All Status</option>
                {['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-secondary" onClick={() => clearFiltersForTab('goals')}>Clear Filters</button>
            </div>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-right">Progress</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {goalRows.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-secondary-400">No goals found</td></tr>
                ) : goalRows.map((g) => (
                  <tr key={g.id}>
                    <td>{g.title}</td>
                    <td>{g.employee?.user?.name || '-'}</td>
                    <td>{g.type || '-'}</td>
                    <td>{g.status || '-'}</td>
                    <td className="text-right">{Number(g.achievementPercentage || 0).toFixed(1)}%</td>
                    <td className="text-right"><button onClick={() => openEditGoal(g)} className="text-primary-600 font-bold text-xs">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && activeTab === 'kpis' && (
          <div className="card-premium overflow-x-auto">
            <div className="p-3 border-b border-secondary-100 grid grid-cols-1 md:grid-cols-4 gap-2">
              <select className="input" value={kpiFilters.employeeId} onChange={(e) => {
                const next = { ...kpiFilters, employeeId: e.target.value };
                setKpiFilters(next);
                updateUrlFilters({ kpis: next });
              }}>
                <option value="ALL">All Employees</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
              </select>
              <select className="input" value={kpiFilters.period} onChange={(e) => {
                const next = { ...kpiFilters, period: e.target.value };
                setKpiFilters(next);
                updateUrlFilters({ kpis: next });
              }}>
                <option value="ALL">All Periods</option>
                {['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="input" value={kpiFilters.status} onChange={(e) => {
                const next = { ...kpiFilters, status: e.target.value };
                setKpiFilters(next);
                updateUrlFilters({ kpis: next });
              }}>
                <option value="ALL">All Status</option>
                <option value="ON_TRACK">On Track</option>
                <option value="NEEDS_ATTENTION">Needs Attention</option>
              </select>
              <button className="btn btn-secondary" onClick={() => clearFiltersForTab('kpis')}>Clear Filters</button>
            </div>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th>Employee</th>
                  <th>Period</th>
                  <th className="text-right">Target</th>
                  <th className="text-right">Current</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {kpiRows.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-secondary-400">No KPIs found</td></tr>
                ) : kpiRows.map((k) => (
                  <tr key={k.id}>
                    <td>{k.title}</td>
                    <td>{k.employee?.user?.name || '-'}</td>
                    <td>{k.period || '-'}</td>
                    <td className="text-right">{k.target ?? '-'}</td>
                    <td className="text-right">{k.current ?? '-'}</td>
                    <td className="text-right"><button onClick={() => openEditKpi(k)} className="text-primary-600 font-bold text-xs">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && activeTab === 'tasks' && (
          <div className="card-premium overflow-x-auto">
            <div className="p-3 border-b border-secondary-100 grid grid-cols-1 md:grid-cols-4 gap-2">
              <select className="input" value={taskFilters.employeeId} onChange={(e) => {
                const next = { ...taskFilters, employeeId: e.target.value };
                setTaskFilters(next);
                updateUrlFilters({ tasks: next });
              }}>
                <option value="ALL">All Employees</option>
                <option value="UNASSIGNED">Unassigned</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
              </select>
              <select className="input" value={taskFilters.period} onChange={(e) => {
                const next = { ...taskFilters, period: e.target.value };
                setTaskFilters(next);
                updateUrlFilters({ tasks: next });
              }}>
                <option value="ALL">All Frequencies</option>
                {['DAILY', 'WEEKLY', 'MONTHLY'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="input" value={taskFilters.status} onChange={(e) => {
                const next = { ...taskFilters, status: e.target.value };
                setTaskFilters(next);
                updateUrlFilters({ tasks: next });
              }}>
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <button className="btn btn-secondary" onClick={() => clearFiltersForTab('tasks')}>Clear Filters</button>
            </div>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Frequency</th>
                  <th className="text-right">Points</th>
                  <th className="text-right">Target</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {taskRows.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-secondary-400">No task templates found</td></tr>
                ) : taskRows.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{t.frequency || '-'}</td>
                    <td className="text-right">{t.points ?? '-'}</td>
                    <td className="text-right">{t.targetValue ?? '-'}</td>
                    <td>{t.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="text-right"><button onClick={() => openEditTaskTemplate(t)} className="text-primary-600 font-bold text-xs">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && activeTab === 'review' && (
          <div className="card-premium overflow-x-auto">
            <div className="p-3 border-b border-secondary-100 grid grid-cols-1 md:grid-cols-4 gap-2">
              <select className="input" value={reviewFilters.employeeId} onChange={(e) => {
                const next = { ...reviewFilters, employeeId: e.target.value };
                setReviewFilters(next);
                updateUrlFilters({ review: next });
              }}>
                <option value="ALL">All Employees</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
              </select>
              <select className="input" value={reviewFilters.period} onChange={(e) => {
                const next = { ...reviewFilters, period: e.target.value };
                setReviewFilters(next);
                updateUrlFilters({ review: next });
              }}>
                <option value="ALL">All Periods</option>
                {Array.from(new Set(snapshots.map((s) => `${s.month}/${s.year}`))).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="input" value={reviewFilters.status} onChange={(e) => {
                const next = { ...reviewFilters, status: e.target.value };
                setReviewFilters(next);
                updateUrlFilters({ review: next });
              }}>
                <option value="ALL">All Grades</option>
                {Array.from(new Set(snapshots.map((s) => s.performanceGrade).filter(Boolean))).map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <button className="btn btn-secondary" onClick={() => clearFiltersForTab('review')}>Clear Filters</button>
            </div>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Period</th>
                  <th className="text-right">Score</th>
                  <th>Grade</th>
                  <th className="text-right">Task Completion</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-center text-secondary-400">No monthly review data found</td></tr>
                ) : reviewRows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.employee?.user?.name || '-'}</td>
                    <td>{`${s.month}/${s.year}`}</td>
                    <td className="text-right">{Number(s.overallScore || 0).toFixed(1)}</td>
                    <td>{s.performanceGrade || '-'}</td>
                    <td className="text-right">{Number(s.taskCompletionRate || 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {goalDraft && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-lg p-5 space-y-4">
              <h3 className="text-lg font-black text-secondary-900">{goalDraft.id ? 'Edit Goal' : 'Create Goal'}</h3>
              {formError && <div className="text-sm font-bold text-danger-700 bg-danger-50 border border-danger-200 rounded p-2">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select className="input" value={goalDraft.employeeId} onChange={(e) => setGoalDraft({ ...goalDraft, employeeId: e.target.value })}>
                  <option value="">Select Employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
                </select>
                <input className="input" placeholder="Title" value={goalDraft.title} onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })} />
                <input className="input" placeholder="Unit" value={goalDraft.unit} onChange={(e) => setGoalDraft({ ...goalDraft, unit: e.target.value })} />
                <select className="input" value={goalDraft.type} onChange={(e) => setGoalDraft({ ...goalDraft, type: e.target.value })}>
                  {['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <input className="input" type="number" placeholder="Target" value={goalDraft.targetValue} onChange={(e) => setGoalDraft({ ...goalDraft, targetValue: e.target.value })} />
                <input className="input" type="number" placeholder="Current" value={goalDraft.currentValue} onChange={(e) => setGoalDraft({ ...goalDraft, currentValue: e.target.value })} />
                <input className="input" type="date" value={goalDraft.startDate} onChange={(e) => setGoalDraft({ ...goalDraft, startDate: e.target.value })} />
                <input className="input" type="date" value={goalDraft.endDate} onChange={(e) => setGoalDraft({ ...goalDraft, endDate: e.target.value })} />
              </div>
              <textarea className="input min-h-[90px]" placeholder="Description" value={goalDraft.description} onChange={(e) => setGoalDraft({ ...goalDraft, description: e.target.value })} />
              <div className="flex justify-end gap-2">
                <button className="btn btn-secondary" onClick={() => { setGoalDraft(null); setFormError(null); }}>Cancel</button>
                <button className="btn btn-primary" onClick={saveGoal} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {kpiDraft && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-lg p-5 space-y-4">
              <h3 className="text-lg font-black text-secondary-900">{kpiDraft.id ? 'Edit KPI' : 'Create KPI'}</h3>
              {formError && <div className="text-sm font-bold text-danger-700 bg-danger-50 border border-danger-200 rounded p-2">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select className="input" value={kpiDraft.employeeId} onChange={(e) => setKpiDraft({ ...kpiDraft, employeeId: e.target.value })}>
                  <option value="">Select Employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
                </select>
                <input className="input" placeholder="Title" value={kpiDraft.title} onChange={(e) => setKpiDraft({ ...kpiDraft, title: e.target.value })} />
                <select className="input" value={kpiDraft.period} onChange={(e) => setKpiDraft({ ...kpiDraft, period: e.target.value })}>
                  {['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <input className="input" placeholder="Unit" value={kpiDraft.unit} onChange={(e) => setKpiDraft({ ...kpiDraft, unit: e.target.value })} />
                <input className="input" type="number" placeholder="Target" value={kpiDraft.target} onChange={(e) => setKpiDraft({ ...kpiDraft, target: e.target.value })} />
                <input className="input" type="number" placeholder="Current" value={kpiDraft.current} onChange={(e) => setKpiDraft({ ...kpiDraft, current: e.target.value })} />
                <input className="input md:col-span-2" placeholder="Category" value={kpiDraft.category} onChange={(e) => setKpiDraft({ ...kpiDraft, category: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn btn-secondary" onClick={() => { setKpiDraft(null); setFormError(null); }}>Cancel</button>
                <button className="btn btn-primary" onClick={saveKpi} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {taskDraft && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-lg p-5 space-y-4">
              <h3 className="text-lg font-black text-secondary-900">{taskDraft.id ? 'Edit Task Template' : 'Create Task Template'}</h3>
              {formError && <div className="text-sm font-bold text-danger-700 bg-danger-50 border border-danger-200 rounded p-2">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="input md:col-span-2" placeholder="Title" value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} />
                <textarea className="input md:col-span-2 min-h-[80px]" placeholder="Description" value={taskDraft.description} onChange={(e) => setTaskDraft({ ...taskDraft, description: e.target.value })} />
                <input className="input" type="number" placeholder="Points" value={taskDraft.points} onChange={(e) => setTaskDraft({ ...taskDraft, points: e.target.value })} />
                <select className="input" value={taskDraft.frequency} onChange={(e) => setTaskDraft({ ...taskDraft, frequency: e.target.value })}>
                  {['DAILY', 'WEEKLY', 'MONTHLY'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <input className="input" type="number" placeholder="Target Value" value={taskDraft.targetValue} onChange={(e) => setTaskDraft({ ...taskDraft, targetValue: e.target.value })} />
                <input className="input" placeholder="Target Unit" value={taskDraft.targetUnit} onChange={(e) => setTaskDraft({ ...taskDraft, targetUnit: e.target.value })} />
                <select className="input md:col-span-2" value={taskDraft.employeeId} onChange={(e) => setTaskDraft({ ...taskDraft, employeeId: e.target.value })}>
                  <option value="">No employee-specific assignment</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
                </select>
                {taskDraft.id && (
                  <label className="md:col-span-2 text-sm font-bold text-secondary-700 flex items-center gap-2">
                    <input type="checkbox" checked={taskDraft.isActive} onChange={(e) => setTaskDraft({ ...taskDraft, isActive: e.target.checked })} />
                    Active
                  </label>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn btn-secondary" onClick={() => { setTaskDraft(null); setFormError(null); }}>Cancel</button>
                <button className="btn btn-primary" onClick={saveTaskTemplate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
