'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { LifeBuoy, Plus, X, ArrowRight, Building2, Clock, UserCheck, AlertCircle } from 'lucide-react';
import {
    useTickets,
    useTicketMutations,
    useSupportDepartments,
    STATUS_STYLE,
    PRIORITY_STYLE,
    type TicketScope,
} from '@/hooks/useSupportTickets';
import { LifecycleTabs, StartPill, PeopleStack } from '@/components/dashboard/it/LifecycleUI';
import {
    ticketLifecycle, lifecycleStart,
    TICKET_LIFECYCLES, TICKET_LIFECYCLE_LABELS,
    type LifecycleKey,
} from '@/lib/it/lifecycle';

const TRIAGE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'MANAGER', 'TEAM_LEADER'];
const CATEGORIES = ['GENERAL', 'HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCESS', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const EMPTY = { title: '', description: '', departmentId: '', category: 'GENERAL', priority: 'MEDIUM' };

export default function SupportPage() {
    const [role, setRole] = useState('');
    useEffect(() => {
        const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (u) try { setRole(JSON.parse(u).role || ''); } catch { /* ignore */ }
    }, []);
    const isTriager = TRIAGE_ROLES.includes(role);

    const [scope, setScope] = useState<TicketScope>('mine');
    const { data: tickets = [], isLoading } = useTickets(scope);
    const { create } = useTicketMutations();
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const { data: departments = [] } = useSupportDepartments(creating);

    const tabs = useMemo(
        () => [
            { key: 'mine' as const, label: 'My Requests' },
            { key: 'assigned' as const, label: 'Assigned to Me' },
            ...(isTriager ? [{ key: 'queue' as const, label: 'Queue' }] : []),
        ],
        [isTriager],
    );

    /* Scope answers "whose tickets"; stage answers "what state" — the two compose. */
    const [stage, setStage] = useState<LifecycleKey | 'ALL'>('ALL');

    const staged = useMemo(
        () =>
            tickets.map((t: any) => {
                const lifecycle = ticketLifecycle(t.status);
                return {
                    ...t,
                    lifecycle,
                    start: lifecycleStart({
                        lifecycle,
                        kind: 'queue',
                        startDate: t.createdAt,
                        dueDate: t.dueAt,
                        completedAt: t.resolvedAt,
                    }),
                };
            }),
        [tickets],
    );

    const stageCounts = useMemo(
        () =>
            staged.reduce<Record<string, number>>((acc, t) => {
                acc[t.lifecycle] = (acc[t.lifecycle] ?? 0) + 1;
                return acc;
            }, {}),
        [staged],
    );

    const visible = stage === 'ALL' ? staged : staged.filter((t) => t.lifecycle === stage);
    const breached = staged.filter((t) => t.start.tone === 'late').length;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await create.mutateAsync(form);
            setCreating(false);
            setForm(EMPTY);
            toast.success('Support ticket raised');
        } catch (err: any) {
            toast.error(err?.message || 'Could not raise ticket');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-2">
                        <LifeBuoy size={26} className="text-primary-500" /> Support Tickets
                    </h1>
                    <p className="text-secondary-500 font-medium mt-1">Raise a request to IT or another department — and track it to resolution.</p>
                </div>
                <button onClick={() => setCreating(true)} className="btn btn-primary flex items-center gap-2 px-6 py-3 font-bold shadow-lg shadow-primary-500/20">
                    <Plus size={20} /> New Ticket
                </button>
            </div>

            <div className="flex gap-2">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setScope(t.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${scope === t.key ? 'bg-primary-600 text-white' : 'bg-white border border-secondary-200 text-secondary-600 hover:bg-secondary-50'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {!isLoading && tickets.length > 0 && (
                <div className="space-y-3">
                    <LifecycleTabs
                        tone="light"
                        value={stage}
                        onChange={setStage}
                        stages={TICKET_LIFECYCLES}
                        counts={stageCounts}
                        total={staged.length}
                        labels={TICKET_LIFECYCLE_LABELS}
                        allLabel="All States"
                    />
                    {breached > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                            <AlertCircle size={12} /> {breached} past due
                        </span>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="p-10 text-center animate-pulse">Loading tickets…</div>
            ) : visible.length === 0 ? (
                <div className="card-premium p-12 text-center text-secondary-400">
                    <LifeBuoy size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-bold text-secondary-600">
                        {stage === 'ALL' ? 'No tickets here yet.' : 'Nothing sits in this state right now.'}
                    </p>
                    {stage !== 'ALL' && (
                        <button onClick={() => setStage('ALL')} className="mt-4 text-xs font-black text-primary-600 uppercase tracking-widest hover:underline">
                            Show all states
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {visible.map((t: any) => (
                        <Link key={t.id} href={`/dashboard/support-desk/${t.id}`} className="card-premium p-5 flex items-center justify-between gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all group">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${STATUS_STYLE[t.status] || STATUS_STYLE.OPEN}`}>{t.status.replace('_', ' ')}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.MEDIUM}`}>{t.priority}</span>
                                    {t.department?.name && (
                                        <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-1"><Building2 size={11} /> {t.department.name}</span>
                                    )}
                                    {/* Waiting / being worked / breached, in the shared vocabulary */}
                                    <StartPill state={t.start} tone="light" />
                                </div>
                                <h3 className="font-black text-secondary-900 truncate group-hover:text-primary-600">{t.title}</h3>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-secondary-500">
                                    <PeopleStack
                                        tone="light" size="sm" caption={null} emptyLabel="Nobody on it"
                                        people={[
                                            ...(t.assignedTo ? [{ ...t.assignedTo, role: 'Working on it' }] : []),
                                            ...(t.requester && t.requester.id !== t.assignedTo?.id
                                                ? [{ ...t.requester, role: 'Requester' }] : []),
                                        ]}
                                    />
                                    <span className="flex items-center gap-1">
                                        <UserCheck size={11} />
                                        {t.assignedTo ? (t.assignedTo.name || t.assignedTo.email) : 'Unassigned'}
                                    </span>
                                    <span className="flex items-center gap-1"><Clock size={11} /> {new Date(t.createdAt).toLocaleDateString()}</span>
                                    {t._count?.comments > 0 && <span>{t._count.comments} repl{t._count.comments === 1 ? 'y' : 'ies'}</span>}
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-secondary-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all shrink-0" />
                        </Link>
                    ))}
                </div>
            )}

            {creating && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-secondary-900">Raise a Support Ticket</h3>
                            <button onClick={() => setCreating(false)} className="p-2 rounded-lg hover:bg-secondary-100 text-secondary-400"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Subject</label>
                                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What do you need help with?" className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Details</label>
                                <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue or request…" className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Route to Department</label>
                                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none">
                                    <option value="">IT (default)</option>
                                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Category</label>
                                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none">
                                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Priority</label>
                                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none">
                                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setCreating(false)} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 font-bold hover:bg-secondary-50">Cancel</button>
                                <button type="submit" disabled={create.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-60">
                                    {create.isPending ? 'Submitting…' : 'Submit Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
