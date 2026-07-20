'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, ExternalLink, Shield, X } from 'lucide-react';
import WorkAssignmentManager from '@/components/dashboard/assignments/WorkAssignmentManager';

interface EmployeePanelProps {
    userId: string;
    fallbackName?: string | null;
    onClose: () => void;
}

// Slide-over profile: identity + current-month KRA goals + KPI checkpoints +
// the full assignment manager (assign / reprioritise / status) for this person.
// Uses the same endpoints as the Employee360 page; the full profile is one
// click away for everything else (documents, leaves, salary history…).
export default function EmployeePanel({ userId, fallbackName, onClose }: EmployeePanelProps) {
    const [employee, setEmployee] = useState<any>(null);
    const [goals, setGoals] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setEmployee(null);
            setGoals([]);
            setKpis([]);
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

                const res = await fetch(`/api/hr/employees/${userId}`, { headers });
                if (!res.ok) return;
                const profile = await res.json();
                setEmployee(profile);

                if (profile?.id) {
                    const [gRes, kRes] = await Promise.all([
                        fetch(`/api/kra/my?employeeId=${profile.id}&periodType=MONTHLY`, { headers }),
                        fetch(`/api/hr/performance/kpis?employeeId=${profile.id}`, { headers }),
                    ]);
                    if (gRes.ok) setGoals((await gRes.json()).goals || []);
                    if (kRes.ok) {
                        const d = await kRes.json();
                        setKpis(Array.isArray(d) ? d : d.kpis || []);
                    }
                }
            } catch {
                // Panel degrades to the identity header + assignments.
            } finally {
                setLoading(false);
            }
        })();
    }, [userId]);

    const displayName = employee?.user?.name || employee?.user?.email || fallbackName || 'Employee';

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-secondary-900/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
                <div className="sticky top-0 bg-white border-b border-secondary-100 p-4 flex items-center gap-3 z-10">
                    <div className="relative w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center text-lg font-bold text-primary-600 overflow-hidden shrink-0">
                        {employee?.profilePicture ? (
                            <Image src={employee.profilePicture} alt="" fill className="object-cover" />
                        ) : (
                            String(displayName)[0]?.toUpperCase()
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-secondary-900 truncate">{displayName}</h2>
                        <p className="text-xs text-secondary-500 truncate">
                            {employee?.designation || 'No designation'}
                            {employee?.user?.department?.name && ` • ${employee.user.department.name}`}
                            {employee?.user?.role && ` • ${employee.user.role}`}
                        </p>
                    </div>
                    <Link
                        href={`/dashboard/hr-management/employees/${userId}`}
                        className="btn btn-secondary text-xs flex items-center gap-1.5 shrink-0"
                    >
                        <ExternalLink size={13} /> Full profile
                    </Link>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary-50 shrink-0" title="Close">
                        <X size={18} className="text-secondary-500" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {loading ? (
                        <div className="p-12 text-center text-secondary-400">Loading profile...</div>
                    ) : (
                        <>
                            <section>
                                <h3 className="text-xs font-black text-secondary-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Shield size={14} className="text-primary-500" /> KRA Goals (this month)
                                </h3>
                                {goals.length ? (
                                    <div className="space-y-2">
                                        {goals.slice(0, 8).map((g: any) => (
                                            <div key={g.id} className="p-3 bg-secondary-50/50 rounded-xl border border-secondary-100">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-xs font-bold text-secondary-900 truncate">{g.title}</span>
                                                    <span className="text-xs font-black text-primary-700 shrink-0">{Number(g.achievementPercentage || 0).toFixed(0)}%</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {g.dimension && <span className="text-[9px] font-black uppercase text-secondary-400">{g.dimension}</span>}
                                                    <div className="flex-1 bg-secondary-100 rounded-full h-1.5 overflow-hidden">
                                                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, Number(g.achievementPercentage || 0))}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-secondary-400 italic">No KRA goals for the current month.</p>
                                )}
                            </section>

                            <section>
                                <h3 className="text-xs font-black text-secondary-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Activity size={14} className="text-warning-500" /> KPI Checkpoints
                                </h3>
                                {kpis.length ? (
                                    <div className="space-y-2">
                                        {kpis.slice(0, 6).map((kpi: any) => {
                                            const perc = kpi.target > 0 ? Math.min(100, (kpi.current / kpi.target) * 100) : 0;
                                            return (
                                                <div key={kpi.id} className="p-3 bg-white rounded-xl border border-secondary-100">
                                                    <div className="flex justify-between items-center gap-2">
                                                        <span className="text-xs font-bold text-secondary-900 truncate">{kpi.title}</span>
                                                        <span className="text-[10px] font-bold text-secondary-400 uppercase shrink-0">{kpi.period}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <div className="flex-1 bg-secondary-100 rounded-full h-2 overflow-hidden">
                                                            <div className={`h-full rounded-full ${perc >= 100 ? 'bg-success-500' : 'bg-primary-500'}`} style={{ width: `${perc}%` }} />
                                                        </div>
                                                        <span className="text-xs font-black text-secondary-700 shrink-0">
                                                            {Number(kpi.current).toLocaleString()} / {Number(kpi.target).toLocaleString()} {kpi.unit}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-secondary-400 italic">No KPIs recorded.</p>
                                )}
                            </section>

                            <section>
                                <WorkAssignmentManager userId={userId} view="received" canAssign />
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
