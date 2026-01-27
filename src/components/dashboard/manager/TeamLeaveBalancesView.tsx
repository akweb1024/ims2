'use client';

import React from 'react';
import { useLeaveLedger } from '@/hooks/useHR';
import { Zap, User, AlertCircle, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface TeamLeaveBalancesViewProps {
    filters: any;
    setFilters: (filters: any) => void;
}

const TeamLeaveBalancesView: React.FC<TeamLeaveBalancesViewProps> = ({ filters, setFilters }) => {
    const { data: balances = [], isLoading: loading } = useLeaveLedger(filters.month, filters.year);

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
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Calculating team balances...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Team Leave Balances</h2>
                    <p className="text-secondary-500 font-medium">Monthly balance ledger for {new Date(2024, filters.month - 1).toLocaleString('default', { month: 'long' })} {filters.year}</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card-premium p-6 bg-indigo-600 text-white border-none shadow-xl shadow-indigo-200/50">
                    <div className="flex items-center justify-between mb-2">
                        <Zap size={20} className="text-indigo-200" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Allotted</span>
                    </div>
                    <div className="text-3xl font-black">
                        {balances.reduce((acc, curr) => acc + (curr.autoCredit || 0), 0).toFixed(1)}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-70">Days this month</p>
                </div>

                <div className="card-premium p-6 bg-rose-600 text-white border-none shadow-xl shadow-rose-200/50">
                    <div className="flex items-center justify-between mb-2">
                        <Zap size={20} className="text-rose-200" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Taken</span>
                    </div>
                    <div className="text-3xl font-black">
                        {balances.reduce((acc, curr) => acc + (curr.takenLeaves || 0), 0).toFixed(1)}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-70">Approved leaves</p>
                </div>

                <div className="card-premium p-6 bg-amber-500 text-white border-none shadow-xl shadow-amber-200/50 col-span-1 md:col-span-2">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={24} className="text-amber-100" />
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest opacity-90">Attention Required</p>
                            <p className="text-lg font-bold">
                                {balances.filter(b => b.closingBalance < 1).length} Members with low balance
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-premium overflow-hidden border border-secondary-100 bg-white">
                <table className="table w-full">
                    <thead className="bg-secondary-50/50">
                        <tr className="text-[10px] uppercase font-black text-secondary-400 tracking-[0.2em] border-b border-secondary-100">
                            <th className="px-8 py-6 text-left">Team Member</th>
                            <th className="px-8 py-6 text-center">Opening</th>
                            <th className="px-8 py-6 text-center">Allotted</th>
                            <th className="px-8 py-6 text-center">Taken</th>
                            <th className="px-8 py-6 text-center">Deductions</th>
                            <th className="px-8 py-6 text-center">Current Bal</th>
                            <th className="px-8 py-6 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-50">
                        {balances.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-8 py-20 text-center text-secondary-400 font-bold italic">
                                    No ledger data found for this period.
                                </td>
                            </tr>
                        ) : balances.map((row: any) => (
                            <tr key={row.employeeId} className="hover:bg-secondary-50/30 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3 text-secondary-900">
                                        <div className="w-8 h-8 rounded-lg bg-secondary-900 text-white flex items-center justify-center text-xs font-black">
                                            {row.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="font-bold flex flex-col">
                                            <span>{row.name}</span>
                                            <span className="text-[9px] text-secondary-400 font-black uppercase tracking-wider">{row.email.split('@')[0]}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center text-xs font-bold text-secondary-500">
                                    {row.openingBalance.toFixed(1)}
                                </td>
                                <td className="px-8 py-5 text-center text-xs font-bold text-emerald-600">
                                    +{row.autoCredit.toFixed(1)}
                                </td>
                                <td className="px-8 py-5 text-center text-xs font-black text-rose-500">
                                    -{row.takenLeaves.toFixed(1)}
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold text-secondary-400">
                                            L: {row.lateDeductions.toFixed(1)} | S: {row.shortLeaveDeductions.toFixed(1)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className={`text-sm font-black ${row.closingBalance < 1 ? 'text-rose-600 animate-pulse' : 'text-secondary-900'}`}>
                                        {row.closingBalance.toFixed(2)}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${row.closingBalance >= 5 ? 'bg-emerald-50 text-emerald-700' :
                                            row.closingBalance > 0 ? 'bg-amber-50 text-amber-700' :
                                                'bg-rose-50 text-rose-700'
                                        }`}>
                                        {row.closingBalance >= 5 ? 'Healthy' : row.closingBalance > 0 ? 'Review' : 'Negative'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-start gap-4 p-6 bg-secondary-50 rounded-2xl border border-secondary-100">
                <Info size={20} className="text-secondary-400 mt-1 flex-shrink-0" />
                <div className="space-y-1">
                    <p className="text-sm font-black text-secondary-900 uppercase tracking-wider">Manager Insights</p>
                    <p className="text-xs text-secondary-500 leading-relaxed">
                        These balances are synchronized with HR records. If a team member has a negative balance, future check-ins will trigger automatic leave deductions.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TeamLeaveBalancesView;
