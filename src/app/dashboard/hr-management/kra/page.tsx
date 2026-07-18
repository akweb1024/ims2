'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { FiTarget, FiGrid, FiUsers, FiPlus, FiTrash2, FiEdit2, FiCheck, FiInbox, FiX, FiBarChart2, FiStar, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  kraFetch, PERIOD_TYPES, DATA_SOURCES, AGGREGATIONS, KRA_DIMENSIONS,
  type KraMetric, type KraTemplate, type KraTemplateItem,
} from '@/lib/kra/client';

type Tab = 'metrics' | 'templates' | 'assign' | 'review' | 'performance' | 'rating';

export default function KraAdminPage() {
  const [tab, setTab] = useState<Tab>('metrics');

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiTarget className="text-indigo-600" /> KRA & Targets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Define department-wise metrics, build templates, and assign employees their monthly/quarterly targets.
          </p>
        </header>

        <nav className="flex gap-1 border-b border-gray-200 mb-6">
          {([
            ['metrics', 'Metrics', <FiGrid key="m" />],
            ['templates', 'Templates', <FiTarget key="t" />],
            ['assign', 'Assign', <FiUsers key="a" />],
            ['review', 'Review', <FiInbox key="r" />],
            ['rating', 'Ratings', <FiStar key="rt" />],
            ['performance', 'Performance', <FiBarChart2 key="p" />],
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
        {tab === 'rating' && <RatingTab />}
        {tab === 'performance' && <PerformanceTab />}
      </div>
    </>
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
        <p className="text-gray-500">No metrics yet — start with the New Metric button above, or run a seed.</p>
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
            <Field label="Key (machine)" hint="Unique machine ID in lowercase_with_underscores (e.g. articles_published). Used internally and cannot be changed once created."><input className={inputCls} disabled={!!editing.id}
              value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value })} placeholder="articles_published" /></Field>
            <Field label="Name" hint="The human-readable name shown in templates, targets and reports (e.g. Articles Published)."><input className={inputCls}
              value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Articles Published" /></Field>
            <Field label="Unit" hint="What this metric is measured in — e.g. articles, calls, %, ₹, tickets, count."><input className={inputCls}
              value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="articles / ₹ / %" /></Field>
            <Field label="Department tag" hint="The department this metric belongs to. Used to group metrics and default them into a department's templates."><input className={inputCls}
              value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })} placeholder="Publication" /></Field>
            <Field label="Data source" hint="MANUAL = the employee self-reports the value in their daily report. SYSTEM/AUTO = the value is pulled automatically from another module."><select className={inputCls}
              value={editing.dataSource} onChange={(e) => setEditing({ ...editing, dataSource: e.target.value })}>
              {DATA_SOURCES.map((d) => <option key={d}>{d}</option>)}</select></Field>
            <Field label="Source type (auto-verify)" hint="For SYSTEM/HYBRID metrics, the module the value is verified against: REVENUE_TRANSACTION, COMMUNICATION_LOG, or IT_PROJECT_DELIVERED (counts completed IT projects the person led). Leave blank for MANUAL metrics."><input className={inputCls}
              value={editing.sourceType} onChange={(e) => setEditing({ ...editing, sourceType: e.target.value })} placeholder="IT_PROJECT_DELIVERED" /></Field>
            <Field label="Aggregation" hint="How multiple entries combine over the period — SUM adds them up, AVG averages them, etc."><select className={inputCls}
              value={editing.aggregation} onChange={(e) => setEditing({ ...editing, aggregation: e.target.value })}>
              {AGGREGATIONS.map((a) => <option key={a}>{a}</option>)}</select></Field>
            <Field label="Direction" hint="Whether a higher value is better (e.g. sales, articles) or a lower value is better (e.g. bugs, turnaround time)."><select className={inputCls}
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
        kraFetch<any[]>('/api/hr/departments?own=1').catch(() => []),
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
          dimension: i.dimension || 'OUTPUT',
          dailyTarget: i.dailyTarget != null && i.dailyTarget !== ('' as any) ? Number(i.dailyTarget) : null,
          ratePerUnit: i.ratePerUnit != null && i.ratePerUnit !== ('' as any) ? Number(i.ratePerUnit) : null,
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
  const addItem = () => setEditing({ ...editing, items: [...editing.items, { metricId: metrics[0]?.id || '', defaultTarget: 0, weight: 1, periodType: 'MONTHLY', dimension: 'OUTPUT', dailyTarget: '', ratePerUnit: '' }] });
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
        <p className="text-gray-500">No templates yet.</p>
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
                    <span className="text-gray-400">{i.defaultTarget}{i.metric?.unit}{i.dailyTarget ? ` · ${i.dailyTarget}/day` : ''}{i.ratePerUnit ? ` · ₹${i.ratePerUnit}/unit` : ''} · w{i.weight} · {i.periodType}</span>
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
              {uniqueByName(departments).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Metrics</span>
            <button onClick={addItem} className="text-indigo-600 text-sm inline-flex items-center gap-1"><FiPlus /> Add metric</button>
          </div>
          <div className="space-y-3 mt-1">
            {editing.items.length === 0 && <p className="text-sm text-gray-400">No metrics added.</p>}
            {editing.items.map((it: any, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50/40">
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <Field label="Metric" hint="Which metric this target applies to (from the Metrics tab).">
                      <select className={inputCls} value={it.metricId} onChange={(e) => setItem(idx, { metricId: e.target.value })}>
                        {metrics.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                      </select>
                    </Field>
                  </div>
                  <button onClick={() => delItem(idx)} title="Remove metric" className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md p-2 mb-1 shrink-0"><FiTrash2 /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Field label="Target" hint="The goal value to hit for the period (e.g. 20 articles).">
                    <input type="number" className={inputCls} value={it.defaultTarget} onChange={(e) => setItem(idx, { defaultTarget: e.target.value })} placeholder="e.g. 20" />
                  </Field>
                  <Field label="Daily target" hint="Optional. Expected per-day pace (e.g. 1/day). Carried onto each employee's goal for pace tracking in the daily report. Leave blank if there's no daily cadence.">
                    <input type="number" className={inputCls} value={it.dailyTarget ?? ''} onChange={(e) => setItem(idx, { dailyTarget: e.target.value })} placeholder="blank" />
                  </Field>
                  <Field label="₹ / unit" hint="Optional. Revenue earned per unit — auto-records revenue when the employee logs progress. Leave blank if the target isn't revenue-per-unit.">
                    <input type="number" className={inputCls} value={it.ratePerUnit ?? ''} onChange={(e) => setItem(idx, { ratePerUnit: e.target.value })} placeholder="blank" />
                  </Field>
                  <Field label="Weight" hint="Relative importance as a percentage. All weights in a template should total about 100.">
                    <input type="number" className={inputCls} value={it.weight} onChange={(e) => setItem(idx, { weight: e.target.value })} placeholder="e.g. 50" />
                  </Field>
                  <Field label="Dimension" hint="The performance dimension this metric measures: Output, Quality, TAT, Collaboration, Improvement or Behavior.">
                    <select className={inputCls} value={it.dimension || 'OUTPUT'} onChange={(e) => setItem(idx, { dimension: e.target.value })}>
                      {KRA_DIMENSIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Period" hint="How often this target resets — Monthly, Quarterly, etc.">
                    <select className={inputCls} value={it.periodType} onChange={(e) => setItem(idx, { periodType: e.target.value })}>
                      {PERIOD_TYPES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            ))}
          </div>
          {editing.items.length > 0 && (() => {
            const sum = editing.items.reduce((s: number, it: any) => s + (Number(it.weight) || 0), 0);
            const ok = sum >= 95 && sum <= 105;
            return (
              <p className={`mt-2 text-xs ${ok ? 'text-gray-400' : 'text-amber-600'}`}>
                Total weight: <span className="font-semibold">{sum}</span>{ok ? '' : ' — aim for ~100 if using percentage weights'}
              </p>
            );
          })()}
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
          kraFetch<any[]>('/api/hr/departments?own=1').catch(() => []),
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
    if (!templateId) return toast.error('Select a template');
    if (mode === 'department' && !departmentId) return toast.error('Select a department');
    if (mode === 'employees' && employeeIds.length === 0) return toast.error('Select at least one employee');
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
              {uniqueByName(departments).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
              {employees.length === 0 && <p className="text-sm text-gray-400 px-3 py-2">No employees found.</p>}
            </div>
          </Field>
        )}

        <button onClick={apply} disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          <FiCheck /> {busy ? 'Applying…' : 'Apply targets'}
        </button>
        <p className="text-xs text-gray-400">
          Applying again for the same period updates the targets (no duplicate goals are created).
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
      <p>Nothing to review — all clear ✅</p>
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

/* ----------------------------- Performance ----------------------------- */

interface LeaderRow {
  employeeId: string;
  name: string;
  overallIndex: number;
  grade: string;
  achievementScore: number;
  attendanceScore: number;
  managerRatingScore: number;
  focusScore: number;
  goalCount: number;
}

const gradeColor = (g: string) =>
  g === 'A' ? 'bg-green-100 text-green-700'
  : g === 'B' ? 'bg-blue-100 text-blue-700'
  : g === 'C' ? 'bg-amber-100 text-amber-700'
  : 'bg-red-100 text-red-700';

function PerformanceTab() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState('MONTHLY');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kraFetch<{ leaderboard: LeaderRow[] }>(`/api/kra/performance?periodType=${periodType}`);
      setRows(data.leaderboard || []);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, [periodType]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Team performance index ({periodType.toLowerCase()})</p>
        <select className={`${inputCls} w-44`} value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
          {PERIOD_TYPES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      {loading ? <p className="text-gray-500">Computing…</p> : rows.length === 0 ? (
        <p className="text-gray-500">No data.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">#</th>
                <th className="text-left px-3 py-2 font-medium">Employee</th>
                <th className="text-center px-3 py-2 font-medium">Index</th>
                <th className="text-center px-3 py-2 font-medium">Grade</th>
                <th className="text-right px-3 py-2 font-medium">Achieve</th>
                <th className="text-right px-3 py-2 font-medium">Attend</th>
                <th className="text-right px-3 py-2 font-medium">Mgr</th>
                <th className="text-right px-3 py-2 font-medium">Focus</th>
                <th className="text-right px-3 py-2 font-medium">Goals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={r.employeeId}>
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="font-semibold text-gray-900">{r.overallIndex}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${gradeColor(r.grade)}`}>{r.grade}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.achievementScore}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.attendanceScore}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.managerRatingScore}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.focusScore}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{r.goalCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">
        Index = 45% achievement + 20% attendance + 20% manager rating + 15% KRA focus.
      </p>
    </div>
  );
}

/* -------------------------------- Rating ------------------------------- */

interface RatingRow {
  id: string;
  employeeId: string;
  name: string;
  letterRating: string | null;
  achievementScore: number;
  overallIndex: number;
  grade: string | null;
  ratingStatus: string;
  hrModeration: string | null;
  managerComments: string | null;
}

const RATING_PERIODS = ['QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'MONTHLY'] as const;
const LETTERS = ['A+', 'A', 'B+', 'B', 'C', 'D'] as const;

const letterColor = (l: string | null) =>
  l === 'A+' || l === 'A' ? 'bg-green-100 text-green-700'
  : l === 'B+' || l === 'B' ? 'bg-blue-100 text-blue-700'
  : l === 'C' ? 'bg-amber-100 text-amber-700'
  : l === 'D' ? 'bg-red-100 text-red-700'
  : 'bg-gray-100 text-gray-500';

function RatingTab() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [periodType, setPeriodType] = useState<string>('QUARTERLY');
  const [employeeId, setEmployeeId] = useState('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRatings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kraFetch<{ ratings: RatingRow[] }>(`/api/kra/rating?periodType=${periodType}`);
      setRatings(data.ratings || []);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, [periodType]);

  useEffect(() => {
    (async () => {
      try {
        const e = await kraFetch<any[]>('/api/hr/employees').catch(() => []);
        setEmployees(Array.isArray(e) ? e : []);
      } catch { /* non-fatal */ }
    })();
  }, []);
  useEffect(() => { loadRatings(); }, [loadRatings]);

  const save = async () => {
    if (!employeeId) return toast.error('Select an employee');
    setBusy(true);
    try {
      const res = await kraFetch<any>('/api/kra/rating', {
        method: 'POST',
        body: JSON.stringify({ employeeId, periodType, managerComments: comments || undefined }),
      });
      toast.success(`Rating saved: ${res.letterRating} (${res.achievementScore}%)`);
      setComments('');
      loadRatings();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const moderate = async (r: RatingRow) => {
    const note = prompt('HR moderation note?');
    if (!note) return;
    const override = prompt('Override letter (A+, A, B+, B, C, D) — blank to keep')?.trim().toUpperCase();
    const ratingOverride = override && (LETTERS as readonly string[]).includes(override) ? override : undefined;
    setBusy(true);
    try {
      await kraFetch('/api/kra/rating', { method: 'PATCH', body: JSON.stringify({ ratingId: r.id, hrModeration: note, ratingOverride }) });
      toast.success('Rating moderated');
      loadRatings();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      {/* Save a rating */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Compute & save a quarterly rating</h3>
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <Field label="Employee">
            <select className={inputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">— Select —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.user?.name || emp.name || emp.employeeId || emp.id}</option>
              ))}
            </select>
          </Field>
          <Field label="Period">
            <select className={inputCls} value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
              {RATING_PERIODS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Manager comments">
            <input className={inputCls} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="optional" />
          </Field>
          <button onClick={save} disabled={busy}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            <FiStar /> {busy ? 'Saving…' : 'Save rating'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Letter grade is computed from weighted KRA achievement (A+ ≥90 … D &lt;50).</p>
      </div>

      {/* Saved ratings */}
      {loading ? <p className="text-gray-500">Loading…</p> : ratings.length === 0 ? (
        <p className="text-gray-500">No ratings saved for this period.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Employee</th>
                <th className="text-center px-3 py-2 font-medium">Rating</th>
                <th className="text-right px-3 py-2 font-medium">Achieve</th>
                <th className="text-right px-3 py-2 font-medium">Index</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ratings.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${letterColor(r.letterRating)}`}>{r.letterRating || '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.achievementScore}%</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.overallIndex}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-gray-500">{r.ratingStatus}</span>
                    {r.hrModeration && <div className="text-xs text-amber-600">HR: {r.hrModeration}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button disabled={busy} onClick={() => moderate(r)}
                      className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded disabled:opacity-50">
                      Moderate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Shared UI ----------------------------- */

// Departments are effectively shared across companies (same name per company), so the
// dropdowns show each name once. Case-insensitive; keeps the first occurrence.
function uniqueByName<T extends { name?: string | null }>(list: T[]): T[] {
  const seen = new Set<string>();
  return (list || []).filter((d) => {
    const key = (d?.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none';

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
        {label}
        {hint && <FiInfo className="text-gray-400 cursor-help" title={hint} aria-label={hint} />}
      </span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose, onSave, wide }: {
  title: string; children: ReactNode; onClose: () => void; onSave: () => void; wide?: boolean;
}) {
  // Right-side drawer: at least 40% of the screen (wider for the template editor), full
  // height, with a sticky header/footer and a scrollable body.
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div
        className={`bg-white shadow-2xl h-full flex flex-col w-full min-w-[380px] ${wide ? 'sm:w-[60%] sm:max-w-[860px]' : 'sm:w-[42%] sm:max-w-[640px]'} animate-in slide-in-from-right duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
        </div>
      </div>
    </div>
  );
}
