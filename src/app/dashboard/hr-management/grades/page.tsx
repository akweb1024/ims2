'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Pencil, Trash2, Sparkles, X } from 'lucide-react';

interface Grade {
    id: string;
    code: string;
    name: string;
    order: number;
    minCtc: number | null;
    midCtc: number | null;
    maxCtc: number | null;
    noticeDays: number | null;
    typicalExperience: string | null;
    decisionRights: string | null;
    _count?: { employees: number; designations: number };
}

const empty = { code: '', name: '', order: 0, minCtc: '', midCtc: '', maxCtc: '', noticeDays: '', typicalExperience: '', decisionRights: '' };
const inr = (n: number | null) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);

export default function GradesPage() {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<Grade | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<any>({ ...empty });

    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}` }), []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/hr/grades', { headers: authHeaders() });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Failed to load grades');
            setGrades(d.grades || []);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [authHeaders]);

    useEffect(() => { load(); }, [load]);

    const seedDefaults = async () => {
        setBusy(true); setError(null);
        try {
            const res = await fetch('/api/hr/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ action: 'seed-defaults' }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Seed failed');
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setBusy(false); }
    };

    const openAdd = () => { setEditing(null); setForm({ ...empty, order: grades.length }); setShowForm(true); };
    const openEdit = (g: Grade) => {
        setEditing(g);
        setForm({ code: g.code, name: g.name, order: g.order, minCtc: g.minCtc ?? '', midCtc: g.midCtc ?? '', maxCtc: g.maxCtc ?? '', noticeDays: g.noticeDays ?? '', typicalExperience: g.typicalExperience ?? '', decisionRights: g.decisionRights ?? '' });
        setShowForm(true);
    };

    const save = async () => {
        if (!form.code.trim() || !form.name.trim()) { setError('Code and name are required.'); return; }
        setBusy(true); setError(null);
        try {
            const method = editing ? 'PATCH' : 'POST';
            const body = editing ? { id: editing.id, ...form } : form;
            const res = await fetch('/api/hr/grades', { method, headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Save failed');
            setShowForm(false);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setBusy(false); }
    };

    const remove = async (g: Grade) => {
        const refs = (g._count?.employees || 0) + (g._count?.designations || 0);
        if (!window.confirm(`Delete grade ${g.code} — ${g.name}?${refs ? ` ${refs} employee/designation link(s) will be unassigned.` : ''}`)) return;
        setBusy(true); setError(null);
        try {
            const res = await fetch(`/api/hr/grades?id=${encodeURIComponent(g.id)}`, { method: 'DELETE', headers: authHeaders() });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Delete failed');
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setBusy(false); }
    };

    return (
        <>
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Layers className="w-7 h-7 text-indigo-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Job Grades</h1>
                            <p className="text-sm text-gray-500">Grade ladder (G0–G8) — drives salary band, compa-ratio, notice period and increment guidance.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {grades.length === 0 && (
                            <button onClick={seedDefaults} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Seed default ladder
                            </button>
                        )}
                        <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add grade
                        </button>
                    </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

                <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {loading ? <p className="text-sm text-gray-400 p-5">Loading…</p>
                        : grades.length === 0 ? <p className="text-sm text-gray-400 p-5">No grades yet. Seed the default ladder or add one.</p>
                            : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
                                                <th className="py-2.5 px-4 font-medium">Grade</th>
                                                <th className="py-2.5 px-4 font-medium">Band (min · mid · max, monthly CTC)</th>
                                                <th className="py-2.5 px-4 font-medium text-right">Notice</th>
                                                <th className="py-2.5 px-4 font-medium">Typical experience</th>
                                                <th className="py-2.5 px-4 font-medium text-right">Assigned</th>
                                                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grades.map((g) => (
                                                <tr key={g.id} className="border-b border-gray-50">
                                                    <td className="py-2.5 px-4"><span className="font-semibold text-gray-900">{g.code}</span> <span className="text-gray-600">· {g.name}</span></td>
                                                    <td className="py-2.5 px-4 tabular-nums text-gray-700">{inr(g.minCtc)} · <span className="font-semibold">{inr(g.midCtc)}</span> · {inr(g.maxCtc)}</td>
                                                    <td className="py-2.5 px-4 text-right tabular-nums text-gray-700">{g.noticeDays != null ? `${g.noticeDays}d` : '—'}</td>
                                                    <td className="py-2.5 px-4 text-gray-500 text-xs max-w-xs">{g.typicalExperience || '—'}</td>
                                                    <td className="py-2.5 px-4 text-right text-xs text-gray-500">{g._count?.employees ?? 0} emp · {g._count?.designations ?? 0} desig</td>
                                                    <td className="py-2.5 px-4">
                                                        <div className="flex gap-1 justify-end">
                                                            <button onClick={() => openEdit(g)} title="Edit" className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                                                            <button onClick={() => remove(g)} disabled={busy} title="Delete" className="p-1.5 rounded text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                </section>

                {showForm && (
                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900">{editing ? `Edit ${editing.code}` : 'Add grade'}</h2>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="text-sm"><span className="text-gray-600">Code</span><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="G3" className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" /></label>
                                <label className="text-sm"><span className="text-gray-600">Order</span><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" /></label>
                                <label className="text-sm col-span-2"><span className="text-gray-600">Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Executive" className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" /></label>
                                <label className="text-sm"><span className="text-gray-600">Min CTC</span><input type="number" value={form.minCtc} onChange={(e) => setForm({ ...form, minCtc: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" /></label>
                                <label className="text-sm"><span className="text-gray-600">Mid CTC <span className="text-gray-400">(compa-ratio base)</span></span><input type="number" value={form.midCtc} onChange={(e) => setForm({ ...form, midCtc: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" /></label>
                                <label className="text-sm"><span className="text-gray-600">Max CTC</span><input type="number" value={form.maxCtc} onChange={(e) => setForm({ ...form, maxCtc: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" /></label>
                                <label className="text-sm"><span className="text-gray-600">Notice (days)</span><input type="number" value={form.noticeDays} onChange={(e) => setForm({ ...form, noticeDays: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" /></label>
                                <label className="text-sm col-span-2"><span className="text-gray-600">Typical experience</span><input value={form.typicalExperience} onChange={(e) => setForm({ ...form, typicalExperience: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" /></label>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowForm(false)} className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">Cancel</button>
                                <button onClick={save} disabled={busy} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2">{busy ? 'Saving…' : 'Save'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
