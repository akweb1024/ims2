'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, Pencil, Lock, TrendingUp, Award, IndianRupee, CheckSquare, CalendarPlus, Clock } from 'lucide-react';

interface MonthlyAchievementSummaryProps {
    workReports: any[];
}

// Canonical IST date string (YYYY-MM-DD) — matches the submit-report page so the
// ?date= edit deep-link resolves to the same day the report is stored under.
const getISTDateString = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);

export default function MonthlyAchievementSummary({ workReports }: MonthlyAchievementSummaryProps) {
    const router = useRouter();
    const todayStr = getISTDateString(new Date());
    // 0 = current month, -1 = previous, etc. Data for the whole year is already
    // loaded by the parent, so month navigation is a pure client-side filter.
    const [monthOffset, setMonthOffset] = useState(0);

    const { label, rows, totals, isCurrentMonth } = useMemo(() => {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
        const year = target.getFullYear();
        const month = target.getMonth();

        const rows = (workReports || [])
            .filter((r) => {
                const d = new Date(r.date);
                return d.getFullYear() === year && d.getMonth() === month;
            })
            .map((r) => {
                const dateStr = getISTDateString(new Date(r.date));
                const enteredStr = r.createdAt ? getISTDateString(new Date(r.createdAt)) : null;
                return {
                    id: r.id,
                    dateStr,
                    rawDate: r.date,
                    createdAt: r.createdAt,
                    enteredStr,
                    // A report whose entry date differs from the day it covers was filed late.
                    isLateEntry: !!enteredStr && enteredStr !== dateStr,
                    title: r.title as string,
                    points: r.pointsEarned || 0,
                    revenue: r.revenueGenerated || 0,
                    tasks: r.tasksCompleted || 0,
                    status: (r.status || 'SUBMITTED') as string,
                };
            })
            .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

        const totals = rows.reduce(
            (acc, r) => ({
                points: acc.points + r.points,
                revenue: acc.revenue + r.revenue,
                tasks: acc.tasks + r.tasks,
                days: acc.days + 1,
            }),
            { points: 0, revenue: 0, tasks: 0, days: 0 },
        );

        const label = target.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        return { label, rows, totals, isCurrentMonth: monthOffset === 0 };
    }, [workReports, monthOffset]);

    const statusBadge = (status: string) => {
        const s = status.toUpperCase();
        if (s === 'APPROVED') return 'bg-success-50 text-success-700';
        if (s === 'SUBMITTED') return 'bg-blue-50 text-blue-700';
        if (s === 'FLAGGED' || s === 'REJECTED') return 'bg-danger-50 text-danger-700';
        return 'bg-secondary-100 text-secondary-600';
    };

    return (
        <div className="card-premium p-6 border-t-4 border-indigo-500">
            {/* Header + month nav */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Calendar className="text-indigo-600" size={22} />
                    <h3 className="font-bold text-lg text-secondary-900">Monthly Achievement</h3>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* File a report for a missed past day */}
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-primary-600 bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-primary-100 transition-colors">
                        <CalendarPlus size={14} />
                        Add missed day
                        <input
                            type="date"
                            max={todayStr}
                            title="Pick a past date to file its report"
                            className="sr-only"
                            onChange={(e) => {
                                if (e.target.value) router.push(`/dashboard/staff-portal/submit-report?date=${e.target.value}`);
                            }}
                        />
                    </label>
                    <button
                        onClick={() => setMonthOffset((o) => o - 1)}
                        className="p-1.5 rounded-lg border border-secondary-200 text-secondary-500 hover:bg-secondary-50 transition-colors"
                        title="Previous month"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-black text-secondary-800 min-w-[130px] text-center">{label}</span>
                    <button
                        onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
                        disabled={isCurrentMonth}
                        className="p-1.5 rounded-lg border border-secondary-200 text-secondary-500 hover:bg-secondary-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Next month"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Month totals */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-indigo-50 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Days Reported</p>
                    <p className="text-xl font-black text-indigo-700 mt-0.5">{totals.days}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center justify-center gap-1"><Award size={11} /> Points</p>
                    <p className="text-xl font-black text-amber-700 mt-0.5">{totals.points}</p>
                </div>
                <div className="bg-success-50 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-success-500 uppercase tracking-wider flex items-center justify-center gap-1"><IndianRupee size={11} /> Revenue</p>
                    <p className="text-xl font-black text-success-700 mt-0.5">₹{totals.revenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center justify-center gap-1"><CheckSquare size={11} /> Tasks</p>
                    <p className="text-xl font-black text-emerald-700 mt-0.5">{totals.tasks}</p>
                </div>
            </div>

            {/* Date-wise table */}
            {rows.length === 0 ? (
                <div className="py-10 text-center text-secondary-400">
                    <TrendingUp size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-bold">No reports submitted in {label}.</p>
                </div>
            ) : (
                <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm min-w-[680px]">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-secondary-400 border-b border-secondary-100">
                                <th className="text-left font-bold py-2 px-2">Date</th>
                                <th className="text-left font-bold py-2 px-2">Entered On</th>
                                <th className="text-right font-bold py-2 px-2">Points</th>
                                <th className="text-right font-bold py-2 px-2">Revenue</th>
                                <th className="text-right font-bold py-2 px-2">Tasks</th>
                                <th className="text-center font-bold py-2 px-2">Status</th>
                                <th className="text-right font-bold py-2 px-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => {
                                const editable = r.status.toUpperCase() === 'SUBMITTED';
                                return (
                                    <tr key={r.id} className="border-b border-secondary-50 hover:bg-secondary-50/40 transition-colors">
                                        <td className="py-2.5 px-2">
                                            <span className="font-bold text-secondary-800">
                                                {new Date(r.rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' })}
                                            </span>
                                            <span className="block text-[10px] text-secondary-400 truncate max-w-[160px]">{r.title}</span>
                                        </td>
                                        <td className="py-2.5 px-2">
                                            {r.createdAt ? (
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${r.isLateEntry ? 'text-amber-600' : 'text-secondary-500'}`}>
                                                    <Clock size={11} />
                                                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    {r.isLateEntry && <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Late</span>}
                                                </span>
                                            ) : (
                                                <span className="text-secondary-300">—</span>
                                            )}
                                        </td>
                                        <td className="text-right font-black text-amber-700 px-2">{r.points}</td>
                                        <td className="text-right font-bold text-success-700 px-2">{r.revenue > 0 ? `₹${r.revenue.toLocaleString('en-IN')}` : '—'}</td>
                                        <td className="text-right font-bold text-emerald-700 px-2">{r.tasks || '—'}</td>
                                        <td className="text-center px-2">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${statusBadge(r.status)}`}>{r.status}</span>
                                        </td>
                                        <td className="text-right px-2">
                                            {editable ? (
                                                <Link
                                                    href={`/dashboard/staff-portal/submit-report?date=${r.dateStr}`}
                                                    className="inline-flex items-center gap-1 text-[10px] font-black text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100 transition-all"
                                                    title="Edit this day's report (allowed until reviewed)"
                                                >
                                                    <Pencil size={11} /> Edit
                                                </Link>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary-400" title="Locked — already reviewed">
                                                    <Lock size={11} /> Locked
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="text-[10px] text-secondary-400 mt-4 italic">
                💡 You can edit any day&apos;s report until a manager reviews it. Reviewed days are locked.
            </p>
        </div>
    );
}
