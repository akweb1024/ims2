'use client';

import { useState, useMemo } from 'react';
import {
    Calendar, List, ChevronLeft, ChevronRight, Clock, Wifi,
    Building2, AlertTriangle, CheckCircle2, XCircle, MinusCircle, TrendingUp
} from 'lucide-react';

interface AttendanceRecord {
    id: string;
    date: string;
    checkIn?: string | null;
    checkOut?: string | null;
    status: string;
    workFrom?: string;
    lateMinutes?: number;
    shortMinutes?: number;
    otMinutes?: number;
    isLate?: boolean;
    isShort?: boolean;
    remarks?: string;
}

interface Props { attendance: AttendanceRecord[]; }

type StatusKey = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'WFH';

const STATUS_CONFIG: Record<StatusKey, {
    label: string;
    bgCell: string; textCell: string; borderCell: string;
    bgBadge: string; textBadge: string;
    dot: string;
    icon: React.ReactNode;
}> = {
    PRESENT:  {
        label: 'Present',
        bgCell: 'bg-emerald-50', textCell: 'text-emerald-700', borderCell: 'border-emerald-200',
        bgBadge: 'bg-emerald-100', textBadge: 'text-emerald-700',
        dot: 'bg-emerald-500',
        icon: <CheckCircle2 size={11} strokeWidth={2.5} />
    },
    ABSENT: {
        label: 'Absent',
        bgCell: 'bg-red-50', textCell: 'text-red-600', borderCell: 'border-red-200',
        bgBadge: 'bg-red-100', textBadge: 'text-red-700',
        dot: 'bg-red-500',
        icon: <XCircle size={11} strokeWidth={2.5} />
    },
    LATE: {
        label: 'Late',
        bgCell: 'bg-amber-50', textCell: 'text-amber-700', borderCell: 'border-amber-200',
        bgBadge: 'bg-amber-100', textBadge: 'text-amber-700',
        dot: 'bg-amber-500',
        icon: <AlertTriangle size={11} strokeWidth={2.5} />
    },
    HALF_DAY: {
        label: 'Half Day',
        bgCell: 'bg-purple-50', textCell: 'text-purple-700', borderCell: 'border-purple-200',
        bgBadge: 'bg-purple-100', textBadge: 'text-purple-700',
        dot: 'bg-purple-500',
        icon: <MinusCircle size={11} strokeWidth={2.5} />
    },
    LEAVE: {
        label: 'Leave',
        bgCell: 'bg-blue-50', textCell: 'text-blue-700', borderCell: 'border-blue-200',
        bgBadge: 'bg-blue-100', textBadge: 'text-blue-700',
        dot: 'bg-blue-500',
        icon: <MinusCircle size={11} strokeWidth={2.5} />
    },
    WFH: {
        label: 'WFH',
        bgCell: 'bg-indigo-50', textCell: 'text-indigo-700', borderCell: 'border-indigo-200',
        bgBadge: 'bg-indigo-100', textBadge: 'text-indigo-700',
        dot: 'bg-indigo-500',
        icon: <Wifi size={11} strokeWidth={2.5} />
    },
};

function getStatusKey(rec: AttendanceRecord): StatusKey {
    if (rec.status === 'ABSENT') return 'ABSENT';
    if (rec.status === 'LEAVE') return 'LEAVE';
    if (rec.status === 'HALF_DAY') return 'HALF_DAY';
    if (rec.workFrom === 'HOME') return 'WFH';
    if (rec.isLate && rec.lateMinutes && rec.lateMinutes > 0) return 'LATE';
    return 'PRESENT';
}

