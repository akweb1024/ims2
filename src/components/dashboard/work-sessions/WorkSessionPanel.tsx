'use client';

import { useEffect, useState } from 'react';
import { Play, Square, Clock, Users, Plus, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    useCurrentSession,
    useProjectSessions,
    useWorkSessionMutations,
    formatMinutes,
    type ProjectRef,
} from '@/hooks/useWorkSessions';

const personLabel = (u?: { name?: string | null; email?: string | null } | null) =>
    u?.name || u?.email || 'Someone';

/** H:MM:SS from a start timestamp, ticking live. */
const useLiveClock = (startedAt?: string | null) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!startedAt) return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [startedAt]);
    if (!startedAt) return '0:00:00';
    const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/**
 * Start / stop a work session on a single project, plus a running activity log and the
 * project's session history (who worked, how long). Works for both Company Projects
 * (projectId) and IT projects (itProjectId) — pass exactly one.
 */
export default function WorkSessionPanel({ projectId, itProjectId }: ProjectRef) {
    const ref: ProjectRef = projectId ? { projectId } : { itProjectId };
    const { data: current } = useCurrentSession();
    const { data: sessions = [] } = useProjectSessions(ref);
    const { start, stop, addActivity } = useWorkSessionMutations();
    const [activityText, setActivityText] = useState('');

    const isThis =
        !!current &&
        ((projectId && current.projectId === projectId) || (itProjectId && current.itProjectId === itProjectId));
    const otherName = current && !isThis ? current.project?.title || current.itProject?.name : null;
    const clock = useLiveClock(isThis ? current?.startedAt : null);

    const activeNow = sessions.filter((s: any) => s.isRunning);
    const totalMinutes = sessions.reduce((sum: number, s: any) => sum + (s.durationMinutes || s.elapsedMinutes || 0), 0);

    const handleStart = async () => {
        try {
            await start.mutateAsync(ref);
            toast.success('Work session started');
        } catch (e: any) {
            if (e?.status === 409 && e?.body?.running) {
                const rn = e.body.running.project?.title || e.body.running.itProject?.name || 'another project';
                toast.error(`You're already working on ${rn}. Stop it first.`);
            } else {
                toast.error(e?.message || 'Could not start session');
            }
        }
    };

    const handleStop = async () => {
        if (!current) return;
        try {
            await stop.mutateAsync({ id: current.id });
            toast.success('Work session stopped');
        } catch (e: any) {
            toast.error(e?.message || 'Could not stop session');
        }
    };

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!current || !activityText.trim()) return;
        try {
            await addActivity.mutateAsync({ id: current.id, description: activityText.trim() });
            setActivityText('');
        } catch (err: any) {
            toast.error(err?.message || 'Could not log activity');
        }
    };

    return (
        <div className="card-premium p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                    <Clock size={18} className="text-primary-500" /> Work Session
                </h3>
                {activeNow.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-success-50 text-success-700 border border-success-200">
                        <Users size={12} /> {activeNow.length} active now
                    </span>
                )}
            </div>

            {/* Control block */}
            {isThis ? (
                <div className="rounded-xl border border-success-200 bg-success-50/50 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-success-700">Running</p>
                            <p className="text-3xl font-black tabular-nums text-secondary-900">{clock}</p>
                        </div>
                        <button
                            onClick={handleStop}
                            disabled={stop.isPending}
                            className="btn flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-60"
                        >
                            <Square size={16} /> Stop
                        </button>
                    </div>

                    {/* Activity log */}
                    <form onSubmit={handleAddActivity} className="mt-4 flex gap-2">
                        <input
                            value={activityText}
                            onChange={(e) => setActivityText(e.target.value)}
                            placeholder="What are you working on right now?"
                            className="flex-1 px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!activityText.trim() || addActivity.isPending}
                            className="px-3 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm disabled:opacity-50 flex items-center gap-1"
                        >
                            <Plus size={14} /> Log
                        </button>
                    </form>
                    {current?.activities?.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                            {current.activities.map((a: any) => (
                                <li key={a.id} className="flex items-start gap-2 text-xs text-secondary-600">
                                    <Activity size={12} className="mt-0.5 text-secondary-400 shrink-0" />
                                    <span className="flex-1">{a.description}</span>
                                    <span className="text-secondary-400">{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : otherName ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800">
                    You&apos;re currently working on <span className="font-bold">{otherName}</span>. Stop that session to start one here.
                </div>
            ) : (
                <button
                    onClick={handleStart}
                    disabled={start.isPending}
                    className="btn btn-primary w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-bold disabled:opacity-60"
                >
                    <Play size={18} /> Start Work
                </button>
            )}

            {/* Project session history */}
            <div className="mt-5 pt-4 border-t border-secondary-100">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-secondary-400">Session History</span>
                    <span className="text-xs font-bold text-secondary-500">Total logged: {formatMinutes(totalMinutes)}</span>
                </div>
                {sessions.length === 0 ? (
                    <p className="text-xs text-secondary-400 italic">No one has logged work on this project yet.</p>
                ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto">
                        {sessions.slice(0, 30).map((s: any) => (
                            <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.isRunning ? 'bg-success-500 animate-pulse' : 'bg-secondary-300'}`} />
                                    <span className="font-semibold text-secondary-800 truncate">{personLabel(s.user)}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 text-xs">
                                    <span className="font-bold text-secondary-700 tabular-nums">
                                        {s.isRunning ? `${formatMinutes(s.elapsedMinutes)} (live)` : formatMinutes(s.durationMinutes || 0)}
                                    </span>
                                    <span className="text-secondary-400">{new Date(s.startedAt).toLocaleDateString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
