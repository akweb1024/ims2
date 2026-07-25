'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, Users, Clock, Folder, FolderKanban } from 'lucide-react';
import { useLiveSessions, useTimeAnalytics, formatMinutes } from '@/hooks/useWorkSessions';

const personLabel = (u?: { name?: string | null; email?: string | null } | null) =>
    u?.name || u?.email || 'Someone';

const elapsed = (startedAt: string, now: number) => Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 60000));

/**
 * Live "who is working on what right now" board for managers / admins / super-admins.
 * Scope comes from the API (downline for managers, company for other overseers, all for
 * group-wide admins). Refreshes on its own every 30s.
 */
export default function WorkActivityPage() {
    const { data, isLoading, isError } = useLiveSessions();
    const { data: analytics } = useTimeAnalytics(7);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(t);
    }, []);

    if (isLoading) return <div className="p-10 text-center animate-pulse">Loading live activity…</div>;
    if (isError) return <div className="p-10 text-center text-rose-500">You don&apos;t have access to the live activity board.</div>;

    const sessions: any[] = data?.sessions ?? [];
    const byProject: any[] = data?.byProject ?? [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500" />
                    </span>
                    Live Work Activity
                </h1>
                <p className="text-secondary-500 font-medium mt-1">Who is working on which project right now — {data?.totalActive ?? 0} active session{(data?.totalActive ?? 0) === 1 ? '' : 's'}.</p>
            </div>

            {sessions.length === 0 ? (
                <div className="card-premium p-12 text-center text-secondary-400">
                    <Radio size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-bold text-secondary-600">Nobody is clocked in right now.</p>
                </div>
            ) : (
                <>
                    {/* Per-project rollup */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {byProject.map((p) => (
                            <div key={p.key} className="card-premium p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2.5 rounded-xl ${p.kind === 'IT' ? 'bg-indigo-50 text-indigo-600' : 'bg-primary-50 text-primary-600'}`}>
                                        {p.kind === 'IT' ? <FolderKanban size={20} /> : <Folder size={20} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-secondary-900 truncate">{p.name}</p>
                                        <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider">{p.kind === 'IT' ? 'IT Project' : 'Company Project'}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-black text-secondary-900 flex items-center gap-1 justify-end"><Users size={16} className="text-secondary-400" />{p.activeUsers}</p>
                                    <p className="text-[10px] font-bold text-secondary-400 uppercase">active</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Active sessions */}
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-black text-secondary-900 mb-4">Active Sessions</h3>
                        <div className="divide-y divide-secondary-100">
                            {sessions.map((s) => {
                                const projectHref = s.projectId
                                    ? `/dashboard/projects/${s.projectId}`
                                    : s.itProjectId
                                        ? `/dashboard/it-management/projects/${s.itProjectId}`
                                        : null;
                                const projectName = s.project?.title || s.itProject?.name || 'Unassigned';
                                return (
                                    <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                {(personLabel(s.user)[0] || 'U').toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-secondary-900 truncate">{personLabel(s.user)}</p>
                                                {projectHref ? (
                                                    <Link href={projectHref} className="text-xs text-primary-600 font-semibold hover:underline truncate block">{projectName}</Link>
                                                ) : (
                                                    <span className="text-xs text-secondary-400">{projectName}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            {s.activities?.length > 0 && (
                                                <span className="hidden sm:block text-xs text-secondary-500 max-w-[220px] truncate italic">“{s.activities[0].description}”</span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5 text-sm font-black text-success-700 tabular-nums">
                                                <Clock size={14} /> {formatMinutes(elapsed(s.startedAt, now))}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Historical time — last 7 days */}
            {analytics && analytics.byProject?.length > 0 && (
                <div className="card-premium p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-secondary-900">Logged — last 7 days</h3>
                        <span className="text-xs font-bold text-secondary-500">Total {formatMinutes(analytics.totalMinutes)} · {analytics.sessionCount} sessions</span>
                    </div>
                    <div className="space-y-2">
                        {analytics.byProject.slice(0, 12).map((p: any) => {
                            const pct = analytics.totalMinutes ? Math.round((p.minutes / analytics.totalMinutes) * 100) : 0;
                            return (
                                <div key={p.key} className="flex items-center gap-3">
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 ${p.kind === 'IT' ? 'bg-indigo-50 text-indigo-600' : 'bg-primary-50 text-primary-600'}`}>{p.kind === 'IT' ? 'IT' : 'CO'}</span>
                                    <span className="font-semibold text-secondary-800 text-sm truncate w-48 shrink-0">{p.name}</span>
                                    <div className="flex-1 h-2 rounded-full bg-secondary-100 overflow-hidden">
                                        <div className="h-full bg-primary-400 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-secondary-700 tabular-nums w-16 text-right shrink-0">{formatMinutes(p.minutes)}</span>
                                    <span className="text-[11px] text-secondary-400 w-14 text-right shrink-0">{p.users} {p.users === 1 ? 'person' : 'people'}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
