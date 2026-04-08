'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import FormattedDate from '@/components/common/FormattedDate';
import { Download, Search, X, FileText, ChevronDown } from 'lucide-react';

// ─── Month helpers ────────────────────────────────────────────────────────────
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function getPreviousMonth() {
    const today = new Date();
    const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
    const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    return { month: prevMonth, year: prevYear };
}

// ─── PDF / DOCX generation helpers ───────────────────────────────────────────
function buildDocxContent(r: any, userName: string, empId: string): string {
    const monthName = MONTH_NAMES[(r.month ?? 1) - 1];
    return `
REIMBURSEMENT DECLARATION FORM
===============================
Employee Name  : ${userName}
Employee ID    : ${empId || 'N/A'}
Month          : ${monthName} ${r.year}
Status         : ${r.status}
Date Submitted : ${new Date(r.createdAt).toLocaleDateString('en-IN')}

EXPENSE BREAKDOWN
-----------------
Health Care Allowance  : ₹${(r.healthCare ?? 0).toLocaleString('en-IN')}
Travelling Allowance   : ₹${(r.travelling ?? 0).toLocaleString('en-IN')}
Mobile Allowance       : ₹${(r.mobile ?? 0).toLocaleString('en-IN')}
Internet Allowance     : ₹${(r.internet ?? 0).toLocaleString('en-IN')}
Books & Periodicals    : ₹${(r.booksAndPeriodicals ?? 0).toLocaleString('en-IN')}
                        ─────────────────────
Total Claim Amount     : ₹${(r.totalAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}

DECLARATION
-----------
I hereby declare that I have incurred the above expenses for official 
allowances during ${monthName} ${r.year}. I have the necessary 
receipts and agree that false declarations may lead to disciplinary action.

[Digitally Signed]
`.trim();
}

