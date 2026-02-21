'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Calendar, TrendingUp, TrendingDown, AlertCircle, Clock,
    CheckCircle, XCircle, Minus, ChevronDown, Filter
} from 'lucide-react';

interface LeaveLedgerEntry {
    id: string;
    month: number;
    year: number;
    openingBalance: number;
    takenLeaves: number;
    closingBalance: number;
    autoCredit: number | null;
    lateArrivalCount: number;
    shortLeaveCount: number;
    lateDeductions: number;
    shortLeaveDeductions: number;
    remarks: string | null;
}

interface AttendanceMetrics {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    shortDays: number;
    attendancePercentage: number;
    punctualityScore: number;
    regularityScore: number;
    punctualityTrend: number;
    averageLateMinutes: number;
}

interface LeaveLedgerHistoryProps {
    employeeId: string;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function LeaveLedgerHistory({ employeeId }: LeaveLedgerHistoryProps) {
    const [ledgerEntries, setLedgerEntries] = useState<LeaveLedgerEntry[]>([]);
    const [latestBalance, setLatestBalance] = useState<LeaveLedgerEntry | null>(null);
    const [attendanceMetrics, setAttendanceMetrics] = useState<AttendanceMetrics | null>(null);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');

    const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

    const fetchLeaveLedger = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedYear !== 'all') params.append('year', selectedYear.toString());
            if (selectedMonth !== 'all') params.append('month', selectedMonth.toString());

            const res = await fetch(`/api/hr/leave-ledger/${employeeId}?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLedgerEntries(data.ledgerEntries);
                setLatestBalance(data.latestBalance);
                setAttendanceMetrics(data.attendanceMetrics);
                setSummary(data.summary);
            }
        } catch (error) {
            console.error('Error fetching leave ledger:', error);
        } finally {
            setLoading(false);
        }
    }, [employeeId, selectedYear, selectedMonth]);

    useEffect(() => {
        fetchLeaveLedger();
    }, [fetchLeaveLedger]);

    const getBalanceColor = (balance: number) => {
        if (balance >= 10) return 'text-success-600 bg-success-50';
        if (balance >= 5) return 'text-warning-600 bg-warning-50';
        return 'text-danger-600 bg-danger-50';
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-success-600';
        if (score >= 75) return 'text-warning-600';
        return 'text-danger-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-secondary-500 font-medium">Loading leave history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="card-premium p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-secondary-600" />
                    <h3 className="text-lg font-bold text-secondary-900">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-secondary-600 uppercase tracking-wider mb-2">
                            Year
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-secondary-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All Years</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-secondary-600 uppercase tracking-wider mb-2">
                            Month
                        </label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-secondary-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All Months</option>
                            {MONTHS.map((month, idx) => (
                                <option key={idx} value={idx + 1}>{month}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); }}
                            className="w-full px-4 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 font-bold rounded-xl transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Latest Balance Highlight */}
            {latestBalance && (
                <div className={`card-premium p-8 border-l-4 border-primary-600 ${getBalanceColor(latestBalance.closingBalance)}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-secondary-600 mb-2">
                                Current Leave Balance
                            </p>
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-5xl font-black">{latestBalance.closingBalance.toFixed(1)}</h2>
                                <span className="text-xl font-bold text-secondary-500">days</span>
                            </div>
                            <p className="text-sm font-medium text-secondary-600 mt-2">
                                As of {MONTHS[latestBalance.month - 1]} {latestBalance.year}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm">
                                <Calendar className="w-4 h-4 text-primary-600" />
                                <span className="text-sm font-bold text-secondary-900">Latest</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Behavior Metrics */}
            {attendanceMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-success-100 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-success-600" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-secondary-600">Attendance</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${getScoreColor(attendanceMetrics.attendancePercentage)}`}>
                                {attendanceMetrics.attendancePercentage}%
                            </span>
                        </div>
                        <p className="text-xs text-secondary-500 mt-2">
                            {attendanceMetrics.presentDays}/{attendanceMetrics.totalDays} days
                        </p>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-primary-100 rounded-lg">
                                <Clock className="w-5 h-5 text-primary-600" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-secondary-600">Punctuality</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${getScoreColor(attendanceMetrics.punctualityScore)}`}>
                                {attendanceMetrics.punctualityScore}%
                            </span>
                            {attendanceMetrics.punctualityTrend !== 0 && (
                                <span className={`flex items-center text-sm font-bold ${attendanceMetrics.punctualityTrend > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                    {attendanceMetrics.punctualityTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    {Math.abs(attendanceMetrics.punctualityTrend).toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-secondary-500 mt-2">
                            {attendanceMetrics.lateDays} late arrivals
                        </p>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-warning-100 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-warning-600" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-secondary-600">Regularity</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${getScoreColor(attendanceMetrics.regularityScore)}`}>
                                {attendanceMetrics.regularityScore}%
                            </span>
                        </div>
                        <p className="text-xs text-secondary-500 mt-2">
                            {attendanceMetrics.absentDays} absences
                        </p>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-danger-100 rounded-lg">
                                <XCircle className="w-5 h-5 text-danger-600" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-secondary-600">Avg Late</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-secondary-900">
                                {attendanceMetrics.averageLateMinutes}
                            </span>
                            <span className="text-sm font-bold text-secondary-500">min</span>
                        </div>
                        <p className="text-xs text-secondary-500 mt-2">
                            per late arrival
                        </p>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card-premium p-4 text-center">
                        <p className="text-xs font-bold text-secondary-600 uppercase tracking-wider mb-1">Total Credits</p>
                        <p className="text-2xl font-black text-success-600">{summary.totalCredits.toFixed(1)}</p>
                    </div>
                    <div className="card-premium p-4 text-center">
                        <p className="text-xs font-bold text-secondary-600 uppercase tracking-wider mb-1">Total Taken</p>
                        <p className="text-2xl font-black text-primary-600">{summary.totalTaken.toFixed(1)}</p>
                    </div>
                    <div className="card-premium p-4 text-center">
                        <p className="text-xs font-bold text-secondary-600 uppercase tracking-wider mb-1">Late Deductions</p>
                        <p className="text-2xl font-black text-warning-600">{summary.totalLateDeductions.toFixed(1)}</p>
                    </div>
                    <div className="card-premium p-4 text-center">
                        <p className="text-xs font-bold text-secondary-600 uppercase tracking-wider mb-1">Short Deductions</p>
                        <p className="text-2xl font-black text-danger-600">{summary.totalShortLeaveDeductions.toFixed(1)}</p>
                    </div>
                </div>
            )}

