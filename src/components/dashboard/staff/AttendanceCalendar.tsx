'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import { formatToISTDate, formatToISTTime } from '@/lib/date-utils';

interface AttendanceCalendarProps {
    attendance: any[];
    workReports: any[];
    onDateClick?: (date: Date, attendanceRecord?: any) => void;
}

export default function AttendanceCalendar({ attendance, workReports, onDateClick }: AttendanceCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) {
        calendarDays.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
        calendarDays.push(new Date(year, month, i));
    }

    const getAttendanceForDay = (date: Date) => {
        return attendance.find(a => {
            const ad = new Date(a.date);
            return ad.getDate() === date.getDate() &&
                ad.getMonth() === date.getMonth() &&
                ad.getFullYear() === date.getFullYear();
        });
    };

    const getWorkReportForDay = (date: Date) => {
        return workReports.find(r => {
            const rd = new Date(r.date);
            return rd.getDate() === date.getDate() &&
                rd.getMonth() === date.getMonth() &&
                rd.getFullYear() === date.getFullYear();
        });
    };

    const formatDuration = (checkIn: string, checkOut: string) => {
        if (!checkIn || !checkOut) return null;
        const dur = new Date(checkOut).getTime() - new Date(checkIn).getTime();
        const hours = Math.floor(dur / (1000 * 60 * 60));
        const mins = Math.floor((dur % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-secondary-100 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black">{monthNames[month]} {year}</h3>
                    <p className="text-primary-100 text-xs font-bold uppercase tracking-widest">Attendance & Reports Tracker</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex gap-1 mr-2">
                        <button
                            className="p-2 hover:bg-white/10 rounded-xl transition-all text-xs font-bold flex items-center gap-1"
                            title="Export CSV"
                            onClick={() => window.open(`/api/hr/attendance/export?startDate=${year}-${month + 1}-01&endDate=${year}-${month + 1}-${totalDays}`, '_blank')}
                        >
                            Export
                        </button>
                        <button
                            className="p-2 hover:bg-white/10 rounded-xl transition-all text-xs font-bold flex items-center gap-1"
                            title="Import CSV"
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.csv';
                                input.onchange = async (e: any) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const fd = new FormData();
                                    fd.append('file', file);
                                    try {
                                        const res = await fetch('/api/hr/attendance/import', { method: 'POST', body: fd });
                                        if (res.ok) alert('Import Successful');
                                        else alert('Import Failed');
                                    } catch (err) { alert('Error: ' + err); }
                                };
                                input.click();
                            }}
                        >
                            Import
                        </button>
                    </div>
                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-7 gap-4 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-secondary-400 uppercase tracking-widest">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-4">
                    {calendarDays.map((date, idx) => {
                        if (!date) return <div key={`empty-${idx}`} className="aspect-square"></div>;

                        const att = getAttendanceForDay(date);
                        const report = getWorkReportForDay(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                        return (
                            <div
                                key={idx}
                                onClick={() => onDateClick && onDateClick(date, att)}
                                className={`
                                    relative p-2 rounded-2xl border aspect-square flex flex-col justify-between transition-all group hover:shadow-md
                                    ${isToday ? 'border-primary-500 bg-primary-50/30 ring-2 ring-primary-100' : 'border-secondary-50'}
                                    ${isWeekend && !att ? 'bg-secondary-50/30' : ''}
                                    ${onDateClick ? 'cursor-pointer hover:border-primary-400 hover:bg-primary-50' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-black ${isToday ? 'text-primary-600' : 'text-secondary-600'}`}>
                                        {date.getDate()}
                                    </span>
                                    {att && (
                                        <div className={`w-2 h-2 rounded-full ${att.status === 'PRESENT' ? 'bg-success-500' : 'bg-danger-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    {att ? (
                                        <>
                                            <div className="text-[8px] font-bold text-secondary-500 flex items-center gap-1">
                                                <Clock size={8} /> {formatToISTTime(att.checkIn)}
                                            </div>
                                            <div className="text-[8px] font-black text-primary-600">
                                                {att.checkIn && att.checkOut ? formatDuration(att.checkIn, att.checkOut) : att.checkIn ? 'Active' : '--'}
                                            </div>
                                            <div className="flex gap-1 mt-0.5">
                                                {att.isLate && (
                                                    <span className="text-[6px] font-black text-danger-600 bg-danger-50 px-0.5 rounded uppercase">Late</span>
                                                )}
                                                {att.isShort && (
                                                    <span className="text-[6px] font-black text-warning-600 bg-warning-50 px-0.5 rounded uppercase">Short</span>
                                                )}
                                            </div>
                                        </>
                                    ) : !isWeekend && date < new Date() && (
                                        <div className="text-[8px] font-bold text-danger-500 uppercase tracking-tighter italic">Absent</div>
                                    )}

                                    {report ? (
                                        <div className="flex items-center gap-1 text-[8px] font-bold text-success-600 bg-success-50 px-1 rounded">
                                            <CheckCircle2 size={8} /> PDF
                                        </div>
                                    ) : date < new Date() && !isWeekend && att && (
                                        <div className="flex items-center gap-1 text-[8px] font-bold text-warning-600 bg-warning-50 px-1 rounded">
                                            <AlertCircle size={8} /> NO RPT
                                        </div>
                                    )}
                                </div>

                                {/* Tooltip on hover */}
                                <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-secondary-900 text-white text-[10px] rounded-lg shadow-xl">
                                        <p className="font-bold border-b border-white/10 pb-1 mb-1"><FormattedDate date={date} /></p>
                                        {att ? (
                                            <>
                                                <p>In: {formatToISTTime(att.checkIn)}</p>
                                                <p>Out: {formatToISTTime(att.checkOut)}</p>
                                                <p>Status: {att.status}</p>
                                                {att.isLate && <p className="text-danger-400 font-bold">Late: {att.lateMinutes}m</p>}
                                                {att.isShort && <p className="text-warning-400 font-bold">Short: {att.shortMinutes}m</p>}
                                            </>
                                        ) : <p>No Attendance Record</p>}
                                        {report ? (
                                            <p className="text-success-400 mt-1 font-black">Report: {report.status}</p>
                                        ) : <p className="text-warning-400 mt-1">No Report Filed</p>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 pt-6 border-t border-secondary-100 flex flex-wrap gap-4 text-[10px] font-bold text-secondary-500">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-success-500"></div> Present
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-danger-500"></div> Absent
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="bg-success-50 text-success-600 px-1 rounded">PDF</span> Report Filed
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="bg-warning-50 text-warning-600 px-1 rounded">NO RPT</span> Missing Report
                    </div>
                </div>
            </div>
        </div>
    );
}

