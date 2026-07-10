'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, RefreshCw, Search } from 'lucide-react';

interface CompanyOption {
    id: string;
    name: string;
}

interface TransactionRow {
    id: string;
    razorpayPaymentId: string | null;
    amount: number;
    currency: string;
    status: string;
    method: string;
    name: string;
    email: string;
    description: string;
    created_at: number;
}

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
 * Shared by the standalone Company Transactions page and the main dashboard section.
 */
export default function CompanyTransactionsPanel({ heading, subheading, lazy = false }: CompanyTransactionsPanelProps) {
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [payments, setPayments] = useState<TransactionRow[]>([]);
    const [stats, setStats] = useState<{ totalRevenue: number; totalCount: number } | null>(null);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [search, setSearch] = useState('');
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

    const fetchTransactions = useCallback(async (companyId: string) => {
        setLoadingPayments(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/payments/razorpay?companyId=${companyId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments || []);
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
    useEffect(() => { if (selectedCompanyId) fetchTransactions(selectedCompanyId); }, [selectedCompanyId, fetchTransactions]);

    const filteredPayments = payments.filter((p) =>
        !search.trim() ||
        p.razorpayPaymentId?.toLowerCase().includes(search.toLowerCase()) ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
    );

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
                        onClick={() => setSelectedCompanyId(c.id)}
                        className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCompanyId === c.id ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            {/* Summary + search */}
            <div className="card-premium flex flex-wrap items-center justify-between gap-6 p-6">
                <div className="flex gap-8">
                    <div>
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Total Revenue</p>
                        <p className="text-2xl font-black text-secondary-900">₹{Math.round(stats?.totalRevenue || 0).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Transactions</p>
                        <p className="text-2xl font-black text-secondary-900">{stats?.totalCount ?? 0}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search by payment ID, name, or email…"
                            className="input h-10 pl-9 rounded-xl text-xs font-bold w-72"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => selectedCompanyId && fetchTransactions(selectedCompanyId)}
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
                        {filteredPayments.length} of {payments.length} shown
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
                                <tr key={p.id} className="hover:bg-secondary-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="font-black text-secondary-900 text-xs">{p.razorpayPaymentId || p.id}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-secondary-800 text-xs">{p.name || '—'}</p>
                                        <p className="text-[9px] text-secondary-400 font-medium mt-1">{p.email || ''}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="font-black text-secondary-900 text-sm">
                                            {p.currency === 'INR' ? '₹' : `${p.currency} `}{p.amount.toLocaleString()}
                                        </span>
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
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${p.status === 'captured' ? 'bg-success-100 text-success-700' : p.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-secondary-200 text-secondary-600'}`}>
                                            {p.status || 'unknown'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
                </>
            )}
        </div>
    );
}
