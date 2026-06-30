'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Target, Plus, LayoutTemplate, PencilLine, CheckCircle2 } from 'lucide-react';

const PERIODS = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'WEEKLY', 'DAILY'] as const;
const DIMENSIONS = ['OUTPUT', 'QUALITY', 'TAT', 'COLLABORATION', 'IMPROVEMENT', 'BEHAVIOR'] as const;

interface Assignee { employeeId: string; name: string; departmentName: string | null }
interface Template { id: string; name: string; items?: { id: string }[] }
interface Goal { id: string; title: string; targetValue: number; currentValue: number; achievementPercentage: number; unit: string; status: string; dimension?: string | null }

const emptyCustom = { title: '', metric: '', target: '', dimension: 'OUTPUT', dailyTarget: '', ratePerUnit: '' };

export default function AssignKraPage() {
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [employeeId, setEmployeeId] = useState('');
    const [period, setPeriod] = useState<typeof PERIODS[number]>('MONTHLY');
    const [mode, setMode] = useState<'custom' | 'template'>('custom');
    const [custom, setCustom] = useState({ ...emptyCustom });
    const [templateId, setTemplateId] = useState('');
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loadingGoals, setLoadingGoals] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}` }), []);

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

    const loadGoals = useCallback(async () => {
        if (!employeeId) { setGoals([]); return; }
        setLoadingGoals(true);
        try {
            const res = await fetch(`/api/kra/my?employeeId=${employeeId}&periodType=${period}`, { headers: authHeaders() });
            if (res.ok) {
                const d = await res.json();
                setGoals((d.goals || []).map((g: any) => ({
                    id: g.id, title: g.title, targetValue: g.targetValue, currentValue: g.currentValue,
                    achievementPercentage: g.achievementPercentage, unit: g.unit, status: g.status, dimension: g.dimension,
                })));
            } else setGoals([]);
        } catch { setGoals([]); }
        finally { setLoadingGoals(false); }
    }, [authHeaders, employeeId, period]);

    useEffect(() => { loadGoals(); }, [loadGoals]);

    const submit = async () => {
        setError(null); setSuccess(null);
        if (!employeeId) { setError('Pehle employee chuno.'); return; }
        setSaving(true);
        try {
            let res: Response;
            if (mode === 'custom') {
                if (!custom.title.trim() || !custom.metric.trim() || custom.target === '') {
                    setError('Title, unit aur target zaroori hain.'); setSaving(false); return;
                }
                res = await fetch('/api/kra/goal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({
                        employeeId,
                        title: custom.title.trim(),
                        metric: custom.metric.trim(),
                        target: Number(custom.target),
                        period,
                        dimension: custom.dimension,
                        ...(custom.dailyTarget !== '' ? { dailyTarget: Number(custom.dailyTarget) } : {}),
                        ...(custom.ratePerUnit !== '' ? { ratePerUnit: Number(custom.ratePerUnit) } : {}),
                    }),
                });
            } else {
                if (!templateId) { setError('Template chuno.'); setSaving(false); return; }
                res = await fetch('/api/kra/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ templateId, periodType: period, employeeIds: [employeeId] }),
                });
            }
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Assign failed');
            const who = assignees.find((a) => a.employeeId === employeeId)?.name || 'employee';
            setSuccess(mode === 'custom'
                ? `Goal assign ho gaya — ${who} ko ab "My Performance" me dikhega.`
                : `Template assign ho gaya (${body.created || 0} naye, ${body.updated || 0} updated) — ${who} ke dashboard pe dikhega.`);
            setCustom({ ...emptyCustom });
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
                    {/* Employee + period */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-sm">
                            <span className="text-gray-600">Employee</span>
                            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                <option value="">Select team member…</option>
                                {assignees.map((a) => <option key={a.employeeId} value={a.employeeId}>{a.name}{a.departmentName ? ` · ${a.departmentName}` : ''}</option>)}
                            </select>
                        </label>
                        <label className="text-sm">
                            <span className="text-gray-600">Period</span>
                            <select value={period} onChange={(e) => setPeriod(e.target.value as typeof PERIODS[number])} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                {PERIODS.map((p) => <option key={p} value={p}>{p.replace('_', '-').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                            </select>
                        </label>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="text-sm">
                                <span className="text-gray-600">Template</span>
                                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white">
                                    <option value="">Select template…</option>
                                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.items ? ` (${t.items.length} metrics)` : ''}</option>)}
                                </select>
                            </label>
                            <div className="text-xs text-gray-400 self-end pb-2">Template ke saare metrics is employee ko is period ke liye assign ho jaayenge.</div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button onClick={submit} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> {saving ? 'Assigning…' : 'Assign'}
                        </button>
                    </div>
                </section>

                {/* Current goals for the selected employee/period */}
                {employeeId && (
                    <section className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="font-semibold text-gray-900 mb-4">Current goals · {assignees.find((a) => a.employeeId === employeeId)?.name} · {period.toLowerCase()}</h2>
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
