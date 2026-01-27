'use client';

import React, { useState } from 'react';
import { useSalaryStructures, useAdvances, useIncrements } from '@/hooks/useHR';
import { CreditCard, FileText, Briefcase, TrendingUp, Award, DollarSign, Wallet } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

interface TeamSalaryViewProps {
    activeSubTab: string;
}

const TeamSalaryView: React.FC<TeamSalaryViewProps> = ({ activeSubTab }) => {
    // Hooks fetch data using the updated APIs with manager/downline logic
    const { data: structures = [], isLoading: loadingStructures } = useSalaryStructures();
    const { data: advances = [], isLoading: loadingAdvances } = useAdvances();
    const { data: increments = [], isLoading: loadingIncrements } = useIncrements();

    const renderStructure = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {structures.map((s: any) => (
                    <div key={s.id} className="card-premium bg-white border border-secondary-100 p-8 hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-bl-full -mr-12 -mt-12 group-hover:bg-primary-100 transition-colors"></div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-secondary-900 text-white flex items-center justify-center font-black">
                                {s.employee.user.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-black text-secondary-900 leading-tight">{s.employee.user.name}</h4>
                                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{s.employee.designation || 'Specialist'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-dashed border-secondary-100 pb-4">
                                <div>
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Gross Salary</p>
                                    <p className="text-xl font-black text-secondary-900 mt-1">₹{s.grossSalary?.toLocaleString() || 0}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Net Payable</p>
                                    <p className="text-lg font-black text-emerald-600 mt-1">₹{s.netSalary?.toLocaleString() || 0}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <p className="text-[9px] font-black text-secondary-400 uppercase tracking-wider">Total Ded.</p>
                                    <p className="text-sm font-bold text-rose-500">₹{s.totalDeductions?.toLocaleString() || 0}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-secondary-400 uppercase tracking-wider">CTC Yearly</p>
                                    <p className="text-sm font-bold text-secondary-700">₹{(s.ctc * 12 / 100000).toFixed(2)}L</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderAdvances = () => (
        <div className="card-premium overflow-hidden border border-secondary-100 bg-white">
            <table className="table w-full">
                <thead className="bg-secondary-50/50">
                    <tr className="text-[10px] uppercase font-black text-secondary-400 tracking-[0.2em] border-b border-secondary-100">
                        <th className="px-8 py-6 text-left">Recipient</th>
                        <th className="px-8 py-6 text-left">Total Advance</th>
                        <th className="px-8 py-6 text-center">EMI Details</th>
                        <th className="px-8 py-6 text-center">Repayment Progress</th>
                        <th className="px-8 py-6 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-secondary-50">
                    {advances.length === 0 ? (
                        <tr><td colSpan={5} className="px-8 py-20 text-center text-secondary-400 font-bold italic">No salary advances in team.</td></tr>
                    ) : advances.map((adv: any) => (
                        <tr key={adv.id} className="hover:bg-secondary-50/30 transition-colors">
                            <td className="px-8 py-5">
                                <p className="font-bold text-secondary-900">{adv.employee.user.name}</p>
                                <p className="text-[10px] text-secondary-400 font-medium">Ref: {adv.id.slice(-8).toUpperCase()}</p>
                            </td>
                            <td className="px-8 py-5">
                                <p className="text-sm font-black text-secondary-900">₹{adv.amount.toLocaleString()}</p>
                                <p className="text-[10px] text-secondary-400 italic">Reason: {adv.reason || 'N/A'}</p>
                            </td>
                            <td className="px-8 py-5 text-center">
                                <p className="text-xs font-black text-rose-500">₹{adv.emiAmount.toLocaleString()}/mo</p>
                                <p className="text-[10px] font-bold text-secondary-400">for {adv.totalEmis} months</p>
                            </td>
                            <td className="px-8 py-5">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-48 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary-600 rounded-full transition-all"
                                            style={{ width: `${(adv.paidEmis / adv.totalEmis) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[9px] font-black text-secondary-500 uppercase tracking-widest">{adv.paidEmis} / {adv.totalEmis} Months Paid</span>
                                </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${adv.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                    {adv.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderIncrements = () => (
        <div className="space-y-8">
            {increments.map((inc: any) => (
                <div key={inc.id} className="card-premium bg-white p-8 border border-secondary-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 group">
                    <div className="flex gap-6 items-start flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-primary-200">
                            <TrendingUp size={24} />
                        </div>
                        <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-black text-secondary-900">{inc.employeeProfile.user.name}</h3>
                                <span className="px-2 py-0.5 bg-secondary-100 text-secondary-600 text-[9px] font-black rounded uppercase tracking-widest">{inc.status}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                                <div>
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Increment</p>
                                    <p className="text-md font-black text-emerald-600 mt-1">+₹{inc.incrementAmount?.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-secondary-400 italic">({inc.percentage?.toFixed(1)}% Hike)</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">New CTC</p>
                                    <p className="text-md font-black text-secondary-900 mt-1">₹{inc.newSalary?.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Effective From</p>
                                    <p className="text-xs font-bold text-secondary-700 mt-1"><FormattedDate date={inc.effectiveDate} /></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {increments.length === 0 && <div className="p-20 text-center text-secondary-400 font-bold italic card-premium bg-white border border-secondary-100">No recent salary increments for your team.</div>}
        </div>
    );

    const isLoading = loadingStructures || loadingAdvances || loadingIncrements;

    if (isLoading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Processing financial data...</div>;
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 text-secondary-900">
            <div>
                <h2 className="text-3xl font-black tracking-tight capitalize">Team {activeSubTab.replace('structures', 'Salary Plans')}</h2>
                <p className="text-secondary-500 font-medium">Consolidated financial overview of your reporting line</p>
            </div>

            {activeSubTab === 'structures' && renderStructure()}
            {activeSubTab === 'advances' && renderAdvances()}
            {activeSubTab === 'increments' && renderIncrements()}
            {(activeSubTab === 'slips' || activeSubTab === 'incentives') && (
                <div className="p-20 text-center text-secondary-400 font-bold italic card-premium bg-white border border-secondary-100">
                    This section ({activeSubTab}) is managed by HR & Finance. Contact them for specific reports.
                </div>
            )}
        </div>
    );
};

export default TeamSalaryView;
