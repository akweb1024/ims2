'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Target, Plus, LayoutTemplate, PencilLine, CheckCircle2, Users } from 'lucide-react';

const PERIODS = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'WEEKLY', 'DAILY'] as const;
const DIMENSIONS = ['OUTPUT', 'QUALITY', 'TAT', 'COLLABORATION', 'IMPROVEMENT', 'BEHAVIOR'] as const;

interface Assignee { employeeId: string; userId: string; name: string; departmentName: string | null }
interface TemplateItem { id: string; metricId: string; defaultTarget: number; metric?: { name: string; unit: string | null } }
interface Template { id: string; name: string; items?: TemplateItem[] }
interface Goal { id: string; title: string; targetValue: number; currentValue: number; achievementPercentage: number; unit: string; status: string; dimension?: string | null }

const emptyCustom = { title: '', metric: '', target: '', dimension: 'OUTPUT', dailyTarget: '', ratePerUnit: '' };

export default function AssignKraPage() {
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [employeeIds, setEmployeeIds] = useState<string[]>([]);
    const [deptFilter, setDeptFilter] = useState('');
    const [reviewerId, setReviewerId] = useState('');
    const [period, setPeriod] = useState<typeof PERIODS[number]>('MONTHLY');
    const [mode, setMode] = useState<'custom' | 'template'>('custom');
    const [custom, setCustom] = useState({ ...emptyCustom });
    const [templateId, setTemplateId] = useState('');
    const [showOverrides, setShowOverrides] = useState(false);
    const [overrides, setOverrides] = useState<Record<string, string>>({}); // `${employeeId}:${metricId}` -> target
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loadingGoals, setLoadingGoals] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}` }), []);

    // Distinct departments among assignees, for the quick-filter dropdown.
    const departments = useMemo(() => {
        const names = new Set<string>();
        assignees.forEach((a) => { if (a.departmentName) names.add(a.departmentName); });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [assignees]);

    // Assignees currently visible given the department filter.
    const visible = useMemo(
        () => (deptFilter ? assignees.filter((a) => a.departmentName === deptFilter) : assignees),
        [assignees, deptFilter],
    );

    const selected = useMemo(() => new Set(employeeIds), [employeeIds]);
    // A recipient can't also be the reviewer — drop the reviewer if they get selected.
    useEffect(() => {
        if (!reviewerId) return;
        const rev = assignees.find((a) => a.userId === reviewerId);
        if (rev && selected.has(rev.employeeId)) setReviewerId('');
    }, [selected, reviewerId, assignees]);
    const toggle = (id: string) => setEmployeeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    const selectAllVisible = () => setEmployeeIds((prev) => Array.from(new Set([...prev, ...visible.map((a) => a.employeeId)])));
    const clearSelection = () => setEmployeeIds([]);

    const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);
    const setOverride = (employeeId: string, metricId: string, value: string) =>
        setOverrides((prev) => ({ ...prev, [`${employeeId}:${metricId}`]: value }));
    // Only send overrides for currently-selected members × current template metrics with a valid number.
    const buildOverrides = () => {
        if (!selectedTemplate?.items?.length) return [];
        const out: { employeeId: string; metricId: string; target: number }[] = [];
        for (const id of employeeIds) {
            for (const it of selectedTemplate.items) {
                const raw = overrides[`${id}:${it.metricId}`];
                if (raw !== undefined && raw !== '' && Number.isFinite(Number(raw))) {
                    out.push({ employeeId: id, metricId: it.metricId, target: Number(raw) });
                }
            }
        }
        return out;
    };

    useEffect(() => {
        (async () => {
            try {
                const [aRes, tRes] = await Promise.all([
                    fetch('/api/kra/assignees', { headers: authHeaders() }),
                    fetch('/api/kra/templates', { headers: authHeaders() }),
                ]);
                if (aRes.ok) setAssignees((await aRes.json()).assignees || []);
                if (tRes.ok) setTemplates((await tRes.json()).templates || []);
            } catch (e: any) { setError(e.message); }
        })();
    }, [authHeaders]);

    // Current-goals preview only makes sense for a single selection.
    const soleEmployeeId = employeeIds.length === 1 ? employeeIds[0] : '';

    const loadGoals = useCallback(async () => {
        if (!soleEmployeeId) { setGoals([]); return; }
        setLoadingGoals(true);
        try {
            const res = await fetch(`/api/kra/my?employeeId=${soleEmployeeId}&periodType=${period}`, { headers: authHeaders() });
            if (res.ok) {
                const d = await res.json();
                setGoals((d.goals || []).map((g: any) => ({
                    id: g.id, title: g.title, targetValue: g.targetValue, currentValue: g.currentValue,
                    achievementPercentage: g.achievementPercentage, unit: g.unit, status: g.status, dimension: g.dimension,
                })));
            } else setGoals([]);
        } catch { setGoals([]); }
        finally { setLoadingGoals(false); }
    }, [authHeaders, soleEmployeeId, period]);

    useEffect(() => { loadGoals(); }, [loadGoals]);

    const whoLabel = () => {
        if (employeeIds.length === 1) return assignees.find((a) => a.employeeId === employeeIds[0])?.name || 'employee';
        return `${employeeIds.length} members`;
    };

    const submit = async () => {
        setError(null); setSuccess(null);
        if (employeeIds.length === 0) { setError('Pehle kam se kam ek employee chuno.'); return; }
        setSaving(true);
        try {
            if (mode === 'custom') {
                if (!custom.title.trim() || !custom.metric.trim() || custom.target === '') {
                    setError('Title, unit aur target zaroori hain.'); setSaving(false); return;
                }
                const payloadBase = {
                    title: custom.title.trim(),
                    metric: custom.metric.trim(),
                    target: Number(custom.target),
                    period,
                    dimension: custom.dimension,
                    ...(custom.dailyTarget !== '' ? { dailyTarget: Number(custom.dailyTarget) } : {}),
                    ...(custom.ratePerUnit !== '' ? { ratePerUnit: Number(custom.ratePerUnit) } : {}),
                    ...(reviewerId ? { reviewerId } : {}),
                };
                // One goal per employee — /api/kra/goal is single-employee.
                const results = await Promise.all(employeeIds.map(async (id) => {
                    try {
                        const r = await fetch('/api/kra/goal', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders() },
                            body: JSON.stringify({ employeeId: id, ...payloadBase }),
                        });
                        return r.ok ? { ok: true as const } : { ok: false as const, error: (await r.json()).error };
                    } catch (e: any) { return { ok: false as const, error: e.message }; }
                }));
                const ok = results.filter((r) => r.ok).length;
                const failed = results.length - ok;
                if (ok === 0) throw new Error(results.find((r) => !r.ok)?.error || 'Assign failed');
                setSuccess(`Goal ${ok} member${ok > 1 ? 's' : ''} ko assign ho gaya${failed ? ` (${failed} fail)` : ''} — unhe "My Performance" me dikhega.`);
                setCustom({ ...emptyCustom });
            } else {
                if (!templateId) { setError('Template chuno.'); setSaving(false); return; }
                const res = await fetch('/api/kra/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ templateId, periodType: period, employeeIds, ...(reviewerId ? { reviewerId } : {}), ...(buildOverrides().length ? { overrides: buildOverrides() } : {}) }),
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error || 'Assign failed');
                setSuccess(`Template assign ho gaya (${body.created || 0} naye, ${body.updated || 0} updated) — ${whoLabel()} ke dashboard pe dikhega.`);
            }
            loadGoals();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Target className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Assign KRA / Goals</h1>
                        <p className="text-sm text-gray-500">Apni team ke kisi member ko KRA goal do — custom ya template se. Employee ko turant uske dashboard pe dikhega.</p>
                    </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
                {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{success}</div>}

                <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                    {/* Team members (multi-select) + period */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-sm">
                            <span className="text-gray-600">Filter by department</span>
                            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                <option value="">All departments</option>
                                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </label>
                        <label className="text-sm">
                            <span className="text-gray-600">Period</span>
                            <select value={period} onChange={(e) => setPeriod(e.target.value as typeof PERIODS[number])} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                {PERIODS.map((p) => <option key={p} value={p}>{p.replace('_', '-').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                            </select>
                        </label>
                        <label className="text-sm">
                            <span className="text-gray-600">Reviewer <span className="text-gray-400">(optional)</span></span>
                            <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                <option value="">Default (TL → Manager)</option>
                                {assignees.filter((a) => !selected.has(a.employeeId)).map((a) => <option key={a.userId} value={a.userId}>{a.name}</option>)}
                            </select>
                        </label>
                    </div>

                    {/* Member picker */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 flex items-center gap-1.5">
                                <Users className="w-4 h-4" /> Team members
                                {employeeIds.length > 0 && <span className="text-indigo-600 font-medium">· {employeeIds.length} selected</span>}
                            </span>
                            <div className="flex gap-3 text-xs">
                                <button type="button" onClick={selectAllVisible} className="text-indigo-600 hover:underline">Select all{deptFilter ? ' in dept' : ''}</button>
                                <button type="button" onClick={clearSelection} disabled={employeeIds.length === 0} className="text-gray-500 hover:underline disabled:opacity-40">Clear</button>
                            </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-50">
                            {visible.length === 0 ? <p className="text-sm text-gray-400 px-3 py-4">Koi team member nahi mila.</p>
                                : visible.map((a) => (
                                    <label key={a.employeeId} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                        <input type="checkbox" checked={selected.has(a.employeeId)} onChange={() => toggle(a.employeeId)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-sm text-gray-800">{a.name}</span>
                                        {a.departmentName && <span className="text-xs text-gray-400 ml-auto">{a.departmentName}</span>}
                                    </label>
                                ))}
                        </div>
                    </div>

                    {/* Mode tabs */}
                    <div className="flex gap-1 border-b border-gray-200">
                        <button onClick={() => setMode('custom')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${mode === 'custom' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <PencilLine className="w-4 h-4" /> Custom goal
                        </button>
                        <button onClick={() => setMode('template')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${mode === 'template' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <LayoutTemplate className="w-4 h-4" /> From template
                        </button>
                    </div>

                    {mode === 'custom' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <label className="text-sm md:col-span-2">
                                <span className="text-gray-600">Goal title</span>
                                <input value={custom.title} onChange={(e) => setCustom({ ...custom, title: e.target.value })} placeholder="e.g. Publish 20 articles" className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" />
                            </label>
                            <label className="text-sm">
                                <span className="text-gray-600">Unit / metric</span>
                                <input value={custom.metric} onChange={(e) => setCustom({ ...custom, metric: e.target.value })} placeholder="articles, calls, deals…" maxLength={32} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" />
                            </label>
                            <label className="text-sm">
                                <span className="text-gray-600">Target</span>
                                <input type="number" min={0} step="any" value={custom.target} onChange={(e) => setCustom({ ...custom, target: e.target.value })} placeholder="e.g. 20" className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" />
                            </label>
                            <label className="text-sm">
                                <span className="text-gray-600">Dimension</span>
                                <select value={custom.dimension} onChange={(e) => setCustom({ ...custom, dimension: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                    {DIMENSIONS.map((d) => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
                                </select>
                            </label>
                            <label className="text-sm">
                                <span className="text-gray-600">Daily target <span className="text-gray-400">(optional)</span></span>
                                <input type="number" min={0} step="any" value={custom.dailyTarget} onChange={(e) => setCustom({ ...custom, dailyTarget: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" />
                            </label>
                            <label className="text-sm">
                                <span className="text-gray-600">₹ per unit <span className="text-gray-400">(optional)</span></span>
                                <input type="number" min={0} step="any" value={custom.ratePerUnit} onChange={(e) => setCustom({ ...custom, ratePerUnit: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2" />
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="text-sm">
                                    <span className="text-gray-600">Template</span>
                                    <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                        <option value="">Select template…</option>
                                        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.items ? ` (${t.items.length} metrics)` : ''}</option>)}
                                    </select>
                                </label>
                                <div className="text-xs text-gray-400 self-end pb-2">Template ke saare metrics selected members ko is period ke liye assign ho jaayenge. Default target chhodo — sirf jahan alag chahiye wahan bharo.</div>
                            </div>

                            {/* Per-member target overrides */}
                            {selectedTemplate?.items?.length && employeeIds.length > 0 ? (
                                <div className="border border-gray-200 rounded-md">
                                    <button type="button" onClick={() => setShowOverrides((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                        <span className="font-medium">Customize targets per member <span className="text-gray-400 font-normal">(optional)</span></span>
                                        <span className="text-gray-400 text-xs">{showOverrides ? 'Hide' : 'Show'}</span>
                                    </button>
                                    {showOverrides && (
                                        <div className="overflow-x-auto border-t border-gray-100">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-500 border-b border-gray-100">
                                                        <th className="py-2 px-3 font-medium sticky left-0 bg-white">Member</th>
                                                        {selectedTemplate.items.map((it) => (
                                                            <th key={it.id} className="py-2 px-3 font-medium whitespace-nowrap">
                                                                {it.metric?.name || 'Metric'}
                                                                <span className="block text-xs font-normal text-gray-400">default {it.defaultTarget}{it.metric?.unit ? ` ${it.metric.unit}` : ''}</span>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {employeeIds.map((id) => {
                                                        const a = assignees.find((x) => x.employeeId === id);
                                                        return (
                                                            <tr key={id} className="border-b border-gray-50">
                                                                <td className="py-2 px-3 text-gray-800 whitespace-nowrap sticky left-0 bg-white">{a?.name || 'Member'}</td>
                                                                {selectedTemplate.items!.map((it) => (
                                                                    <td key={it.id} className="py-1.5 px-3">
                                                                        <input
                                                                            type="number" min={0} step="any"
                                                                            value={overrides[`${id}:${it.metricId}`] ?? ''}
                                                                            onChange={(e) => setOverride(id, it.metricId, e.target.value)}
                                                                            placeholder={String(it.defaultTarget)}
                                                                            className="w-24 border border-gray-200 rounded px-2 py-1 tabular-nums"
                                                                        />
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button onClick={submit} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> {saving ? 'Assigning…' : 'Assign'}
                        </button>
                    </div>
                </section>

                {/* Current goals — only when a single member is selected */}
                {soleEmployeeId && (
                    <section className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="font-semibold text-gray-900 mb-4">Current goals · {assignees.find((a) => a.employeeId === soleEmployeeId)?.name} · {period.toLowerCase()}</h2>
                        {loadingGoals ? <p className="text-sm text-gray-400">Loading…</p>
                            : goals.length === 0 ? <p className="text-sm text-gray-400">Is period me abhi koi goal nahi.</p>
                                : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                                    <th className="py-2 pr-4 font-medium">Goal</th>
                                                    <th className="py-2 pr-4 font-medium text-right">Target</th>
                                                    <th className="py-2 pr-4 font-medium text-right">Current</th>
                                                    <th className="py-2 pr-4 font-medium text-right">%</th>
                                                    <th className="py-2 pr-4 font-medium">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {goals.map((g) => (
                                                    <tr key={g.id} className="border-b border-gray-50">
                                                        <td className="py-2 pr-4 text-gray-800">{g.title}</td>
                                                        <td className="py-2 pr-4 text-right tabular-nums">{g.targetValue} {g.unit}</td>
                                                        <td className="py-2 pr-4 text-right tabular-nums">{g.currentValue}</td>
                                                        <td className="py-2 pr-4 text-right tabular-nums">{Math.round(g.achievementPercentage)}%</td>
                                                        <td className="py-2 pr-4 text-xs text-gray-500">{g.status.replace(/_/g, ' ')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                    </section>
                )}
            </div>
        </DashboardLayout>
    );
}
