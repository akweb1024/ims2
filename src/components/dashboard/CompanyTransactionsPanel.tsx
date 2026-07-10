'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, RefreshCw, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CompanyOption {
    id: string;
    name: string;
}

interface TransactionRow {
    id: string;
    razorpayPaymentId: string | null;
    amount: number;
    base_amount?: number;
    base_currency?: string;
    currency: string;
    status: string;
    method: string;
    name: string;
    email: string;
    contact?: string;
    description?: string;
    international?: boolean;
    created_at: number;
    fee?: number;
    tax?: number;
    card?: { last4?: string; network?: string; type?: string } | null;
    bank?: string | null;
    wallet?: string | null;
    vpa?: string | null;
    error_reason?: string | null;
    error_description?: string | null;
    company?: { name?: string } | null;
}

const PAGE_SIZE = 100;

interface CompanyTransactionsPanelProps {
    /** Optional heading rendered above the company tabs. */
    heading?: string;
    /** Optional italic subheading under the heading. */
    subheading?: string;
    /**
     * Defer the (heavy) data fetch until the panel scrolls into view. Use on busy pages
     * like the main dashboard so it costs nothing unless the user actually reaches it.
     */
    lazy?: boolean;
}

/**
 * Razorpay transactions for every company the current user can access, one company per tab.
 * Reuses /api/payments/razorpay, which already enforces per-company access via
 * assertCompanyAccess/getAvailableCompaniesForUser — so a regular employee only ever sees
 * their own company's single tab while a SUPER_ADMIN sees one tab per company.
 *
 * Server-side paginated (100/page) with a month filter; the endpoint's `total` and revenue
 * stats already respect the month range. Text search filters the current page. Clicking a
 * row opens a full-detail modal. Shared by the standalone page and the main dashboard.
 */
