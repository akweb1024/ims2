'use client';

import { useState, useEffect } from 'react';
import {
    X, User, Briefcase, DollarSign, FileText, Monitor, Clock, TrendingUp,
    Phone, Mail, MapPin, Award, Shield, Calendar, Building2, ChevronRight,
    CreditCard, Layers, Star, Target, Activity, ExternalLink
} from 'lucide-react';

interface Employee360ModalProps {
    employeeId: string;
    onClose: () => void;
    /** Controls which sections are visible - defaults to 'all'. Use 'manager' to hide salary. */
    viewAs?: 'admin' | 'manager' | 'all';
}

const TABS = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'personal', label: 'Personal', icon: Shield },
    { id: 'professional', label: 'Professional', icon: Briefcase },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'assets', label: 'Assets', icon: Monitor },
];

const fmt = (amount: number | undefined | null) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const InfoField = ({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) => (
    <div>
        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-sm font-semibold text-secondary-900 ${mono ? 'font-mono' : ''}`}>{value || <span className="text-secondary-300 italic font-normal">Not provided</span>}</p>
    </div>
);

const StatCard = ({ label, value, color = 'indigo', sub }: { label: string; value: any; color?: string; sub?: string }) => {
    const colors: any = {
        indigo: 'from-indigo-50 to-indigo-100 border-indigo-100 text-indigo-700',
        green: 'from-emerald-50 to-emerald-100 border-emerald-100 text-emerald-700',
        amber: 'from-amber-50 to-amber-100 border-amber-100 text-amber-700',
        rose: 'from-rose-50 to-rose-100 border-rose-100 text-rose-700',
    };
    return (
        <div className={`p-5 rounded-2xl bg-gradient-to-br border ${colors[color]}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{label}</p>
            <p className="text-2xl font-black">{value}</p>
            {sub && <p className="text-xs font-medium mt-1 opacity-70">{sub}</p>}
        </div>
    );
};

