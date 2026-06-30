'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Share2, Plus, Trash2, Building2, Layers, Info, BarChart3, Settings2, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

type DepartmentType = 'REVENUE' | 'PRODUCTION' | 'SUPPORT';

interface Company {
    id: string;
    name: string;
}

interface Department {
    id: string;
    name: string;
    companyId: string;
    departmentType: DepartmentType;
}

interface ShareRule {
    id: string;
    beneficiaryDepartmentId: string;
    sourceCompanyId: string;
    sourceDepartmentId: string | null;
    percentage: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    isActive: boolean;
    note: string | null;
    beneficiaryDepartment: { id: string; name: string; departmentType: DepartmentType; company: { id: string; name: string } };
    sourceCompany: { id: string; name: string };
    sourceDepartment: { id: string; name: string } | null;
}

interface ReportRow {
    departmentId: string;
    departmentName: string;
    companyId: string;
    companyName: string;
    departmentType: DepartmentType;
    grossRevenue: number;
    sharesOut: number;
    residualKept: number;
    sharesIn: number;
    netAttributed: number;
}

interface ShareReport {
    month: number;
    year: number;
    locked: boolean;
    rows: ReportRow[];
    totals: { grossRevenue: number; sharesOut: number; residualKept: number; sharesIn: number; netAttributed: number };
}

