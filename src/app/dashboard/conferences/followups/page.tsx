'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ConferenceModuleNav from '@/components/dashboard/conferences/ConferenceModuleNav';
import { AlertCircle, Calendar, ChevronRight, MessageSquare } from 'lucide-react';
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
            danger: 'bg-red-50 border-red-200 text-red-900',
            primary: 'bg-blue-50 border-blue-200 text-blue-900',
            success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        };

        return (
            <div className={`rounded-3xl border p-5 ${toneClasses[tone]}`}>
                <div className="mb-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em]">{title}</div>
                    <div className="text-3xl font-black mt-2">{items.length}</div>
                </div>

                <div className="space-y-3">
                    {items.length === 0 ? (
                        <div className="rounded-2xl bg-white/80 border border-white p-4 text-xs text-secondary-500">
                            No items in this queue.
                        </div>
                    ) : (
                        items.map((item) => (
                            <Link
                                key={item.id}
                                href={item.type === 'CONFERENCE'
                                    ? `/dashboard/conferences/${item.conferenceId}`
                                    : `/dashboard/conferences/${item.conferenceId}/registrations`}
                                className="block rounded-2xl bg-white/85 border border-white p-4 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">
                                            {item.type === 'CONFERENCE' ? 'Conference Follow-up' : 'Registrant Follow-up'}
                                        </div>
                                        <div className="font-bold text-secondary-900 truncate">{item.subject}</div>
                                        <div className="text-xs text-secondary-600 mt-1 truncate">{item.conferenceTitle}</div>
                                        {item.attendeeName && (
                                            <div className="text-xs text-secondary-500 mt-1">
                                                Lead: {item.attendeeName}
                                            </div>
                                        )}
                                        <div className="text-xs text-secondary-500 mt-2">
                                            Due: {new Date(item.nextFollowUpDate).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        {item.customerHealth && (
                                            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${getHealthBadgeColor(item.customerHealth)}`}>
                                                {item.customerHealth}
                                            </span>
                                        )}
                                        <ChevronRight size={16} className="text-secondary-400" />
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900">Conference Follow-up Matrix</h1>
                    <p className="text-secondary-500 mt-1">
                        A focused queue for conference-level and registration-level follow-up work.
                    </p>
                </div>

                <ConferenceModuleNav />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card-premium p-5">
                        <p className="text-sm text-secondary-500">Total Items</p>
                        <p className="text-3xl font-black text-secondary-900 mt-2">{matrix?.meta?.total || 0}</p>
                    </div>
                    <div className="card-premium p-5 border border-red-200 bg-red-50/60">
                        <p className="text-sm text-red-700">Overdue</p>
                        <p className="text-3xl font-black text-red-900 mt-2">{matrix?.missed.length || 0}</p>
                    </div>
                    <div className="card-premium p-5 border border-blue-200 bg-blue-50/60">
                        <p className="text-sm text-blue-700">Due Today</p>
                        <p className="text-3xl font-black text-blue-900 mt-2">{matrix?.today.length || 0}</p>
                    </div>
                    <div className="card-premium p-5 border border-emerald-200 bg-emerald-50/60">
                        <p className="text-sm text-emerald-700">Upcoming</p>
                        <p className="text-3xl font-black text-emerald-900 mt-2">{matrix?.upcoming.length || 0}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="card-premium p-12 text-center text-secondary-500">Loading follow-up matrix...</div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <MatrixColumn title="Overdue Horizon" items={matrix?.missed || []} tone="danger" />
                        <MatrixColumn title="Today Queue" items={matrix?.today || []} tone="primary" />
                        <MatrixColumn title="Upcoming Flow" items={matrix?.upcoming || []} tone="success" />
                    </div>
                )}

                <div className="card-premium p-6">
                    <div className="flex items-center gap-2 text-secondary-900">
                        <AlertCircle size={18} className="text-primary-600" />
                        <h2 className="text-lg font-black">Navigation Logic</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm text-secondary-600">
                        <div className="rounded-2xl bg-secondary-50 p-4">
                            <div className="font-bold text-secondary-900">Conference item</div>
                            <div className="mt-1">Opens the conference detail page for conference-level actions.</div>
                        </div>
                        <div className="rounded-2xl bg-secondary-50 p-4">
                            <div className="font-bold text-secondary-900">Registrant item</div>
                            <div className="mt-1">Opens registrations for that conference so you can continue lead follow-up.</div>
                        </div>
                        <div className="rounded-2xl bg-secondary-50 p-4">
                            <div className="font-bold text-secondary-900">Clear separation</div>
                            <div className="mt-1">This page is only for action queues, not for browsing all conference cards.</div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
