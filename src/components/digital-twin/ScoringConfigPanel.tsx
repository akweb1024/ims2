'use client';

import { useEffect, useMemo, useState } from 'react';

type Weights = {
    attendance: number;
    workReport: number;
    kpi: number;
    kra: number;
    discipline: number;
    projectLoad: number;
    thinkTank: number;
};

type ConfigRow = {
    departmentId: string | null;
    departmentName: string | null;
    weights: Weights;
    riskThresholdHigh: number;
    riskThresholdMedium: number;
};

type DepartmentRow = {
    id: string;
    name: string;
    code?: string | null;
};

const DEFAULT_WEIGHTS: Weights = {
    attendance: 1,
    workReport: 1,
    kpi: 1,
    kra: 1,
    discipline: 1,
    projectLoad: 1,
    thinkTank: 1,
};

export function ScoringConfigPanel() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [forbidden, setForbidden] = useState(false);
    const [departments, setDepartments] = useState<DepartmentRow[]>([]);
    const [configs, setConfigs] = useState<ConfigRow[]>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('default');
    const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
    const [riskThresholdHigh, setRiskThresholdHigh] = useState(65);
    const [riskThresholdMedium, setRiskThresholdMedium] = useState(35);
    const [message, setMessage] = useState('');

    const configByDepartment = useMemo(() => {
        const map = new Map<string, ConfigRow>();
        for (const config of configs) {
            map.set(config.departmentId || 'default', config);
        }
        return map;
    }, [configs]);

    const load = async () => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/digital-twin/scoring-config');
            if (res.status === 403) {
                setForbidden(true);
                setLoading(false);
                return;
            }
            if (!res.ok) throw new Error('Failed to load scoring config');
            const json = await res.json();
            const items: ConfigRow[] = [
                ...(json.defaultConfig ? [json.defaultConfig] : []),
                ...(json.departmentConfigs || []),
            ];
            setConfigs(items);
            setDepartments(json.departments || []);

            const defaultConfig = items.find((row) => row.departmentId === null);
            if (defaultConfig) {
                setWeights(defaultConfig.weights);
                setRiskThresholdHigh(defaultConfig.riskThresholdHigh);
                setRiskThresholdMedium(defaultConfig.riskThresholdMedium);
            }
        } catch (err: any) {
            setMessage(err.message || 'Unable to load scoring configuration');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        const row = configByDepartment.get(selectedDepartmentId);
        if (row) {
            setWeights(row.weights);
            setRiskThresholdHigh(row.riskThresholdHigh);
            setRiskThresholdMedium(row.riskThresholdMedium);
            return;
        }
        const fallback = configByDepartment.get('default');
        if (fallback) {
            setWeights(fallback.weights);
            setRiskThresholdHigh(fallback.riskThresholdHigh);
            setRiskThresholdMedium(fallback.riskThresholdMedium);
            return;
        }
        setWeights(DEFAULT_WEIGHTS);
        setRiskThresholdHigh(65);
        setRiskThresholdMedium(35);
    }, [selectedDepartmentId, configByDepartment]);

    const setWeight = (key: keyof Weights, value: number) => {
        setWeights((prev) => ({ ...prev, [key]: value }));
    };

    const save = async () => {
        setSaving(true);
        setMessage('');
        try {
            const payload = {
                departmentId: selectedDepartmentId === 'default' ? null : selectedDepartmentId,
                weights,
                riskThresholdHigh,
                riskThresholdMedium,
                isActive: true,
            };

            const res = await fetch('/api/digital-twin/scoring-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.message || err?.error || 'Failed to save');
            }

            setMessage('Scoring configuration saved.');
            await load();
        } catch (err: any) {
            setMessage(err.message || 'Failed to save scoring configuration');
        } finally {
            setSaving(false);
        }
    };

    if (forbidden) return null;
    if (loading) {
        return (
            <div className="mb-8 p-4 rounded-2xl border border-white/10 bg-white/5 text-white/50 text-sm">
                Loading scoring configuration...
            </div>
        );
    }

    return (
        <div className="mb-8 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Department Scoring Config</h3>
                    <p className="text-xs text-white/40">Tune Digital Twin risk and engagement scoring by department.</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        className="bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-xs text-white"
                    >
                        <option value="default">Default (All Departments)</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}{dept.code ? ` (${dept.code})` : ''}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={save}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
                {(Object.keys(weights) as Array<keyof Weights>).map((key) => (
                    <label key={key} className="p-2 rounded-lg border border-white/10 bg-black/25">
                        <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1">{key}</p>
                        <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={weights[key]}
                            onChange={(e) => setWeight(key, Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/15 rounded px-2 py-1 text-xs text-white"
                        />
                    </label>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="p-2 rounded-lg border border-white/10 bg-black/25">
                    <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1">High Risk Threshold</p>
                    <input
                        type="number"
                        min={40}
                        max={95}
                        value={riskThresholdHigh}
                        onChange={(e) => setRiskThresholdHigh(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/15 rounded px-2 py-1 text-xs text-white"
                    />
                </label>
                <label className="p-2 rounded-lg border border-white/10 bg-black/25">
                    <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1">Medium Risk Threshold</p>
                    <input
                        type="number"
                        min={10}
                        max={90}
                        value={riskThresholdMedium}
                        onChange={(e) => setRiskThresholdMedium(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/15 rounded px-2 py-1 text-xs text-white"
                    />
                </label>
            </div>

            {message && (
                <p className="mt-3 text-xs text-indigo-300">{message}</p>
            )}
        </div>
    );
}