            {/* Leave Ledger Table */}
            <div className="card-premium overflow-hidden">
                <div className="p-6 border-b border-secondary-100">
                    <h3 className="text-lg font-bold text-secondary-900">Leave Ledger History</h3>
                    <p className="text-sm text-secondary-600 mt-1">Monthly leave balance transactions</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-black text-secondary-600 uppercase tracking-wider">Period</th>
                                <th className="px-6 py-3 text-right text-xs font-black text-secondary-600 uppercase tracking-wider">Opening</th>
                                <th className="px-6 py-3 text-right text-xs font-black text-secondary-600 uppercase tracking-wider">Credits</th>
                                <th className="px-6 py-3 text-right text-xs font-black text-secondary-600 uppercase tracking-wider">Taken</th>
                                <th className="px-6 py-3 text-right text-xs font-black text-secondary-600 uppercase tracking-wider">Late Ded.</th>
                                <th className="px-6 py-3 text-right text-xs font-black text-secondary-600 uppercase tracking-wider">Short Ded.</th>
                                <th className="px-6 py-3 text-right text-xs font-black text-secondary-600 uppercase tracking-wider">Closing</th>
                                <th className="px-6 py-3 text-center text-xs font-black text-secondary-600 uppercase tracking-wider">Behavior</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {ledgerEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-secondary-500">
                                        No leave ledger entries found for the selected period.
                                    </td>
                                </tr>
                            ) : (
                                ledgerEntries.map((entry, idx) => (
                                    <tr
                                        key={entry.id}
                                        className={`hover:bg-secondary-50 transition-colors ${idx === 0 ? 'bg-primary-50/30' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {idx === 0 && (
                                                    <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-black uppercase rounded">
                                                        Latest
                                                    </span>
                                                )}
                                                <span className="font-bold text-secondary-900">
                                                    {MONTHS[entry.month - 1]} {entry.year}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-secondary-700">
                                            {entry.openingBalance.toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-success-600">
                                            +{(entry.autoCredit || 0).toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-primary-600">
                                            -{entry.takenLeaves.toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-warning-600">
                                            -{entry.lateDeductions.toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-danger-600">
                                            -{entry.shortLeaveDeductions.toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-black text-lg ${getBalanceColor(entry.closingBalance).split(' ')[0]}`}>
                                                {entry.closingBalance.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                {entry.lateArrivalCount > 0 && (
                                                    <span className="px-2 py-1 bg-warning-100 text-warning-700 text-xs font-bold rounded">
                                                        {entry.lateArrivalCount} Late
                                                    </span>
                                                )}
                                                {entry.shortLeaveCount > 0 && (
                                                    <span className="px-2 py-1 bg-danger-100 text-danger-700 text-xs font-bold rounded">
                                                        {entry.shortLeaveCount} Short
                                                    </span>
                                                )}
                                                {entry.lateArrivalCount === 0 && entry.shortLeaveCount === 0 && (
                                                    <span className="text-success-600 font-bold text-xs">✓ Good</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
