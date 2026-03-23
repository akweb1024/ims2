'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ConferenceModuleNav from '@/components/dashboard/conferences/ConferenceModuleNav';
import { Calendar, MessageSquare, AlertCircle, ArrowRight, Plus } from 'lucide-react';

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
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Conference Hub</h1>
                        <p className="text-secondary-500 mt-1">
                            A cleaner workspace for conference operations, follow-ups, and execution.
                        </p>
                    </div>
                    {canCreate && (
                        <Link href="/dashboard/conferences/all" className="btn btn-primary flex items-center gap-2">
                            <Plus size={16} /> New Conference
                        </Link>
                    )}
                </div>

                <ConferenceModuleNav />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card-premium p-5">
                        <p className="text-sm text-secondary-500">Total Conferences</p>
                        <p className="text-3xl font-black text-secondary-900 mt-2">{stats.totalConferences}</p>
                    </div>
                    <div className="card-premium p-5">
                        <p className="text-sm text-secondary-500">Follow-ups Active</p>
                        <p className="text-3xl font-black text-secondary-900 mt-2">{stats.pendingFollowUps}</p>
                    </div>
                    <div className="card-premium p-5 border border-red-200 bg-red-50/60">
                        <p className="text-sm text-red-700">Overdue Follow-ups</p>
                        <p className="text-3xl font-black text-red-900 mt-2">{stats.overdueFollowUps}</p>
                    </div>
                    <div className="card-premium p-5 border border-blue-200 bg-blue-50/60">
                        <p className="text-sm text-blue-700">Due Today</p>
                        <p className="text-3xl font-black text-blue-900 mt-2">{stats.activeToday}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Link
                        href="/dashboard/conferences/all"
                        className="card-premium p-6 hover:shadow-xl transition-all border border-secondary-200 hover:border-primary-200"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-secondary-900">
                                    <Calendar size={18} className="text-primary-600" />
                                    <h2 className="text-xl font-black">All Conferences</h2>
                                </div>
                                <p className="text-secondary-500 mt-2">
                                    See every conference in one place with filters, status, and operational summary.
                                </p>
                            </div>
                            <ArrowRight size={18} className="text-secondary-400" />
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/conferences/followups"
                        className="card-premium p-6 hover:shadow-xl transition-all border border-secondary-200 hover:border-primary-200"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-secondary-900">
                                    <MessageSquare size={18} className="text-primary-600" />
                                    <h2 className="text-xl font-black">Follow-up Matrix</h2>
                                </div>
                                <p className="text-secondary-500 mt-2">
                                    Focus only on overdue, today, and upcoming conference-related follow-ups without list clutter.
                                </p>
                            </div>
                            <ArrowRight size={18} className="text-secondary-400" />
                        </div>
                    </Link>
                </div>

                <div className="card-premium p-6">
                    <div className="flex items-center gap-2 text-secondary-900">
                        <AlertCircle size={18} className="text-primary-600" />
                        <h2 className="text-lg font-black">How To Use This Module</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm text-secondary-600">
                        <div className="rounded-2xl bg-secondary-50 p-4">
                            <div className="font-bold text-secondary-900">1. Use `All Conferences`</div>
                            <div className="mt-1">For browsing, creating, and opening conferences.</div>
                        </div>
                        <div className="rounded-2xl bg-secondary-50 p-4">
                            <div className="font-bold text-secondary-900">2. Use `Follow-up Matrix`</div>
                            <div className="mt-1">For daily follow-up execution and queue management.</div>
                        </div>
                        <div className="rounded-2xl bg-secondary-50 p-4">
                            <div className="font-bold text-secondary-900">3. Use conference detail pages</div>
                            <div className="mt-1">For conference-level follow-up and registration-level follow-up actions.</div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
