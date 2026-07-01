'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Layers, Save, Wand2 } from 'lucide-react';

interface Grade { id: string; code: string; name: string; minCtc: number | null; midCtc: number | null; maxCtc: number | null }
interface Emp { id: string; name: string; designation: string | null; department: string | null; baseSalary: number | null; gradeId: string | null }

const inr = (n: number | null) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);

export default function GradeMappingPage() {
    const [employees, setEmployees] = useState<Emp[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [assign, setAssign] = useState<Record<string, string>>({}); // profileId -> gradeId ('' = none)
    const [original, setOriginal] = useState<Record<string, string>>({});
    const [bulkDesig, setBulkDesig] = useState('');
    const [bulkGrade, setBulkGrade] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}` }), []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/hr/grade-mapping', { headers: authHeaders() });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Failed to load');
            setEmployees(d.employees || []);
            setGrades(d.grades || []);
            const init: Record<string, string> = {};
            (d.employees || []).forEach((e: Emp) => { init[e.id] = e.gradeId || ''; });
            setAssign(init); setOriginal(init);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [authHeaders]);

    useEffect(() => { load(); }, [load]);

    const gradeById = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades]);
    const designations = useMemo(() => Array.from(new Set(employees.map((e) => e.designation).filter(Boolean))).sort() as string[], [employees]);
    const dirtyIds = useMemo(() => employees.filter((e) => (assign[e.id] || '') !== (original[e.id] || '')).map((e) => e.id), [employees, assign, original]);

    const compa = (salary: number | null, gradeId: string) => {
        const g = gradeById.get(gradeId);
        if (!g?.midCtc || !salary) return null;
        return Math.round((salary / g.midCtc) * 100) / 100;
    };

    const applyBulk = () => {
        if (!bulkDesig || !bulkGrade) return;
        setAssign((prev) => {
            const next = { ...prev };
            employees.forEach((e) => { if (e.designation === bulkDesig) next[e.id] = bulkGrade; });
            return next;
        });
    };

    const save = async () => {
        if (!dirtyIds.length) return;
        setSaving(true); setError(null); setSuccess(null);
        try {
            const assignments = dirtyIds.map((id) => ({ employeeId: id, gradeId: assign[id] ? assign[id] : null }));
            const res = await fetch('/api/hr/grade-mapping', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ assignments }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Save failed');
            setSuccess(`${d.updated} employee(s) updated${d.skipped ? `, ${d.skipped} skipped` : ''}.`);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setSaving(false); }
    };

    const assignedCount = employees.filter((e) => assign[e.id]).length;

    return (
        <DashboardLayout>
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Layers className="w-7 h-7 text-indigo-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Grade Mapping</h1>
                            <p className="text-sm text-gray-500">Assign a grade to each employee — individually or in bulk by designation. Feeds compa-ratio, fitment equity and increment advice.</p>
                        </div>
                    </div>
                    <button onClick={save} disabled={saving || !dirtyIds.length} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
                        <Save className="w-4 h-4" /> {saving ? 'Saving…' : `Save${dirtyIds.length ? ` (${dirtyIds.length})` : ''}`}
                    </button>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
                {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">{success}</div>}

                {grades.length === 0 && !loading && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">No grades yet — seed the ladder under <b>Job Grades</b> first.</div>
                )}

                {/* Bulk-by-designation helper */}
                <section className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600"><Wand2 className="w-4 h-4" /> Bulk set:</div>
                    <label className="text-sm">
                        <span className="text-gray-500 text-xs block">All with designation</span>
                        <select value={bulkDesig} onChange={(e) => setBulkDesig(e.target.value)} className="mt-0.5 border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                            <option value="">Select…</option>
                            {designations.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </label>
                    <label className="text-sm">
                        <span className="text-gray-500 text-xs block">→ grade</span>
                        <select value={bulkGrade} onChange={(e) => setBulkGrade(e.target.value)} className="mt-0.5 border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                            <option value="">Select…</option>
                            {grades.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.name}</option>)}
                        </select>
                    </label>
                    <button onClick={applyBulk} disabled={!bulkDesig || !bulkGrade} className="border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 text-sm font-medium rounded-lg px-3 py-1.5">Apply</button>
                    <span className="text-xs text-gray-400 ml-auto">{assignedCount}/{employees.length} graded</span>
                </section>

                <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {loading ? <p className="text-sm text-gray-400 p-5">Loading…</p>
                        : employees.length === 0 ? <p className="text-sm text-gray-400 p-5">No employees.</p>
                            : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
                                                <th className="py-2.5 px-4 font-medium">Employee</th>
                                                <th className="py-2.5 px-4 font-medium">Designation</th>
                                                <th className="py-2.5 px-4 font-medium text-right">Salary</th>
                                                <th className="py-2.5 px-4 font-medium">Grade</th>
                                                <th className="py-2.5 px-4 font-medium text-right">Compa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employees.map((e) => {
                                                const gid = assign[e.id] || '';
                                                const cr = compa(e.baseSalary, gid);
                                                const dirty = (assign[e.id] || '') !== (original[e.id] || '');
                                                return (
                                                    <tr key={e.id} className={`border-b border-gray-50 ${dirty ? 'bg-indigo-50/40' : ''}`}>
                                                        <td className="py-2 px-4 text-gray-800">{e.name}{e.department ? <span className="text-xs text-gray-400"> · {e.department}</span> : ''}</td>
                                                        <td className="py-2 px-4 text-gray-600 text-xs">{e.designation || '—'}</td>
                                                        <td className="py-2 px-4 text-right tabular-nums text-gray-700">{inr(e.baseSalary)}</td>
                                                        <td className="py-2 px-4">
                                                            <select value={gid} onChange={(ev) => setAssign((prev) => ({ ...prev, [e.id]: ev.target.value }))} className="border border-gray-200 rounded-md px-2 py-1 bg-white">
                                                                <option value="">— none —</option>
                                                                {grades.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="py-2 px-4 text-right tabular-nums">
                                                            {cr == null ? <span className="text-gray-300">—</span>
                                                                : <span className={cr < 0.85 ? 'text-amber-600' : cr > 1.2 ? 'text-red-600' : 'text-emerald-600'}>{cr.toFixed(2)}</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                </section>
            </div>
        </DashboardLayout>
    );
}
