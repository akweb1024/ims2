'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type ProblemsMode = 'dashboard' | 'my' | 'queue';

type ProblemIssue = {
    id: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    visibility: string;
    recurrence: string;
    impactType: string;
    location?: string | null;
    affectedArea?: string | null;
    departmentName?: string | null;
    isSensitive?: boolean;
    resolutionSummary?: string | null;
    createdAt: string;
    updatedAt: string;
    acknowledgedAt?: string | null;
    resolvedAt?: string | null;
    closedAt?: string | null;
    reopenedAt?: string | null;
    reportedBy?: { id: string; name?: string | null; email?: string | null; role?: string | null } | null;
    assignedTo?: { id: string; name?: string | null; email?: string | null; role?: string | null } | null;
    comments?: Array<{
        id: string;
        content: string;
        createdAt: string;
        updatedAt: string;
        author?: { id: string; name?: string | null; email?: string | null; role?: string | null } | null;
    }>;
    internalNotes?: Array<{
        id: string;
        content: string;
        createdAt: string;
        updatedAt: string;
        author?: { id: string; name?: string | null; email?: string | null; role?: string | null } | null;
    }>;
    statusHistory?: Array<{
        id: string;
        fromStatus?: string | null;
        toStatus: string;
        note?: string | null;
        createdAt: string;
        actor?: { id: string; name?: string | null; email?: string | null } | null;
    }>;
    assignmentHistory?: Array<{
        id: string;
        previousAssigneeId?: string | null;
        newAssigneeId?: string | null;
        note?: string | null;
        createdAt: string;
        actor?: { id: string; name?: string | null; email?: string | null } | null;
    }>;
};

type ProblemAssignee = { id: string; name?: string | null; email?: string | null; role?: string | null };

const CATEGORY_OPTIONS = [
    'OPERATIONS',
    'HR',
    'IT',
    'FINANCE',
    'CRM',
    'PUBLICATION',
    'LOGISTICS',
    'COMPLIANCE',
    'CUSTOMER',
    'OTHER',
] as const;

const SEVERITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const VISIBILITY_OPTIONS = ['NAMED', 'ANONYMOUS_TO_PEERS', 'RESTRICTED_ANONYMOUS'] as const;
const RECURRENCE_OPTIONS = ['ONE_TIME', 'RECURRING', 'ALWAYS_HAPPENING'] as const;
const IMPACT_OPTIONS = ['PERSONAL_BLOCKER', 'TEAM_BLOCKER', 'CUSTOMER_ISSUE', 'REVENUE_ISSUE', 'COMPLIANCE_RISK', 'SYSTEM_APP_ISSUE', 'OTHER'] as const;
const STATUS_OPTIONS = ['SUBMITTED', 'ACKNOWLEDGED', 'NEEDS_INFO', 'IN_REVIEW', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED', 'MERGED'] as const;

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
    }).format(date);
};

const formatLabel = (value?: string | null, fallback = '—') => {
    if (!value) return fallback;
    return value.replace(/_/g, ' ');
};

const canManageProblems = (role?: string | null) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'IT_MANAGER', 'IT_ADMIN', 'FINANCE_ADMIN'].includes(role || '');

