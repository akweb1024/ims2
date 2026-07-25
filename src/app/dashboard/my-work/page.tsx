'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Square, Clock, Folder, FolderKanban, ArrowRight } from 'lucide-react';
import { useCurrentSession, useMySessions, useWorkSessionMutations, formatMinutes } from '@/hooks/useWorkSessions';

const projectHref = (s: any) =>
    s.projectId ? `/dashboard/projects/${s.projectId}` : s.itProjectId ? `/dashboard/it-management/projects/${s.itProjectId}` : '#';
const projectName = (s: any) => s.project?.title || s.itProject?.name || 'Unassigned';
const projectKey = (s: any) => (s.projectId ? `p:${s.projectId}` : s.itProjectId ? `it:${s.itProjectId}` : 'none');

export default function MyWorkPage() {
    const { data: current } = useCurrentSession();
    const { data: sessions = [], isLoading } = useMySessions();
    const { stop } = useWorkSessionMutations();
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // Distinct projects I've worked on, with my total logged time each.
    const myProjects = useMemo(() => {
        const map = new Map<string, { key: string; name: string; kind: 'COMPANY' | 'IT'; href: string; minutes: number; runningNow: boolean }>();
        for (const s of sessions as any[]) {
            const key = projectKey(s);
            const cur = map.get(key) || { key, name: projectName(s), kind: s.itProjectId ? 'IT' as const : 'COMPANY' as const, href: projectHref(s), minutes: 0, runningNow: false };
            cur.minutes += s.durationMinutes || (s.isRunning ? 0 : 0);
            if (s.isRunning) cur.runningNow = true;
            map.set(key, cur);
        }
        return [...map.values()].sort((a, b) => Number(b.runningNow) - Number(a.runningNow) || b.minutes - a.minutes);
    }, [sessions]);

    const liveClock = current ? Math.max(0, Math.floor((now - new Date(current.startedAt).getTime()) / 1000)) : 0;
    const clockStr = `${Math.floor(liveClock / 3600)}:${String(Math.floor((liveClock % 3600) / 60)).padStart(2, '0')}:${String(liveClock % 60).padStart(2, '0')}`;

    const handleStop = async () => {
        if (!current) return;
        try {
            await stop.mutateAsync({ id: current.id });
            toast.success('Work session stopped');
        } catch (e: any) {
            toast.error(e?.message || 'Could not stop session');
        }
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse">Loading your work…</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-secondary-900 tracking-tight">My Work</h1>
                <p className="text-secondary-500 font-medium mt-1">Your current session and the projects you&apos;re active on.</p>
            </div>

            {/* Running session */}
            {current ? (
                <div className="card-premium p-6 border-2 border-success-200 bg-success-50/40">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-success-700 mb-1">Currently working on</p>
                            <Link href={projectHref(current)} className="text-xl font-black text-secondary-900 hover:text-primary-600">{projectName(current)}</Link>
                            <p className="text-3xl font-black tabular-nums text-secondary-900 mt-1">{clockStr}</p>
                        </div>
                        <button onClick={handleStop} disabled={stop.isPending} className="btn flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-60">
                            <Square size={16} /> Stop
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card-premium p-6 text-secondary-500">
                    You have no running session. Open a project and hit <span className="font-bold text-secondary-700">Start Work</span> to begin.
                </div>
            )}

            {/* My projects */}
            <div>
                <h2 className="text-lg font-black text-secondary-900 mb-4">My Active Projects</h2>
                {myProjects.length === 0 ? (
                    <div className="card-premium p-10 text-center text-secondary-400 italic">You haven&apos;t logged any project work yet.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myProjects.map((p) => (
                            <Link key={p.key} href={p.href} className="card-premium p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all group">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2.5 rounded-xl ${p.kind === 'IT' ? 'bg-indigo-50 text-indigo-600' : 'bg-primary-50 text-primary-600'}`}>
                                        {p.kind === 'IT' ? <FolderKanban size={20} /> : <Folder size={20} />}
                                    </div>
                                    {p.runningNow && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-success-700">
                                            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" /> live
                                        </span>
                                    )}
                                </div>
                                <p className="font-black text-secondary-900 truncate group-hover:text-primary-600">{p.name}</p>
                                <p className="text-xs text-secondary-500 mt-1 flex items-center gap-1.5"><Clock size={12} /> {formatMinutes(p.minutes)} logged</p>
                                <div className="mt-3 flex items-center gap-1 text-primary-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
                                    Open <ArrowRight size={14} />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
