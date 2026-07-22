'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, LayoutTemplate, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface Assignee {
    profileId: string;
    employeeCode: string | null;
    name: string | null;
    email: string;
    designation: string | null;
    department: string | null;
    managerName: string | null;
}

interface TemplateRow {
    id: string;
    name: string;
    description: string | null;
    kpiCount: number;
    employeeCount: number;
    employees: Assignee[];
}

interface Filters {
    departments: { id: string; name: string }[];
    teams: { managerUserId: string; managerName: string }[];
}

export default function TemplateAssignmentsPage() {
    const [query, setQuery] = useState('');
    const [department, setDepartment] = useState('');
    const [team, setTeam] = useState('');
    const [filters, setFilters] = useState<Filters>({ departments: [], teams: [] });
    const [templates, setTemplates] = useState<TemplateRow[]>([]);
    const [summary, setSummary] = useState<{ templateCount: number; assignedEmployees: number }>({ templateCount: 0, assignedEmployees: 0 });
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/insights/filters');
                if (res.ok) setFilters(await res.json());
            } catch {
                /* filters are optional; the view still works without dropdowns */
            }
        })();
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const sp = new URLSearchParams();
            if (query.trim()) sp.set('query', query.trim());
            if (department) sp.set('department', department);
            if (team) sp.set('team', team);
            const res = await fetch(`/api/insights/templates?${sp.toString()}`);
            if (!res.ok) throw new Error(`Failed to load templates (${res.status})`);
            const data = await res.json();
            setTemplates(data.templates ?? []);
            setSummary({ templateCount: data.templateCount ?? 0, assignedEmployees: data.assignedEmployees ?? 0 });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    }, [query, department, team]);

    useEffect(() => {
        const t = setTimeout(load, 250);
        return () => clearTimeout(t);
    }, [load]);

    const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

    return (
        <div className="space-y-6 p-4 md:p-6">
            <header>
                <h1 className="text-2xl font-bold text-foreground">KRA Template Assignments</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Which KRA/KPI template is assigned to which employees, department and team. An assignment is a
                    KRA goal carrying that template — set from the Assign KRA screen.
                </p>
            </header>

            {/* Filters */}
            <Card>
                <CardContent className="flex flex-wrap items-center gap-3 py-4">
                    <div className="relative min-w-[12rem] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search template name"
                            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                    <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    >
                        <option value="">All departments</option>
                        {filters.departments.map((d) => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                    <select
                        value={team}
                        onChange={(e) => setTeam(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    >
                        <option value="">All teams</option>
                        {filters.teams.map((t) => (
                            <option key={t.managerUserId} value={t.managerUserId}>{t.managerName}&apos;s team</option>
                        ))}
                    </select>
                    {(department || team || query) && (
                        <button
                            type="button"
                            onClick={() => { setDepartment(''); setTeam(''); setQuery(''); }}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            Clear
                        </button>
                    )}
                </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span><span className="font-bold text-foreground">{summary.templateCount}</span> templates</span>
                <span>·</span>
                <span><span className="font-bold text-foreground">{summary.assignedEmployees}</span> employees assigned</span>
                {(department || team) ? <span className="text-xs">(filtered)</span> : null}
            </div>

            {error ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            ) : null}

            {loading && templates.length === 0 ? (
                <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
            ) : templates.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                        No templates match. Materialize the role catalog (npm run kra:materialize) and assign KRAs to see mappings here.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {templates.map((t) => {
                        const open = expanded[t.id];
                        return (
                            <Card key={t.id}>
                                <button
                                    type="button"
                                    onClick={() => toggle(t.id)}
                                    className="flex w-full items-start justify-between gap-4 p-5 text-left"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <LayoutTemplate className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="font-semibold text-foreground">{t.name}</span>
                                        </div>
                                        {t.description ? (
                                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                                        ) : null}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Badge variant="secondary">{t.kpiCount} KPIs</Badge>
                                        <Badge variant={t.employeeCount > 0 ? 'default' : 'outline'} className="flex items-center gap-1">
                                            <Users className="h-3 w-3" /> {t.employeeCount}
                                        </Badge>
                                        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                </button>
                                {open ? (
                                    <div className="border-t border-border px-5 py-4">
                                        {t.employees.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No employees assigned this template yet.</p>
                                        ) : (
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {t.employees.map((e) => (
                                                    <div key={e.profileId} className="rounded-lg border border-border bg-card px-3 py-2">
                                                        <div className="text-sm font-medium text-foreground">{e.name || e.email}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {[e.designation, e.department, e.managerName ? `↳ ${e.managerName}` : null].filter(Boolean).join(' · ')}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