function downloadDocx(r: any, userName: string, empId: string) {
    const content = buildDocxContent(r, userName, empId);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reimbursement_${userName}_${MONTH_NAMES[(r.month ?? 1) - 1]}_${r.year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

async function downloadPDF(r: any, userName: string, empId: string) {
    const monthName = MONTH_NAMES[(r.month ?? 1) - 1];
    // Build printable HTML and trigger browser print-to-PDF
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Reimbursement - ${userName} - ${monthName} ${r.year}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f3f4f6; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; }
  .total-row td { font-weight: bold; font-size: 16px; background: #eff6ff; }
  .status { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #fef3c7; color: #92400e; }
  .status.APPROVED { background: #d1fae5; color: #065f46; }
  .status.PAID { background: #dbeafe; color: #1e40af; }
  .declaration { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 13px; color: #374151; background: #fffbeb; }
  .sig-row { display: flex; justify-content: flex-end; margin-top: 40px; }
  .sig-box { text-align: center; }
  .sig-box img { height: 60px; width: 120px; object-fit: contain; border-bottom: 1px solid #000; }
  .sig-box p { font-size: 11px; margin-top: 4px; color: #666; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>Reimbursement Declaration</h1>
<div class="subtitle">
  Employee: <strong>${userName}</strong> (${empId || 'N/A'}) &nbsp;|&nbsp;
  Period: <strong>${monthName} ${r.year}</strong> &nbsp;|&nbsp;
  Filed: ${new Date(r.createdAt).toLocaleDateString('en-IN')} &nbsp;|&nbsp;
  <span class="status ${r.status}">${r.status}</span>
</div>

<table>
  <thead><tr><th>Expense Category</th><th>Amount Claimed</th></tr></thead>
  <tbody>
    ${r.healthCare > 0 ? `<tr><td>Health Care Allowance</td><td>₹${r.healthCare.toLocaleString('en-IN')}</td></tr>` : ''}
    ${r.travelling > 0 ? `<tr><td>Travelling Allowance</td><td>₹${r.travelling.toLocaleString('en-IN')}</td></tr>` : ''}
    ${r.mobile > 0 ? `<tr><td>Mobile Allowance</td><td>₹${r.mobile.toLocaleString('en-IN')}</td></tr>` : ''}
    ${r.internet > 0 ? `<tr><td>Internet Allowance</td><td>₹${r.internet.toLocaleString('en-IN')}</td></tr>` : ''}
    ${r.booksAndPeriodicals > 0 ? `<tr><td>Books & Periodicals</td><td>₹${r.booksAndPeriodicals.toLocaleString('en-IN')}</td></tr>` : ''}
    <tr class="total-row"><td>Total Claim Amount</td><td>₹${r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
  </tbody>
</table>

<div class="declaration">
  <strong>Declaration:</strong> I hereby declare that I have incurred ₹${r.totalAmount.toLocaleString('en-IN')} for the 
  official allowances selected above during <strong>${monthName} ${r.year}</strong>. I have the necessary receipts and 
  agree that false declarations may lead to disciplinary action.
</div>

${r.employeeSignatureUrl ? `
<div class="sig-row">
  <div class="sig-box">
    <img src="${r.employeeSignatureUrl}" alt="Signature"/>
    <p>Authorised Signature</p>
  </div>
</div>` : ''}

</body>
</html>`;
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 600);
    }
}

// ─── User History Table ───────────────────────────────────────────────────────
function UserHistoryTable({ records, user }: { records: any[], user: any }) {
    const [searchMonth, setSearchMonth] = useState('');
    const [searchYear, setSearchYear] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = useMemo(() => {
        const result = records.filter(r => {
            const monthMatch = !searchMonth || r.month === parseInt(searchMonth);
            const yearMatch = !searchYear || r.year === parseInt(searchYear);

            const q = searchQuery.toLowerCase();
            const queryMatch = !q ||
                r.status.toLowerCase().includes(q) ||
                r.totalAmount.toString().includes(q) ||
                MONTH_NAMES[(r.month ?? 1) - 1].toLowerCase().includes(q);

            return monthMatch && yearMatch && queryMatch;
        });

        return result.slice(0, 5); // last 5 entries by default
    }, [records, searchMonth, searchYear, searchQuery]);


    const empId = user?.employeeProfile?.employeeId || '';

    if (records.length === 0) {
        return (
            <div className="p-20 text-center flex flex-col items-center text-secondary-300">
                <div className="text-6xl mb-6 opacity-20">📂</div>
                <h3 className="font-black text-2xl text-secondary-900 mb-2">History Empty</h3>
                <p className="text-sm font-medium text-secondary-400 max-w-xs mx-auto">Your verified reimbursement submissions will appear here.</p>
            </div>
        );
    }

    const currentYear = new Date().getFullYear();

    return (
        <div>
            {/* Filters */}
        <div className="p-4 border-b border-secondary-100 bg-secondary-50/50 flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-white border border-secondary-200 rounded-xl px-3 py-2 flex-grow sm:flex-grow-0">
                <Search size={14} className="text-secondary-400" />
                <input 
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="text-sm font-medium text-secondary-700 bg-transparent outline-none w-full sm:w-40"
                />
            </div>
            <div className="flex items-center gap-2 bg-white border border-secondary-200 rounded-xl px-3 py-2">
                <select
                    value={searchMonth}
                    onChange={e => setSearchMonth(e.target.value)}
                    className="text-sm font-medium text-secondary-700 bg-transparent outline-none"
                    title="Select Month"
                >
                    <option value="">All Months</option>
                    {MONTH_NAMES.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-2 bg-white border border-secondary-200 rounded-xl px-3 py-2">
                <select
                    value={searchYear}
                    onChange={e => setSearchYear(e.target.value)}
                    className="text-sm font-medium text-secondary-700 bg-transparent outline-none"
                    title="Select Year"
                >
                    <option value="">All Years</option>
                    {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>
            {(searchMonth || searchYear || searchQuery) && (
                <button
                    onClick={() => { setSearchMonth(''); setSearchYear(''); setSearchQuery(''); }}
                    className="flex items-center gap-1 text-xs font-bold text-danger-600 hover:bg-danger-50 px-2 py-1 rounded-lg transition-all"
                >
                    <X size={12} /> Clear Filters
                </button>
            )}


                <span className="ml-auto text-xs font-bold text-secondary-400 uppercase tracking-widest">
                    Showing last {Math.min(filtered.length, 5)} of {records.length}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-secondary-100/30 text-[10px] uppercase font-black text-secondary-400 tracking-[0.2em]">
                        <tr>
                            <th className="px-6 py-4">Date Filed</th>
                            <th className="px-6 py-4">Period</th>
                            <th className="px-6 py-4 text-right">Total Claim</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4">Signature</th>
                            <th className="px-6 py-4 text-center">Download</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                        {filtered.map((r, i) => {
                            const mn = MONTH_NAMES[(r.month ?? 1) - 1];
                            return (
                                <tr key={i} className="hover:bg-primary-50/40 transition-all group">
                                    <td className="px-6 py-5 font-bold text-secondary-900">
                                        <FormattedDate date={r.createdAt} />
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="bg-secondary-100/50 px-3 py-1.5 rounded-xl inline-block font-black text-[11px] text-secondary-700">
                                            {mn} {r.year}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right font-mono font-black text-secondary-900 text-lg">
                                        ₹{r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className={`inline-flex px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                            r.status === 'APPROVED' ? 'bg-success-500 text-white' :
                                            r.status === 'PAID' ? 'bg-primary-600 text-white' :
                                            'bg-amber-400 text-white'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        {r.employeeSignatureUrl ? (
                                            <div className="bg-white p-2 rounded-xl border border-secondary-100 shadow-sm inline-block">
                                                <Image src={r.employeeSignatureUrl} alt="Signature" width={64} height={32} unoptimized className="h-8 w-16 object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        ) : (
                                            <span className="text-secondary-300 text-[10px] font-black uppercase tracking-widest">Digital Only</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => downloadPDF(r, user?.name || 'Employee', empId)}
                                                title="Download PDF"
                                                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all hover:scale-110"
                                            >
                                                <FileText size={14} />
                                            </button>
                                            <button
                                                onClick={() => downloadDocx(r, user?.name || 'Employee', empId)}
                                                title="Download DOCX"
                                                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all hover:scale-110"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── HR Admin Table ───────────────────────────────────────────────────────────
function HRReimbursementTable() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterName, setFilterName] = useState('');
    const [filterEmpId, setFilterEmpId] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [debouncedName, setDebouncedName] = useState('');

    const currentYear = new Date().getFullYear();

    // Debounce name filter
    useEffect(() => {
        const t = setTimeout(() => setDebouncedName(filterName), 400);
        return () => clearTimeout(t);
    }, [filterName]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedName) params.set('name', debouncedName);
            if (filterEmpId) params.set('employeeId', filterEmpId);
            if (filterMonth) params.set('month', filterMonth);
            if (filterYear) params.set('year', filterYear);

            const res = await fetch(`/api/hr/reimbursements?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const { data } = await res.json();
                setRecords(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedName, filterEmpId, filterMonth, filterYear]);

    const clearFilters = () => {
        setFilterName('');
        setFilterEmpId('');
        setFilterMonth('');
        setFilterYear('');
    };

    const hasFilters = filterName || filterEmpId || filterMonth || filterYear;

    return (
        <div className="card-premium overflow-hidden border-t-8 border-t-primary-500">
            <div className="p-6 border-b border-secondary-100 bg-secondary-50/50">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-2xl font-black text-secondary-900 tracking-tight">All Reimbursements</h3>
                        <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mt-1">HR & Super Admin View</p>
                    </div>
                    <span className="bg-primary-600 text-white px-5 py-2 rounded-2xl font-black text-sm shadow-lg shadow-primary-100">
                        {records.length} Records
                    </span>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-white border border-secondary-200 rounded-xl px-3 py-2 flex-1 min-w-[160px]">
                        <Search size={14} className="text-secondary-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={filterName}
                            onChange={e => setFilterName(e.target.value)}
                            className="text-sm font-medium text-secondary-700 bg-transparent outline-none w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-secondary-200 rounded-xl px-3 py-2 min-w-[160px]">
                        <input
                            type="text"
                            placeholder="Employee ID..."
                            value={filterEmpId}
                            onChange={e => setFilterEmpId(e.target.value)}
                            className="text-sm font-medium text-secondary-700 bg-transparent outline-none w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-secondary-200 rounded-xl px-3 py-2">
                        <select
                            value={filterMonth}
                            onChange={e => setFilterMonth(e.target.value)}
                            className="text-sm font-medium text-secondary-700 bg-transparent outline-none"
                        >
                            <option value="">All Months</option>
                            {MONTH_NAMES.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-secondary-200 rounded-xl px-3 py-2">
                        <select
                            value={filterYear}
                            onChange={e => setFilterYear(e.target.value)}
                            className="text-sm font-medium text-secondary-700 bg-transparent outline-none"
                        >
                            <option value="">All Years</option>
                            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-danger-600 hover:bg-danger-50 rounded-xl border border-danger-200 transition-all"
                        >
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-black text-secondary-400 uppercase tracking-widest">Loading...</p>
                </div>
            ) : records.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center text-secondary-300">
                    <div className="text-6xl mb-6 opacity-20">📂</div>
                    <h3 className="font-black text-2xl text-secondary-900 mb-2">No Records Found</h3>
                    <p className="text-sm font-medium text-secondary-400">Adjust your filters to find records.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary-100/30 text-[10px] uppercase font-black text-secondary-400 tracking-[0.2em]">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Emp ID</th>
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4 text-right">Total Claim</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4">Filed On</th>
                                <th className="px-6 py-4 text-center">Download</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {records.map((r, i) => {
                                const mn = MONTH_NAMES[(r.month ?? 1) - 1];
                                const userName = r.user?.name || r.user?.email || 'Unknown';
                                const empId = r.user?.employeeProfile?.employeeId || 'N/A';
                                return (
                                    <tr key={i} className="hover:bg-primary-50/40 transition-all group">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-secondary-900">{userName}</div>
                                            <div className="text-xs text-secondary-400">{r.user?.email}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="font-mono text-xs font-bold bg-secondary-100 px-2 py-1 rounded-lg text-secondary-700">{empId}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="bg-secondary-100/50 px-3 py-1.5 rounded-xl inline-block font-black text-[11px] text-secondary-700">
                                                {mn} {r.year}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right font-mono font-black text-secondary-900 text-base">
                                            ₹{r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                                r.status === 'APPROVED' ? 'bg-success-500 text-white' :
                                                r.status === 'PAID' ? 'bg-primary-600 text-white' :
                                                'bg-amber-400 text-white'
                                            }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 font-bold text-secondary-500 text-xs">
                                            <FormattedDate date={r.createdAt} />
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => downloadPDF(r, userName, empId)}
                                                    title="Download PDF"
                                                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all hover:scale-110"
                                                >
                                                    <FileText size={14} />
                                                </button>
                                                <button
                                                    onClick={() => downloadDocx(r, userName, empId)}
                                                    title="Download DOCX"
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all hover:scale-110"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StaffReimbursementView({ fullProfile, user, onUpdateUser, isAdmin, defaultTab }: {
    fullProfile?: any;
    user: any;
    onUpdateUser?: () => void;
    isAdmin?: boolean;
    defaultTab?: 'form' | 'history' | 'hr';
}) {
    const isHROrAdmin = isAdmin || user?.role === 'SUPER_ADMIN' || user?.role === 'HR' || user?.role === 'HR_MANAGER';

    const [subTab, setSubTab] = useState<'form' | 'history' | 'hr'>(defaultTab || (isAdmin ? 'hr' : 'form'));
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Default to PREVIOUS month (reimbursement is always for last month)
    const prev = getPreviousMonth();
    const [selectedMonth, setSelectedMonth] = useState(prev.month);
    const [selectedYear, setSelectedYear] = useState(prev.year);

    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1];

    // Salary structure limits
    const ss = fullProfile?.salaryStructure || {};
    const perkLimits = useMemo(() => ({
        healthCare: ss.healthCare || 0,
        travelling: ss.travelling || 0,
        mobile: ss.mobile || 0,
        internet: ss.internet || 0,
        booksAndPeriodicals: ss.booksAndPeriodicals || 0,
    }), [ss.healthCare, ss.travelling, ss.mobile, ss.internet, ss.booksAndPeriodicals]);

    const [perkAmounts, setPerkAmounts] = useState({ ...perkLimits });

    useEffect(() => {
        setPerkAmounts({ ...perkLimits });
    }, [fullProfile, perkLimits]);

    const handleAmountChange = (category: string, value: string) => {
        const val = parseFloat(value) || 0;
        const limit = (perkLimits as any)[category] || 0;
        setPerkAmounts(prev => ({ ...prev, [category]: Math.min(val, limit) }));
    };

    const totalAmount = Object.values(perkAmounts).reduce((acc, curr) => acc + curr, 0);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reimbursements', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRecords(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, []);

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            if (uploadRes.ok) {
                const { url } = await uploadRes.json();
                const signatureRes = await fetch('/api/profile/signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify({ signatureUrl: url })
                });
                if (signatureRes.ok) {
                    setMessage({ type: 'success', text: 'Signature uploaded successfully.' });
                    if (onUpdateUser) onUpdateUser();
                } else {
                    setMessage({ type: 'error', text: 'Failed to save signature link.' });
                }
            } else {
                setMessage({ type: 'error', text: 'Upload failed.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network connection error.' });
        } finally {
            setUploading(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setSubmitLoading(true);
        try {
            const res = await fetch('/api/reimbursements', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ month: selectedMonth, year: selectedYear, perks: perkAmounts })
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Reimbursement declaration submitted successfully.' });
                fetchRecords();
                setTimeout(() => { setSubTab('history'); setMessage({ type: '', text: '' }); }, 2000);
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: err.error || 'Failed to submit.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network Error.' });
        } finally {
            setSubmitLoading(false);
        }
    };

    const selMonthName = MONTH_NAMES[selectedMonth - 1];
    const isSubmittedForSelected = records.some(r => r.month === selectedMonth && r.year === selectedYear);
    const hasAnyLimit = Object.values(perkLimits).some(v => v > 0);
    const empId = fullProfile?.employeeId || user?.employeeProfile?.employeeId || '';

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Tab Bar */}
            <div className="flex bg-secondary-50 p-1.5 rounded-2xl w-fit border border-secondary-100">
                <button
                    onClick={() => setSubTab('form')}
                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'form' ? 'bg-primary-600 text-white shadow-md scale-105' : 'text-secondary-500 hover:text-primary-600 hover:bg-primary-50'}`}
                >
                    <span className="text-lg">🧾</span> New Declaration
                </button>
                <button
                    onClick={() => setSubTab('history')}
                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'history' ? 'bg-primary-600 text-white shadow-md scale-105' : 'text-secondary-500 hover:text-primary-600 hover:bg-primary-50'}`}
                >
                    <span className="text-lg">📜</span> My History
                </button>
                {isHROrAdmin && (
                    <button
                        onClick={() => setSubTab('hr')}
                        className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'hr' ? 'bg-primary-600 text-white shadow-md scale-105' : 'text-secondary-500 hover:text-primary-600 hover:bg-primary-50'}`}
                    >
                        <span className="text-lg">👥</span> All Records
                    </button>
                )}
            </div>

            {/* ── FORM TAB ── */}
            {subTab === 'form' && (
                <div className="max-w-3xl mx-auto card-premium overflow-hidden border-t-8 border-t-primary-500">
                    <div className="p-8 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-secondary-900 tracking-tight leading-none mb-2">Reimbursement Filing</h2>
                                <p className="text-secondary-500 font-medium tracking-wide">
                                    Filing for period: <span className="text-primary-600 font-bold">{selMonthName} {selectedYear}</span>
                                </p>
                            </div>
                            {/* Month/Year selector — defaults to last month */}
                            <div className="flex items-center gap-3 bg-secondary-50 p-2 rounded-2xl border border-secondary-100">
                                <select
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                    className="select select-sm font-bold h-10 rounded-xl"
                                >
                                    {MONTH_NAMES.map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                                    className="select select-sm font-bold h-10 rounded-xl"
                                >
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {!hasAnyLimit ? (
                            <div className="bg-amber-50 p-8 rounded-3xl border border-amber-200 text-amber-900 text-center flex flex-col items-center">
                                <div className="text-5xl mb-4">⚠️</div>
                                <h3 className="font-black text-xl mb-2 tracking-tight">No Allowances Found</h3>
                                <p className="text-sm opacity-80 max-w-sm">Your salary structure doesn&apos;t include reimbursable components. Please contact HR.</p>
                            </div>
                        ) : isSubmittedForSelected ? (
                            <div className="bg-success-50 p-10 rounded-3xl border border-success-200 text-success-800 text-center flex flex-col items-center">
                                <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner animate-bounce">✓</div>
                                <h3 className="font-black text-2xl mb-2 tracking-tight">Already Submitted</h3>
                                <p className="text-base opacity-90 max-w-sm">You have already submitted your reimbursement claim for {selMonthName} {selectedYear}. Check the History tab for details.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleFormSubmit} className="space-y-8">
                                {message.text && (
                                    <div className={`p-5 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2 flex items-center gap-3 ${message.type === 'success' ? 'bg-success-100 text-success-700 border border-success-200' : 'bg-danger-100 text-danger-700 border border-danger-200'}`}>
                                        <span className="text-lg">{message.type === 'success' ? '✅' : '⚠️'}</span> {message.text}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] ml-1">Expense Breakdown</p>
                                    <div className="grid gap-4">
                                        {[
                                            { id: 'healthCare', label: 'Health Care Allowance', limit: perkLimits.healthCare },
                                            { id: 'travelling', label: 'Travelling Allowance', limit: perkLimits.travelling },
                                            { id: 'mobile', label: 'Mobile Allowance', limit: perkLimits.mobile },
                                            { id: 'internet', label: 'Internet Allowance', limit: perkLimits.internet },
                                            { id: 'booksAndPeriodicals', label: 'Books & Periodicals', limit: perkLimits.booksAndPeriodicals },
                                        ].filter(p => p.limit > 0).map((perk, i) => (
                                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-secondary-100 rounded-2xl hover:border-primary-200 hover:shadow-sm transition-all group">
                                                <div>
                                                    <h4 className="font-bold text-secondary-900 group-hover:text-primary-700 transition-colors">{perk.label}</h4>
                                                    <p className="text-xs text-secondary-400 font-medium">Monthly Limit: ₹{perk.limit.toLocaleString()}</p>
                                                </div>
                                                <div className="mt-3 sm:mt-0 relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        max={perk.limit}
                                                        min="0"
                                                        step="0.01"
                                                        value={(perkAmounts as any)[perk.id]}
                                                        onChange={e => handleAmountChange(perk.id, e.target.value)}
                                                        className="input input-sm w-full sm:w-40 pl-8 pr-4 font-mono font-bold text-right text-lg h-12 bg-secondary-50 border-secondary-100 focus:bg-white focus:ring-primary-500 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-primary-600 p-6 rounded-2xl shadow-xl shadow-primary-200 flex items-center justify-between text-white">
                                    <span className="font-bold text-primary-100 uppercase tracking-widest text-[10px]">Total Claim Amount</span>
                                    <span className="text-3xl font-black font-mono">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 text-amber-900">
                                    <label className="flex items-start gap-4 cursor-pointer">
                                        <input type="checkbox" required className="mt-1 w-6 h-6 rounded-lg text-primary-600 focus:ring-primary-500 border-amber-300 transition-all cursor-pointer" />
                                        <span className="text-sm font-semibold leading-relaxed">
                                            I hereby declare that I have incurred ₹{totalAmount.toLocaleString()} for the official allowances selected above during{' '}
                                            <span className="bg-amber-200/50 px-1.5 rounded">{selMonthName} {selectedYear}</span>.
                                            I have the necessary receipts and agree that false declarations may lead to disciplinary action.
                                        </span>
                                    </label>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-secondary-100">
                                    <div className="w-full sm:w-auto">
                                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] mb-2">Authenticated Signature</p>
                                        {user.signatureUrl ? (
                                            <div className="bg-white border-2 border-dashed border-secondary-200 p-4 rounded-3xl inline-block shadow-sm">
                                                <Image src={user.signatureUrl} alt="Signature" width={128} height={64} unoptimized className="h-16 w-32 object-contain" />
                                                <p className="text-[9px] text-secondary-300 font-bold uppercase text-center mt-2 tracking-tighter">Profile Signature Found</p>
                                            </div>
                                        ) : (
                                            <div className="relative bg-white border-2 border-dashed border-danger-200 p-6 rounded-3xl w-full sm:w-64 flex flex-col items-center text-center">
                                                <div className="text-3xl mb-2">{uploading ? '⏳' : '✍️'}</div>
                                                <p className="text-xs font-bold text-danger-600 mb-2">{uploading ? 'Processing...' : 'Signature Required'}</p>
                                                <label className="btn btn-xs btn-outline btn-danger rounded-lg cursor-pointer">
                                                    {uploading ? 'Uploading...' : 'Upload Now'}
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} disabled={uploading} />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitLoading || !user.signatureUrl || totalAmount <= 0}
                                        className="btn btn-primary w-full sm:w-auto px-12 py-4 rounded-3xl shadow-2xl shadow-primary-200 hover:shadow-primary-300 hover:-translate-y-1 transition-all font-black text-xl disabled:opacity-50 disabled:grayscale disabled:transform-none"
                                    >
                                        {submitLoading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                Submitting...
                                            </span>
                                        ) : 'Save Declaration'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ── MY HISTORY TAB ── */}
            {subTab === 'history' && (
                <div className="card-premium overflow-hidden border-t-8 border-t-secondary-400">
                    <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                        <div>
                            <h3 className="text-2xl font-black text-secondary-900 tracking-tight">My Submissions</h3>
                            <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mt-1">Last 5 records · filterable</p>
                        </div>
                        <span className="bg-primary-600 text-white px-5 py-2 rounded-2xl font-black text-sm shadow-lg shadow-primary-100">
                            {records.length} Total
                        </span>
                    </div>
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-black text-secondary-400 uppercase tracking-widest">Loading...</p>
                        </div>
                    ) : (
                        <UserHistoryTable records={records} user={{ ...user, employeeProfile: fullProfile }} />
                    )}
                </div>
            )}

            {/* ── HR ADMIN TAB ── */}
            {subTab === 'hr' && isHROrAdmin && (
                <HRReimbursementTable />
            )}
        </div>
    );
}
