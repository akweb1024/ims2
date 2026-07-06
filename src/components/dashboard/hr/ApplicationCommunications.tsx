'use client';

import { useCallback, useEffect, useState } from 'react';
import { Phone, Mail, Users, MessageSquare, Plus, Check, RotateCcw, Loader2, AlarmClock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatToISTDate, formatToISTTime } from '@/lib/date-utils';

// CRM-style communication log + follow-up process for one candidate
// application: HR records every call/email/meeting, optionally schedules the
// next follow-up, and closes follow-ups as they're done.

const TYPE_META: Record<string, { icon: React.ReactNode; label: string }> = {
    CALL: { icon: <Phone size={14} />, label: 'Call' },
    EMAIL: { icon: <Mail size={14} />, label: 'Email' },
    MEETING: { icon: <Users size={14} />, label: 'Meeting' },
    COMMENT: { icon: <MessageSquare size={14} />, label: 'Note' },
};

const EMPTY_FORM = { type: 'CALL', subject: '', notes: '', outcome: '', nextFollowUpDate: '' };

const authHeaders = () => ({
    'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
    'Content-Type': 'application/json',
});

export default function ApplicationCommunications({ applicationId }: { applicationId: string }) {
    const [communications, setCommunications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/recruitment/applications/${applicationId}/communications`, { headers: authHeaders() });
            if (res.ok) setCommunications((await res.json()).communications || []);
        } catch { /* non-fatal */ }
        finally { setLoading(false); }
    }, [applicationId]);

    useEffect(() => { load(); }, [load]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/recruitment/applications/${applicationId}/communications`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    type: form.type,
                    subject: form.subject,
                    notes: form.notes,
                    outcome: form.outcome || undefined,
                    nextFollowUpDate: form.nextFollowUpDate ? new Date(form.nextFollowUpDate).toISOString() : undefined,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || data.error || 'Failed to log communication');
            toast.success('Communication logged');
            setForm({ ...EMPTY_FORM });
            setShowForm(false);
            load();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleFollowUp = async (comm: any, done: boolean) => {
        setBusyId(comm.id);
        try {
            const res = await fetch(`/api/recruitment/applications/${applicationId}/communications`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ communicationId: comm.id, isFollowUpCompleted: done }),
            });
            if (!res.ok) throw new Error('Update failed');
            toast.success(done ? 'Follow-up completed' : 'Follow-up reopened');
            load();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const pendingFollowUps = communications.filter(c => c.nextFollowUpDate && !c.isFollowUpCompleted);
    const overdueCount = pendingFollowUps.filter(c => new Date(c.nextFollowUpDate) < new Date()).length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-secondary-100 pb-2">
                <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                    Communications & Follow-ups
                    {pendingFollowUps.length > 0 && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${overdueCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {overdueCount > 0 ? `${overdueCount} overdue` : `${pendingFollowUps.length} pending`}
                        </span>
                    )}
                </h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5"
                >
                    <Plus size={14} /> Log Communication
                </button>
            </div>

            {showForm && (
                <form onSubmit={submit} className="bg-secondary-50 border border-secondary-100 rounded-2xl p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Type</label>
                            <select
                                className="w-full bg-white border border-secondary-200 rounded-xl p-3 font-bold text-sm mt-1"
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                            >
                                <option value="CALL">Call</option>
                                <option value="EMAIL">Email</option>
                                <option value="MEETING">Meeting</option>
                                <option value="COMMENT">Note</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Next follow-up (optional)</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-white border border-secondary-200 rounded-xl p-3 font-bold text-sm mt-1"
                                value={form.nextFollowUpDate}
                                onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Subject *</label>
                        <input
                            required
                            className="w-full bg-white border border-secondary-200 rounded-xl p-3 font-bold text-sm mt-1"
                            value={form.subject}
                            onChange={(e) => setForm({ ...form, subject: e.target.value })}
                            placeholder="e.g. Salary expectation discussion"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Notes *</label>
                        <textarea
                            required
                            rows={3}
                            className="w-full bg-white border border-secondary-200 rounded-xl p-3 text-sm font-medium mt-1"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="What was discussed..."
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Outcome (optional)</label>
                        <input
                            className="w-full bg-white border border-secondary-200 rounded-xl p-3 text-sm font-medium mt-1"
                            value={form.outcome}
                            onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                            placeholder="e.g. Candidate will confirm by Friday"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setShowForm(false)} className="text-secondary-500 font-bold uppercase text-xs tracking-widest px-3">Cancel</button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn bg-secondary-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-50 flex items-center gap-2"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : null} Save Log
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <p className="text-secondary-400 text-sm font-medium animate-pulse">Loading communication history…</p>
            ) : communications.length === 0 ? (
                <p className="text-secondary-400 text-sm font-medium italic">No communications logged yet. Record your first call or email with this candidate.</p>
            ) : (
                <div className="space-y-3">
                    {communications.map((comm) => {
                        const meta = TYPE_META[comm.type] || TYPE_META.COMMENT;
                        const hasFollowUp = Boolean(comm.nextFollowUpDate);
                        const overdue = hasFollowUp && !comm.isFollowUpCompleted && new Date(comm.nextFollowUpDate) < new Date();
                        return (
                            <div key={comm.id} className="bg-white border border-secondary-100 rounded-xl p-4 hover:border-primary-200 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="p-2 bg-secondary-50 rounded-lg text-primary-600 shrink-0">{meta.icon}</div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-secondary-900 text-sm">{comm.subject}</p>
                                            <p className="text-xs text-secondary-500 mt-0.5">
                                                {meta.label} · {formatToISTDate(comm.date)} {formatToISTTime(comm.date)} · by {comm.user?.name || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-secondary-600 mt-2 whitespace-pre-wrap">{comm.notes}</p>
                                            {comm.outcome && (
                                                <p className="text-xs text-secondary-500 mt-1 italic">Outcome: {comm.outcome}</p>
                                            )}
                                        </div>
                                    </div>
                                    {hasFollowUp && (
                                        <div className="shrink-0 text-right space-y-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                                                comm.isFollowUpCompleted ? 'bg-success-50 text-success-600'
                                                    : overdue ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                <AlarmClock size={11} />
                                                {comm.isFollowUpCompleted ? 'Done' : formatToISTDate(comm.nextFollowUpDate)}
                                            </span>
                                            <div>
                                                {comm.isFollowUpCompleted ? (
                                                    <button
                                                        onClick={() => toggleFollowUp(comm, false)}
                                                        disabled={busyId === comm.id}
                                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary-400 hover:text-secondary-700"
                                                    >
                                                        <RotateCcw size={11} /> Reopen
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => toggleFollowUp(comm, true)}
                                                        disabled={busyId === comm.id}
                                                        className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-success-600 hover:bg-success-700 px-2.5 py-1 rounded-lg disabled:opacity-50"
                                                    >
                                                        <Check size={11} /> Mark Done
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
