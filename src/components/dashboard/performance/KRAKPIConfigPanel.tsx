'use client';

import { useEffect, useMemo, useState } from 'react';

type KpiRow = {
    id?: string;
    title: string;
    target: number;
    current: number;
    unit: string;
    period: string;
    category: string;
};

const PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

export default function KRAKPIConfigPanel() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [kra, setKra] = useState('');
    const [kpis, setKpis] = useState<KpiRow[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const selectedEmployee = useMemo(
        () => employees.find((e) => e.employeeId === selectedEmployeeId),
        [employees, selectedEmployeeId]
    );

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/performance/kra-kpi-config', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await res.json().catch(() => []);
            if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to load KRA/KPI config');
            setEmployees(Array.isArray(payload) ? payload : []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load KRA/KPI config');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/hr/performance/kra-kpi-templates', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const payload = await res.json().catch(() => []);
                if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to load templates');
                setTemplates(Array.isArray(payload) ? payload : []);
            } catch {
                setTemplates([]);
            }
        };
        loadTemplates();
    }, []);

    useEffect(() => {
        if (!selectedEmployee) {
            setKra('');
            setKpis([]);
            return;
        }
        setKra(selectedEmployee.kra || '');
        setKpis(
            (selectedEmployee.kpis || []).map((k: any) => ({
                id: k.id,
                title: k.title || '',
                target: Number(k.target || 0),
                current: Number(k.current || 0),
                unit: k.unit || 'COUNT',
                period: k.period || 'MONTHLY',
                category: k.category || 'GENERAL',
            }))
        );
    }, [selectedEmployee]);

    const updateKpi = (index: number, patch: Partial<KpiRow>) => {
        setKpis((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const addKpi = () => {
        setKpis((prev) => [
            ...prev,
            {
                title: '',
                target: 0,
                current: 0,
                unit: 'COUNT',
                period: 'MONTHLY',
                category: 'GENERAL',
            },
        ]);
    };

    const removeKpi = (index: number) => {
        setKpis((prev) => prev.filter((_, i) => i !== index));
    };

    const save = async () => {
        if (!selectedEmployeeId) {
            setError('Please select an employee first');
            return;
        }
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/performance/kra-kpi-config', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employeeId: selectedEmployeeId,
                    kra,
                    kpis,
                    replaceExisting: true,
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to save KRA/KPI');
            setNotice('KRA/KPI saved successfully.');
            await loadAll();
        } catch (e: any) {
            setError(e?.message || 'Failed to save KRA/KPI');
        } finally {
            setSaving(false);
        }
    };

    const applyTemplate = () => {
        if (!selectedTemplateId) {
            setError('Please select a template first');
            return;
        }
        const template = templates.find((t) => t.id === selectedTemplateId);
        if (!template) {
            setError('Template not found');
            return;
        }
        setError('');
        setNotice(`Applied template: ${template.name}`);
        setKra(template.kra || '');
        setKpis(
            (template.kpis || []).map((k: any) => ({
                title: k.title || '',
                target: Number(k.target || 0),
                current: Number(k.current || 0),
                unit: k.unit || 'COUNT',
                period: k.period || 'MONTHLY',
                category: k.category || 'GENERAL',
            }))
        );
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-gray-900">KRA/KPI Configuration</h3>
                    <p className="text-xs text-gray-500">Set KRAs and KPI rows for each employee with one workflow.</p>
                </div>
                <button
                    onClick={save}
                    disabled={saving || !selectedEmployeeId}
                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-60"
                >
                    {saving ? 'Saving...' : 'Save KRA/KPI'}
                </button>
            </div>

            {loading && <div className="text-xs text-gray-500">Loading employees...</div>}
            {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}
            {notice && <div className="text-xs text-emerald-600 font-semibold">{notice}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700"
                >
                    <option value="">Select Employee</option>
                    {employees.map((employee) => (
                        <option key={employee.employeeId} value={employee.employeeId}>
                            {employee.name} ({employee.designation})
                        </option>
                    ))}
                </select>

                <input
                    value={selectedEmployee?.email || ''}
                    readOnly
                    placeholder="Employee email"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700"
                >
                    <option value="">Select Team Template</option>
                    {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                            {template.name} [{template.family} - {template.roleType}]
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={applyTemplate}
                    className="px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold"
                >
                    Apply Template
                </button>
            </div>

            <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1">KRA Definition</label>
                <textarea
                    value={kra}
                    onChange={(e) => setKra(e.target.value)}
                    rows={4}
                    placeholder="Define key responsibility areas for this employee..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700"
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">KPI Rows</p>
                    <button onClick={addKpi} className="text-xs font-bold text-indigo-600">+ Add KPI</button>
                </div>
                {kpis.length === 0 && (
                    <div className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg p-3">
                        No KPIs yet. Add KPI rows for tracking.
                    </div>
                )}
                {kpis.map((kpi, index) => (
                    <div key={`${kpi.id || 'new'}-${index}`} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                                value={kpi.title}
                                onChange={(e) => updateKpi(index, { title: e.target.value })}
                                placeholder="KPI title"
                                className="border border-gray-200 rounded-lg px-2 py-2 text-xs"
                            />
                            <input
                                value={kpi.category}
                                onChange={(e) => updateKpi(index, { category: e.target.value })}
                                placeholder="Category"
                                className="border border-gray-200 rounded-lg px-2 py-2 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <input
                                type="number"
                                value={kpi.target}
                                onChange={(e) => updateKpi(index, { target: Number(e.target.value) })}
                                placeholder="Target"
                                className="border border-gray-200 rounded-lg px-2 py-2 text-xs"
                            />
                            <input
                                type="number"
                                value={kpi.current}
                                onChange={(e) => updateKpi(index, { current: Number(e.target.value) })}
                                placeholder="Current"
                                className="border border-gray-200 rounded-lg px-2 py-2 text-xs"
                            />
                            <input
                                value={kpi.unit}
                                onChange={(e) => updateKpi(index, { unit: e.target.value })}
                                placeholder="Unit"
                                className="border border-gray-200 rounded-lg px-2 py-2 text-xs"
                            />
                            <select
                                value={kpi.period}
                                onChange={(e) => updateKpi(index, { period: e.target.value })}
                                className="border border-gray-200 rounded-lg px-2 py-2 text-xs"
                            >
                                {PERIODS.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => removeKpi(index)}
                                className="border border-red-200 rounded-lg px-2 py-2 text-xs font-bold text-red-600"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