const TYPE_META: Record<DepartmentType, { label: string; hint: string; color: string }> = {
    REVENUE: { label: 'Revenue', hint: 'Earns revenue directly', color: 'bg-green-100 text-green-700' },
    PRODUCTION: { label: 'Production', hint: 'Builds the product', color: 'bg-blue-100 text-blue-700' },
    SUPPORT: { label: 'Support', hint: 'Enables everyone, no direct revenue', color: 'bg-amber-100 text-amber-700' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMoney = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

const emptyDraft = {
    beneficiaryDepartmentId: '',
    sourceCompanyId: '',
    sourceDepartmentId: '',
    percentage: '',
    effectiveFrom: '',
    effectiveTo: '',
    note: '',
};

export default function RevenueSharePage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [rules, setRules] = useState<ShareRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState({ ...emptyDraft });

    const [view, setView] = useState<'config' | 'report'>('config');
    const now = new Date();
    const [period, setPeriod] = useState<{ month: number; year: number }>({ month: now.getMonth() + 1, year: now.getFullYear() });
    const [report, setReport] = useState<ShareReport | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [locking, setLocking] = useState(false);

    const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${token()}` }), []);

    const fetchReport = useCallback(async () => {
        setReportLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/revenue/department-shares?month=${period.month}&year=${period.year}`, { headers: authHeaders() });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load report');
            setReport(await res.json());
        } catch (e: any) {
            setError(e.message);
            setReport(null);
        } finally {
            setReportLoading(false);
        }
    }, [authHeaders, period.month, period.year]);

    useEffect(() => {
        if (view === 'report') fetchReport();
    }, [view, fetchReport]);

    const shiftPeriod = (delta: number) => {
        setPeriod((p) => {
            const idx = p.year * 12 + (p.month - 1) + delta;
            return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
        });
    };

    const lockPeriod = async () => {
        if (!confirm(`Lock ${MONTHS[period.month - 1]} ${period.year}? Allocations for this period become immutable.`)) return;
        setLocking(true);
        try {
            const res = await fetch('/api/revenue/department-shares', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ action: 'lock', month: period.month, year: period.year }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to lock period');
            await fetchReport();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLocking(false);
        }
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            // Departments: this is a cross-company feature, so try to load EVERY company's
            // departments (companyId=ALL). Roles that can't access all companies fall back
            // to their own company's departments.
            let dRes = await fetch('/api/departments?companyId=ALL', { headers: authHeaders() });
            if (!dRes.ok) dRes = await fetch('/api/departments', { headers: authHeaders() });

            const [cRes, rRes] = await Promise.all([
                fetch('/api/companies?limit=100', { headers: authHeaders() }),
                fetch('/api/settings/revenue-share-rules?includeInactive=true', { headers: authHeaders() }),
            ]);
            // /api/companies returns { data: [...], pagination }, not a bare array.
            const cData = cRes.ok ? await cRes.json() : [];
            setCompanies(Array.isArray(cData) ? cData : (cData.data || cData.companies || []));
            setDepartments(dRes.ok ? await dRes.json() : []);
            setRules(rRes.ok ? await rRes.json() : []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const companyName = useCallback((id: string) => companies.find((c) => c.id === id)?.name || '—', [companies]);

    // Beneficiaries are typically SUPPORT/PRODUCTION; sources are typically REVENUE.
    const beneficiaryDepts = useMemo(
        () => departments.filter((d) => d.departmentType !== 'REVENUE'),
        [departments],
    );
    const sourceDeptsForCompany = useMemo(
        () => departments.filter((d) => d.companyId === draft.sourceCompanyId),
        [departments, draft.sourceCompanyId],
    );

    const setDeptType = async (deptId: string, departmentType: DepartmentType) => {
        setDepartments((prev) => prev.map((d) => (d.id === deptId ? { ...d, departmentType } : d)));
        try {
            const res = await fetch(`/api/departments/${deptId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ departmentType }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to update department type');
        } catch (e: any) {
            setError(e.message);
            fetchAll();
        }
    };

    const addRule = async () => {
        setError(null);
        if (!draft.beneficiaryDepartmentId || !draft.sourceCompanyId || draft.percentage === '') {
            setError('Beneficiary department, source company, and percentage are required.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/settings/revenue-share-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    beneficiaryDepartmentId: draft.beneficiaryDepartmentId,
                    sourceCompanyId: draft.sourceCompanyId,
                    sourceDepartmentId: draft.sourceDepartmentId || null,
                    percentage: Number(draft.percentage),
                    effectiveFrom: draft.effectiveFrom || null,
                    effectiveTo: draft.effectiveTo || null,
                    note: draft.note || null,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to create rule');
            setDraft({ ...emptyDraft });
            await fetchAll();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const deactivateRule = async (id: string) => {
        if (!confirm('Deactivate this rule? Already-computed shares are preserved.')) return;
        try {
            const res = await fetch(`/api/settings/revenue-share-rules?id=${id}`, { method: 'DELETE', headers: authHeaders() });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to deactivate');
            await fetchAll();
        } catch (e: any) {
            setError(e.message);
        }
    };

    // Per source column, sum active percentages so admins can spot >100% over-allocation.
    const sourceTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        rules.filter((r) => r.isActive).forEach((r) => {
            const key = `${r.sourceCompanyId}:${r.sourceDepartmentId || 'ALL'}`;
            totals[key] = (totals[key] || 0) + r.percentage;
        });
        return totals;
    }, [rules]);

    return (
        <DashboardLayout>
            <div className="p-6 max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-3">
                    <Share2 className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Revenue Share</h1>
                        <p className="text-sm text-gray-500">
                            Classify departments and define how support/production departments earn a fixed share of revenue.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-200">
                    <button
                        onClick={() => setView('config')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${view === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Settings2 className="w-4 h-4" /> Configure
                    </button>
                    <button
                        onClick={() => setView('report')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${view === 'report' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <BarChart3 className="w-4 h-4" /> Report
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
                )}

                {view === 'report' ? (
                    <ReportView
                        report={report}
                        loading={reportLoading}
                        period={period}
                        onShift={shiftPeriod}
                        onLock={lockPeriod}
                        locking={locking}
                    />
                ) : loading ? (
                    <div className="text-gray-400 text-sm">Loading…</div>
                ) : (
                    <>
                        {/* Department classification */}
                        <section className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Layers className="w-5 h-5 text-gray-500" />
                                <h2 className="font-semibold text-gray-900">Department types</h2>
                            </div>
                            <div className="space-y-5">
                                {companies.map((company) => {
                                    const depts = departments.filter((d) => d.companyId === company.id);
                                    if (!depts.length) return null;
                                    return (
                                        <div key={company.id}>
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                {company.name}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {depts.map((d) => (
                                                    <div key={d.id} className="flex items-center justify-between gap-2 border border-gray-100 rounded-lg px-3 py-2">
                                                        <span className="text-sm text-gray-800 truncate">{d.name}</span>
                                                        <select
                                                            value={d.departmentType}
                                                            onChange={(e) => setDeptType(d.id, e.target.value as DepartmentType)}
                                                            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                                                        >
                                                            {(['REVENUE', 'PRODUCTION', 'SUPPORT'] as DepartmentType[]).map((t) => (
                                                                <option key={t} value={t}>{TYPE_META[t].label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Add rule */}
                        <section className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Plus className="w-5 h-5 text-gray-500" />
                                <h2 className="font-semibold text-gray-900">New share rule</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <label className="text-sm">
                                    <span className="text-gray-600">Beneficiary department</span>
                                    <select
                                        value={draft.beneficiaryDepartmentId}
                                        onChange={(e) => setDraft({ ...draft, beneficiaryDepartmentId: e.target.value })}
                                        className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white"
                                    >
                                        <option value="">Select…</option>
                                        {beneficiaryDepts.map((d) => (
                                            <option key={d.id} value={d.id}>{companyName(d.companyId)} › {d.name} ({TYPE_META[d.departmentType].label})</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm">
                                    <span className="text-gray-600">Source company</span>
                                    <select
                                        value={draft.sourceCompanyId}
                                        onChange={(e) => setDraft({ ...draft, sourceCompanyId: e.target.value, sourceDepartmentId: '' })}
                                        className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white"
                                    >
                                        <option value="">Select…</option>
                                        {companies.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm">
                                    <span className="text-gray-600">Source department <span className="text-gray-400">(optional — blank = whole company)</span></span>
                                    <select
                                        value={draft.sourceDepartmentId}
                                        onChange={(e) => setDraft({ ...draft, sourceDepartmentId: e.target.value })}
                                        disabled={!draft.sourceCompanyId}
                                        className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2 bg-white disabled:bg-gray-50"
                                    >
                                        <option value="">Whole company</option>
                                        {sourceDeptsForCompany.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm">
                                    <span className="text-gray-600">Percentage</span>
                                    <input
                                        type="number" min={0} max={100} step="0.01"
                                        value={draft.percentage}
                                        onChange={(e) => setDraft({ ...draft, percentage: e.target.value })}
                                        className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2"
                                        placeholder="e.g. 10"
                                    />
                                </label>
                                <label className="text-sm">
                                    <span className="text-gray-600">Effective from <span className="text-gray-400">(optional)</span></span>
                                    <input
                                        type="date"
                                        value={draft.effectiveFrom}
                                        onChange={(e) => setDraft({ ...draft, effectiveFrom: e.target.value })}
                                        className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2"
                                    />
                                </label>
                                <label className="text-sm">
                                    <span className="text-gray-600">Effective to <span className="text-gray-400">(optional)</span></span>
                                    <input
                                        type="date"
                                        value={draft.effectiveTo}
                                        onChange={(e) => setDraft({ ...draft, effectiveTo: e.target.value })}
                                        className="mt-1 w-full border border-gray-200 rounded-md px-2 py-2"
                                    />
                                </label>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5" /> Overlapping whole-company and dept-specific rules stack (add up).
                                </p>
                                <button
                                    onClick={addRule}
                                    disabled={saving}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add rule'}
                                </button>
                            </div>
                        </section>

                        {/* Existing rules */}
                        <section className="bg-white rounded-xl border border-gray-200 p-5">
                            <h2 className="font-semibold text-gray-900 mb-4">Active rules</h2>
                            {rules.filter((r) => r.isActive).length === 0 ? (
                                <p className="text-sm text-gray-400">No rules yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                                <th className="py-2 pr-4 font-medium">Beneficiary</th>
                                                <th className="py-2 pr-4 font-medium">Source</th>
                                                <th className="py-2 pr-4 font-medium text-right">%</th>
                                                <th className="py-2 pr-4 font-medium">Effective</th>
                                                <th className="py-2 pr-4 font-medium"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rules.filter((r) => r.isActive).map((r) => {
                                                const key = `${r.sourceCompanyId}:${r.sourceDepartmentId || 'ALL'}`;
                                                const over = sourceTotals[key] > 100;
                                                return (
                                                    <tr key={r.id} className="border-b border-gray-50">
                                                        <td className="py-2 pr-4">
                                                            <span className="text-gray-800">{r.beneficiaryDepartment.company.name} › {r.beneficiaryDepartment.name}</span>
                                                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${TYPE_META[r.beneficiaryDepartment.departmentType].color}`}>
                                                                {TYPE_META[r.beneficiaryDepartment.departmentType].label}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 pr-4 text-gray-700">
                                                            {r.sourceCompany.name}{r.sourceDepartment ? ` › ${r.sourceDepartment.name}` : ' (whole company)'}
                                                        </td>
                                                        <td className={`py-2 pr-4 text-right tabular-nums ${over ? 'text-red-600 font-semibold' : 'text-gray-800'}`}>
                                                            {r.percentage}%
                                                        </td>
                                                        <td className="py-2 pr-4 text-gray-500 text-xs">
                                                            {new Date(r.effectiveFrom).toLocaleDateString()}{r.effectiveTo ? ` → ${new Date(r.effectiveTo).toLocaleDateString()}` : ' →'}
                                                        </td>
                                                        <td className="py-2 pr-4">
                                                            <button onClick={() => deactivateRule(r.id)} className="text-gray-400 hover:text-red-600" title="Deactivate">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {Object.entries(sourceTotals).some(([, v]) => v > 100) && (
                                        <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
                                            <Info className="w-3.5 h-3.5" /> One or more sources allocate more than 100% — the engine will skip over-allocated transactions.
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}

function ReportView({
    report,
    loading,
    period,
    onShift,
    onLock,
    locking,
}: {
    report: ShareReport | null;
    loading: boolean;
    period: { month: number; year: number };
    onShift: (delta: number) => void;
    onLock: () => void;
    locking: boolean;
}) {
    // Group rows by company for a cross-company view.
    const grouped = useMemo(() => {
        const map = new Map<string, { companyName: string; rows: ReportRow[] }>();
        (report?.rows || []).forEach((r) => {
            const g = map.get(r.companyId) || { companyName: r.companyName, rows: [] };
            g.rows.push(r);
            map.set(r.companyId, g);
        });
        return [...map.values()];
    }, [report]);

    return (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => onShift(-1)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm font-semibold text-gray-900 w-28 text-center">{MONTHS[period.month - 1]} {period.year}</span>
                    <button onClick={() => onShift(1)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-3">
                    {report?.locked && (
                        <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            <Lock className="w-3.5 h-3.5" /> Period locked
                        </span>
                    )}
                    <button
                        onClick={onLock}
                        disabled={locking || report?.locked || !report?.rows.length}
                        className="flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                        <Lock className="w-4 h-4" /> {locking ? 'Locking…' : 'Lock period'}
                    </button>
                </div>
            </div>

            <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Net = kept remainder + revenue earned by supporting others. Total net equals total attributed gross.
            </p>

            {loading ? (
                <div className="text-gray-400 text-sm">Loading…</div>
            ) : !report || report.rows.length === 0 ? (
                <p className="text-sm text-gray-400">No revenue-share activity in this period.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="py-2 pr-4 font-medium">Department</th>
                                <th className="py-2 pr-4 font-medium text-right">Gross</th>
                                <th className="py-2 pr-4 font-medium text-right">Shared out</th>
                                <th className="py-2 pr-4 font-medium text-right">Kept</th>
                                <th className="py-2 pr-4 font-medium text-right">Earned (support)</th>
                                <th className="py-2 pr-4 font-medium text-right">Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grouped.map((g) => (
                                <Fragment key={g.companyName}>
                                    <tr className="bg-gray-50">
                                        <td colSpan={6} className="py-1.5 px-2 text-xs font-semibold text-gray-600">{g.companyName}</td>
                                    </tr>
                                    {g.rows.map((r) => (
                                        <tr key={r.departmentId} className="border-b border-gray-50">
                                            <td className="py-2 pr-4">
                                                <span className="text-gray-800">{r.departmentName}</span>
                                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${TYPE_META[r.departmentType].color}`}>{TYPE_META[r.departmentType].label}</span>
                                            </td>
                                            <td className="py-2 pr-4 text-right tabular-nums text-gray-700">{r.grossRevenue ? fmtMoney(r.grossRevenue) : '—'}</td>
                                            <td className="py-2 pr-4 text-right tabular-nums text-rose-600">{r.sharesOut ? `(${fmtMoney(r.sharesOut)})` : '—'}</td>
                                            <td className="py-2 pr-4 text-right tabular-nums text-gray-700">{r.residualKept ? fmtMoney(r.residualKept) : '—'}</td>
                                            <td className="py-2 pr-4 text-right tabular-nums text-emerald-600">{r.sharesIn ? fmtMoney(r.sharesIn) : '—'}</td>
                                            <td className="py-2 pr-4 text-right tabular-nums font-semibold text-gray-900">{fmtMoney(r.netAttributed)}</td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-200 font-semibold text-gray-900">
                                <td className="py-2 pr-4">Total</td>
                                <td className="py-2 pr-4 text-right tabular-nums">{fmtMoney(report.totals.grossRevenue)}</td>
                                <td className="py-2 pr-4 text-right tabular-nums text-rose-600">({fmtMoney(report.totals.sharesOut)})</td>
                                <td className="py-2 pr-4 text-right tabular-nums">{fmtMoney(report.totals.residualKept)}</td>
                                <td className="py-2 pr-4 text-right tabular-nums text-emerald-600">{fmtMoney(report.totals.sharesIn)}</td>
                                <td className="py-2 pr-4 text-right tabular-nums">{fmtMoney(report.totals.netAttributed)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
}
