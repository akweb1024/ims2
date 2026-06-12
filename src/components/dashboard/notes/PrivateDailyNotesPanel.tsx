'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
  employeeId?: string;
  title?: string;
};

const BASE_CATEGORIES = ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'WEBSITE', 'SECURITY', 'BACKUP', 'CUSTOM'];

export default function PrivateDailyNotesPanel({ employeeId, title = 'Important Daily Notes (Private)' }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: '',
    note: '',
    category: 'NEUTRAL',
    customCategory: '',
    sentiment: 'NEUTRAL',
    performanceImpactScore: '0',
    taggedEmployeeIds: employeeId ? [employeeId] : [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const query = new URLSearchParams();
      if (employeeId) query.set('employeeId', employeeId);

      const [notesRes, employeesRes] = await Promise.all([
        fetch(`/api/hr/private-notes?${query.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch('/api/hr/employees?all=true', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);

      const notesPayload = await notesRes.json().catch(() => ({}));
      if (!notesRes.ok) throw new Error(notesPayload?.error || notesPayload?.message || 'Failed to load private notes');
      setNotes(Array.isArray(notesPayload?.notes) ? notesPayload.notes : []);
      setSummary(notesPayload?.summary || null);

      if (employeesRes.ok) {
        const employeesPayload = await employeesRes.json().catch(() => []);
        setEmployees(Array.isArray(employeesPayload) ? employeesPayload : []);
      } else {
        setEmployees([]);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to load private notes');
      setNotes([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const employeeOptions = useMemo(() => {
    return employees
      .filter((e) => e?.id)
      .map((e) => ({
        id: e.id,
        name: e.user?.name || e.user?.email || e.employeeId || e.id,
        designation: e.designation || e.designatRef?.name || 'Staff',
      }));
  }, [employees]);

  const toggleEmployee = (id: string) => {
    setForm((prev) => ({
      ...prev,
      taggedEmployeeIds: prev.taggedEmployeeIds.includes(id)
        ? prev.taggedEmployeeIds.filter((x) => x !== id)
        : [...prev.taggedEmployeeIds, id]
    }));
  };

  const createNote = async () => {
    if (!form.title.trim() || !form.note.trim()) {
      alert('Title and note are required');
      return;
    }
    if (!form.taggedEmployeeIds.length) {
      alert('Tag at least one employee');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/hr/private-notes', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          performanceImpactScore: Number(form.performanceImpactScore || 0),
          taggedEmployeeIds: employeeId ? [employeeId, ...form.taggedEmployeeIds].filter((v, i, a) => a.indexOf(v) === i) : form.taggedEmployeeIds,
          category: form.category,
          customCategory: form.category === 'CUSTOM' ? form.customCategory : null,
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to create note');

      setForm({
        title: '',
        note: '',
        category: employeeId ? 'NEUTRAL' : 'NEUTRAL',
        customCategory: '',
        sentiment: 'NEUTRAL',
        performanceImpactScore: '0',
        taggedEmployeeIds: employeeId ? [employeeId] : [],
      });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed to create note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-premium p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-secondary-900">{title}</h3>
        <span className="text-[10px] font-black uppercase tracking-wider text-secondary-500">Creator Only</span>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Metric label="Total" value={summary.total || 0} />
          <Metric label="Positive" value={summary.positive || 0} />
          <Metric label="Negative" value={summary.negative || 0} />
          <Metric label="Neutral" value={summary.neutral || 0} />
        </div>
      ) : null}

      <div className="border border-secondary-100 rounded-xl p-3 space-y-3">
        <input
          className="input w-full"
          placeholder="Note title"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />
        <textarea
          className="input w-full min-h-[96px]"
          placeholder="Write your important daily note..."
          value={form.note}
          onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select className="input" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
            {BASE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {form.category === 'CUSTOM' ? (
            <input
              className="input"
              placeholder="Custom category"
              value={form.customCategory}
              onChange={(e) => setForm((prev) => ({ ...prev, customCategory: e.target.value }))}
            />
          ) : <div />}
          <select className="input" value={form.sentiment} onChange={(e) => setForm((prev) => ({ ...prev, sentiment: e.target.value }))}>
            <option value="POSITIVE">POSITIVE</option>
            <option value="NEGATIVE">NEGATIVE</option>
            <option value="NEUTRAL">NEUTRAL</option>
          </select>
          <input
            className="input"
            type="number"
            min={-10}
            max={10}
            placeholder="Impact (-10 to 10)"
            value={form.performanceImpactScore}
            onChange={(e) => setForm((prev) => ({ ...prev, performanceImpactScore: e.target.value }))}
          />
        </div>

        {!employeeId ? (
          <div className="border border-secondary-100 rounded-lg p-2 max-h-36 overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-wider text-secondary-500 mb-2">Tag Employees</p>
            {employeeOptions.length === 0 ? <p className="text-xs text-secondary-500">No employee list access. You can still use this panel where employee context exists.</p> : null}
            {employeeOptions.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 py-1 text-xs">
                <input type="checkbox" checked={form.taggedEmployeeIds.includes(opt.id)} onChange={() => toggleEmployee(opt.id)} />
                <span className="font-semibold text-secondary-800">{opt.name}</span>
                <span className="text-secondary-500">({opt.designation})</span>
              </label>
            ))}
          </div>
        ) : null}

        <button className="btn btn-primary text-xs" onClick={createNote} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Private Note'}
        </button>
      </div>

      <div className="space-y-2">
        {loading ? <p className="text-sm text-secondary-500">Loading notes...</p> : null}
        {!loading && notes.length === 0 ? <p className="text-sm text-secondary-500">No notes yet.</p> : null}
        {notes.map((n) => (
          <div key={n.id} className="border border-secondary-100 rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-secondary-900">{n.title}</p>
              <span className="text-[10px] font-black uppercase tracking-wider text-secondary-500">{new Date(n.noteDate).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-secondary-700 mt-1">{n.note}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
              <span className="px-2 py-1 rounded bg-secondary-100 text-secondary-700">{n.category === 'CUSTOM' && n.customCategory ? n.customCategory : n.category}</span>
              <span className="px-2 py-1 rounded bg-primary-50 text-primary-700">{n.sentiment}</span>
              <span className="px-2 py-1 rounded bg-success-50 text-success-700">Impact {n.performanceImpactScore ?? 0}</span>
            </div>
            <div className="mt-2 text-xs text-secondary-600">
              Tagged: {(n.taggedEmployees || []).map((t: any) => t.employee?.user?.name || t.employee?.user?.email || t.employeeId).join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-secondary-100 bg-white p-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-secondary-500">{label}</p>
      <p className="text-base font-black text-secondary-900">{value}</p>
    </div>
  );
}
