'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Eye, Edit, Trash2, Clock, Calendar, CheckCircle, XCircle,
    Info, DollarSign, TrendingUp, User as UserIcon, HelpCircle,
    LayoutGrid
} from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';

export default function IncrementTracker({ initialIncrements }: { initialIncrements: any[] }) {
    const router = useRouter();
    const [increments, setIncrements] = useState(initialIncrements);
    const [selectedIncrement, setSelectedIncrement] = useState<any>(null);
    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);

    const calculateExperience = (doj: string | Date | null) => {
        if (!doj) return "N/A";
        const start = new Date(doj);
        const end = new Date();
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        return `${months} Mo`;
    };

    const calculateTotalPerks = (fixed: number, perks: any) => {
        const { healthCare = 0, travelling = 0, mobile = 0, internet = 0, books = 0 } = perks;
        return fixed + healthCare + travelling + mobile + internet + books;
    };

    const handleDelete = async (id: string, status: string) => {
        const message = status === 'DRAFT'
            ? 'Are you sure you want to delete this increment draft?'
            : `WARNING: This increment is in ${status} status. Deleting it may affect payroll and history. Are you sure you want to proceed?`;

        if (!confirm(message)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/increments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setIncrements(increments.filter(inc => inc.id !== id));
                alert('Increment deleted successfully');
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error deleting increment:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: any = {
            'DRAFT': { color: 'bg-secondary-100 text-secondary-700', icon: Clock },
            'MANAGER_APPROVED': { color: 'bg-blue-100 text-blue-700', icon: Info },
            'APPROVED': { color: 'bg-success-100 text-success-700', icon: CheckCircle },
            'REJECTED': { color: 'bg-danger-100 text-danger-700', icon: XCircle }
        };

        const badge = badges[status] || badges['DRAFT'];
        const Icon = badge.icon;

        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${badge.color}`}>
                <Icon size={12} />
                {status.replace('_', ' ')}
            </span>
        );
    };

    const openReasonModal = (increment: any) => {
        setSelectedIncrement(increment);
        setIsReasonModalOpen(true);
    };

    return (
        <div className="card-premium overflow-hidden p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-secondary-50">
                        <tr>
                            <th className="px-4 py-4 text-left text-xs font-bold text-secondary-600 uppercase tracking-tighter">Name</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-secondary-600 uppercase tracking-tighter">DOJ (EXP in Mo)</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-secondary-600 uppercase tracking-tighter">Last Approved</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-secondary-600 uppercase tracking-tighter">Current Approved</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-secondary-600 uppercase tracking-tighter">Next Proposal</th>
                            <th className="px-4 py-4 text-center text-xs font-bold text-secondary-600 uppercase tracking-tighter">Reason</th>
                            <th className="px-4 py-4 text-right text-xs font-bold text-secondary-600 uppercase tracking-tighter">Total CTC Past</th>
                            <th className="px-4 py-4 text-right text-xs font-bold text-secondary-600 uppercase tracking-tighter">CTC After</th>
                            <th className="px-4 py-4 text-center text-xs font-bold text-secondary-600 uppercase tracking-tighter">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100 italic-rows text-xs">
                        {increments.map((inc) => {
                            const emp = inc.employeeProfile;
                            const oldPerksVal = (inc.oldHealthCare || 0) + (inc.oldTravelling || 0) + (inc.oldMobile || 0) + (inc.oldInternet || 0) + (inc.oldBooksAndPeriodicals || 0);
                            const newPerksVal = (inc.newHealthCare || 0) + (inc.newTravelling || 0) + (inc.newMobile || 0) + (inc.newInternet || 0) + (inc.newBooksAndPeriodicals || 0);

                            const lastApprovedTotal = (inc.oldFixed || 0) + oldPerksVal + (inc.oldVariable || 0);
                            const currentApprovedTotal = (inc.newFixed || 0) + newPerksVal + (inc.newVariable || 0);

                            return (
                                <tr key={inc.id} className="hover:bg-primary-50 transition-colors group">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="h-8 w-8 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-500">
                                                <UserIcon size={14} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-secondary-900 leading-tight">{emp?.user?.name}</p>
                                                <p className="text-[10px] text-secondary-400">{emp?.user?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-xs">
                                        <div className="text-[11px] font-medium text-secondary-700">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={10} className="text-secondary-400" />
                                                <FormattedDate date={emp?.dateOfJoining} />
                                            </div>
                                            <p className="text-primary-600 font-black mt-0.5">({calculateExperience(emp?.dateOfJoining)})</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-secondary-600 font-mono text-xs">
                                        <p className="font-bold text-secondary-900">₹{lastApprovedTotal.toLocaleString()}</p>
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[9px] font-bold uppercase tracking-tighter">
                                            <span className="text-secondary-400">F: <span className="text-secondary-600">₹{(inc.oldFixed || 0).toLocaleString()}</span></span>
                                            <span className="text-secondary-400">Re: <span className="text-secondary-600">₹{oldPerksVal.toLocaleString()}</span></span>
                                            <span className="text-secondary-400">v: <span className="text-secondary-600">₹{(inc.oldVariable || 0).toLocaleString()}</span></span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-secondary-600 font-mono text-xs">
                                        <p className="font-bold text-secondary-900">₹{currentApprovedTotal.toLocaleString()}</p>
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[9px] font-bold uppercase tracking-tighter">
                                            <span className="text-primary-400">F: <span className="text-primary-700">₹{(inc.newFixed || 0).toLocaleString()}</span></span>
                                            <span className="text-primary-400">Re: <span className="text-primary-700">₹{newPerksVal.toLocaleString()}</span></span>
                                            <span className="text-primary-400">v: <span className="text-primary-700">₹{(inc.newVariable || 0).toLocaleString()}</span></span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-indigo-600 underline decoration-indigo-200 underline-offset-2">
                                                ₹{(inc.incrementAmount || 0).toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-secondary-400 mt-1 flex items-center gap-1">
                                                <Clock size={10} />
                                                <FormattedDate date={inc.effectiveDate} />
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <button
                                            onClick={() => openReasonModal(inc)}
                                            className="p-1.5 bg-secondary-100 hover:bg-primary-100 text-secondary-600 hover:text-primary-600 rounded-lg transition-all"
                                            title="View Reason and KRA/KPI"
                                        >
                                            <HelpCircle size={16} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 text-right text-xs">
                                        <p className="font-bold text-secondary-800">₹{(inc.oldSalary || 0).toLocaleString()}</p>
                                    </td>
                                    <td className="px-4 py-4 text-right text-xs">
                                        <div className="flex flex-col items-end">
                                            <p className="font-black text-success-600">₹{(inc.newSalary || 0).toLocaleString()}</p>
                                            <span className="text-[10px] font-bold bg-success-50 text-success-700 px-1.5 rounded mt-1">
                                                +{(inc.percentage || 0).toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <Link href={`/dashboard/hr-management/increments/${inc.id}`} className="p-1.5 hover:bg-white rounded-md transition-colors text-primary-600"><Eye size={16} /></Link>
                                            <Link href={`/dashboard/hr-management/increments/${inc.id}/edit`} className="p-1.5 hover:bg-white rounded-md transition-colors text-blue-600"><Edit size={16} /></Link>
                                            <button onClick={() => handleDelete(inc.id, inc.status)} className="p-1.5 hover:bg-white rounded-md transition-colors text-danger-600"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Reason Modal */}
            {isReasonModalOpen && selectedIncrement && (
                <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-secondary-100 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-secondary-50 bg-gradient-to-r from-secondary-50 to-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-200">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tighter">Recommendation Context</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-secondary-500 font-bold uppercase tracking-widest">{selectedIncrement.employeeProfile?.user?.name}</span>
                                        <span className="h-1 w-1 rounded-full bg-secondary-300"></span>
                                        <span className="text-[10px] text-primary-600 font-black uppercase tracking-widest">Effective: <FormattedDate date={selectedIncrement.effectiveDate} /></span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsReasonModalOpen(false)} className="p-2 hover:bg-danger-50 rounded-xl text-secondary-400 hover:text-danger-500 transition-all">
                                <XCircle size={28} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                            {/* Salary Components Grid */}
                            <section>
                                <h4 className="text-[11px] font-black text-secondary-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <DollarSign size={14} className="text-primary-500" /> Compensation Architecture
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-100 flex flex-col justify-between">
                                        <p className="text-[9px] font-bold text-secondary-400 uppercase mb-1">Fixed Salary (F)</p>
                                        <p className="text-lg font-black text-secondary-900">₹{(selectedIncrement.newFixed || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 flex flex-col justify-between">
                                        <p className="text-[9px] font-bold text-primary-500 uppercase mb-1">Exemp / Perks (Re)</p>
                                        <p className="text-lg font-black text-primary-700">
                                            ₹{((selectedIncrement.newHealthCare || 0) +
                                                (selectedIncrement.newTravelling || 0) +
                                                (selectedIncrement.newMobile || 0) +
                                                (selectedIncrement.newInternet || 0) +
                                                (selectedIncrement.newBooksAndPeriodicals || 0)).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-between">
                                        <p className="text-[9px] font-bold text-indigo-500 uppercase mb-1">Variable (v)</p>
                                        <p className="text-lg font-black text-indigo-700">₹{(selectedIncrement.newVariable || 0).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="mt-4 p-4 bg-success-50 rounded-2xl border border-success-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-success-600 flex items-center justify-center text-white">
                                            <CheckCircle size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-success-600 uppercase">Total Proposed CTC</p>
                                            <p className="text-xl font-black text-success-700">₹{(selectedIncrement.newSalary || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-success-600 uppercase">Growth</p>
                                        <p className="text-lg font-black text-success-700">+{(selectedIncrement.percentage || 0).toFixed(1)}%</p>
                                    </div>
                                </div>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Reason Section */}
                                <section className="space-y-3">
                                    <h4 className="text-[11px] font-black text-secondary-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Info size={14} className="text-primary-500" /> Rational & Justification
                                    </h4>
                                    <div className="p-5 bg-white rounded-2xl border-2 border-primary-50 text-secondary-700 text-sm leading-relaxed italic shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
                                        &ldquo;{selectedIncrement.reason || 'No specific justification provided by the manager.'}&rdquo;
                                    </div>
                                </section>

                                {/* Designation & Target Section */}
                                <section className="space-y-3">
                                    <h4 className="text-[11px] font-black text-secondary-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <TrendingUp size={14} className="text-indigo-500" /> Career Propagation
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-100">
                                            <p className="text-[8px] font-bold text-secondary-400 uppercase">New Designation</p>
                                            <p className="text-xs font-black text-secondary-800 truncate">{selectedIncrement.newDesignation || 'Unchanged'}</p>
                                        </div>
                                        <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-100">
                                            <p className="text-[8px] font-bold text-secondary-400 uppercase">New Target</p>
                                            <p className="text-xs font-black text-secondary-800">₹{(selectedIncrement.newMonthlyTarget || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Performance Redefinitions */}
                            <section className="space-y-4">
                                <h4 className="text-[11px] font-black text-secondary-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <LayoutGrid size={14} className="text-primary-500" /> KRA & KPI Redefinition
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="group">
                                        <p className="text-[10px] font-black text-secondary-500 uppercase mb-2 ml-1">Key Result Areas (KRA)</p>
                                        <div className="p-5 bg-secondary-50 rounded-2xl border border-secondary-100 min-h-[160px] text-xs text-secondary-600 whitespace-pre-wrap leading-relaxed group-hover:border-primary-200 transition-colors">
                                            {selectedIncrement.newKRA || 'No KRA updates provided.'}
                                        </div>
                                    </div>
                                    <div className="group">
                                        <p className="text-[10px] font-black text-secondary-500 uppercase mb-2 ml-1">Key Performance Indicators (KPI)</p>
                                        <div className="p-5 bg-secondary-50 rounded-2xl border border-secondary-100 min-h-[160px] text-xs font-mono text-secondary-500 overflow-x-auto group-hover:border-indigo-200 transition-colors">
                                            {typeof selectedIncrement.newKPI === 'object'
                                                ? <pre>{JSON.stringify(selectedIncrement.newKPI, null, 2)}</pre>
                                                : selectedIncrement.newKPI || 'No KPI updates provided.'}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setIsReasonModalOpen(false)}
                                className="px-10 py-3 bg-white hover:bg-secondary-900 hover:text-white text-secondary-900 border border-secondary-200 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm hover:shadow-xl active:scale-95"
                            >
                                Close Context
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
