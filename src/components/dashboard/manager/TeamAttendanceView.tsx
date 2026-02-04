'use client';

import React from 'react';
import { useAttendance } from '@/hooks/useHR';
import { Calendar, User, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import { formatToISTTime } from '@/lib/date-utils';

interface TeamAttendanceViewProps {
    filters: any;
    setFilters: (filters: any) => void;
}

const TeamAttendanceView: React.FC<TeamAttendanceViewProps> = ({ filters, setFilters }) => {
    // We add 'all=true' to fetch the whole team's attendance for the manager
    const { data: attendance = [], isLoading: loading } = useAttendance(filters.month, filters.year, true);

    const formatTime = (dateStr: string | null) => {
        return formatToISTTime(dateStr, 'hh:mm a');
    };

    const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
        if (!checkIn || !checkOut) return '--';
        const start = new Date(checkIn).getTime();
        const end = new Date(checkOut).getTime();
        const diffMinutes = Math.floor((end - start) / 60000);
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${hours}h ${minutes}m`;
    };

    const nextMonth = () => {
        let m = filters.month + 1;
        let y = filters.year;
        if (m > 12) { m = 1; y++; }
        setFilters({ ...filters, month: m, year: y });
    };

    const prevMonth = () => {
        let m = filters.month - 1;
        let y = filters.year;
        if (m < 1) { m = 12; y--; }
        setFilters({ ...filters, month: m, year: y });
    };

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Retrieving attendance logs...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Team Attendance</h2>
                    <p className="text-secondary-500 font-medium">Viewing logs for {new Date(2024, filters.month - 1).toLocaleString('default', { month: 'long' })} {filters.year}</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-secondary-100">
                    <button onClick={prevMonth} className="p-2 hover:bg-secondary-50 text-secondary-500 rounded-xl transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="px-4 text-sm font-black text-secondary-900 min-w-[120px] text-center">
                        {new Date(2024, filters.month - 1).toLocaleString('default', { month: 'short' }).toUpperCase()} {filters.year}
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-secondary-50 text-secondary-500 rounded-xl transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="card-premium overflow-hidden border border-secondary-100 bg-white shadow-xl">
                <table className="table w-full">
                    <thead className="bg-secondary-50/50">
                        <tr className="text-[10px] uppercase font-black text-secondary-400 tracking-[0.2em] border-b border-secondary-100">
                            <th className="px-8 py-6 text-left">Staff Member</th>
                            <th className="px-8 py-6 text-left">Date</th>
                            <th className="px-8 py-6 text-center">Check-In</th>
                            <th className="px-8 py-6 text-center">Check-Out</th>
                            <th className="px-8 py-6 text-center">Working Hrs</th>
                            <th className="px-8 py-6 text-center">Late/OT</th>
                            <th className="px-8 py-6 text-center">Status</th>
                            <th className="px-8 py-6 text-right">Location</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-50">
                        {attendance.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-8 py-20 text-center text-secondary-400 font-bold italic">
                                    No attendance records found for this period.
                                </td>
                            </tr>
                        ) : attendance.map((log: any) => (
                            <tr key={log.id} className="hover:bg-secondary-50/30 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-secondary-100 text-secondary-600 flex items-center justify-center font-black group-hover:bg-secondary-900 group-hover:text-white transition-all">
                                            {log.employee.user.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-secondary-900">{log.employee.user.name}</p>
                                            <p className="text-[10px] text-secondary-400 font-medium">Emp ID: {log.employee.employeeId || 'N/A'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <p className="text-xs font-bold text-secondary-900"><FormattedDate date={log.date} /></p>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className={`text-xs font-black ${log.lateMinutes > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {formatTime(log.checkIn)}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-center text-xs font-black text-secondary-900">
                                    {formatTime(log.checkOut)}
                                </td>
                                <td className="px-8 py-5 text-center text-xs font-bold text-secondary-600">
                                    {calculateDuration(log.checkIn, log.checkOut)}
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <div className="flex flex-col gap-0.5">
                                        {log.lateMinutes > 0 && (
                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider">Late: {log.lateMinutes}m</span>
                                        )}
                                        {log.otMinutes > 0 && (
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">OT: {log.otMinutes}m</span>
                                        )}
                                        {!log.lateMinutes && !log.otMinutes && (
                                            <span className="text-[9px] font-black text-secondary-300">--</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${log.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' :
                                        log.status === 'LEAVE' ? 'bg-indigo-50 text-indigo-700' :
                                            'bg-rose-50 text-rose-700'
                                        }`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 text-secondary-400">
                                        <span className="text-[10px] font-bold uppercase">{log.workFrom || 'OFFICE'}</span>
                                        <MapPin size={12} className={log.isGeofenced ? 'text-emerald-500' : 'text-rose-400'} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeamAttendanceView;
