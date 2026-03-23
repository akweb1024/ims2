'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ConferenceShell from '@/components/dashboard/conferences/ConferenceShell';
import { Calendar, MessageSquare, AlertCircle, ArrowRight, Plus, Sparkles, Activity, AlarmClock } from 'lucide-react';

export default function ConferencesHubPage() {
    const [userRole, setUserRole] = useState('');
    const [stats, setStats] = useState({
        totalConferences: 0,
        pendingFollowUps: 0,
        overdueFollowUps: 0,
        activeToday: 0,
    });

    const fetchStats = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const [conferenceRes, matrixRes] = await Promise.all([
                fetch('/api/conferences', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/conferences/follow-up-matrix', { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const conferences = conferenceRes.ok ? await conferenceRes.json() : [];
            const matrix = matrixRes.ok ? await matrixRes.json() : { missed: [], today: [], upcoming: [] };

            setStats({
                totalConferences: conferences.length,
                pendingFollowUps: [...matrix.today, ...matrix.upcoming].length,
                overdueFollowUps: matrix.missed.length,
                activeToday: matrix.today.length,
            });
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchStats();
    }, [fetchStats]);

    const canCreate = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

    return (
        <ConferenceShell
            userRole={userRole}
            title="Conference Hub"
            subtitle="Move through conference work with less clutter: browse the portfolio, jump straight into follow-up queues, and manage conference operations from a calmer, clearer workspace."
            badge="Conference command center"
            actions={canCreate ? (
                <Link href="/dashboard/conferences/all" className="btn btn-primary flex items-center gap-2 shadow-lg shadow-sky-200">
                    <Plus size={16} /> New Conference
                </Link>
            ) : null}
            stats={
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="flex items-center gap-2 text-slate-500 text-sm"><Calendar size={16} /> Total Conferences</div>
                        <p className="text-3xl font-black text-slate-950 mt-3">{stats.totalConferences}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="flex items-center gap-2 text-slate-500 text-sm"><Activity size={16} /> Follow-ups Active</div>
                        <p className="text-3xl font-black text-slate-950 mt-3">{stats.pendingFollowUps}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-red-200 bg-red-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-red-700 text-sm"><AlarmClock size={16} /> Overdue</div>
                        <p className="text-3xl font-black text-red-900 mt-3">{stats.overdueFollowUps}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-blue-700 text-sm"><Sparkles size={16} /> Due Today</div>
                        <p className="text-3xl font-black text-blue-900 mt-3">{stats.activeToday}</p>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Link
                        href="/dashboard/conferences/all"
                        className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_24px_60px_rgba(14,165,233,0.10)]"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-slate-900">
                                    <Calendar size={18} className="text-sky-600" />
                                    <h2 className="text-xl font-black">All Conferences</h2>
                                </div>
                                <p className="text-slate-500 mt-2">
                                    See every conference in one place with filters, status, and operational summary.
                                </p>
                            </div>
                            <ArrowRight size={18} className="text-slate-400 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/conferences/followups"
                        className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_24px_60px_rgba(14,165,233,0.10)]"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-slate-900">
                                    <MessageSquare size={18} className="text-sky-600" />
                                    <h2 className="text-xl font-black">Follow-up Matrix</h2>
                                </div>
                                <p className="text-slate-500 mt-2">
                                    Focus only on overdue, today, and upcoming conference-related follow-ups without list clutter.
                                </p>
                            </div>
                            <ArrowRight size={18} className="text-slate-400 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-2 text-slate-900">
                        <AlertCircle size={18} className="text-sky-600" />
                        <h2 className="text-lg font-black">How To Use This Module</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm text-slate-600">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="font-bold text-slate-900">1. Use `All Conferences`</div>
                            <div className="mt-1">For browsing, creating, and opening conferences.</div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="font-bold text-slate-900">2. Use `Follow-up Matrix`</div>
                            <div className="mt-1">For daily follow-up execution and queue management.</div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="font-bold text-slate-900">3. Use conference detail pages</div>
                            <div className="mt-1">For conference-level follow-up and registration-level follow-up actions.</div>
                        </div>
                    </div>
                </div>
            </div>
        </ConferenceShell>
    );
}
