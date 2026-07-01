'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SearchableFilterSelect, { SearchableFilterOption } from '@/components/dashboard/SearchableFilterSelect';
import { formatToISTDate } from '@/lib/date-utils';
import { DashboardScope, DashboardWidgetKey, DASHBOARD_WIDGETS } from '@/lib/dashboard/widgets';
import {
    CalendarDays,
    CheckCircle2,
    ChevronsUpDown,
    GripVertical,
    LayoutGrid,
    Pencil,
    Settings2,
    ShieldCheck,
    Trash2,
    Users,
} from 'lucide-react';

type WidgetPayloadMap = Partial<Record<DashboardWidgetKey, any>>;

const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

function todayISTInputValue() {
    return formatToISTDate(new Date());
}

function monthStartISTInputValue() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function buildDateRangeLabel(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return 'This Month';
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    return startDate || endDate || 'This Month';
}

function DashboardMetric({
    label,
    value,
    subtext,
    tone = 'default',
}: {
    label: string;
    value: string;
    subtext?: string;
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
    const toneClasses: Record<string, string> = {
        default: 'bg-slate-50 text-slate-900 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-rose-50 text-rose-700 border-rose-200',
        info: 'bg-sky-50 text-sky-700 border-sky-200',
    };

    return (
        <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{label}</div>
            <div className="mt-2 text-2xl font-black leading-none">{value}</div>
            {subtext && <div className="mt-2 text-xs font-medium opacity-70">{subtext}</div>}
        </div>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const user = session?.user as any;
    const userRole = user?.role || 'EXECUTIVE';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [layout, setLayout] = useState<any>(null);
    const [widgetData, setWidgetData] = useState<WidgetPayloadMap>({});
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [activeContext, setActiveContext] = useState<DashboardScope>('INDIVIDUAL');
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [checkingIn, setCheckingIn] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [departmentOptions, setDepartmentOptions] = useState<SearchableFilterOption[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<SearchableFilterOption[]>([]);
    const [teamOptions, setTeamOptions] = useState<SearchableFilterOption[]>([]);
    const [workFromMode, setWorkFromMode] = useState<'OFFICE' | 'REMOTE'>('OFFICE');
    const [filters, setFilters] = useState({
        startDate: monthStartISTInputValue(),
        endDate: todayISTInputValue(),
        departmentId: '',
        employeeId: '',
        teamId: '',
    });

    const isManagerial = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(userRole);
    const canUseTeamContext = isManagerial;

    const authHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }, []);

    const fetchLayout = useCallback(async (context: DashboardScope = activeContext) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/dashboard/customization?context=${context}`, {
                headers: authHeaders(),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to load dashboard layout');
            }

            const data = await res.json();
            setLayout(data);
            setActiveContext(data.selectedScope || context);
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, [activeContext, authHeaders]);

    const fetchWidgetData = useCallback(async (context: DashboardScope, filtersState = filters) => {
        if (!layout?.widgets?.length) return;

        const entries = await Promise.all(
            layout.widgets
                .filter((widget: any) => widget.visible && widget.allowed)
                .map(async (widget: any) => {
                    const params = new URLSearchParams({
                        context,
                        startDate: filtersState.startDate,
                        endDate: filtersState.endDate,
                        departmentId: filtersState.departmentId,
                        employeeId: filtersState.employeeId,
                        teamId: filtersState.teamId,
                    });

                    const response = await fetch(`/api/dashboard/widgets/${widget.key}?${params.toString()}`, {
                        headers: authHeaders(),
                    });
                    if (!response.ok) return [widget.key, null] as const;
                    // The widget API wraps the data as { widgetKey, scope, payload };
                    // the renderers read flat fields, so store the inner payload.
                    const json = await response.json();
                    return [widget.key, json.payload ?? null] as const;
                })
        );

        setWidgetData(Object.fromEntries(entries) as WidgetPayloadMap);
    }, [authHeaders, filters, layout?.widgets]);

    const fetchTodayAttendance = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            const now = new Date();
            const res = await fetch(`/api/hr/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, {
                headers,
            });
            if (res.ok) {
                setAttendanceRecords(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch attendance', err);
        }
    }, []);

    const fetchFilterLookups = useCallback(async () => {
        setLookupLoading(true);
        try {
            const headers = authHeaders();
            const [departmentsRes, employeesRes] = await Promise.all([
                fetch('/api/hr/departments', { headers }),
                fetch('/api/hr/employees', { headers }),
            ]);

            const departments = departmentsRes.ok ? await departmentsRes.json() : [];
            const employees = employeesRes.ok ? await employeesRes.json() : [];

            setDepartmentOptions(
                (Array.isArray(departments) ? departments : []).map((department: any) => ({
                    value: department.id,
                    label: department.name,
                    hint: department.code ? `Code ${department.code}` : department.company?.name ? department.company.name : 'Department',
                }))
            );

            const normalizedEmployees = Array.isArray(employees) ? employees : [];
            setEmployeeOptions(
                normalizedEmployees.map((employee: any) => ({
                    value: employee.id,
                    label: employee.user?.name || employee.name || employee.user?.email || employee.email || employee.employeeId || 'Employee',
                    hint: employee.employeeId
                        ? `${employee.employeeId}${employee.designation?.title ? ` · ${employee.designation.title}` : ''}`
                        : employee.user?.email || employee.email || 'Employee profile',
                }))
            );

            setTeamOptions(
                normalizedEmployees
                    .filter((employee: any) => ['MANAGER', 'TEAM_LEADER'].includes(employee.user?.role))
                    .map((employee: any) => ({
                        value: employee.user?.id || employee.id,
                        label: employee.user?.name || employee.name || employee.user?.email || 'Team Lead',
                        hint: `${employee.user?.role || 'TEAM'}${employee.department?.name ? ` · ${employee.department.name}` : ''}`,
                    }))
            );
        } catch (err) {
            console.error('Failed to load dashboard filter lookups', err);
        } finally {
            setLookupLoading(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            fetchLayout(activeContext);
            fetchTodayAttendance();
        }
    }, [activeContext, fetchLayout, fetchTodayAttendance, router, status]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchFilterLookups();
        }
    }, [fetchFilterLookups, status]);

    useEffect(() => {
        if (layout?.widgets?.length) {
            void fetchWidgetData(activeContext, filters);
        }
    }, [activeContext, fetchWidgetData, filters, layout?.widgets]);

    const saveLayout = useCallback(async () => {
        if (!layout?.widgets?.length) return;

        setSaving(true);
        try {
            const widgetOrder = layout.widgets.map((widget: any) => widget.key);
            const widgetVisibility = layout.widgets.reduce((acc: Record<string, boolean>, widget: any) => {
                acc[widget.key] = widget.visible;
                return acc;
            }, {});

            const res = await fetch('/api/dashboard/customization', {
                method: 'PATCH',
                headers: {
                    ...authHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    context: activeContext,
                    selectedScope: activeContext,
                    widgetOrder,
                    widgetVisibility,
                    widgetConfig: {},
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to save dashboard');
            }

            setShowCustomizer(false);
            await fetchLayout(activeContext);
        } catch (err: any) {
            setError(err.message || 'Failed to save dashboard');
        } finally {
            setSaving(false);
        }
    }, [activeContext, authHeaders, fetchLayout, layout?.widgets]);

    const reorderWidget = (fromIndex: number, toIndex: number) => {
        if (!layout?.widgets) return;
        const next = [...layout.widgets];
        const [item] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, item);
        setLayout({ ...layout, widgets: next });
    };

    const toggleVisibility = (key: DashboardWidgetKey) => {
        if (!layout?.widgets) return;
        setLayout({
            ...layout,
            widgets: layout.widgets.map((widget: any) => (
                widget.key === key
                    ? { ...widget, visible: widget.locked ? true : !widget.visible }
                    : widget
            )),
        });
    };

    const renderWidgetContent = (key: DashboardWidgetKey) => {
        const data = widgetData[key];
        if (!data) {
            return <div className="text-sm text-slate-500">No data available yet.</div>;
        }

        switch (key) {
            case 'marketing_sales_performance':
                return (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <DashboardMetric
                            label="Revenue"
                            value={currency.format(data.currentRevenue || 0)}
                            subtext={`Last month ${currency.format(data.previousRevenue || 0)}`}
                            tone="info"
                        />
                        <DashboardMetric
                            label="Follow-ups"
                            value={`${data.todayFollowUpCompleted || 0}/${data.todayFollowUpTotal || 0}`}
                            subtext="Completed today vs total today"
                            tone="success"
                        />
                        <DashboardMetric
                            label="Missed Follow-ups"
                            value={`${data.missedFollowUps || 0}`}
                            subtext="Pending follow-ups past due"
                            tone="danger"
                        />
                        <DashboardMetric
                            label="Invoice vs Proforma"
                            value={`${currency.format(data.invoiceTotal || 0)} / ${currency.format(data.proformaTotal || 0)}`}
                            subtext={`${data.invoiceCount || 0} invoices, ${data.proformaCount || 0} proformas`}
                        />
                    </div>
                );
            case 'attendance_overview':
                return (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <DashboardMetric
                            label="Attendance"
                            value={`${data.currentAttendance || 0}`}
                            subtext={`Last month ${data.previousAttendance || 0}`}
                            tone="info"
                        />
                        <DashboardMetric
                            label="Late Count"
                            value={`${data.currentLate || 0}`}
                            subtext={`Last month ${data.previousLate || 0}`}
                            tone="warning"
                        />
                        <DashboardMetric
                            label="Absent Count"
                            value={`${data.currentAbsent || 0}`}
                            subtext={`Last month ${data.previousAbsent || 0}`}
                            tone="danger"
                        />
                    </div>
                );
            case 'team_summary':
                return (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <DashboardMetric label="Active Members" value={`${data.members || 0}`} subtext="Users in your team" tone="info" />
                        <DashboardMetric label="Today Attendance" value={`${data.attendance || 0}`} subtext="Attendance records today" tone="success" />
                    </div>
                );
            case 'individual_summary':
                return (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <DashboardMetric label="Attendance" value={`${data.attendanceCount || 0}`} tone="info" />
                        <DashboardMetric label="Follow-ups" value={`${data.followUps || 0}`} tone="success" />
                        <DashboardMetric label="Tasks" value={`${data.tasks || 0}`} tone="warning" />
                    </div>
                );
            case 'follow_up_snapshot':
                return (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <DashboardMetric label="Missed" value={`${data.missed || 0}`} tone="danger" />
                        <DashboardMetric label="Today" value={`${data.today || 0}`} tone="info" />
                        <DashboardMetric label="Upcoming" value={`${data.upcoming || 0}`} tone="success" />
                    </div>
                );
            case 'invoice_vs_proforma':
                return (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <DashboardMetric label="Invoices" value={currency.format(data.invoiceTotal || 0)} subtext={`${data.invoiceCount || 0} records`} tone="info" />
                        <DashboardMetric label="Proformas" value={currency.format(data.proformaTotal || 0)} subtext={`${data.proformaCount || 0} records`} tone="success" />
                    </div>
                );
            default:
                return <div className="text-sm text-slate-500">Widget not implemented yet.</div>;
        }
    };

    const availableScopes = useMemo(() => {
        const scopes = new Set<DashboardScope>(['INDIVIDUAL']);
        if (canUseTeamContext) scopes.add('TEAM');
        return Array.from(scopes);
    }, [canUseTeamContext]);

    const selectedDepartment = useMemo(
        () => departmentOptions.find((option) => option.value === filters.departmentId),
        [departmentOptions, filters.departmentId]
    );
    const selectedEmployee = useMemo(
        () => employeeOptions.find((option) => option.value === filters.employeeId),
        [employeeOptions, filters.employeeId]
    );
    const selectedTeam = useMemo(
        () => teamOptions.find((option) => option.value === filters.teamId),
        [filters.teamId, teamOptions]
    );
    const activeFilterCount = useMemo(
        () => [filters.departmentId, filters.employeeId, filters.teamId].filter(Boolean).length,
        [filters.departmentId, filters.employeeId, filters.teamId]
    );
    const visibleWidgetCount = useMemo(
        () => (layout?.widgets || []).filter((widget: any) => widget.visible && widget.allowed).length,
        [layout?.widgets]
    );
    const visibleWidgetTotal = layout?.widgets?.length || 0;
    const attendancePolicy = layout?.attendancePolicy;
    const scopeLabel = layout?.selectedScope || activeContext;

    if (status === 'loading' || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
                    <div className="text-sm font-semibold text-slate-700">Loading your dashboard...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
                    <div className="mb-3 text-3xl">⚠️</div>
                    <h1 className="text-xl font-black text-slate-900">Dashboard unavailable</h1>
                    <p className="mt-2 text-sm text-slate-600">{error}</p>
                    <button
                        onClick={() => fetchLayout(activeContext)}
                        className="mt-6 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    const widgets = layout?.widgets || [];
    const todayAttendance = attendanceRecords.find((record: any) => formatToISTDate(record.date) === formatToISTDate(new Date()));

    const handleAttendance = async (action: 'check-in' | 'check-out') => {
        setCheckingIn(true);
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch('/api/hr/attendance', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action,
                    workFrom: workFromMode,
                }),
            });

            if (res.ok) {
                await fetchTodayAttendance();
            }
        } catch (err) {
            console.error('Attendance action failed', err);
        } finally {
            setCheckingIn(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <div className="grid gap-0 lg:grid-cols-[1.25fr_0.95fr]">
                        <div className="bg-gradient-to-br from-white via-slate-50 to-sky-50 p-6 md:p-7">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
                                <LayoutGrid size={12} />
                                Dashboard Customization
                            </div>
                            <div className="mt-4 max-w-2xl">
                                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                                    Welcome back, {user?.name || 'User'}
                                </h1>
                                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                                    Choose the widgets you want, switch between team and individual context, and keep the dashboard aligned with your role.
                                </p>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                    {visibleWidgetCount}/{visibleWidgetTotal || 0} widgets visible
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                    {activeFilterCount} filters active
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                    {scopeLabel} scope
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 bg-slate-950 p-5 text-white lg:border-l lg:border-t-0">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Active view</div>
                                    <div className="mt-1 text-lg font-black tracking-tight">{scopeLabel}</div>
                                    <div className="mt-1 text-xs text-white/55">{buildDateRangeLabel(filters.startDate, filters.endDate)}</div>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    Live
                                </div>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Window</div>
                                    <div className="mt-1 text-sm font-semibold text-white">{buildDateRangeLabel(filters.startDate, filters.endDate)}</div>
                                    <div className="mt-1 text-[11px] text-white/55">Drives every widget query.</div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Filters</div>
                                    <div className="mt-1 text-sm font-semibold text-white">{activeFilterCount ? 'Scoped' : 'All data'}</div>
                                    <div className="mt-1 text-[11px] text-white/55">
                                        {selectedDepartment?.label || selectedEmployee?.label || selectedTeam?.label || 'No audience override'}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Attendance policy</div>
                                        <div className="mt-1 text-xs text-white/55">Operational guardrails for check-in timing.</div>
                                    </div>
                                    <div className="grid gap-1 text-right text-xs text-white/85">
                                        <div>Late after {attendancePolicy?.lateCheckInTime || '09:30'} AM</div>
                                        <div>Short leave after {attendancePolicy?.shortLeaveTime || '10:30'} AM</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <div className="inline-flex overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1">
                                    {availableScopes.map((scope) => (
                                        <button
                                            key={scope}
                                            onClick={() => {
                                                setActiveContext(scope);
                                                void fetchLayout(scope);
                                            }}
                                            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                                                activeContext === scope ? 'bg-white text-slate-950' : 'text-white/70 hover:bg-white/10'
                                            }`}
                                        >
                                            {scope.toLowerCase()}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowCustomizer(true)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20"
                                >
                                    <Settings2 size={16} />
                                    Customize Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">Filters and audience</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Search departments, employees, and team leads to narrow the dashboard without typing raw IDs.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                                {lookupLoading ? 'Loading selectors' : 'Live selectors'}
                            </div>
                            <button
                                type="button"
                                onClick={() => setFilters({
                                    startDate: monthStartISTInputValue(),
                                    endDate: todayISTInputValue(),
                                    departmentId: '',
                                    employeeId: '',
                                    teamId: '',
                                })}
                                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                Reset filters
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.45fr]">
                        <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4">
                            <div className="mb-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Date Range</div>
                                <div className="mt-1 text-sm text-slate-500">Controls the reporting window for every widget.</div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Start Date</span>
                                    <input
                                        type="date"
                                        value={filters.startDate}
                                        onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">End Date</span>
                                    <input
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4">
                            <div className="mb-4 flex items-end justify-between gap-3">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Audience Scope</div>
                                    <div className="mt-1 text-sm text-slate-500">Pick a department, employee, or team lead.</div>
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    {activeFilterCount} active
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <SearchableFilterSelect
                                    label="Department"
                                    value={filters.departmentId}
                                    options={departmentOptions}
                                    onChange={(value) => setFilters((prev) => ({ ...prev, departmentId: value }))}
                                    placeholder="Search departments..."
                                    emptyLabel="All departments"
                                    loading={lookupLoading}
                                />
                                <SearchableFilterSelect
                                    label="Employee"
                                    value={filters.employeeId}
                                    options={employeeOptions}
                                    onChange={(value) => setFilters((prev) => ({ ...prev, employeeId: value }))}
                                    placeholder="Search employees..."
                                    emptyLabel="All employees"
                                    loading={lookupLoading}
                                />
                                {canUseTeamContext ? (
                                    <SearchableFilterSelect
                                        label="Team lead"
                                        value={filters.teamId}
                                        options={teamOptions}
                                        onChange={(value) => setFilters((prev) => ({ ...prev, teamId: value }))}
                                        placeholder="Search team leads..."
                                        emptyLabel="All teams"
                                        loading={lookupLoading}
                                    />
                                ) : (
                                    <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-white/60 p-4">
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Team</div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">Team filters are limited to manager views.</div>
                                        <div className="mt-1 text-xs text-slate-500">You can still switch to individual scope above.</div>
                                    </div>
                                )}
                            </div>

                            {(selectedDepartment || selectedEmployee || selectedTeam) && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {selectedDepartment && (
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                            Dept: {selectedDepartment.label}
                                        </span>
                                    )}
                                    {selectedEmployee && (
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                            Employee: {selectedEmployee.label}
                                        </span>
                                    )}
                                    {selectedTeam && (
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                            Team: {selectedTeam.label}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {userRole !== 'CUSTOMER' && userRole !== 'AGENCY' && (
                    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Attendance Control</div>
                                <h2 className="mt-1 text-2xl font-black text-slate-950">Check in or check out</h2>
                                <p className="mt-1 text-sm text-slate-500">This remains available for your personal dashboard regardless of the widget layout.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {!todayAttendance?.checkIn ? (
                                    <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                                        <button
                                            onClick={() => setWorkFromMode('OFFICE')}
                                            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                                                workFromMode === 'OFFICE' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
                                            }`}
                                        >
                                            Office
                                        </button>
                                        <button
                                            onClick={() => setWorkFromMode('REMOTE')}
                                            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                                                workFromMode === 'REMOTE' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
                                            }`}
                                        >
                                            Remote
                                        </button>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                                        Checked in today
                                    </div>
                                )}

                                {!todayAttendance?.checkIn ? (
                                    <button
                                        onClick={() => void handleAttendance('check-in')}
                                        disabled={checkingIn}
                                        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 disabled:opacity-60"
                                    >
                                        {checkingIn ? 'Checking in...' : `Check In (${workFromMode})`}
                                    </button>
                                ) : !todayAttendance?.checkOut ? (
                                    <button
                                        onClick={() => void handleAttendance('check-out')}
                                        disabled={checkingIn}
                                        className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/10 disabled:opacity-60"
                                    >
                                        {checkingIn ? 'Checking out...' : 'Check Out'}
                                    </button>
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600">
                                        Shift completed
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">Widgets</h2>
                            <p className="text-sm text-slate-500">Visible widgets are saved per user and context.</p>
                        </div>
                        <div className="text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                            <div>{visibleWidgetCount} visible</div>
                            {buildDateRangeLabel(filters.startDate, filters.endDate)}
                        </div>
                    </div>

                    {widgets.filter((widget: any) => widget.visible).length > 0 ? (
                        <div className="grid gap-6 xl:grid-cols-2">
                            {widgets.filter((widget: any) => widget.visible).map((widget: any) => (
                            <article key={widget.key} className="rounded-[1.75rem] border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/60 p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                                            {widget.category}
                                        </div>
                                        <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">{widget.title}</h3>
                                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{widget.description}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                            {widget.scope}
                                        </div>
                                        {widget.locked && (
                                            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                                Locked
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-[1.45rem] border border-slate-200/60 bg-white p-5">
                                    {renderWidgetContent(widget.key)}
                                </div>
                            </article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[1.65rem] border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center">
                            <div className="text-sm font-semibold text-slate-900">No widgets are visible yet.</div>
                            <p className="mt-2 text-sm text-slate-500">
                                Open Customize Dashboard to bring widgets back into the layout.
                            </p>
                        </div>
                    )}
                </section>

                {canUseTeamContext && (
                    <section className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500">
                                <ShieldCheck size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em]">Role</span>
                            </div>
                            <div className="mt-3 text-xl font-black text-slate-950">{userRole.replace(/_/g, ' ')}</div>
                            <p className="mt-2 text-sm text-slate-600">Team context is available for your role and permissions.</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Users size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em]">Scope</span>
                            </div>
                            <div className="mt-3 text-xl font-black text-slate-950">{layout?.selectedScope || activeContext}</div>
                            <p className="mt-2 text-sm text-slate-600">Switch between team and individual views any time.</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500">
                                <CalendarDays size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em]">Filters</span>
                            </div>
                            <div className="mt-3 text-xl font-black text-slate-950">Ready</div>
                            <p className="mt-2 text-sm text-slate-600">Date, department, employee, and team filters are wired into widget requests.</p>
                        </div>
                    </section>
                )}
            </div>

            {showCustomizer && layout && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
                    <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Dashboard Layout</div>
                                <h3 className="mt-1 text-2xl font-black text-slate-950">Customize widgets</h3>
                                <p className="mt-1 text-sm text-slate-500">Drag to reorder. Toggle visibility. Locked widgets cannot be turned off.</p>
                            </div>
                            <button onClick={() => setShowCustomizer(false)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                                Close
                            </button>
                        </div>

                        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                            <ChevronsUpDown size={14} />
                            Drag rows to reorder
                            <span className="text-slate-300">•</span>
                            <Pencil size={14} />
                            Toggle visibility
                        </div>

                        <div className="max-h-[55vh] space-y-3 overflow-auto pr-1">
                            {widgets.map((widget: any, index: number) => (
                                <div
                                    key={widget.key}
                                    draggable={!widget.locked}
                                    onDragStart={() => setDragIndex(index)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => {
                                        if (dragIndex === null || dragIndex === index) return;
                                        reorderWidget(dragIndex, index);
                                        setDragIndex(null);
                                    }}
                                    className={`flex items-center gap-4 rounded-2xl border bg-white p-4 ${
                                        widget.locked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'
                                    }`}
                                >
                                    <div className="cursor-grab text-slate-400">
                                        <GripVertical size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="font-bold text-slate-900">{widget.title}</div>
                                            {widget.locked && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                                    Locked
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 text-sm text-slate-500">{widget.description}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleVisibility(widget.key)}
                                        disabled={widget.locked}
                                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${
                                            widget.visible
                                                ? 'bg-slate-950 text-white'
                                                : 'border border-slate-200 bg-white text-slate-600'
                                        } ${widget.locked ? 'cursor-not-allowed opacity-60' : ''}`}
                                    >
                                        {widget.visible ? <CheckCircle2 size={16} /> : <Trash2 size={16} />}
                                        {widget.visible ? 'Visible' : 'Hidden'}
                                    </button>
                                    <div className="w-8 text-right text-xs font-black text-slate-400">{index + 1}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowCustomizer(false)}
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void saveLayout()}
                                disabled={saving}
                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : 'Save Layout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