function fmt(dt?: string | null) {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function hoursWorked(rec: AttendanceRecord): string {
    if (!rec.checkIn || !rec.checkOut) return '—';
    const ms = new Date(rec.checkOut).getTime() - new Date(rec.checkIn).getTime();
    if (ms <= 0) return '—';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const STATS = [
    { key: 'present' as const, label: 'Present',  gradient: 'from-emerald-500 to-emerald-600' },
    { key: 'late'    as const, label: 'Late',     gradient: 'from-amber-400 to-amber-500' },
    { key: 'absent'  as const, label: 'Absent',   gradient: 'from-red-500 to-red-600' },
    { key: 'wfh'     as const, label: 'WFH',      gradient: 'from-indigo-500 to-indigo-600' },
    { key: 'leave'   as const, label: 'Leave',    gradient: 'from-blue-500 to-blue-600' },
    { key: 'halfDay' as const, label: 'Half Day', gradient: 'from-purple-500 to-purple-600' },
];

export default function AttendanceCalendarView({ attendance }: Props) {
    const [view, setView] = useState<'calendar' | 'list'>('calendar');
    const today = new Date();
    const [calMonth, setCalMonth] = useState(today.getMonth());
    const [calYear, setCalYear] = useState(today.getFullYear());

    const byDate = useMemo(() => {
        const map: Record<string, AttendanceRecord> = {};
        attendance.forEach(r => {
            const key = new Date(r.date).toISOString().split('T')[0];
            map[key] = r;
        });
        return map;
    }, [attendance]);

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const calCells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ];

    const monthStats = useMemo(() => {
        const stats = { present: 0, absent: 0, late: 0, wfh: 0, leave: 0, halfDay: 0 };
        for (let d = 1; d <= daysInMonth; d++) {
            const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const rec = byDate[key];
            if (!rec) continue;
            const st = getStatusKey(rec);
            if (st === 'PRESENT') stats.present++;
            else if (st === 'ABSENT') stats.absent++;
            else if (st === 'LATE') stats.late++;
            else if (st === 'WFH') stats.wfh++;
            else if (st === 'LEAVE') stats.leave++;
            else if (st === 'HALF_DAY') stats.halfDay++;
        }
        return stats;
    }, [byDate, calMonth, calYear, daysInMonth]);

    const sortedList = useMemo(() =>
        [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [attendance]
    );

    const prevMonth = () => {
        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
        else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
        else setCalMonth(m => m + 1);
    };

    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

    return (
        <div className="space-y-5">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="text-blue-600" size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">Attendance Tracker</h3>
                        <p className="text-xs text-gray-500">{attendance.length} records loaded</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setView('calendar')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            view === 'calendar'
                                ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Calendar size={13} /> Calendar
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            view === 'list'
                                ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <List size={13} /> List
                    </button>
                </div>
            </div>

            {/* ── STATS BAR ── */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {STATS.map(s => (
                    <div key={s.key} className={`bg-gradient-to-br ${s.gradient} rounded-xl p-3 text-white text-center shadow-sm`}>
                        <p className="text-xl font-black leading-none">{monthStats[s.key]}</p>
                        <p className="text-[10px] font-semibold mt-0.5 opacity-90 uppercase tracking-wide">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ─────── CALENDAR VIEW ─────── */}
            {view === 'calendar' && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                    {/* Month navigation */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <h4 className="font-bold text-gray-900 text-sm tracking-wide">
                            {MONTHS[calMonth]} {calYear}
                        </h4>
                        <button
                            onClick={nextMonth}
                            disabled={isCurrentMonth}
                            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="p-4">
                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {WEEKDAYS.map(d => (
                                <div
                                    key={d}
                                    className={`text-center text-[10px] font-bold uppercase tracking-wider py-2 ${
                                        d === 'Sun' || d === 'Sat' ? 'text-red-400' : 'text-gray-400'
                                    }`}
                                >
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-1.5">
                            {calCells.map((day, i) => {
                                if (!day) return <div key={`e-${i}`} />;

                                const mm = String(calMonth + 1).padStart(2, '0');
                                const dd = String(day).padStart(2, '0');
                                const key = `${calYear}-${mm}-${dd}`;
                                const rec = byDate[key];
                                const dateObj = new Date(calYear, calMonth, day);
                                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                                const isToday = key === todayKey;
                                const statusKey = rec ? getStatusKey(rec) : null;
                                const cfg = statusKey ? STATUS_CONFIG[statusKey] : null;

                                let tooltip = 'No record';
                                if (rec && cfg) {
                                    tooltip = `${cfg.label}`;
                                    if (rec.checkIn) tooltip += ` • In: ${fmt(rec.checkIn)}`;
                                    if (rec.checkOut) tooltip += ` • Out: ${fmt(rec.checkOut)}`;
                                    if (rec.lateMinutes && rec.lateMinutes > 0) tooltip += ` • Late ${rec.lateMinutes}m`;
                                } else if (isWeekend) {
                                    tooltip = 'Weekend';
                                }

                                return (
                                    <div
                                        key={key}
                                        title={tooltip}
                                        className={[
                                            'relative flex flex-col items-center justify-center rounded-xl transition-all cursor-default select-none',
                                            'aspect-square border',
                                            isToday ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : '',
                                            cfg
                                                ? `${cfg.bgCell} ${cfg.borderCell}`
                                                : isWeekend
                                                    ? 'bg-gray-50 border-gray-100'
                                                    : 'bg-white border-gray-100 hover:bg-gray-50',
                                        ].join(' ')}
                                    >
                                        {/* Day number */}
                                        <span className={`text-xs font-bold leading-none ${
                                            isToday
                                                ? 'text-blue-600'
                                                : cfg
                                                    ? cfg.textCell
                                                    : isWeekend
                                                        ? 'text-gray-300'
                                                        : 'text-gray-600'
                                        }`}>
                                            {day}
                                        </span>

                                        {/* Status icon */}
                                        {cfg && (
                                            <span className={`mt-0.5 ${cfg.textCell} opacity-70`}>
                                                {cfg.icon}
                                            </span>
                                        )}

                                        {/* Late dot */}
                                        {rec?.isLate && rec?.lateMinutes && rec.lateMinutes > 0 && statusKey !== 'ABSENT' && (
                                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 border border-white" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
                        {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${v.dot} shrink-0`} />
                                <span className="text-[11px] font-medium text-gray-500">{v.label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-[11px] font-medium text-gray-500">Late marker</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────── LIST VIEW ─────── */}
            {view === 'list' && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    {['Date', 'Status', 'Check In', 'Check Out', 'Hours', 'Work From', 'Flags', 'Remarks'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sortedList.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center">
                                            <Calendar className="mx-auto text-gray-300 mb-2" size={28} />
                                            <p className="text-sm font-medium text-gray-400">No attendance records found</p>
                                        </td>
                                    </tr>
                                ) : sortedList.map(rec => {
                                    const statusKey = getStatusKey(rec);
                                    const cfg = STATUS_CONFIG[statusKey];
                                    const dateObj = new Date(rec.date);
                                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                                    const hw = hoursWorked(rec);

                                    return (
                                        <tr
                                            key={rec.id}
                                            className={`hover:bg-blue-50/40 transition-colors ${isWeekend ? 'opacity-60' : ''}`}
                                        >
                                            {/* Date */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <p className="font-semibold text-gray-800 text-sm">
                                                    {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                                <p className="text-[10px] font-medium text-gray-400 uppercase mt-0.5">
                                                    {dateObj.toLocaleDateString('en-IN', { weekday: 'long' })}
                                                </p>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.bgBadge} ${cfg.textBadge}`}>
                                                    {cfg.icon}
                                                    {cfg.label}
                                                </span>
                                            </td>

                                            {/* Check In */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`font-semibold text-sm ${rec.isLate ? 'text-amber-600' : 'text-gray-700'}`}>
                                                    {fmt(rec.checkIn)}
                                                </span>
                                                {rec.isLate && rec.lateMinutes && rec.lateMinutes > 0 && (
                                                    <p className="text-[10px] text-amber-500 font-medium">+{rec.lateMinutes}m late</p>
                                                )}
                                            </td>

                                            {/* Check Out */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`font-semibold text-sm ${rec.isShort ? 'text-red-500' : 'text-gray-700'}`}>
                                                    {fmt(rec.checkOut)}
                                                </span>
                                                {rec.isShort && rec.shortMinutes && rec.shortMinutes > 0 && (
                                                    <p className="text-[10px] text-red-400 font-medium">-{rec.shortMinutes}m short</p>
                                                )}
                                            </td>

                                            {/* Hours */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Clock size={12} className="text-gray-400 shrink-0" />
                                                    <span className="font-semibold text-gray-700 text-sm">{hw}</span>
                                                </div>
                                                {rec.otMinutes && rec.otMinutes > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <TrendingUp size={10} className="text-emerald-500" />
                                                        <span className="text-[10px] text-emerald-600 font-semibold">+{rec.otMinutes}m OT</span>
                                                    </div>
                                                ) : null}
                                            </td>

                                            {/* Work From */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                                                    {rec.workFrom === 'HOME'
                                                        ? <Wifi size={12} className="text-indigo-500" />
                                                        : <Building2 size={12} className="text-gray-400" />
                                                    }
                                                    {rec.workFrom || 'OFFICE'}
                                                </span>
                                            </td>

                                            {/* Flags */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {rec.isLate && rec.lateMinutes && rec.lateMinutes > 0 && (
                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md">
                                                            Late
                                                        </span>
                                                    )}
                                                    {rec.isShort && rec.shortMinutes && rec.shortMinutes > 0 && (
                                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-md">
                                                            Short
                                                        </span>
                                                    )}
                                                    {rec.otMinutes && rec.otMinutes > 0 && (
                                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md">
                                                            OT
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Remarks */}
                                            <td className="px-4 py-3 max-w-[130px]">
                                                <span className="text-xs text-gray-500 truncate block" title={rec.remarks || ''}>
                                                    {rec.remarks || <span className="text-gray-300">—</span>}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
