'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
    Eye, Edit, Trash2, Clock, Calendar, CheckCircle, XCircle,
    Info, DollarSign, TrendingUp, User as UserIcon, HelpCircle,
    LayoutGrid
} from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';
import IncrementReviewModal from '@/components/dashboard/hr/IncrementReviewModal';
import { ClipboardList } from 'lucide-react';

export default function IncrementTracker({ initialIncrements }: { initialIncrements: any[] }) {
    const router = useRouter();
    const [increments, setIncrements] = useState(initialIncrements);
    const [selectedIncrement, setSelectedIncrement] = useState<any>(null);
    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [companyFilter, setCompanyFilter] = useState('all');
    const [fyFilter, setFyFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deptFilter, setDeptFilter] = useState('all');
    const [managerFilter, setManagerFilter] = useState('all');

    // Unique values for filters
    const companies = Array.from(new Set(initialIncrements.map(inc => inc.employeeProfile?.user?.company?.name).filter(Boolean)));
    const departments = Array.from(new Set(initialIncrements.map(inc => inc.employeeProfile?.user?.department?.name).filter(Boolean)));
    const managers = Array.from(new Set(initialIncrements.map(inc => inc.employeeProfile?.user?.manager?.name).filter(Boolean)));
    const fiscalYears = Array.from(new Set(initialIncrements.map(inc => inc.fiscalYear).filter(Boolean)));
    const statuses = Array.from(new Set(initialIncrements.map(inc => inc.status)));

    useEffect(() => {
        let filtered = initialIncrements;

        if (searchTerm) {
            filtered = filtered.filter(inc =>
                inc.employeeProfile?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inc.employeeProfile?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (companyFilter !== 'all') {
            filtered = filtered.filter(inc => inc.employeeProfile?.user?.company?.name === companyFilter);
        }

        if (fyFilter !== 'all') {
            filtered = filtered.filter(inc => inc.fiscalYear === fyFilter);
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(inc => inc.status === statusFilter);
        }

        if (deptFilter !== 'all') {
            filtered = filtered.filter(inc => inc.employeeProfile?.user?.department?.name === deptFilter);
        }

        if (managerFilter !== 'all') {
            filtered = filtered.filter(inc => inc.employeeProfile?.user?.manager?.name === managerFilter);
        }

        setIncrements(filtered);
    }, [searchTerm, companyFilter, fyFilter, statusFilter, deptFilter, managerFilter, initialIncrements]);

    const calculateExperience = (doj: string | Date | null) => {
        if (!doj) return "N/A";
        const start = new Date(doj);
        const end = new Date();
        const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;

        let result = "";
        if (years > 0) result += `${years} Years `;
        result += `${months} Months`;
        return result.trim();
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

    const openReviewModal = (increment: any) => {
        setSelectedIncrement(increment);
        setIsReviewModalOpen(true);
    };

    const handleSaveReview = async (reviewData: any) => {
        if (!selectedIncrement) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/increments/${selectedIncrement.id}/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reviewData)
            });

            if (res.ok) {
                alert('Review saved successfully!');
                // We could refresh data here if needed, but for now alert is fine
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error('Error saving review:', error);
            alert('Failed to save review');
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter Hub */}
            <div className="bg-white p-4 rounded-3xl border border-secondary-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative group">
                    <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search employee or email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-secondary-50 border border-secondary-100 rounded-2xl text-sm focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className="px-4 py-2.5 bg-secondary-50 border border-secondary-100 rounded-2xl text-xs font-black text-secondary-600 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 cursor-pointer"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                >
                    <option value="all">🏢 All Companies</option>
                    {companies.map((c: any) => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                    className="px-4 py-2.5 bg-secondary-50 border border-secondary-100 rounded-2xl text-xs font-black text-secondary-600 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 cursor-pointer"
                    value={fyFilter}
                    onChange={(e) => setFyFilter(e.target.value)}
                >
                    <option value="all">📅 All FY</option>
                    {fiscalYears.map((fy: any) => <option key={fy} value={fy}>FY {fy}</option>)}
                </select>

                <select
                    className="px-4 py-2.5 bg-secondary-50 border border-secondary-100 rounded-2xl text-xs font-black text-secondary-600 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 cursor-pointer"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                >
                    <option value="all">📁 All Departments</option>
                    {departments.map((d: any) => <option key={d} value={d}>{d}</option>)}
                </select>

                <select
                    className="px-4 py-2.5 bg-secondary-50 border border-secondary-100 rounded-2xl text-xs font-black text-secondary-600 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 cursor-pointer"
                    value={managerFilter}
                    onChange={(e) => setManagerFilter(e.target.value)}
                >
                    <option value="all">👤 All Managers</option>
                    {managers.map((m: any) => <option key={m} value={m}>{m}</option>)}
                </select>

                <select
                    className="px-4 py-2.5 bg-secondary-50 border border-secondary-100 rounded-2xl text-xs font-black text-secondary-600 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">⚡ All Status</option>
                    {statuses.map((s: any) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>

                <div className="h-10 px-4 bg-primary-50 rounded-2xl flex items-center justify-center border border-primary-100">
                    <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{increments.length} Records</span>
                </div>
            </div>

            <div className="card-premium overflow-hidden p-0 border border-secondary-100 shadow-xl shadow-secondary-100/50">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm min-w-[1300px]">
                        <thead className="bg-secondary-50/80 backdrop-blur-sm border-b border-secondary-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest">Employee Intelligence</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest whitespace-nowrap">Tenure (EXP)</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest text-nowrap">Last Approved (FY)</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest text-nowrap">Current Approved (FY)</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest text-nowrap">Next Proposal (FY)</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-secondary-500 uppercase tracking-widest">Logic</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-secondary-500 uppercase tracking-widest">Fixed Salary (Past)</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-secondary-500 uppercase tracking-widest">Fixed Salary (New)</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-secondary-500 uppercase tracking-widest">Propagate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 italic-rows text-xs bg-white">
                            {increments.map((inc) => {
                                const emp = inc.employeeProfile;
                                const oldPerksVal = (inc.oldHealthCare || 0) + (inc.oldTravelling || 0) + (inc.oldMobile || 0) + (inc.oldInternet || 0) + (inc.oldBooksAndPeriodicals || 0);
                                const newPerksVal = (inc.newHealthCare || 0) + (inc.newTravelling || 0) + (inc.newMobile || 0) + (inc.newInternet || 0) + (inc.newBooksAndPeriodicals || 0);

                                // const lastApprovedTotal = (inc.oldFixed || 0) + oldPerksVal + (inc.oldVariable || 0);
                                // const currentApprovedTotal = (inc.newFixed || 0) + newPerksVal + (inc.newVariable || 0);

                                return (
                                    <tr key={inc.id} className="hover:bg-primary-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3 text-xs">
                                                <div className="h-10 w-10 rounded-2xl bg-secondary-100 flex items-center justify-center text-secondary-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                                    <UserIcon size={18} />
                                                </div>
                                                <div>
                                                    <Link
                                                        href={`/dashboard/hr-management/employees/${emp?.id}`}
                                                        className="font-black text-secondary-900 leading-tight uppercase tracking-tight hover:text-primary-600 transition-colors"
                                                    >
                                                        {emp?.user?.name}
                                                    </Link>
                                                    <p className="text-[10px] text-secondary-400">{emp?.user?.email}</p>
                                                    <p className="text-[9px] text-primary-500 font-black uppercase mt-0.5 tracking-widest">{emp?.user?.company?.name || 'Main Group'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs italic">
                                            <div className="text-[11px] font-medium text-secondary-700">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-secondary-400" />
                                                    <FormattedDate date={emp?.dateOfJoining} />
                                                </div>
                                                <p className="text-primary-600 font-black mt-1 uppercase tracking-tighter">({calculateExperience(emp?.dateOfJoining)})</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-secondary-600 font-mono text-xs italic">
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-secondary-900">₹{(inc.oldFixed || 0).toLocaleString()}</p>
                                                <span className="text-[8px] bg-secondary-100 px-1 rounded font-black text-secondary-400">FY{inc.fiscalYear || '??'}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[9px] font-black uppercase tracking-tighter">
                                                <span className="text-secondary-400">Re: <span className="text-secondary-600">₹{oldPerksVal.toLocaleString()}</span></span>
                                                <span className="text-secondary-400">Var: <span className="text-secondary-600">₹{(inc.oldVariable || 0).toLocaleString()}</span></span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-secondary-600 font-mono text-xs italic">
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-secondary-900 underline decoration-primary-200 underline-offset-4">₹{(inc.newFixed || 0).toLocaleString()}</p>
                                                <span className="text-[8px] bg-primary-100 px-1 rounded font-black text-primary-500">FY{inc.fiscalYear || '??'}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[9px] font-black uppercase tracking-tighter">
                                                <span className="text-primary-400">Re: <span className="text-primary-700">₹{newPerksVal.toLocaleString()}</span></span>
                                                <span className="text-primary-400">Var: <span className="text-primary-700">₹{(inc.newVariable || 0).toLocaleString()}</span></span>
                                            </div>
                                            <div className="text-[10px] text-primary-500 mt-2 flex items-center gap-1 font-bold not-italic">
                                                <Clock size={10} />
                                                <FormattedDate date={inc.effectiveDate} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs italic">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-indigo-600">
                                                        ₹{(inc.incrementAmount || 0).toLocaleString()}
                                                    </span>
                                                    <span className="text-[8px] bg-indigo-100 px-1 rounded font-black text-indigo-500">FY{inc.fiscalYear || '??'}</span>
                                                </div>
                                                <span className="text-[10px] text-indigo-500 mt-1.5 flex items-center gap-1 font-bold not-italic">
                                                    <Clock size={12} />
                                                    <FormattedDate date={inc.effectiveDate} />
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => openReasonModal(inc)}
                                                className="h-10 w-10 bg-secondary-50 hover:bg-primary-600 text-secondary-400 hover:text-white rounded-2xl transition-all flex items-center justify-center shadow-sm hover:shadow-lg group/btn"
                                                title="View Logical Context & KRA/KPI"
                                            >
                                                <HelpCircle size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs italic">
                                            <p className="font-black text-secondary-800">₹{(inc.oldSalary || 0).toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs italic">
                                            <div className="flex flex-col items-end">
                                                <p className="font-black text-success-600 text-sm">₹{(inc.newSalary || 0).toLocaleString()}</p>
                                                <span className="text-[10px] font-black bg-success-50 text-success-700 px-2 py-0.5 rounded-full mt-1.5 border border-success-100">
                                                    +{(inc.percentage || 0).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openReviewModal(inc)} className="p-2 hover:bg-success-50 rounded-xl transition-colors text-success-600 shadow-sm hover:shadow active:scale-95" title="Manage Reviews"><ClipboardList size={18} /></button>
                                                <Link href={`/dashboard/hr-management/increments/${inc.id}`} className="p-2 hover:bg-primary-50 rounded-xl transition-colors text-primary-600 shadow-sm hover:shadow active:scale-95"><Eye size={18} /></Link>
                                                <Link href={`/dashboard/hr-management/increments/${inc.id}/edit`} className="p-2 hover:bg-blue-50 rounded-xl transition-colors text-blue-600 shadow-sm hover:shadow active:scale-95"><Edit size={18} /></Link>
                                                <button onClick={() => handleDelete(inc.id, inc.status)} className="p-2 hover:bg-danger-50 rounded-xl transition-colors text-danger-600 shadow-sm hover:shadow active:scale-95"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Reason Modal - Fixed Screen Visibility */}
                {/* Reason Modal Portal */}
                {mounted && isReasonModalOpen && selectedIncrement && createPortal(
                    <div className="fixed inset-0 bg-secondary-900/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-white/20 flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
                            {/* ... modal content ... */}
                            <div className="p-8 border-b border-secondary-100 bg-gradient-to-br from-secondary-50 via-white to-secondary-50 flex justify-between items-center shrink-0">
                                {/* ... header ... */}
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 rounded-3xl bg-primary-600 flex items-center justify-center text-white shadow-xl shadow-primary-200">
                                        <TrendingUp size={30} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-secondary-900 uppercase tracking-tight">Intelligence Context</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-secondary-500 font-black uppercase tracking-widest">{selectedIncrement.employeeProfile?.user?.name}</span>
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse"></div>
                                            <span className="text-xs text-primary-600 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                <Clock size={12} /> Effective: <FormattedDate date={selectedIncrement.effectiveDate} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsReasonModalOpen(false)} className="h-12 w-12 flex items-center justify-center bg-danger-50 hover:bg-danger-600 text-danger-500 hover:text-white rounded-2xl transition-all shadow-sm hover:shadow-lg active:scale-90">
                                    <XCircle size={28} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8 space-y-10 overflow-y-auto custom-scrollbar flex-1 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent)]">
                                {/* Salary Grid */}
                                <section className="space-y-4">
                                    <h4 className="text-[11px] font-black text-secondary-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-3 ml-1">
                                        <DollarSign size={14} className="text-primary-500" /> Compensation Architecture
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div className="p-6 bg-secondary-50 rounded-3xl border border-secondary-100 group hover:border-primary-200 transition-colors">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase mb-2">Fixed Salary (F)</p>
                                            <p className="text-2xl font-black text-secondary-900 tracking-tight">₹{(selectedIncrement.newFixed || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="p-6 bg-primary-50 rounded-3xl border border-primary-100 group hover:border-primary-400 transition-colors">
                                            <p className="text-[10px] font-black text-primary-600 uppercase mb-2">Exemp / Perks (Re)</p>
                                            <p className="text-2xl font-black text-primary-900 tracking-tight">
                                                ₹{((selectedIncrement.newHealthCare || 0) +
                                                    (selectedIncrement.newTravelling || 0) +
                                                    (selectedIncrement.newMobile || 0) +
                                                    (selectedIncrement.newInternet || 0) +
                                                    (selectedIncrement.newBooksAndPeriodicals || 0)).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 group hover:border-indigo-400 transition-colors">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Variable (v)</p>
                                            <p className="text-2xl font-black text-indigo-900 tracking-tight">₹{(selectedIncrement.newVariable || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    {/* Reason Section */}
                                    <section className="space-y-4">
                                        <h4 className="text-[11px] font-black text-secondary-400 uppercase tracking-[0.25em] flex items-center gap-3 ml-1">
                                            <Info size={14} className="text-primary-500" /> Strategic Justification
                                        </h4>
                                        <div className="p-7 bg-white rounded-3xl border-2 border-primary-100/50 text-secondary-700 text-sm leading-relaxed italic shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-2 h-full bg-primary-600"></div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                                <TrendingUp size={100} />
                                            </div>
                                            &ldquo;{selectedIncrement.reason || 'No specific logical justification provided by the recommending authority.'}&rdquo;
                                        </div>
                                    </section>

                                    {/* Promotions Section */}
                                    <section className="space-y-4">
                                        <h4 className="text-[11px] font-black text-secondary-400 uppercase tracking-[0.25em] flex items-center gap-3 ml-1">
                                            <TrendingUp size={14} className="text-indigo-500" /> Career Propagation
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="p-5 bg-secondary-900 rounded-3xl shadow-lg border border-secondary-800">
                                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1">New Designation</p>
                                                <p className="text-sm font-black text-white truncate">{selectedIncrement.newDesignation || 'Unchanged'}</p>
                                            </div>
                                            <div className="p-5 bg-indigo-600 rounded-3xl shadow-lg border border-indigo-500">
                                                <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Target Threshold</p>
                                                <p className="text-sm font-black text-white">₹{(selectedIncrement.newMonthlyTarget || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Performance Redefinitions */}
                                <section className="space-y-6">
                                    <h4 className="text-[11px] font-black text-secondary-400 uppercase tracking-[0.25em] flex items-center gap-3 ml-1">
                                        <LayoutGrid size={14} className="text-primary-500" /> Goal Realignment (KRA/KPI)
                                    </h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-secondary-600 uppercase ml-2 tracking-widest">Defined KRA</p>
                                            <div className="p-7 bg-secondary-50 rounded-[2rem] border border-secondary-100 min-h-[220px] text-[13px] text-secondary-700 whitespace-pre-wrap leading-relaxed shadow-inner hover:bg-white hover:border-primary-200 transition-all">
                                                {selectedIncrement.newKRA || 'Standard KRA policy remains active for this position.'}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-secondary-600 uppercase ml-2 tracking-widest">Defined KPI Metrics</p>
                                            <div className="p-7 bg-secondary-900 rounded-[2rem] border border-secondary-800 min-h-[220px] text-xs font-mono text-primary-400 overflow-x-auto shadow-inner hover:bg-secondary-800 transition-all custom-scrollbar">
                                                {(() => {
                                                    let kpiData;
                                                    try {
                                                        const rawKPI = selectedIncrement.newKPI;
                                                        if (typeof rawKPI === 'object' && rawKPI !== null) {
                                                            kpiData = rawKPI;
                                                        } else if (typeof rawKPI === 'string' && rawKPI.trim().startsWith('{')) {
                                                            kpiData = JSON.parse(rawKPI);
                                                        } else {
                                                            return rawKPI || 'Baseline performance metrics applied.';
                                                        }

                                                        if (Object.keys(kpiData).length === 0) return 'No metrics defined.';

                                                        return (
                                                            <ul className="space-y-2">
                                                                {Object.entries(kpiData).map(([key, value]: [string, any]) => (
                                                                    <li key={key} className="flex justify-between items-center border-b border-secondary-800 pb-1">
                                                                        <span className="text-secondary-400 font-bold opacity-80">{key.replace(/_/g, ' ')}:</span>
                                                                        <span className="text-white font-black">{String(value)}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        );
                                                    } catch (e) {
                                                        return selectedIncrement.newKPI || 'Baseline performance metrics applied.';
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 bg-secondary-50 border-t border-secondary-100 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-success-50 flex items-center justify-center text-success-600 border border-success-100">
                                        <DollarSign size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-secondary-400 uppercase">Impact Score</p>
                                        <p className="text-lg font-black text-secondary-900">+₹{(selectedIncrement.incrementAmount || 0).toLocaleString()} <span className="text-success-600">({(selectedIncrement.percentage || 0).toFixed(1)}%)</span></p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsReasonModalOpen(false)}
                                    className="px-12 py-4 bg-secondary-900 hover:bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl hover:shadow-primary-200 active:scale-95"
                                >
                                    Dismiss Intelligence
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {mounted && isReviewModalOpen && selectedIncrement && createPortal(
                    <IncrementReviewModal
                        isOpen={isReviewModalOpen}
                        onClose={() => setIsReviewModalOpen(false)}
                        onSave={handleSaveReview}
                        incrementRecord={selectedIncrement}
                    />,
                    document.body
                )}
            </div>
        </div>
    );
}
