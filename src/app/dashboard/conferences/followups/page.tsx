'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ConferenceShell from '@/components/dashboard/conferences/ConferenceShell';
import { AlertCircle, Calendar, ChevronRight, AlarmClock, Sparkles, Activity } from 'lucide-react';
import { getHealthBadgeColor } from '@/lib/predictions';

export default function ConferenceFollowupsPage() {
    const [userRole, setUserRole] = useState('');
    const [loading, setLoading] = useState(true);
    const [matrix, setMatrix] = useState<{ missed: any[]; today: any[]; upcoming: any[]; meta?: any } | null>(null);

    const fetchMatrix = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/conferences/follow-up-matrix', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setMatrix(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchMatrix();
    }, [fetchMatrix]);

    const MatrixColumn = ({
        title,
        items,
        tone,
    }: {
        title: string;
        items: any[];
        tone: 'danger' | 'primary' | 'success';
    }) => {
        const toneClasses = {
            danger: 'border-red-200 bg-[linear-gradient(180deg,_rgba(254,242,242,0.96),_rgba(255,255,255,0.95))] text-red-900',
            primary: 'border-blue-200 bg-[linear-gradient(180deg,_rgba(239,246,255,0.96),_rgba(255,255,255,0.95))] text-blue-900',
            success: 'border-emerald-200 bg-[linear-gradient(180deg,_rgba(236,253,245,0.96),_rgba(255,255,255,0.95))] text-emerald-900',
        };

        return (
            <section className={`rounded-[1.75rem] border p-5 shadow-[0_16px_50px_rgba(15,23,42,0.05)] ${toneClasses[tone]}`}>
                <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.2em]">{title}</div>
                        <div className="mt-2 text-3xl font-black">{items.length}</div>
                    </div>
                    <div className="text-xs font-semibold opacity-80">
                        {tone === 'danger' ? 'Needs attention first' : tone === 'primary' ? 'Do today' : 'Keep warm'}
                    </div>
                </div>

                <div className="space-y-3">
                    {items.length === 0 ? (
                        <div className="rounded-2xl border border-white bg-white/80 p-4 text-xs text-slate-500">
                            No items in this queue.
                        </div>
                    ) : (
                        items.map((item) => (
                            <Link
                                key={item.id}
                                href={item.type === 'CONFERENCE'
                                    ? `/dashboard/conferences/${item.conferenceId}`
                                    : `/dashboard/conferences/${item.conferenceId}/registrations`}
                                className="block rounded-2xl border border-white bg-white/90 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            {item.type === 'CONFERENCE' ? 'Conference Follow-up' : 'Registrant Follow-up'}
                                        </div>
                                        <div className="truncate font-bold text-slate-900">{item.subject}</div>
                                        <div className="mt-1 truncate text-xs text-slate-600">{item.conferenceTitle}</div>
                                        {item.attendeeName && (
                                            <div className="mt-1 text-xs text-slate-500">
                                                Lead: {item.attendeeName}
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs text-slate-500">
                                            Due: {new Date(item.nextFollowUpDate).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        {item.customerHealth && (
                                            <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${getHealthBadgeColor(item.customerHealth)}`}>
                                                {item.customerHealth}
                                            </span>
                                        )}
                                        <ChevronRight size={16} className="text-slate-400" />
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </section>
        );
    };

    return (
        <ConferenceShell
            userRole={userRole}
            title="Conference Follow-ups"
            subtitle="Work the conference follow-up pipeline from one focused action queue. This separates urgent execution from browsing so the day’s next moves are easier to spot."
            badge="Follow-up matrix"
            stats={
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="flex items-center gap-2 text-slate-500 text-sm"><Activity size={16} /> Total Items</div>
                        <p className="text-3xl font-black text-slate-950 mt-3">{matrix?.meta?.total || 0}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-red-200 bg-red-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-red-700 text-sm"><AlarmClock size={16} /> Overdue</div>
                        <p className="text-3xl font-black text-red-900 mt-3">{matrix?.missed.length || 0}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-blue-700 text-sm"><Calendar size={16} /> Due Today</div>
                        <p className="text-3xl font-black text-blue-900 mt-3">{matrix?.today.length || 0}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-700 text-sm"><Sparkles size={16} /> Upcoming</div>
                        <p className="text-3xl font-black text-emerald-900 mt-3">{matrix?.upcoming.length || 0}</p>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                {loading ? (
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
                        Loading follow-up matrix...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                        <MatrixColumn title="Overdue Horizon" items={matrix?.missed || []} tone="danger" />
                        <MatrixColumn title="Today Queue" items={matrix?.today || []} tone="primary" />
                        <MatrixColumn title="Upcoming Flow" items={matrix?.upcoming || []} tone="success" />
                    </div>
                )}

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-2 text-slate-900">
                        <AlertCircle size={18} className="text-sky-600" />
                        <h2 className="text-lg font-black">How This Queue Works</h2>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-600 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="font-bold text-slate-900">Conference item</div>
                            <div className="mt-1">Opens the conference detail page for conference-level follow-up and planning actions.</div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="font-bold text-slate-900">Registrant item</div>
                            <div className="mt-1">Opens the registrations workspace so you can continue lead follow-up without leaving the conference module.</div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="font-bold text-slate-900">Clear separation</div>
                            <div className="mt-1">This page is action-first by design, while `/all` stays focused on browsing and portfolio management.</div>
                        </div>
                    </div>
                </div>
            </div>
        </ConferenceShell>
    );
}