const StatusPill = ({ status }: { status: string }) => {
    const map: any = {
        PRESENT: 'bg-emerald-100 text-emerald-700',
        ABSENT: 'bg-rose-100 text-rose-700',
        HALF_DAY: 'bg-amber-100 text-amber-700',
        LATE: 'bg-orange-100 text-orange-700',
        LEAVE: 'bg-sky-100 text-sky-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${map[status] || 'bg-secondary-100 text-secondary-600'}`}>{status}</span>;
};

export default function Employee360Modal({ employeeId, onClose, viewAs = 'all' }: Employee360ModalProps) {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch(`/api/staff-management/employees/${employeeId}/full-profile`, { signal: controller.signal });
                if (res.ok) setData(await res.json());
            } catch (_) { /* ignore abort */ }
            finally { setLoading(false); }
        })();
        return () => controller.abort();
    }, [employeeId]);

    const hideSalary = viewAs === 'manager';
    const profile = data?.employeeProfile;
    const visibleTabs = TABS.filter(t => hideSalary ? t.id !== 'financial' : true);

    // Overall performance KPI
    const lastSnapshot = profile?.performanceSnapshots?.[0];
    const overallScore = lastSnapshot?.overallScore || 0;

    // Attendance summary (last 30 days from API)
    const attendance = profile?.attendance || [];
    const presentCount = attendance.filter((a: any) => a.status === 'PRESENT').length;
    const leaveCount = attendance.filter((a: any) => a.status === 'LEAVE').length;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-secondary-400">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                        <p className="font-bold text-sm animate-pulse">Loading employee profile...</p>
                    </div>
                ) : !data ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-secondary-400">
                        <p className="font-bold">Profile not found.</p>
                        <button onClick={onClose} className="mt-4 btn btn-secondary text-xs">Close</button>
                    </div>
                ) : (
                    <>
                        {/* ── HERO HEADER ─────────────────────────────────────────── */}
                        <div className="relative bg-gradient-to-br from-secondary-900 via-indigo-950 to-secondary-900 text-white p-8 shrink-0 overflow-hidden">
                            {/* Decorative blobs */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
                            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 flex items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    {/* Avatar */}
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-primary-500 flex items-center justify-center text-3xl font-black shadow-2xl ring-4 ring-white/10 shrink-0">
                                        {data.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight">{data.name}</h2>
                                        <p className="text-indigo-200 font-bold text-sm mt-1">
                                            {profile?.designatRef?.name || 'No Designation'}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {profile?.employeeId && <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-black tracking-wider uppercase">ID: {profile.employeeId}</span>}
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${data.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                                {data.isActive ? '● Active' : '● Inactive'}
                                            </span>
                                            <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-black tracking-wider uppercase">{data.role?.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick KPIs */}
                                <div className="hidden md:grid grid-cols-3 gap-4 text-center shrink-0">
                                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl min-w-[90px]">
                                        <p className="text-2xl font-black">{overallScore.toFixed(0)}</p>
                                        <p className="text-[10px] uppercase font-bold text-indigo-200 mt-1 tracking-wider">Perf Score</p>
                                    </div>
                                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl min-w-[90px]">
                                        <p className="text-2xl font-black">{presentCount}</p>
                                        <p className="text-[10px] uppercase font-bold text-indigo-200 mt-1 tracking-wider">Days Present</p>
                                    </div>
                                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl min-w-[90px]">
                                        <p className="text-2xl font-black">{profile?.currentLeaveBalance?.toFixed(1) || '0'}</p>
                                        <p className="text-[10px] uppercase font-bold text-indigo-200 mt-1 tracking-wider">Leave Bal</p>
                                    </div>
                                </div>

                                <button onClick={onClose} className="ml-auto shrink-0 p-2 hover:bg-white/10 rounded-xl transition-colors">
                                    <X size={22} />
                                </button>
                            </div>

                            {/* ── Breadcrumb info row */}
                            <div className="relative z-10 flex flex-wrap gap-6 mt-6 pt-6 border-t border-white/10 text-xs text-indigo-200">
                                {data.email && <span className="flex items-center gap-1.5"><Mail size={12} />{data.email}</span>}
                                {profile?.phoneNumber && <span className="flex items-center gap-1.5"><Phone size={12} />{profile.phoneNumber}</span>}
                                {data.department?.name && <span className="flex items-center gap-1.5"><Layers size={12} />{data.department.name}</span>}
                                {data.company?.name && <span className="flex items-center gap-1.5"><Building2 size={12} />{data.company.name}</span>}
                                {profile?.dateOfJoining && <span className="flex items-center gap-1.5"><Calendar size={12} />Joined {new Date(profile.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                            </div>
                        </div>

                        {/* ── TABS ────────────────────────────────────────────────── */}
                        <div className="border-b border-secondary-100 bg-white px-6 shrink-0 overflow-x-auto scrollbar-none">
                            <div className="flex gap-1">
                                {visibleTabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary-400 hover:text-secondary-700'}`}
                                    >
                                        <tab.icon size={14} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── CONTENT ──────────────────────────────────────────────── */}
                        <div className="flex-1 overflow-y-auto bg-secondary-50/50 p-6 scrollbar-thin">
                            <div className="max-w-4xl mx-auto space-y-6">

                                {/* ===== OVERVIEW ===== */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <StatCard label="Performance Score" value={`${overallScore.toFixed(0)}%`} color="indigo" sub={lastSnapshot ? `${lastSnapshot.month}/${lastSnapshot.year}` : 'N/A'} />
                                            <StatCard label="Days Present (30d)" value={presentCount} color="green" sub={`${leaveCount} on leave`} />
                                            <StatCard label="Leave Balance" value={`${profile?.currentLeaveBalance?.toFixed(1) || 0} d`} color="amber" />
                                            <StatCard label="Tasks Assigned" value={data._count?.tasks || 0} color="rose" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Reporting */}
                                            <div className="bg-white rounded-2xl p-5 border border-secondary-100 shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-3">Reporting To</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">{data.manager?.name?.[0] || '?'}</div>
                                                    <div>
                                                        <p className="font-bold text-secondary-900 text-sm">{data.manager?.name || 'Top Level'}</p>
                                                        <p className="text-xs text-secondary-400">{data.manager?.email || ''}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Company */}
                                            <div className="bg-white rounded-2xl p-5 border border-secondary-100 shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-3">Company & Department</p>
                                                <p className="font-bold text-secondary-900 text-sm">{data.company?.name || '-'}</p>
                                                <p className="text-xs text-secondary-400 mt-1">{data.department?.name || '-'}</p>
                                            </div>
                                            {/* Designation History */}
                                            <div className="bg-white rounded-2xl p-5 border border-secondary-100 shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-3">Current Role</p>
                                                <p className="font-bold text-secondary-900 text-sm">{profile?.designatRef?.name || 'Not assigned'}</p>
                                                <p className="text-xs text-secondary-400 mt-1">{data.role?.replace(/_/g, ' ')}</p>
                                            </div>
                                        </div>

                                        {/* Skills */}
                                        {profile?.skills && profile.skills.length > 0 && (
                                            <div className="bg-white rounded-2xl p-5 border border-secondary-100 shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-3">Skills</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {profile.skills.map((s: string, i: number) => (
                                                        <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100">{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* KPIs */}
                                        {profile?.kpis && profile.kpis.length > 0 && (
                                            <div className="bg-white rounded-2xl p-5 border border-secondary-100 shadow-sm">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Target size={16} className="text-indigo-500" />
                                                    <p className="font-bold text-secondary-900">Active KRA / KPIs</p>
                                                </div>
                                                <div className="space-y-3">
                                                    {profile.kpis.map((kpi: any) => {
                                                        const pct = Math.min(100, Math.round((kpi.current / kpi.target) * 100));
                                                        return (
                                                            <div key={kpi.id}>
                                                                <div className="flex justify-between items-end mb-1">
                                                                    <p className="text-sm font-bold text-secondary-800">{kpi.title}</p>
                                                                    <p className="text-xs font-black text-secondary-500">{kpi.current} / {kpi.target} {kpi.unit}</p>
                                                                </div>
                                                                <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ===== PERSONAL ===== */}
                                {activeTab === 'personal' && (
                                    <div className="space-y-4">
                                        <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm">
                                            <h3 className="font-black text-secondary-900 mb-4 flex items-center gap-2"><Mail size={16} className="text-indigo-500" />Contact Information</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                                <InfoField label="Official Email" value={data.email} />
                                                <InfoField label="Phone" value={profile?.phoneNumber} />
                                                <InfoField label="Emergency Contact" value={profile?.emergencyContact} />
                                                <InfoField label="Address" value={profile?.address} />
                                                <InfoField label="City" value={profile?.city} />
                                                <InfoField label="State" value={profile?.state} />
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm">
                                            <h3 className="font-black text-secondary-900 mb-4 flex items-center gap-2"><Shield size={16} className="text-indigo-500" />Identity & Compliance Documents</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                                <InfoField label="Aadhar No." value={profile?.aadharNumber} mono />
                                                <InfoField label="PAN / Tax ID" value={profile?.panNumber} mono />
                                                <InfoField label="UAN (PF)" value={profile?.uanNumber} mono />
                                                <InfoField label="ESIC" value={profile?.esicNumber} mono />
                                                <InfoField label="Passport" value={profile?.passportNumber} mono />
                                                <InfoField label="Bank Account" value={profile?.bankAccountNumber} mono />
                                                <InfoField label="IFSC" value={profile?.ifscCode} mono />
                                                <InfoField label="Bank Name" value={profile?.bankName} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ===== PROFESSIONAL ===== */}
                                {activeTab === 'professional' && (
                                    <div className="space-y-4">
                                        <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm">
                                            <h3 className="font-black text-secondary-900 mb-4 flex items-center gap-2"><Briefcase size={16} className="text-indigo-500" />Current Position</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                                <InfoField label="Company" value={data.company?.name} />
                                                <InfoField label="Department" value={data.department?.name} />
                                                <InfoField label="Designation" value={profile?.designatRef?.name} />
                                                <InfoField label="Reporting To" value={data.manager?.name} />
                                                <InfoField label="Employee ID" value={profile?.employeeId || profile?.employeeCode} mono />
                                                <InfoField label="Date of Joining" value={profile?.dateOfJoining ? new Date(profile.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null} />
                                                <InfoField label="Employment Type" value={profile?.employmentType} />
                                                <InfoField label="Work Mode" value={profile?.workMode} />
                                            </div>
                                        </div>
                                        {/* Designation History */}
                                        {profile?.companyDesignations?.length > 0 && (
                                            <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm">
                                                <h3 className="font-black text-secondary-900 mb-4 flex items-center gap-2"><ChevronRight size={16} className="text-indigo-500" />Designation History</h3>
                                                <div className="space-y-3">
                                                    {profile.companyDesignations.map((d: any) => (
                                                        <div key={d.id} className="flex items-center justify-between py-2 border-b border-secondary-50 last:border-0">
                                                            <div>
                                                                <p className="font-bold text-secondary-900 text-sm">{d.title}</p>
                                                                <p className="text-xs text-secondary-400">{d.company?.name}</p>
                                                            </div>
                                                            <p className="text-xs text-secondary-400">{new Date(d.assignedAt).toLocaleDateString()}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ===== FINANCIAL ===== */}
                                {activeTab === 'financial' && !hideSalary && (
                                    <div className="space-y-4">
                                        {profile?.salaryStructure && (
                                            <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-black text-secondary-900 flex items-center gap-2"><DollarSign size={16} className="text-indigo-500" />Current Salary Structure</h3>
                                                    <span className="text-2xl font-black text-emerald-600">{fmt(profile.salaryStructure.netSalary)}<span className="text-sm font-medium text-secondary-400">/mo</span></span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                                    <InfoField label="Basic Salary" value={fmt(profile.salaryStructure.basicSalary)} />
                                                    <InfoField label="HRA" value={fmt(profile.salaryStructure.hra)} />
                                                    <InfoField label="Special Allowance" value={fmt(profile.salaryStructure.specialAllowance)} />
                                                    <InfoField label="Gross Salary" value={fmt(profile.salaryStructure.grossSalary)} />
                                                    <InfoField label="PF (Employee)" value={fmt(profile.salaryStructure.pfEmployee)} />
                                                    <InfoField label="Professional Tax" value={fmt(profile.salaryStructure.professionalTax)} />
                                                    <InfoField label="Total Deductions" value={fmt(profile.salaryStructure.totalDeductions)} />
                                                    <InfoField label="Net Salary" value={fmt(profile.salaryStructure.netSalary)} />
                                                </div>
                                            </div>
                                        )}
                                        {/* Increment History */}
                                        {profile?.incrementHistory?.length > 0 && (
                                            <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm overflow-x-auto">
                                                <h3 className="font-black text-secondary-900 mb-4 flex items-center gap-2"><Activity size={16} className="text-indigo-500" />Increment History</h3>
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-secondary-50 text-secondary-400 text-[10px] uppercase font-black tracking-wider">
                                                        <tr>{['Effective Date', 'Old CTC', 'New CTC', '+Amount', 'Status'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-secondary-50">
                                                        {profile.incrementHistory.map((h: any) => (
                                                            <tr key={h.id} className="hover:bg-secondary-50">
                                                                <td className="px-4 py-3">{new Date(h.effectiveDate).toLocaleDateString()}</td>
                                                                <td className="px-4 py-3">{fmt(h.oldSalary)}</td>
                                                                <td className="px-4 py-3 font-bold">{fmt(h.newSalary)}</td>
                                                                <td className="px-4 py-3 text-emerald-600 font-bold">+{fmt(h.incrementAmount)}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-secondary-100 text-secondary-600">{h.status}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ===== PERFORMANCE ===== */}
                                {activeTab === 'performance' && (
                                    <div className="space-y-4">
                                        {/* KPIs */}
                                        {profile?.kpis?.length > 0 && (
                                            <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm">
                                                <h3 className="font-black text-secondary-900 mb-4 flex items-center gap-2"><Target size={16} className="text-indigo-500" />Active KRA / KPIs</h3>
                                                <div className="space-y-4">
                                                    {profile.kpis.map((kpi: any) => {
                                                        const pct = Math.min(100, Math.round((kpi.current / kpi.target) * 100));
                                                        return (
                                                            <div key={kpi.id} className="p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <p className="font-bold text-secondary-900 text-sm">{kpi.title}</p>
                                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${pct >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{pct}%</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs text-secondary-400 mb-1.5">
                                                                    <span>{kpi.period}</span>
                                                                    <span>{kpi.current} / {kpi.target} {kpi.unit}</span>
                                                                </div>
                                                                <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        {/* Performance Reviews */}
                                        {profile?.performanceReviews?.length > 0 && (
                                            <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm">
                                                <h3 className="font-black text-secondary-900 mb-4 flex items-center gap-2"><Star size={16} className="text-amber-500" />Performance Reviews</h3>
                                                <div className="space-y-3">
                                                    {profile.performanceReviews.map((r: any) => (
                                                        <div key={r.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl">
                                                            <div>
                                                                <p className="text-sm font-bold text-secondary-900">{r.period || new Date(r.date).toLocaleDateString()}</p>
                                                                <p className="text-xs text-secondary-400">Reviewed by {r.reviewer?.name || 'System'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xl font-black text-indigo-600">{r.rating || r.overallRating || '-'}</p>
                                                                <p className="text-[10px] text-secondary-400 uppercase font-bold">{r.type || 'Review'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {!profile?.kpis?.length && !profile?.performanceReviews?.length && (
                                            <div className="bg-white rounded-2xl p-12 border border-secondary-100 shadow-sm text-center text-secondary-400">
                                                <TrendingUp className="mx-auto mb-3 opacity-30" size={40} />
                                                <p className="font-medium">No performance data available yet.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ===== ATTENDANCE ===== */}
                                {activeTab === 'attendance' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <StatCard label="Present (30d)" value={presentCount} color="green" />
                                            <StatCard label="On Leave (30d)" value={leaveCount} color="amber" />
                                            <StatCard label="Absent (30d)" value={Math.max(0, 30 - presentCount - leaveCount)} color="rose" />
                                        </div>
                                        <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm overflow-x-auto">
                                            <h3 className="font-black text-secondary-900 mb-4">Attendance Log (Last 30 Days)</h3>
                                            {attendance.length === 0 ? (
                                                <p className="text-sm italic text-secondary-400">No attendance records found.</p>
                                            ) : (
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-secondary-50 text-secondary-400 text-[10px] uppercase font-black tracking-wider">
                                                        <tr>{['Date', 'Check In', 'Check Out', 'Status', 'Work From'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-secondary-50">
                                                        {attendance.slice(0, 30).map((a: any) => (
                                                            <tr key={a.id} className="hover:bg-secondary-50">
                                                                <td className="px-4 py-3 font-medium">{new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                                                                <td className="px-4 py-3">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                                <td className="px-4 py-3">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                                <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                                                                <td className="px-4 py-3 text-secondary-400 text-xs">{a.workFrom || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                        {/* Leave Requests */}
                                        {profile?.leaveRequests?.length > 0 && (
                                            <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-sm overflow-x-auto">
                                                <h3 className="font-black text-secondary-900 mb-4">Recent Leave Requests</h3>
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-secondary-50 text-secondary-400 text-[10px] uppercase font-black tracking-wider">
                                                        <tr>{['Type', 'From', 'To', 'Status', 'Reason'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-secondary-50">
                                                        {profile.leaveRequests.map((l: any) => (
                                                            <tr key={l.id} className="hover:bg-secondary-50">
                                                                <td className="px-4 py-3 font-bold">{l.type}</td>
                                                                <td className="px-4 py-3">{new Date(l.startDate).toLocaleDateString()}</td>
                                                                <td className="px-4 py-3">{new Date(l.endDate).toLocaleDateString()}</td>
                                                                <td className="px-4 py-3"><StatusPill status={l.status} /></td>
                                                                <td className="px-4 py-3 text-secondary-400 text-xs truncate max-w-[160px]">{l.reason || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ===== DOCUMENTS ===== */}
                                {activeTab === 'documents' && (
                                    <div className="space-y-4">
                                        {(profile?.documents?.length || 0) + (profile?.digitalDocuments?.length || 0) === 0 ? (
                                            <div className="bg-white rounded-2xl p-12 border border-secondary-100 shadow-sm text-center text-secondary-400">
                                                <FileText className="mx-auto mb-3 opacity-30" size={40} />
                                                <p className="font-medium">No documents uploaded yet.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {[...(profile?.documents || []), ...(profile?.digitalDocuments || [])].map((doc: any) => (
                                                    <div key={doc.id} className="bg-white rounded-2xl p-5 border border-secondary-100 shadow-sm flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><FileText size={18} /></div>
                                                            <div>
                                                                <p className="font-bold text-secondary-900 text-sm">{doc.name || doc.title || doc.type}</p>
                                                                <p className="text-[10px] text-secondary-400 uppercase font-bold mt-0.5">{doc.fileType || doc.category || 'Document'}</p>
                                                            </div>
                                                        </div>
                                                        {(doc.fileUrl || doc.url) && (
                                                            <a href={doc.fileUrl || doc.url} target="_blank" rel="noreferrer"
                                                                className="shrink-0 flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                                                                View <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ===== ASSETS ===== */}
                                {activeTab === 'assets' && (
                                    <div className="space-y-4">
                                        {!data.assignedAssets?.length ? (
                                            <div className="bg-white rounded-2xl p-12 border border-secondary-100 shadow-sm text-center text-secondary-400">
                                                <Monitor className="mx-auto mb-3 opacity-30" size={40} />
                                                <p className="font-medium">No IT assets assigned.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {data.assignedAssets.map((a: any) => (
                                                    <div key={a.id} className="bg-white rounded-2xl p-5 border border-secondary-100 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="p-2 bg-secondary-100 rounded-xl"><Monitor size={16} className="text-secondary-600" /></div>
                                                            <div>
                                                                <p className="font-bold text-secondary-900 text-sm">{a.name}</p>
                                                                <p className="text-[10px] text-secondary-400 uppercase font-bold">{a.type || '-'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                                            <InfoField label="Serial No." value={a.serialNumber} mono />
                                                            <InfoField label="Status" value={a.status} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
