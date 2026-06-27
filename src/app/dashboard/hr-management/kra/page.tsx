'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { FiTarget, FiGrid, FiUsers, FiPlus, FiTrash2, FiEdit2, FiCheck, FiInbox, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  kraFetch, PERIOD_TYPES, DATA_SOURCES, AGGREGATIONS,
  type KraMetric, type KraTemplate, type KraTemplateItem,
} from '@/lib/kra/client';

type Tab = 'metrics' | 'templates' | 'assign' | 'review';

export default function KraAdminPage() {
  const [tab, setTab] = useState<Tab>('metrics');

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiTarget className="text-indigo-600" /> KRA & Targets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Department-wise metrics define karo, templates banao, aur employees ko unke monthly/quarterly targets assign karo.
          </p>
        </header>

        <nav className="flex gap-1 border-b border-gray-200 mb-6">
          {([
            ['metrics', 'Metrics', <FiGrid key="m" />],
            ['templates', 'Templates', <FiTarget key="t" />],
            ['assign', 'Assign', <FiUsers key="a" />],
            ['review', 'Review', <FiInbox key="r" />],
          ] as [Tab, string, ReactElement][]).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition ${
                tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </nav>

        {tab === 'metrics' && <MetricsTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'assign' && <AssignTab />}
        {tab === 'review' && <ReviewTab />}
      </div>
    </DashboardLayout>
  );
}

/* ------------------------------- Metrics ------------------------------- */

const EMPTY_METRIC = {
  key: '', name: '', unit: '', direction: 'HIGHER_BETTER',
  dataSource: 'MANUAL', sourceType: '', aggregation: 'SUM', department: '', isActive: true,
};

function MetricsTab() {
  const [metrics, setMetrics] = useState<KraMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kraFetch<{ metrics: KraMetric[] }>('/api/kra/metrics?includeInactive=true');
      setMetrics(data.metrics);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      if (editing.id) {
        await kraFetch('/api/kra/metrics', { method: 'PATCH', body: JSON.stringify(editing) });
      } else {
        await kraFetch('/api/kra/metrics', { method: 'POST', body: JSON.stringify(editing) });
      }
      toast.success('Metric saved');
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this metric?')) return;
    try { await kraFetch(`/api/kra/metrics?id=${id}`, { method: 'DELETE' }); toast.success('Deactivated'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const grouped = useMemo(() => {
    const g: Record<string, KraMetric[]> = {};
    for (const m of metrics) (g[m.department || 'Other'] ||= []).push(m);
    return g;
  }, [metrics]);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing({ ...EMPTY_METRIC })}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-indigo-700">
          <FiPlus /> New Metric
        </button>
      </div>

      {loading ? <p className="text-gray-500">Loading…</p> : Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500">Koi metric nahi. "New Metric" se shuru karo ya seed chalao.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dept, list]) => (
            <div key={dept}>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{dept}</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Metric</th>
                      <th className="text-left px-3 py-2 font-medium">Unit</th>
                      <th className="text-left px-3 py-2 font-medium">Validation</th>
                      <th className="text-left px-3 py-2 font-medium">Agg</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list.map((m) => (
                      <tr key={m.id} className={m.isActive ? '' : 'opacity-40'}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-400">{m.key}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{m.unit}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            m.dataSource === 'SYSTEM' ? 'bg-green-100 text-green-700'
                            : m.dataSource === 'HYBRID' ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'}`}>
                            {m.dataSource}{m.sourceType ? ` · ${m.sourceType}` : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{m.aggregation}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button onClick={() => setEditing({ ...m, sourceType: m.sourceType || '', department: m.department || '' })}
                            className="text-gray-400 hover:text-indigo-600 p-1"><FiEdit2 /></button>
                          {m.isActive && (
                            <button onClick={() => deactivate(m.id)} className="text-gray-400 hover:text-red-600 p-1"><FiTrash2 /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit Metric' : 'New Metric'} onClose={() => setEditing(null)} onSave={save}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Key (machine)"><input className={inputCls} disabled={!!editing.id}
              value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value })} placeholder="articles_published" /></Field>
            <Field label="Name"><input className={inputCls}
              value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Articles Published" /></Field>
            <Field label="Unit"><input className={inputCls}
              value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="articles / ₹ / %" /></Field>
            <Field label="Department tag"><input className={inputCls}
              value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })} placeholder="Publication" /></Field>
            <Field label="Data source"><select className={inputCls}
              value={editing.dataSource} onChange={(e) => setEditing({ ...editing, dataSource: e.target.value })}>
              {DATA_SOURCES.map((d) => <option key={d}>{d}</option>)}</select></Field>
            <Field label="Source type (auto-verify)"><input className={inputCls}
              value={editing.sourceType} onChange={(e) => setEditing({ ...editing, sourceType: e.target.value })} placeholder="REVENUE_TRANSACTION" /></Field>
            <Field label="Aggregation"><select className={inputCls}
              value={editing.aggregation} onChange={(e) => setEditing({ ...editing, aggregation: e.target.value })}>
              {AGGREGATIONS.map((a) => <option key={a}>{a}</option>)}</select></Field>
            <Field label="Direction"><select className={inputCls}
              value={editing.direction} onChange={(e) => setEditing({ ...editing, direction: e.target.value })}>
              <option value="HIGHER_BETTER">Higher is better</option>
              <option value="LOWER_BETTER">Lower is better</option></select></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------ Templates ------------------------------ */

function TemplatesTab() {
  const [templates, setTemplates] = useState<KraTemplate[]>([]);
  const [metrics, setMetrics] = useState<KraMetric[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m, d] = await Promise.all([
        kraFetch<{ templates: KraTemplate[] }>('/api/kra/templates?includeInactive=true'),
        kraFetch<{ metrics: KraMetric[] }>('/api/kra/metrics'),
        kraFetch<any[]>('/api/hr/departments').catch(() => []),
      ]);
      setTemplates(t.templates); setMetrics(m.metrics); setDepartments(Array.isArray(d) ? d : []);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const deptName = (id: string | null) => departments.find((d) => d.id === id)?.name || '—';

  const save = async () => {
    try {
      const payload = {
        ...editing,
        items: (editing.items as KraTemplateItem[]).map((i) => ({
          metricId: i.metricId, defaultTarget: Number(i.defaultTarget) || 0,
          weight: Number(i.weight) || 1, periodType: i.periodType || 'MONTHLY',
        })),
      };
      if (editing.id) await kraFetch('/api/kra/templates', { method: 'PATCH', body: JSON.stringify(payload) });
      else await kraFetch('/api/kra/templates', { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Template saved'); setEditing(null); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try { await kraFetch(`/api/kra/templates?id=${id}`, { method: 'DELETE' }); toast.success('Deleted'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const newTemplate = () => setEditing({ name: '', description: '', departmentId: '', isActive: true, items: [] });
  const addItem = () => setEditing({ ...editing, items: [...editing.items, { metricId: metrics[0]?.id || '', defaultTarget: 0, weight: 1, periodType: 'MONTHLY' }] });
  const setItem = (idx: number, patch: any) => setEditing({ ...editing, items: editing.items.map((it: any, i: number) => i === idx ? { ...it, ...patch } : it) });
  const delItem = (idx: number) => setEditing({ ...editing, items: editing.items.filter((_: any, i: number) => i !== idx) });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={newTemplate} className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-indigo-700">
          <FiPlus /> New Template
        </button>
      </div>

      {loading ? <p className="text-gray-500">Loading…</p> : templates.length === 0 ? (
        <p className="text-gray-500">Koi template nahi.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className={`border border-gray-200 rounded-xl p-4 ${t.isActive ? '' : 'opacity-50'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="text-xs text-gray-400">Dept: {deptName(t.departmentId)} · {t.items.length} metrics</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing({ ...t, departmentId: t.departmentId || '', description: t.description || '' })}
                    className="text-gray-400 hover:text-indigo-600 p-1"><FiEdit2 /></button>
                  <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-red-600 p-1"><FiTrash2 /></button>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {t.items.map((i) => (
                  <li key={i.id} className="flex justify-between text-gray-600">
                    <span>{i.metric?.name}</span>
                    <span className="text-gray-400">{i.defaultTarget}{i.metric?.unit} · w{i.weight} · {i.periodType}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit Template' : 'New Template'} onClose={() => setEditing(null)} onSave={save} wide>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Name"><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Department"><select className={inputCls} value={editing.departmentId} onChange={(e) => setEditing({ ...editing, departmentId: e.target.value })}>
              <option value="">— None —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Metrics</span>
            <button onClick={addItem} className="text-indigo-600 text-sm inline-flex items-center gap-1"><FiPlus /> Add metric</button>
          </div>
          <div className="space-y-2">
            {editing.items.length === 0 && <p className="text-sm text-gray-400">Koi metric add nahi kiya.</p>}
            {editing.items.map((it: any, idx: number) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <select className={`${inputCls} col-span-5`} value={it.metricId} onChange={(e) => setItem(idx, { metricId: e.target.value })}>
                  {metrics.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </select>
                <input type="number" className={`${inputCls} col-span-2`} value={it.defaultTarget} onChange={(e) => setItem(idx, { defaultTarget: e.target.value })} placeholder="target" />
                <input type="number" className={`${inputCls} col-span-2`} value={it.weight} onChange={(e) => setItem(idx, { weight: e.target.value })} placeholder="weight" />
                <select className={`${inputCls} col-span-2`} value={it.periodType} onChange={(e) => setItem(idx, { periodType: e.target.value })}>
                  {PERIOD_TYPES.map((p) => <option key={p}>{p}</option>)}
                </select>
                <button onClick={() => delItem(idx)} className="text-gray-400 hover:text-red-600 col-span-1"><FiTrash2 /></button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------- Assign ------------------------------- */

function AssignTab() {
  const [templates, setTemplates] = useState<KraTemplate[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [mode, setMode] = useState<'department' | 'employees'>('department');
  const [departmentId, setDepartmentId] = useState('');
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, d, e] = await Promise.all([
          kraFetch<{ templates: KraTemplate[] }>('/api/kra/templates'),
          kraFetch<any[]>('/api/hr/departments').catch(() => []),
          kraFetch<any[]>('/api/hr/employees').catch(() => []),
        ]);
        setTemplates(t.templates);
        setDepartments(Array.isArray(d) ? d : []);
        setEmployees(Array.isArray(e) ? e : []);
      } catch (err: any) { toast.error(err.message); }
    })();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const apply = async () => {
    if (!templateId) return toast.error('Template select karo');
    if (mode === 'department' && !departmentId) return toast.error('Department select karo');
    if (mode === 'employees' && employeeIds.length === 0) return toast.error('Kam se kam ek employee select karo');
    setBusy(true);
    try {
      const body: any = { templateId, periodType };
      if (mode === 'department') body.departmentId = departmentId;
      else body.employeeIds = employeeIds;
      const res = await kraFetch<any>('/api/kra/assign', { method: 'POST', body: JSON.stringify(body) });
      toast.success(`${res.period}: ${res.employees} employees × ${res.metrics} metrics → ${res.created} created, ${res.updated} updated`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl">
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <Field label="Template">
          <select className={inputCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">— Select —</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.items.length} metrics)</option>)}
          </select>
        </Field>

        {selectedTemplate && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            {selectedTemplate.items.map((i) => `${i.metric?.name} (${i.defaultTarget}${i.metric?.unit})`).join(' · ')}
          </div>
        )}

        <Field label="Period">
          <select className={inputCls} value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
            {PERIOD_TYPES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>

        <Field label="Assign to">
          <div className="flex gap-2">
            {(['department', 'employees'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${mode === m ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-gray-200 text-gray-500'}`}>
                {m === 'department' ? 'Whole department' : 'Specific employees'}
              </button>
            ))}
          </div>
        </Field>

        {mode === 'department' ? (
          <Field label="Department">
            <select className={inputCls} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">— Select —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        ) : (
          <Field label={`Employees (${employeeIds.length} selected)`}>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
              {employees.map((emp) => {
                const name = emp.user?.name || emp.name || emp.employeeId || emp.id;
                const checked = employeeIds.includes(emp.id);
                return (
                  <label key={emp.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={checked}
                      onChange={() => setEmployeeIds((prev) => checked ? prev.filter((x) => x !== emp.id) : [...prev, emp.id])} />
                    {name} <span className="text-gray-400 text-xs">{emp.designation || ''}</span>
                  </label>
                );
              })}
              {employees.length === 0 && <p className="text-sm text-gray-400 px-3 py-2">Koi employee nahi mila.</p>}
            </div>
          </Field>
        )}

        <button onClick={apply} disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          <FiCheck /> {busy ? 'Applying…' : 'Apply targets'}
        </button>
        <p className="text-xs text-gray-400">
          Same period par dobara apply karne se targets update honge (duplicate goals nahi banenge).
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- Review ------------------------------- */

interface Contribution {
  id: string;
  reportedValue: number;
  verifiedValue: number | null;
  status: string;
  source: string;
  note: string | null;
  date: string;
  metric?: { name: string; unit: string; dataSource: string | null; sourceType: string | null };
  employee?: { user?: { name?: string; email?: string } };
}

function ReviewTab() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kraFetch<{ contributions: Contribution[] }>('/api/kra/contributions?status=PENDING,FLAGGED');
      setItems(data.contributions);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const review = async (id: string, action: 'APPROVE' | 'REJECT', verifiedValue?: number) => {
    setBusyId(id);
    try {
      const body: any = { id, action };
      if (action === 'APPROVE' && verifiedValue != null) body.verifiedValue = verifiedValue;
      if (action === 'REJECT') body.note = prompt('Reason for rejection (optional)') || undefined;
      await kraFetch('/api/kra/contributions', { method: 'PATCH', body: JSON.stringify(body) });
      toast.success(action === 'APPROVE' ? 'Approved & counted toward target' : 'Rejected');
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) { toast.error(e.message); } finally { setBusyId(null); }
  };

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (items.length === 0) return (
    <div className="text-center py-12 text-gray-400">
      <FiInbox className="mx-auto text-3xl mb-2" />
      <p>Review ke liye kuch nahi — sab clear ✅</p>
    </div>
  );

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Employee</th>
            <th className="text-left px-3 py-2 font-medium">Metric</th>
            <th className="text-right px-3 py-2 font-medium">Reported</th>
            <th className="text-left px-3 py-2 font-medium">Status</th>
            <th className="text-left px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2 text-gray-900">{c.employee?.user?.name || c.employee?.user?.email || '—'}</td>
              <td className="px-3 py-2">
                <div className="text-gray-900">{c.metric?.name}</div>
                {c.note && <div className="text-xs text-amber-600">{c.note}</div>}
              </td>
              <td className="px-3 py-2 text-right font-medium text-gray-900">{c.reportedValue}{c.metric?.unit}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'FLAGGED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-500">{new Date(c.date).toLocaleDateString()}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button disabled={busyId === c.id} onClick={() => review(c.id, 'APPROVE', c.reportedValue)}
                  className="inline-flex items-center gap-1 text-green-600 hover:bg-green-50 px-2 py-1 rounded disabled:opacity-50">
                  <FiCheck /> Approve
                </button>
                <button disabled={busyId === c.id} onClick={() => review(c.id, 'REJECT')}
                  className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50">
                  <FiX /> Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------- Shared UI ----------------------------- */

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose, onSave, wide }: {
  title: string; children: ReactNode; onClose: () => void; onSave: () => void; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
        </div>
      </div>
    </div>
  );
}