export default function ProblemsPortal({ mode }: { mode: ProblemsMode }) {
    const [user, setUser] = useState<any | null>(null);
    const [myIssues, setMyIssues] = useState<ProblemIssue[]>([]);
    const [queueIssues, setQueueIssues] = useState<ProblemIssue[]>([]);
    const [assignees, setAssignees] = useState<ProblemAssignee[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});
    const [selectedStatuses, setSelectedStatuses] = useState<Record<string, string>>({});
    const [assignmentNotes, setAssignmentNotes] = useState<Record<string, string>>({});
    const [selectedAssignees, setSelectedAssignees] = useState<Record<string, string>>({});
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [internalNoteInputs, setInternalNoteInputs] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'OPERATIONS',
        severity: 'MEDIUM',
        visibility: 'NAMED',
        recurrence: 'ONE_TIME',
        impactType: 'TEAM_BLOCKER',
        location: '',
        affectedArea: '',
        departmentName: '',
        isSensitive: false,
    });

    const managementMode = canManageProblems(user?.role);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const localUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
            setUser(localUser);

            const requests: Promise<Response>[] = [
                fetch('/api/problems?view=my', { cache: 'no-store' }),
            ];

            if (localUser && canManageProblems(localUser.role)) {
                requests.push(fetch('/api/problems?view=queue', { cache: 'no-store' }));
            }

            const responses = await Promise.all(requests);
            const myPayload = await responses[0].json();

            if (!responses[0].ok) {
                throw new Error(myPayload.message || myPayload.error || 'Failed to load problems.');
            }

            setMyIssues(myPayload.issues || []);

            if (responses[1]) {
                const queuePayload = await responses[1].json();
                if (!responses[1].ok) {
                    throw new Error(queuePayload.message || queuePayload.error || 'Failed to load queue.');
                }
                setQueueIssues(queuePayload.issues || []);
                setAssignees(queuePayload.assignees || []);
            } else {
                setQueueIssues([]);
                setAssignees([]);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load problems.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const dashboardStats = useMemo(() => {
        const combined = managementMode ? queueIssues : myIssues;
        return {
            myOpen: myIssues.filter((issue) => !['CLOSED', 'MERGED'].includes(issue.status)).length,
            criticalOpen: combined.filter((issue) => issue.severity === 'CRITICAL' && !['CLOSED', 'MERGED'].includes(issue.status)).length,
            resolved: combined.filter((issue) => issue.status === 'RESOLVED' || issue.status === 'CLOSED').length,
            unassigned: combined.filter((issue) => !issue.assignedTo && !['CLOSED', 'MERGED'].includes(issue.status)).length,
        };
    }, [managementMode, myIssues, queueIssues]);

    const submitIssue = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch('/api/problems', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || payload.error || 'Failed to submit problem.');
            }
            toast.success('Problem submitted successfully.');
            setForm({
                title: '',
                description: '',
                category: 'OPERATIONS',
                severity: 'MEDIUM',
                visibility: 'NAMED',
                recurrence: 'ONE_TIME',
                impactType: 'TEAM_BLOCKER',
                location: '',
                affectedArea: '',
                departmentName: '',
                isSensitive: false,
            });
            await loadData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to submit problem.');
        } finally {
            setSubmitting(false);
        }
    };

    const changeStatus = async (issueId: string, status: string) => {
        try {
            const response = await fetch(`/api/problems/${issueId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    note: statusNotes[issueId] || null,
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || payload.error || 'Failed to update status.');
            }
            toast.success('Problem status updated.');
            setStatusNotes((current) => ({ ...current, [issueId]: '' }));
            await loadData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update status.');
        }
    };

    const assignIssue = async (issueId: string) => {
        try {
            const response = await fetch(`/api/problems/${issueId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assigneeId: selectedAssignees[issueId] || null,
                    note: assignmentNotes[issueId] || null,
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || payload.error || 'Failed to assign problem.');
            }
            toast.success('Problem assignment updated.');
            setAssignmentNotes((current) => ({ ...current, [issueId]: '' }));
            await loadData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to assign problem.');
        }
    };

    const addComment = async (issueId: string) => {
        try {
            const content = commentInputs[issueId]?.trim();
            if (!content) return;
            const response = await fetch(`/api/problems/${issueId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || payload.error || 'Failed to add comment.');
            }
            toast.success('Comment added.');
            setCommentInputs((current) => ({ ...current, [issueId]: '' }));
            await loadData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add comment.');
        }
    };

    const addInternalNote = async (issueId: string) => {
        try {
            const content = internalNoteInputs[issueId]?.trim();
            if (!content) return;
            const response = await fetch(`/api/problems/${issueId}/internal-notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || payload.error || 'Failed to add internal note.');
            }
            toast.success('Internal note added.');
            setInternalNoteInputs((current) => ({ ...current, [issueId]: '' }));
            await loadData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add internal note.');
        }
    };

    return (
        <DashboardLayout userRole={user?.role || 'EMPLOYEE'}>
            <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
                <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-xl">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-3xl">
                            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">Problems Resolution</div>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                Raise blockers clearly, route them fast, and keep management accountable.
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                                This module is for operational pain points, risks, and recurring issues. Employees can report problems, and management can acknowledge, assign, and resolve them with a visible status trail.
                            </p>
                        </div>
                        <div className="grid min-w-[260px] gap-3 sm:grid-cols-2">
                            <StatCard label="My Open Problems" value={dashboardStats.myOpen} />
                            <StatCard label="Critical Open" value={dashboardStats.criticalOpen} />
                            <StatCard label="Resolved / Closed" value={dashboardStats.resolved} />
                            <StatCard label="Unassigned" value={dashboardStats.unassigned} />
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <NavChip href="/dashboard/problems" label="Overview" active={mode === 'dashboard'} />
                        <NavChip href="/dashboard/problems/my" label="My Problems" active={mode === 'my'} />
                        {managementMode ? <NavChip href="/dashboard/problems/queue" label="Problems Queue" active={mode === 'queue'} /> : null}
                    </div>
                </section>

                {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading problems module…</div> : null}

                {!loading && mode === 'dashboard' ? (
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <QuickCard href="/dashboard/problems/my" title="Report a Problem" description="Submit blockers, recurring issues, and risks with severity and visibility controls." />
                                {managementMode ? <QuickCard href="/dashboard/problems/queue" title="Open Management Queue" description="Acknowledge, assign, and move problem issues through the resolution workflow." /> : <QuickCard href="/dashboard/problems/my" title="Track My Statuses" description="Review management updates and confirm whether the resolution actually worked." />}
                            </div>
                        </section>
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
                            <div className="mt-4 space-y-3">
                                {(managementMode ? queueIssues : myIssues).slice(0, 5).map((issue) => (
                                    <CompactIssueRow key={issue.id} issue={issue} />
                                ))}
                                {(managementMode ? queueIssues : myIssues).length === 0 ? <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No problem records yet.</div> : null}
                            </div>
                        </section>
                    </div>
                ) : null}

                {!loading && mode === 'my' ? (
                    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-900">Report a New Problem</h2>
                            <form className="mt-5 space-y-4" onSubmit={submitIssue}>
                                <Field label="Title">
                                    <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Short summary of the problem" />
                                </Field>
                                <Field label="Description">
                                    <textarea className="min-h-[130px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="What is happening, who is affected, and what is blocked?" />
                                </Field>
                                <TwoCol>
                                    <Field label="Category">
                                        <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                                            {CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Severity">
                                        <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}>
                                            {SEVERITY_OPTIONS.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
                                        </select>
                                    </Field>
                                </TwoCol>
                                <TwoCol>
                                    <Field label="Visibility">
                                        <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))}>
                                            {VISIBILITY_OPTIONS.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Recurrence">
                                        <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.recurrence} onChange={(event) => setForm((current) => ({ ...current, recurrence: event.target.value }))}>
                                            {RECURRENCE_OPTIONS.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
                                        </select>
                                    </Field>
                                </TwoCol>
                                <Field label="Impact Type">
                                    <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.impactType} onChange={(event) => setForm((current) => ({ ...current, impactType: event.target.value }))}>
                                        {IMPACT_OPTIONS.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
                                    </select>
                                </Field>
                                <TwoCol>
                                    <Field label="Location / System">
                                        <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Team, office, app, workflow" />
                                    </Field>
                                    <Field label="Affected Area">
                                        <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.affectedArea} onChange={(event) => setForm((current) => ({ ...current, affectedArea: event.target.value }))} placeholder="Department, process, unit" />
                                    </Field>
                                </TwoCol>
                                <Field label="Department Name">
                                    <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.departmentName} onChange={(event) => setForm((current) => ({ ...current, departmentName: event.target.value }))} placeholder="Optional department context" />
                                </Field>
                                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                                    <input type="checkbox" checked={form.isSensitive} onChange={(event) => setForm((current) => ({ ...current, isSensitive: event.target.checked }))} />
                                    Mark this as sensitive so management can triage it with extra care.
                                </label>
                                <button disabled={submitting} className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                                    {submitting ? 'Submitting…' : 'Submit Problem'}
                                </button>
                            </form>
                        </section>
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-slate-900">My Problems</h2>
                            {myIssues.length === 0 ? <EmptyState text="No problems reported yet. Submit your first blocker from the form." /> : myIssues.map((issue) => (
                            <ProblemCard
                                key={issue.id}
                                issue={issue}
                                canManage={false}
                                commentValue={commentInputs[issue.id] || ''}
                                onCommentChange={(value) => setCommentInputs((current) => ({ ...current, [issue.id]: value }))}
                                onAddComment={() => addComment(issue.id)}
                                actions={(
                                    <div className="flex flex-wrap gap-2">
                                        {issue.status === 'RESOLVED' ? <ActionButton label="Confirm & Close" onClick={() => changeStatus(issue.id, 'CLOSED')} /> : null}
                                            {['RESOLVED', 'CLOSED'].includes(issue.status) ? <ActionButton label="Reopen" variant="secondary" onClick={() => changeStatus(issue.id, 'REOPENED')} /> : null}
                                        </div>
                                    )}
                                />
                            ))}
                        </section>
                    </div>
                ) : null}

                {!loading && mode === 'queue' && managementMode ? (
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Problems Queue</h2>
                        {queueIssues.length === 0 ? <EmptyState text="No company problems are currently waiting in the queue." /> : queueIssues.map((issue) => (
                            <ProblemCard
                                key={issue.id}
                                issue={issue}
                                showReporter
                                canManage
                                commentValue={commentInputs[issue.id] || ''}
                                onCommentChange={(value) => setCommentInputs((current) => ({ ...current, [issue.id]: value }))}
                                onAddComment={() => addComment(issue.id)}
                                internalNoteValue={internalNoteInputs[issue.id] || ''}
                                onInternalNoteChange={(value) => setInternalNoteInputs((current) => ({ ...current, [issue.id]: value }))}
                                onAddInternalNote={() => addInternalNote(issue.id)}
                                actions={(
                                    <div className="grid gap-3 rounded-2xl bg-slate-50 p-4">
                                        <div className="grid gap-3 lg:grid-cols-[200px_1fr_auto]">
                                            <select
                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                                                value={selectedStatuses[issue.id] ?? issue.status}
                                                onChange={(event) => setSelectedStatuses((current) => ({ ...current, [issue.id]: event.target.value }))}
                                            >
                                                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
                                            </select>
                                            <input
                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                                                value={statusNotes[issue.id] || ''}
                                                onChange={(event) => setStatusNotes((current) => ({ ...current, [issue.id]: event.target.value }))}
                                                placeholder="Optional status note for the timeline"
                                            />
                                            <ActionButton label="Save Status" onClick={() => changeStatus(issue.id, selectedStatuses[issue.id] ?? issue.status)} />
                                        </div>
                                        <div className="grid gap-3 lg:grid-cols-[240px_1fr_auto]">
                                            <select
                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                                                value={selectedAssignees[issue.id] ?? issue.assignedTo?.id ?? ''}
                                                onChange={(event) => setSelectedAssignees((current) => ({ ...current, [issue.id]: event.target.value }))}
                                            >
                                                <option value="">Unassigned</option>
                                                {assignees.map((assignee) => (
                                                    <option key={assignee.id} value={assignee.id}>
                                                        {assignee.name || assignee.email} ({formatLabel(assignee.role)})
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                                                value={assignmentNotes[issue.id] || ''}
                                                onChange={(event) => setAssignmentNotes((current) => ({ ...current, [issue.id]: event.target.value }))}
                                                placeholder="Optional assignment note"
                                            />
                                            <ActionButton label="Update Assignee" onClick={() => assignIssue(issue.id)} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {STATUS_OPTIONS.map((option) => (
                                                <ActionButton key={option} label={formatLabel(option)} variant={issue.status === option ? 'primary' : 'secondary'} onClick={() => changeStatus(issue.id, option)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            />
                        ))}
                    </section>
                ) : null}

                {!loading && mode === 'queue' && !managementMode ? (
                    <EmptyState text="This queue is available only to management roles." />
                ) : null}
            </div>
        </DashboardLayout>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-300">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
        </div>
    );
}

function NavChip({ href, label, active }: { href: string; label: string; active?: boolean }) {
    return (
        <Link
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
            {label}
        </Link>
    );
}

function QuickCard({ href, title, description }: { href: string; title: string; description: string }) {
    return (
        <Link href={href} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
        </Link>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">{label}</span>
            {children}
        </label>
    );
}

function TwoCol({ children }: { children: React.ReactNode }) {
    return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function EmptyState({ text }: { text: string }) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">{text}</div>;
}

function CompactIssueRow({ issue }: { issue: ProblemIssue }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{formatLabel(issue.category, 'Other')}</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{issue.title}</div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{formatLabel(issue.status)}</div>
            </div>
        </div>
    );
}

function ProblemCard({
    issue,
    showReporter,
    canManage,
    commentValue,
    onCommentChange,
    onAddComment,
    internalNoteValue,
    onInternalNoteChange,
    onAddInternalNote,
    actions,
}: {
    issue: ProblemIssue;
    showReporter?: boolean;
    canManage?: boolean;
    commentValue?: string;
    onCommentChange?: (value: string) => void;
    onAddComment?: () => void;
    internalNoteValue?: string;
    onInternalNoteChange?: (value: string) => void;
    onAddInternalNote?: () => void;
    actions?: React.ReactNode;
}) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <span>{formatLabel(issue.category, 'Other')}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 tracking-normal text-slate-700">{formatLabel(issue.severity)}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 tracking-normal text-slate-700">{formatLabel(issue.status)}</span>
                        {issue.isSensitive ? <span className="rounded-full bg-rose-50 px-2 py-1 tracking-normal text-rose-700">Sensitive</span> : null}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">{issue.title}</h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{issue.description}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div>Created: <span className="font-semibold text-slate-900">{formatDateTime(issue.createdAt)}</span></div>
                    <div>Updated: <span className="font-semibold text-slate-900">{formatDateTime(issue.updatedAt)}</span></div>
                    <div>Assigned: <span className="font-semibold text-slate-900">{issue.assignedTo?.name || 'Unassigned'}</span></div>
                    {showReporter ? <div>Reporter: <span className="font-semibold text-slate-900">{issue.reportedBy?.name || issue.reportedBy?.email || 'Hidden'}</span></div> : null}
                </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                <MetaItem label="Visibility" value={formatLabel(issue.visibility)} />
                <MetaItem label="Recurrence" value={formatLabel(issue.recurrence)} />
                <MetaItem label="Impact" value={formatLabel(issue.impactType)} />
                <MetaItem label="Area" value={issue.affectedArea || issue.location || '—'} />
            </div>

            {issue.statusHistory?.length ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Status Timeline</div>
                    <div className="mt-3 space-y-3">
                        {issue.statusHistory.slice(0, 5).map((entry) => (
                            <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                                <div>
                                    <div className="font-medium text-slate-900">
                                        {entry.fromStatus ? `${formatLabel(entry.fromStatus)} -> ${formatLabel(entry.toStatus)}` : formatLabel(entry.toStatus)}
                                    </div>
                                    {entry.note ? <div className="mt-1">{entry.note}</div> : null}
                                </div>
                                <div className="text-right text-xs text-slate-500">
                                    <div>{entry.actor?.name || entry.actor?.email || 'System'}</div>
                                    <div>{formatDateTime(entry.createdAt)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Visible Comments</div>
                    <div className="mt-3 space-y-3">
                        {issue.comments?.length ? issue.comments.map((comment) => (
                            <div key={comment.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                                <div className="font-medium text-slate-900">{comment.author?.name || comment.author?.email || 'Staff'}</div>
                                <div className="mt-1 whitespace-pre-wrap">{comment.content}</div>
                                <div className="mt-2 text-xs text-slate-500">{formatDateTime(comment.createdAt)}</div>
                            </div>
                        )) : <div className="text-sm text-slate-500">No visible comments yet.</div>}
                    </div>
                    {onAddComment && onCommentChange ? (
                        <div className="mt-3 flex gap-3">
                            <input
                                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                                value={commentValue || ''}
                                onChange={(event) => onCommentChange(event.target.value)}
                                placeholder="Add an update or ask for clarification"
                            />
                            <ActionButton label="Post" onClick={onAddComment} />
                        </div>
                    ) : null}
                </div>

                {canManage ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="text-sm font-semibold text-amber-900">Internal Notes</div>
                        <div className="mt-3 space-y-3">
                            {issue.internalNotes?.length ? issue.internalNotes.map((note) => (
                                <div key={note.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                                    <div className="font-medium text-slate-900">{note.author?.name || note.author?.email || 'Manager'}</div>
                                    <div className="mt-1 whitespace-pre-wrap">{note.content}</div>
                                    <div className="mt-2 text-xs text-slate-500">{formatDateTime(note.createdAt)}</div>
                                </div>
                            )) : <div className="text-sm text-amber-800">No internal notes yet.</div>}
                        </div>
                        {onAddInternalNote && onInternalNoteChange ? (
                            <div className="mt-3 flex gap-3">
                                <input
                                    className="flex-1 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm"
                                    value={internalNoteValue || ''}
                                    onChange={(event) => onInternalNoteChange(event.target.value)}
                                    placeholder="Add manager-only handling notes"
                                />
                                <ActionButton label="Save Note" onClick={onAddInternalNote} />
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {actions ? <div className="mt-5">{actions}</div> : null}
        </div>
    );
}

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
            <div className="mt-2 font-medium text-slate-900">{value}</div>
        </div>
    );
}

function ActionButton({
    label,
    onClick,
    variant = 'primary',
    disabled,
}: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${variant === 'primary' ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-50`}
        >
            {label}
        </button>
    );
}
