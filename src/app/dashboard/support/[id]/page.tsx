'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Building2, UserCheck, Lock, Send, MessageSquare } from 'lucide-react';
import {
    useTicket,
    useTicketComments,
    useTicketMutations,
    useSupportAssignees,
    STATUS_STYLE,
    PRIORITY_STYLE,
} from '@/hooks/useSupportTickets';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const personLabel = (u?: { name?: string | null; email?: string | null } | null) => u?.name || u?.email || 'Unknown';

export default function SupportTicketDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: ticket, isLoading } = useTicket(id);
    const { data: comments = [] } = useTicketComments(id);
    const { update, addComment } = useTicketMutations(id);
    const canTriage = !!ticket?.canTriage;
    const { data: assignees = [] } = useSupportAssignees(canTriage);

    const [reply, setReply] = useState('');
    const [internal, setInternal] = useState(false);
    const [draft, setDraft] = useState<{ status: string; priority: string; assignedToId: string; resolution: string } | null>(null);

    useEffect(() => {
        if (ticket && !draft) {
            setDraft({
                status: ticket.status,
                priority: ticket.priority,
                assignedToId: ticket.assignedTo?.id || '',
                resolution: ticket.resolution || '',
            });
        }
    }, [ticket, draft]);

    if (isLoading) return <div className="p-10 text-center animate-pulse">Loading ticket…</div>;
    if (!ticket) return <div className="p-10 text-center text-rose-500">Ticket not found.</div>;

    const saveTriage = async () => {
        if (!draft) return;
        try {
            await update.mutateAsync({ id, status: draft.status, priority: draft.priority, assignedToId: draft.assignedToId || null, resolution: draft.resolution });
            toast.success('Ticket updated');
        } catch (e: any) {
            toast.error(e?.message || 'Update failed');
        }
    };

    const setStatus = async (status: string) => {
        try {
            await update.mutateAsync({ id, status });
            toast.success(status === 'CLOSED' ? 'Ticket closed' : 'Ticket reopened');
        } catch (e: any) {
            toast.error(e?.message || 'Update failed');
        }
    };

    const submitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim()) return;
        try {
            await addComment.mutateAsync({ id, body: reply.trim(), isInternal: internal });
            setReply('');
            setInternal(false);
        } catch (err: any) {
            toast.error(err?.message || 'Could not post reply');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
            <Link href="/dashboard/support" className="inline-flex items-center gap-1.5 text-sm font-bold text-secondary-500 hover:text-primary-600">
                <ArrowLeft size={16} /> Back to tickets
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${STATUS_STYLE[ticket.status] || STATUS_STYLE.OPEN}`}>{ticket.status.replace('_', ' ')}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.MEDIUM}`}>{ticket.priority}</span>
                            {ticket.category && <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider">{ticket.category}</span>}
                        </div>
                        <h1 className="text-2xl font-black text-secondary-900">{ticket.title}</h1>
                        <p className="text-secondary-600 mt-3 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                        {ticket.resolution && (
                            <div className="mt-4 p-4 rounded-xl bg-success-50 border border-success-200">
                                <p className="text-[11px] font-black uppercase tracking-wider text-success-700 mb-1">Resolution</p>
                                <p className="text-sm text-secondary-700 whitespace-pre-wrap">{ticket.resolution}</p>
                            </div>
                        )}
                    </div>

                    {/* Thread */}
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2 mb-4"><MessageSquare size={18} className="text-secondary-400" /> Follow-ups</h3>
                        {comments.length === 0 ? (
                            <p className="text-sm text-secondary-400 italic">No replies yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {comments.map((c: any) => (
                                    <div key={c.id} className={`p-3 rounded-xl border ${c.isInternal ? 'border-amber-200 bg-amber-50/60 border-dashed' : 'border-secondary-100'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-secondary-900 text-sm">{personLabel(c.user)}</span>
                                            <span className="text-[10px] text-secondary-400">{new Date(c.createdAt).toLocaleString()}</span>
                                            {c.isInternal && <span className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-1"><Lock size={10} /> internal</span>}
                                        </div>
                                        <p className="text-sm text-secondary-700 whitespace-pre-wrap">{c.body}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <form onSubmit={submitReply} className="mt-4">
                            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Write a reply…" className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm" />
                            <div className="flex items-center justify-between mt-2">
                                {canTriage ? (
                                    <label className="flex items-center gap-2 text-xs font-semibold text-secondary-500 cursor-pointer">
                                        <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="rounded border-secondary-300" />
                                        Internal note (hidden from requester)
                                    </label>
                                ) : <span />}
                                <button type="submit" disabled={!reply.trim() || addComment.isPending} className="px-4 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm disabled:opacity-50 flex items-center gap-1.5">
                                    <Send size={14} /> Reply
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="card-premium p-6 space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-secondary-400 font-bold uppercase text-[11px]">Requester</span><span className="font-semibold text-secondary-800">{personLabel(ticket.requester)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-secondary-400 font-bold uppercase text-[11px] flex items-center gap-1"><Building2 size={12} /> Department</span><span className="font-semibold text-secondary-800">{ticket.department?.name || 'IT'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-secondary-400 font-bold uppercase text-[11px] flex items-center gap-1"><UserCheck size={12} /> Assignee</span><span className="font-semibold text-secondary-800">{ticket.assignedTo?.name || 'Unassigned'}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-400 font-bold uppercase text-[11px]">Raised</span><span className="font-semibold text-secondary-800">{new Date(ticket.createdAt).toLocaleDateString()}</span></div>
                        {ticket.resolvedAt && <div className="flex justify-between"><span className="text-secondary-400 font-bold uppercase text-[11px]">Resolved</span><span className="font-semibold text-secondary-800">{new Date(ticket.resolvedAt).toLocaleDateString()}</span></div>}
                    </div>

                    {canTriage && draft ? (
                        <div className="card-premium p-6 space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-wider text-secondary-500">Triage</h3>
                            <div>
                                <label className="block text-[11px] font-bold text-secondary-500 uppercase mb-1">Status</label>
                                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm">
                                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-secondary-500 uppercase mb-1">Priority</label>
                                <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm">
                                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-secondary-500 uppercase mb-1">Assign to</label>
                                <select value={draft.assignedToId} onChange={(e) => setDraft({ ...draft, assignedToId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm">
                                    <option value="">Unassigned</option>
                                    {assignees.map((a) => <option key={a.userId} value={a.userId}>{a.name}{a.departmentName ? ` · ${a.departmentName}` : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-secondary-500 uppercase mb-1">Resolution note</label>
                                <textarea value={draft.resolution} onChange={(e) => setDraft({ ...draft, resolution: e.target.value })} rows={3} placeholder="How was it resolved?" className="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm" />
                            </div>
                            <button onClick={saveTriage} disabled={update.isPending} className="w-full px-4 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-60">
                                {update.isPending ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    ) : (
                        // Requester controls
                        ticket.requester?.id && (
                            <div className="card-premium p-6">
                                {['RESOLVED', 'CLOSED'].includes(ticket.status) ? (
                                    <button onClick={() => setStatus('OPEN')} disabled={update.isPending} className="w-full px-4 py-2 rounded-lg border border-secondary-200 font-bold text-secondary-700 hover:bg-secondary-50">Reopen ticket</button>
                                ) : (
                                    <button onClick={() => setStatus('CLOSED')} disabled={update.isPending} className="w-full px-4 py-2 rounded-lg border border-secondary-200 font-bold text-secondary-700 hover:bg-secondary-50">Close ticket</button>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
