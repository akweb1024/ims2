'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Users, Target, CalendarClock, Gauge, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// --- response shapes (mirror src/lib/insights/queries.ts) ----------------

type Period = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

interface Employee {
    profileId: string;
    employeeCode: string | null;
    name: string | null;
    email: string;
    designation: string | null;
    department: string | null;
}

interface Goal {
    id: string;
    title: string;
    kra: string | null;
    unit: string;
    targetValue: number;
    currentValue: number;
    verifiedValue: number;
    achievementPercentage: number;
    weight: number;
    isKra: boolean;
    dimension: string | null;
    status: string;
}

interface EmployeeDetail {
    employee: Employee;
    goals: { goalCount: number; weightedKraAchievement: number | null; goals: Goal[] };
    attendance: { recordedDays: number; presentDays: number; lateDays: number; absentDays: number; byStatus: Record<string, number> };
    performance:
        | { found: false; note: string }
        | { found: true; scores: { achievement: number; attendance: number; managerRating: number; focus: number; overallIndex: number }; grade: string | null; letterRating: string | null };
}

interface Rollup {
    subjectName: string;
    employeeCount: number;
    goalCount: number;
    avgAchievement: number;
    avgIndex: number;
    gradeCounts: Record<string, number> | null;
    dimensionAvgs: Record<string, number> | null;
}

const PERIODS: Period[] = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

function clampPct(n: number): number {
    return Math.max(0, Math.min(100, n));
}