export default function CompanyTransactionsPanel({ heading, subheading, lazy = false }: CompanyTransactionsPanelProps) {
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [payments, setPayments] = useState<TransactionRow[]>([]);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState<{ totalRevenue: number; totalCount: number } | null>(null);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [search, setSearch] = useState('');
    const [month, setMonth] = useState(''); // 'YYYY-MM', or '' for all time
    const [page, setPage] = useState(0); // 0-indexed
    const [selected, setSelected] = useState<TransactionRow | null>(null);
    // When lazy, hold off every fetch until the panel is near the viewport.
    const [inView, setInView] = useState(!lazy);
    const rootRef = useRef<HTMLDivElement>(null);

    const fetchCompanies = useCallback(async () => {
        setLoadingCompanies(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/payments/razorpay?limit=1', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                const list: CompanyOption[] = data.availableCompanies || [];
                setCompanies(list);
                setSelectedCompanyId((prev) => prev || list[0]?.id || null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCompanies(false);
        }
    }, []);

    const fetchTransactions = useCallback(async (companyId: string, pageIndex: number, monthValue: string) => {
        setLoadingPayments(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                companyId,
                limit: String(PAGE_SIZE),
                offset: String(pageIndex * PAGE_SIZE),
            });
            if (monthValue) {
                const [y, m] = monthValue.split('-').map(Number);
                const lastDay = new Date(y, m, 0).getDate();
                params.set('startDate', `${monthValue}-01`);
                params.set('endDate', `${monthValue}-${String(lastDay).padStart(2, '0')}`);
            }
            const res = await fetch(`/api/payments/razorpay?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments || []);
                setTotal(data.total || 0);
                setStats({ totalRevenue: data.stats?.totalRevenue || 0, totalCount: data.stats?.totalCount || 0 });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPayments(false);
        }
    }, []);

    useEffect(() => {
        if (inView) return;
        const el = rootRef.current;
        if (!el) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setInView(true);
                observer.disconnect();
            }
        }, { rootMargin: '200px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [inView]);

    useEffect(() => { if (inView) fetchCompanies(); }, [inView, fetchCompanies]);
    useEffect(() => {
        if (selectedCompanyId) fetchTransactions(selectedCompanyId, page, month);
    }, [selectedCompanyId, page, month, fetchTransactions]);

    // Close the detail modal on Escape.
    useEffect(() => {
        if (!selected) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selected]);

    const selectCompany = (id: string) => {
        setSelectedCompanyId(id);
        setPage(0);
        setSearch('');
    };

    const changeMonth = (value: string) => {
        setMonth(value);
        setPage(0);
    };

    const filteredPayments = payments.filter((p) =>
        !search.trim() ||
        p.razorpayPaymentId?.toLowerCase().includes(search.toLowerCase()) ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const firstRow = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const lastRow = page * PAGE_SIZE + payments.length;

    const amountLabel = (currency: string, amount: number) =>
        `${currency === 'INR' ? '₹' : `${currency} `}${amount.toLocaleString()}`;

    const statusClass = (status: string) =>
        status === 'captured' ? 'bg-success-100 text-success-700'
            : status === 'failed' ? 'bg-red-100 text-red-700'
                : 'bg-secondary-200 text-secondary-600';

    return (
        <div ref={rootRef} className="space-y-6">
            {heading && (
                <div>
                    <h2 className="text-2xl font-black text-secondary-900 tracking-tighter">{heading}</h2>
                    {subheading && <p className="text-secondary-500 font-medium italic">{subheading}</p>}
                </div>
            )}

            {loadingCompanies ? (
                <div className="card-premium p-8 text-center text-secondary-500 font-bold">Loading companies…</div>
            ) : companies.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <Building2 size={40} className="text-secondary-200 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-secondary-900">No companies found</h3>
                    <p className="text-secondary-500 text-sm mt-1">You don&apos;t have access to any company&apos;s payment data yet.</p>
                </div>
            ) : (
                <>
                    {/* Company tabs */}
                    <div className="flex gap-1 p-1 bg-secondary-100 rounded-xl w-fit max-w-full overflow-x-auto">
                        {companies.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => selectCompany(c.id)}
                                className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCompanyId === c.id ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Summary + filters */}
                    <div className="card-premium flex flex-wrap items-center justify-between gap-6 p-6">
                        <div className="flex gap-8">
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">
                                    {month ? 'Revenue (month)' : 'Total Revenue'}
                                </p>
                                <p className="text-2xl font-black text-secondary-900">₹{Math.round(stats?.totalRevenue || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Transactions</p>
                                <p className="text-2xl font-black text-secondary-900">{stats?.totalCount ?? 0}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="month"
                                className="input h-10 rounded-xl text-xs font-bold px-3"
                                value={month}
                                onChange={(e) => changeMonth(e.target.value)}
                                title="Filter by month"
                            />
                            {month && (
                                <button
                                    onClick={() => changeMonth('')}
                                    className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline"
                                >
                                    Clear
                                </button>
                            )}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                                <input
                                    type="text"
                                    placeholder="Search this page by ID, name, or email…"
                                    className="input h-10 pl-9 rounded-xl text-xs font-bold w-72"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => selectedCompanyId && fetchTransactions(selectedCompanyId, page, month)}
                                disabled={loadingPayments}
                                className="p-2.5 rounded-xl bg-secondary-50 text-secondary-500 hover:bg-secondary-100 transition-all disabled:opacity-50"
                                title="Refresh"
                            >
                                <RefreshCw size={16} className={loadingPayments ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Transactions table */}
                    <div className="card-premium p-0 overflow-hidden">
                        <div className="px-8 py-6 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/30">
                            <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest">
                                {companies.find((c) => c.id === selectedCompanyId)?.name || 'Transactions'}
                            </h3>
                            <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">
                                {search.trim()
                                    ? `${filteredPayments.length} of ${payments.length} on page`
                                    : total > 0 ? `${firstRow}–${lastRow} of ${total}` : '0 transactions'}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-secondary-600">
                                <thead className="bg-secondary-50/50 text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-4">Payment ID</th>
                                        <th className="px-8 py-4">Customer</th>
                                        <th className="px-8 py-4">Amount</th>
                                        <th className="px-8 py-4">Method</th>
                                        <th className="px-8 py-4">Date</th>
                                        <th className="px-8 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-50">
                                    {loadingPayments ? (
                                        <tr><td colSpan={6} className="px-8 py-20 text-center text-secondary-400 italic font-black">Loading transactions…</td></tr>
                                    ) : filteredPayments.length === 0 ? (
                                        <tr><td colSpan={6} className="px-8 py-20 text-center text-secondary-400 italic font-black">No transactions found for this company.</td></tr>
                                    ) : filteredPayments.map((p) => (
                                        <tr
                                            key={p.id}
                                            onClick={() => setSelected(p)}
                                            className="hover:bg-secondary-50/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-8 py-5">
                                                <p className="font-black text-secondary-900 text-xs">{p.razorpayPaymentId || p.id}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="font-bold text-secondary-800 text-xs">{p.name || '—'}</p>
                                                <p className="text-[9px] text-secondary-400 font-medium mt-1">{p.email || ''}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="font-black text-secondary-900 text-sm">{amountLabel(p.currency, p.amount)}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-2 py-0.5 bg-secondary-100 rounded text-[9px] font-black uppercase tracking-widest text-secondary-600">
                                                    {p.method || 'razorpay'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="font-bold text-secondary-900 text-[10px]">
                                                    {new Date(p.created_at * 1000).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                                                </p>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${statusClass(p.status)}`}>
                                                    {p.status || 'unknown'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {total > PAGE_SIZE && (
                            <div className="px-8 py-5 border-t border-secondary-50 flex items-center justify-between bg-secondary-50/30">
                                <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">
                                    Page {page + 1} of {totalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        disabled={page === 0 || loadingPayments}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white border border-secondary-100 text-secondary-600 hover:bg-secondary-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={14} /> Prev
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1 || loadingPayments}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white border border-secondary-100 text-secondary-600 hover:bg-secondary-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Detail modal */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm animate-fade-in"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="card-premium w-full max-w-2xl max-h-[85vh] overflow-y-auto p-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-8 py-6 border-b border-secondary-50 flex items-start justify-between bg-secondary-50/30 sticky top-0">
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Transaction</p>
                                <p className="font-black text-secondary-900 text-sm">{selected.razorpayPaymentId || selected.id}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${statusClass(selected.status)}`}>
                                    {selected.status || 'unknown'}
                                </span>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="p-1.5 rounded-lg text-secondary-400 hover:bg-secondary-100 transition-all"
                                    title="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Amount</p>
                                <p className="text-3xl font-black text-secondary-900">{amountLabel(selected.currency, selected.amount)}</p>
                                {selected.international && selected.base_amount ? (
                                    <p className="text-xs text-secondary-500 font-bold mt-1">
                                        ≈ ₹{Math.round((selected.base_amount || 0) / 100).toLocaleString()} (base)
                                    </p>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <Detail label="Customer" value={selected.name || '—'} />
                                <Detail label="Email" value={selected.email || '—'} />
                                <Detail label="Contact" value={selected.contact || '—'} />
                                <Detail label="Company" value={selected.company?.name || '—'} />
                                <Detail label="Method" value={selected.method || '—'} />
                                <Detail
                                    label="Instrument"
                                    value={
                                        selected.card?.last4 ? `${selected.card.network || 'Card'} ****${selected.card.last4}`
                                            : selected.bank || selected.wallet || selected.vpa || '—'
                                    }
                                />
                                <Detail label="Fee" value={selected.fee ? amountLabel(selected.currency, selected.fee) : '—'} />
                                <Detail label="Tax" value={selected.tax ? amountLabel(selected.currency, selected.tax) : '—'} />
                                <Detail
                                    label="Date"
                                    value={new Date(selected.created_at * 1000).toLocaleString(undefined, {
                                        month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                />
                                <Detail label="International" value={selected.international ? 'Yes' : 'No'} />
                            </div>

                            {selected.description && (
                                <div>
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Description</p>
                                    <p className="text-sm font-bold text-secondary-800">{selected.description}</p>
                                </div>
                            )}

                            {selected.status === 'failed' && (selected.error_reason || selected.error_description) && (
                                <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Failure</p>
                                    <p className="text-sm font-bold text-red-700">{selected.error_description || selected.error_reason}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-bold text-secondary-800 break-words">{value}</p>
        </div>
    );
}
