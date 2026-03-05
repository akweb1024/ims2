'use client';

import { useState, useEffect } from 'react';
import {
    IndianRupee, TrendingUp, Globe, Search, DollarSign,
    Filter, CreditCard, ArrowDownCircle, TrendingDown,
    Building2, User, Calendar, ChevronDown, BadgeDollarSign,
    Banknote, Wallet, AlertCircle
} from 'lucide-react';
import { formatToISTDate, formatToISTTime } from '@/lib/date-utils';

export default function EmployeeTransactions() {
    const [tab, setTab] = useState<'company' | 'personal'>('company');

    // Company ledger state
    const [companyData, setCompanyData] = useState<any>(null);
    const [companyLoading, setCompanyLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Personal payroll state
    const [salarySlips, setSalarySlips] = useState<any[]>([]);
    const [slipsLoading, setSlipsLoading] = useState(false);
    const [slipsFetched, setSlipsFetched] = useState(false);
    const [expandedSlip, setExpandedSlip] = useState<string | null>(null);

    // User info
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role || '');
        fetchCompany();
    }, []);

    const fetchCompany = async () => {
        setCompanyLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/payments/razorpay', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setCompanyData(await res.json());
        } catch (err) {
            console.error('Failed to fetch company transactions', err);
        } finally {
            setCompanyLoading(false);
        }
    };

    const fetchSalarySlips = async () => {
        if (slipsFetched) return;
        setSlipsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/salary-slips', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSalarySlips(await res.json());
        } catch (err) {
            console.error('Failed to fetch salary slips', err);
        } finally {
            setSlipsLoading(false);
            setSlipsFetched(true);
        }
    };

    const handleTabChange = (t: 'company' | 'personal') => {
        setTab(t);
        if (t === 'personal') fetchSalarySlips();
    };

    const handleClaim = async (paymentId: string) => {
        if (!confirm('Are you sure the payment is manually claimed by you? This will generate a revenue claim request.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/revenue/claims', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId })
            });
            if (res.ok) {
                alert('Claim submitted successfully!');
                fetchCompany();
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error}`);
            }
        } catch {
            alert('Network error');
        }
    };

    const filteredPayments = companyData?.payments?.filter((p: any) => {
        const matchesSearch =
            (p.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.razorpayPaymentId?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    }) || [];

    const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const getSlipStatusStyle = (status: string) => {
        if (status === 'PAID') return 'bg-green-100 text-green-800 border-green-200';
        if (status === 'GENERATED') return 'bg-blue-100 text-blue-800 border-blue-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-8">

            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Transactions</h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                        Company ledger &amp; your payroll history
                    </p>
                </div>

                {/* Tab Switch */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
                    <button
                        onClick={() => handleTabChange('company')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'company' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Building2 size={14} /> Company Ledger
                    </button>
                    <button
                        onClick={() => handleTabChange('personal')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'personal' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <User size={14} /> My Payroll
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════
                TAB 1: COMPANY LEDGER
            ══════════════════════════════════ */}
            {tab === 'company' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {companyLoading ? (
                        <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                            <IndianRupee size={48} className="text-indigo-200 animate-bounce" />
                            <p className="text-gray-400 font-bold animate-pulse">Loading Company Ledger...</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-gray-900 to-black p-7 text-white">
                                    <div className="absolute top-0 right-0 opacity-10 -mr-6 -mt-6">
                                        <TrendingUp size={120} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Gross Revenue (INR)</p>
                                    <h3 className="text-3xl font-black tabular-nums">
                                        ₹{Math.round(companyData?.stats?.totalRevenue || 0).toLocaleString('en-IN')}
                                    </h3>
                                    <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                                        Live Metric
                                    </span>
                                </div>

                                <div className="rounded-[1.75rem] bg-white border border-gray-100 shadow-sm p-7">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Transactions</p>
                                    <h3 className="text-3xl font-black text-gray-900 tabular-nums">{companyData?.stats?.totalCount || 0}</h3>
                                    <p className="text-[10px] text-gray-400 mt-3 font-medium">via Razorpay gateway</p>
                                </div>

                                <div className="rounded-[1.75rem] bg-white border border-gray-100 shadow-sm p-7">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Current Month</p>
                                    <h3 className="text-3xl font-black text-gray-900 tabular-nums">
                                        ₹{(companyData?.stats?.currentMonthRevenue || 0).toLocaleString('en-IN')}
                                    </h3>
                                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-green-600">
                                        <TrendingUp size={11} />
                                        {typeof companyData?.stats?.momGrowth === 'number' ? companyData.stats.momGrowth.toFixed(1) : 0}% vs last month
                                    </div>
                                </div>
                            </div>

                            {/* Transparency banner */}
                            <div className="flex items-start gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600 shrink-0">
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-indigo-900">Company Revenue Transparency</p>
                                    <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                                        All employees can view company transactions to understand revenue flow.
                                        This promotes financial transparency across the organization.
                                    </p>
                                </div>
                            </div>

                            {/* Ledger Table */}
                            <div className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm overflow-hidden">
                                {/* Table Header / Filters */}
                                <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div>
                                        <h3 className="font-black text-gray-900 text-lg">Company Ledger</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                            {filteredPayments.length} transactions shown
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                                        <div className="relative flex-1 lg:min-w-[280px]">
                                            <Search size={14} className="absolute left-4 top-3.5 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by ID, name or description..."
                                                className="w-full pl-10 pr-4 py-3 text-xs font-bold border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <div className="relative">
                                            <Filter size={13} className="absolute left-3.5 top-3.5 text-gray-400" />
                                            <select
                                                className="pl-9 pr-8 py-3 text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-xl bg-gray-50 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option value="ALL">All Status</option>
                                                <option value="captured">Captured</option>
                                                <option value="authorized">Authorized</option>
                                                <option value="failed">Failed</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-4 text-left">Transaction ID</th>
                                                <th className="px-6 py-4 text-left">Customer / Service</th>
                                                <th className="px-6 py-4 text-left">Date &amp; Time</th>
                                                <th className="px-6 py-4 text-right">Amount</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                                <th className="px-6 py-4 text-center">Method</th>
                                                {['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(userRole) && (
                                                    <th className="px-6 py-4 text-center">Action</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white">
                                            {filteredPayments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-20 text-center">
                                                        <div className="flex flex-col items-center gap-3 text-gray-300">
                                                            <Search size={48} />
                                                            <p className="font-black text-xs uppercase tracking-widest">No matching transactions</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredPayments.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors group">
                                                        <td className="px-6 py-5">
                                                            <div className="font-mono text-xs font-black text-gray-900 group-hover:text-indigo-600">
                                                                #{p.razorpayPaymentId || p.id?.slice(0, 12)}
                                                            </div>
                                                            {p.international && (
                                                                <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-black rounded uppercase">
                                                                    <Globe size={8} /> Int&apos;l
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="text-sm font-black text-gray-900">{p.name || 'External Customer'}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[180px] mt-0.5">
                                                                {p.description || 'System Subscription'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="text-xs font-black text-gray-700">
                                                                {formatToISTDate(new Date(p.created_at * 1000))}
                                                            </div>
                                                            <div className="text-[9px] text-gray-400 font-bold mt-0.5">
                                                                {formatToISTTime(new Date(p.created_at * 1000))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <div className="font-mono text-sm font-black text-gray-900">
                                                                {p.currency} {p.amount?.toLocaleString('en-IN')}
                                                            </div>
                                                            {p.currency !== 'INR' && (
                                                                <div className="text-[9px] text-indigo-500 font-bold mt-0.5">
                                                                    ≈ ₹{Math.round(p.base_amount || p.amount).toLocaleString('en-IN')}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                                p.status === 'captured' ? 'bg-green-100 text-green-700' :
                                                                p.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                                'bg-amber-100 text-amber-700'
                                                            }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                                    p.status === 'captured' ? 'bg-green-500' :
                                                                    p.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                                                                }`} />
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded-lg">
                                                                {p.method || 'N/A'}
                                                            </span>
                                                        </td>
                                                        {['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(userRole) && (
                                                            <td className="px-6 py-5 text-center">
                                                                {p.status === 'captured' && !p.revenueTransaction ? (
                                                                    <button
                                                                        onClick={() => handleClaim(p.id)}
                                                                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                    >
                                                                        Claim
                                                                    </button>
                                                                ) : p.revenueTransaction ? (
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Claimed ✓</span>
                                                                ) : null}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════
                TAB 2: MY PAYROLL HISTORY
            ══════════════════════════════════ */}
            {tab === 'personal' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {slipsLoading ? (
                        <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                            <Banknote size={48} className="text-indigo-200 animate-bounce" />
                            <p className="text-gray-400 font-bold animate-pulse">Loading Payroll Records...</p>
                        </div>
                    ) : salarySlips.length === 0 ? (
                        <div className="p-16 text-center bg-white rounded-[1.75rem] border border-dashed border-gray-200">
                            <Wallet size={48} className="mx-auto text-gray-200 mb-4" />
                            <h3 className="font-black text-gray-500 text-sm">No Payroll Records Yet</h3>
                            <p className="text-xs text-gray-400 mt-2">Your salary slips will appear here once HR generates them each month.</p>
                        </div>
                    ) : (
                        <>
                            {/* Personal summary chips */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    {
                                        label: 'Total Slips',
                                        value: salarySlips.length,
                                        icon: <CreditCard size={18} />,
                                        color: 'bg-indigo-50 text-indigo-600',
                                    },
                                    {
                                        label: 'Total Earned',
                                        value: `₹${salarySlips.reduce((s: number, sl: any) => s + (sl.netPayable || sl.amountPaid || 0), 0).toLocaleString('en-IN')}`,
                                        icon: <IndianRupee size={18} />,
                                        color: 'bg-green-50 text-green-600',
                                    },
                                    {
                                        label: 'Latest Paid',
                                        value: salarySlips[0] ? `₹${(salarySlips[0].netPayable || salarySlips[0].amountPaid || 0).toLocaleString('en-IN')}` : '—',
                                        icon: <Wallet size={18} />,
                                        color: 'bg-blue-50 text-blue-600',
                                    },
                                    {
                                        label: 'TDS Deducted',
                                        value: `₹${salarySlips.reduce((s: number, sl: any) => s + (sl.tds || 0), 0).toLocaleString('en-IN')}`,
                                        icon: <TrendingDown size={18} />,
                                        color: 'bg-red-50 text-red-600',
                                    },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl ${stat.color}`}>{stat.icon}</div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                            <p className="font-black text-gray-900 text-base tabular-nums">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Salary slip cards */}
                            <div className="space-y-3">
                                {salarySlips.map((slip: any) => {
                                    const isExpanded = expandedSlip === slip.id;
                                    const netPay = slip.netPayable || slip.amountPaid || 0;
                                    const gross = slip.grossSalary || 0;
                                    const deductions = slip.totalDeductions || 0;
                                    const monthLabel = `${MONTH_NAMES[slip.month] || slip.month} ${slip.year}`;

                                    return (
                                        <div key={slip.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                            {/* Row header */}
                                            <button
                                                className="w-full p-5 flex items-center justify-between hover:bg-gray-50/60 transition-colors"
                                                onClick={() => setExpandedSlip(isExpanded ? null : slip.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                                        <BadgeDollarSign size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-black text-gray-900 text-sm">{monthLabel} Salary</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                                            Generated {formatToISTDate(slip.createdAt || slip.updatedAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0">
                                                    <div className="text-right">
                                                        <p className="font-black text-gray-900 tabular-nums">₹{netPay.toLocaleString('en-IN')}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold">Net Pay</p>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${getSlipStatusStyle(slip.status)}`}>
                                                        {slip.status || 'GENERATED'}
                                                    </span>
                                                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>

                                            {/* Expanded details */}
                                            {isExpanded && (
                                                <div className="border-t border-gray-100 px-5 pb-5 pt-4 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        {/* Earnings */}
                                                        <div>
                                                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                                                                <TrendingUp size={11} /> Earnings
                                                            </p>
                                                            <div className="space-y-2">
                                                                {[
                                                                    { label: 'Basic Salary', val: slip.basicSalary },
                                                                    { label: 'HRA', val: slip.hra },
                                                                    { label: 'Conveyance', val: slip.conveyance },
                                                                    { label: 'Medical', val: slip.medical },
                                                                    { label: 'Special Allowance', val: slip.specialAllowance },
                                                                    { label: 'Other Allowances', val: slip.otherAllowances },
                                                                    { label: 'Incentive', val: slip.salaryIncentive },
                                                                    { label: 'Statutory Bonus', val: slip.statutoryBonus },
                                                                ].filter(r => r.val > 0).map(row => (
                                                                    <div key={row.label} className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">{row.label}</span>
                                                                        <span className="font-bold text-gray-900 tabular-nums">₹{(row.val || 0).toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="border-t border-dashed border-green-200 pt-2 flex justify-between text-xs font-black">
                                                                    <span className="text-green-700">Gross Salary</span>
                                                                    <span className="text-green-700 tabular-nums">₹{gross.toLocaleString('en-IN')}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Deductions */}
                                                        <div>
                                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                                                                <TrendingDown size={11} /> Deductions
                                                            </p>
                                                            <div className="space-y-2">
                                                                {[
                                                                    { label: 'PF (Employee)', val: slip.pfEmployee },
                                                                    { label: 'ESIC (Employee)', val: slip.esicEmployee },
                                                                    { label: 'Professional Tax', val: slip.professionalTax },
                                                                    { label: 'TDS', val: slip.tds },
                                                                    { label: 'LWP Deduction', val: slip.lwpDeduction },
                                                                    { label: 'Advance Deduction', val: slip.advanceDeduction },
                                                                ].filter(r => r.val > 0).map(row => (
                                                                    <div key={row.label} className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">{row.label}</span>
                                                                        <span className="font-bold text-red-600 tabular-nums">–₹{(row.val || 0).toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="border-t border-dashed border-red-200 pt-2 flex justify-between text-xs font-black">
                                                                    <span className="text-red-600">Total Deductions</span>
                                                                    <span className="text-red-600 tabular-nums">–₹{deductions.toLocaleString('en-IN')}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Employer / Summary */}
                                                        <div>
                                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                                                                <Building2 size={11} /> Employer Contributions
                                                            </p>
                                                            <div className="space-y-2">
                                                                {[
                                                                    { label: 'PF (Employer)', val: slip.pfEmployer },
                                                                    { label: 'ESIC (Employer)', val: slip.esicEmployer },
                                                                    { label: 'Gratuity', val: slip.gratuity },
                                                                ].filter(r => r.val > 0).map(row => (
                                                                    <div key={row.label} className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">{row.label}</span>
                                                                        <span className="font-bold text-blue-700 tabular-nums">₹{(row.val || 0).toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                ))}

                                                                {/* Net Pay highlight */}
                                                                <div className="mt-4 bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Net Take-home</p>
                                                                    <p className="text-2xl font-black text-indigo-700 tabular-nums mt-1">
                                                                        ₹{netPay.toLocaleString('en-IN')}
                                                                    </p>
                                                                    {slip.ctc > 0 && (
                                                                        <p className="text-[10px] text-indigo-400 font-bold mt-1">CTC: ₹{slip.ctc.toLocaleString('en-IN')}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Perks row if any */}
                                                    {(slip.healthCare > 0 || slip.travelling > 0 || slip.mobile > 0 || slip.internet > 0 || slip.booksAndPeriodicals > 0) && (
                                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Perks &amp; Allowances</p>
                                                            <div className="flex flex-wrap gap-3">
                                                                {[
                                                                    { label: 'Health Care', val: slip.healthCare },
                                                                    { label: 'Travelling', val: slip.travelling },
                                                                    { label: 'Mobile', val: slip.mobile },
                                                                    { label: 'Internet', val: slip.internet },
                                                                    { label: 'Books', val: slip.booksAndPeriodicals },
                                                                ].filter(r => r.val > 0).map(row => (
                                                                    <span key={row.label} className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-[10px] font-bold">
                                                                        {row.label}: ₹{row.val.toLocaleString('en-IN')}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800">
                                    Salary slips are generated by HR at the end of each month. If you have questions, contact your HR manager.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