function ProgressBar({ value }: { value: number }) {
    const pct = clampPct(value);
    const tone = pct >= 90 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
    return (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
            {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
        </div>
    );
}

export default function InsightsPage() {
    const [period, setPeriod] = useState<Period>('MONTHLY');
    const [query, setQuery] = useState('');
    const [department, setDepartment] = useState('');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [detail, setDetail] = useState<EmployeeDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [rollup, setRollup] = useState<Rollup | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadList = useCallback(async () => {
        setLoadingList(true);
        setError(null);
        try {
            const sp = new URLSearchParams();
            if (query.trim()) sp.set('query', query.trim());
            if (department.trim()) sp.set('department', department.trim());
            sp.set('limit', '100');
            const res = await fetch(`/api/insights/employees?${sp.toString()}`);
            if (!res.ok) throw new Error(`Failed to load employees (${res.status})`);
            const data = await res.json();
            setEmployees(data.employees ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load employees');
        } finally {
            setLoadingList(false);
        }
    }, [query, department]);

    const loadRollup = useCallback(async () => {
        try {
            const res = await fetch(`/api/insights/rollup?level=COMPANY&period=${period}`);
            if (!res.ok) return;
            const data = await res.json();
            setRollup(data.rollups?.[0] ?? null);
        } catch {
            /* roll-up is best-effort; the cron may not have run yet */
        }
    }, [period]);

    const loadDetail = useCallback(
        async (ref: string) => {
            setLoadingDetail(true);
            try {
                const res = await fetch(`/api/insights/employee?ref=${encodeURIComponent(ref)}&period=${period}`);
                if (!res.ok) throw new Error(`Failed to load employee (${res.status})`);
                setDetail(await res.json());
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load employee');
            } finally {
                setLoadingDetail(false);
            }
        },
        [period]
    );

    // Debounced list load on search/filter change.
    useEffect(() => {
        const t = setTimeout(loadList, 250);
        return () => clearTimeout(t);
    }, [loadList]);

    useEffect(() => {
        loadRollup();
    }, [loadRollup]);

    useEffect(() => {
        if (selected) loadDetail(selected);
    }, [selected, loadDetail]);

    const weighted = detail?.goals.weightedKraAchievement;

    const gradeBadges = useMemo(() => Object.entries(rollup?.gradeCounts ?? {}), [rollup]);

    return (
        <div className="space-y-6 p-4 md:p-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">KRA &amp; Attendance Insights</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        The same read-only data the ims2 MCP server exposes — employees, KRA goals, attendance and
                        performance, straight from the live schema.
                    </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                    {PERIODS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </header>

            {/* Company roll-up */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4 text-muted-foreground" /> Company roll-up ({period.toLowerCase()})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {rollup ? (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <Stat label="Employees" value={rollup.employeeCount} />
                            <Stat label="KRA goals" value={rollup.goalCount} />
                            <Stat label="Avg achievement" value={`${rollup.avgAchievement}%`} />
                            <Stat label="Avg index" value={rollup.avgIndex} hint={gradeBadges.map(([g, n]) => `${g}:${n}`).join('  ')} />
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No roll-up computed for this period yet — the kra-snapshot cron produces these.
                        </p>
                    )}
                </CardContent>
            </Card>

            {error ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                {/* Employee list */}
                <Card className="h-fit">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4 text-muted-foreground" /> Employees
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search name or email"
                                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                        <input
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            placeholder="Filter by department"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <div className="max-h-[28rem] space-y-1 overflow-y-auto">
                            {loadingList ? (
                                <p className="px-1 py-2 text-sm text-muted-foreground">Loading…</p>
                            ) : employees.length === 0 ? (
                                <p className="px-1 py-2 text-sm text-muted-foreground">No employees match.</p>
                            ) : (
                                employees.map((e) => (
                                    <button
                                        key={e.profileId}
                                        type="button"
                                        onClick={() => setSelected(e.email || e.profileId)}
                                        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                                            detail?.employee.profileId === e.profileId ? 'bg-primary/10' : 'hover:bg-muted'
                                        }`}
                                    >
                                        <div className="text-sm font-medium text-foreground">{e.name || e.email}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {[e.designation, e.department].filter(Boolean).join(' · ') || e.email}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Employee detail */}
                <div className="space-y-6">
                    {!selected ? (
                        <Card>
                            <CardContent className="py-16 text-center text-sm text-muted-foreground">
                                Select an employee to see their KRA goals, attendance and performance.
                            </CardContent>
                        </Card>
                    ) : loadingDetail && !detail ? (
                        <Card>
                            <CardContent className="py-16 text-center text-sm text-muted-foreground">Loading…</CardContent>
                        </Card>
                    ) : detail ? (
                        <>
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <CardTitle className="text-lg">{detail.employee.name || detail.employee.email}</CardTitle>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                {[detail.employee.designation, detail.employee.department].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                        {weighted !== null && weighted !== undefined ? (
                                            <div className="text-right">
                                                <div className="text-xs text-muted-foreground">Weighted KRA</div>
                                                <div className="text-2xl font-bold text-foreground">{weighted}%</div>
                                            </div>
                                        ) : null}
                                    </div>
                                </CardHeader>
                            </Card>

                            {/* Goals */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Target className="h-4 w-4 text-muted-foreground" /> KRA goals ({detail.goals.goalCount})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {detail.goals.goals.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No KRA goals in this period.</p>
                                    ) : (
                                        detail.goals.goals.map((g) => (
                                            <div key={g.id} className="space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-sm font-medium text-foreground">{g.title}</div>
                                                    <Badge variant={g.status === 'ACHIEVED' ? 'default' : 'secondary'}>{g.status}</Badge>
                                                </div>
                                                <ProgressBar value={g.achievementPercentage} />
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                    <span className="font-semibold text-foreground">{g.achievementPercentage}%</span>
                                                    <span>
                                                        {g.currentValue}/{g.targetValue} {g.unit}
                                                    </span>
                                                    <span>weight {g.weight}</span>
                                                    {g.dimension ? <span>{g.dimension}</span> : null}
                                                    {g.kra ? <span>· {g.kra}</span> : null}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Attendance */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <CalendarClock className="h-4 w-4 text-muted-foreground" /> Attendance
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-3 gap-3">
                                        <Stat label="Present" value={detail.attendance.presentDays} />
                                        <Stat label="Late" value={detail.attendance.lateDays} />
                                        <Stat label="Absent" value={detail.attendance.absentDays} />
                                        <div className="col-span-3 text-xs text-muted-foreground">
                                            {detail.attendance.recordedDays} recorded day(s) this period.
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Performance index */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Gauge className="h-4 w-4 text-muted-foreground" /> Performance index
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {detail.performance.found ? (
                                            <div className="space-y-2">
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-3xl font-bold text-foreground">
                                                        {detail.performance.scores.overallIndex}
                                                    </span>
                                                    {detail.performance.grade ? (
                                                        <Badge>{detail.performance.grade}</Badge>
                                                    ) : null}
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                    <span>Achievement: {detail.performance.scores.achievement}</span>
                                                    <span>Attendance: {detail.performance.scores.attendance}</span>
                                                    <span>Manager: {detail.performance.scores.managerRating}</span>
                                                    <span>Focus: {detail.performance.scores.focus}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">{detail.performance.note}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
