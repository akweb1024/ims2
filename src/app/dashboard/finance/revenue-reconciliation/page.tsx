'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
    Scale, AlertTriangle, CheckCircle2, Clock, ArrowRight, Info,
    TrendingDown, Users, Landmark,
} from 'lucide-react';

/**
 * Revenue reconciliation: employees' declared sales against money that actually reached the
 * bank, compared on a gross AND a net basis.
 *
 * Distinct from /dashboard/finance/reconciliation, which matches bank statement lines to
 * journal entries — that is bookkeeping. This one answers "do the people who made the sales and
 * the people who count the money agree", which is a different question with different sources.
 *
 * The gateway fee and its GST get their own line because they are the usual reason the two
 * sides differ: a ₹42,500 sale can credit ₹41,320 without anything being wrong.
 */

const inr = (n: number) =>
    `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthBounds = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return {
        from: new Date(y, m - 1, 1).toISOString(),
        to: new Date(y, m, 0, 23, 59, 59, 999).toISOString(),
    };
};

const EXCEPTION_LABEL: Record<string, string> = {
    DECLARED_NOT_SETTLED: 'Declared, no money found',
    SETTLED_NOT_DECLARED: 'Money arrived, nobody declared it',
    AMOUNT_MISMATCH: 'Amounts disagree',
    MISSING_FX_RATE: 'No exchange rate',
};

export default function RevenueReconciliationPage() {
    const now = new Date();
    const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const [tolerance, setTolerance] = useState(1);

    const { from, to } = useMemo(() => monthBounds(month), [month]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['revenue-reconciliation', from, to, tolerance],
        queryFn: async () => {
            const res = await fetch(`/api/finance/revenue-reconciliation?from=${from}&to=${to}&tolerance=${tolerance}`);
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not reconcile');
            return res.json();
        },
    });

    const v = data?.variance;
    const clean = Boolean(v?.matches);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-2">
                        <Scale size={26} className="text-primary-500" /> Revenue Reconciliation
                    </h1>
                    <p className="text-secondary-500 font-medium mt-1">
                        What the team says they sold, against what actually reached the bank.
                    </p>
                </div>
                <div className="flex items-end gap-3">
                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest">
                        Month
                        <input
                            type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                            className="mt-1 block px-4 py-2 rounded-lg border border-secondary-200 text-sm font-bold text-secondary-900 outline-none focus:border-primary-500"
                        />
                    </label>
                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest">
                        Tolerance ₹
                        <input
                            type="number" min={0} step={1} value={tolerance}
                            onChange={(e) => setTolerance(Math.max(0, Number(e.target.value)))}
                            className="mt-1 block w-28 px-4 py-2 rounded-lg border border-secondary-200 text-sm font-bold text-secondary-900 outline-none focus:border-primary-500"
                        />
                    </label>
                </div>
            </div>

            {isLoading ? (
                <div className="p-10 text-center animate-pulse text-secondary-400">Reconciling…</div>
            ) : isError || !data ? (
                <div className="card-premium p-10 text-center text-secondary-500">Could not load the reconciliation.</div>
            ) : (
                <>
                    <div className={`card-premium p-6 border-l-4 ${clean ? 'border-l-success-500' : 'border-l-rose-500'}`}>
                        <div className="flex items-start gap-4">
                            {clean
                                ? <CheckCircle2 className="text-success-600 shrink-0" size={28} />
                                : <AlertTriangle className="text-rose-600 shrink-0" size={28} />}
                            <div>
                                <h2 className="text-xl font-black text-secondary-900">
                                    {clean ? 'The two sides agree' : 'The two sides do not agree'}
                                </h2>
                                <p className="text-sm text-secondary-500 mt-1">
                                    {clean
                                        ? 'Declared sales and bank receipts reconcile on both gross and net, within tolerance.'
                                        : 'At least one basis is outside tolerance. The breakdown below shows where.'}
                                </p>
                                {data.declared.unconvertedCount > 0 && (
                                    <p className="mt-2 text-sm font-bold text-amber-700 flex items-center gap-2">
                                        <Info size={14} />
                                        {data.declared.unconvertedCount} declaration(s) in {data.declared.unratedCurrencies.join(', ')} have no exchange rate, so they are left out of these totals.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[
                            {
                                title: 'Gross — what customers were billed',
                                blurb: 'Bank receipts grossed up by adding the gateway fee and its GST back on.',
                                declared: data.declared.grossInr, settled: data.settled.grossInr,
                                variance: v.grossInr, ok: v.grossMatches,
                            },
                            {
                                title: 'Net — what actually landed',
                                blurb: 'Declared sales netted down by the fees observed on their settlements.',
                                declared: data.declared.netInr, settled: data.settled.netInr,
                                variance: v.netInr, ok: v.netMatches,
                            },
                        ].map((b) => (
                            <div key={b.title} className="card-premium p-6">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-black text-secondary-900">{b.title}</h3>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                                        b.ok ? 'bg-success-50 text-success-700 border-success-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        {b.ok ? 'Agrees' : 'Differs'}
                                    </span>
                                </div>
                                <p className="text-xs text-secondary-400 mb-4">{b.blurb}</p>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-secondary-500 flex items-center gap-2"><Users size={14} /> Employees declared</dt>
                                        <dd className="font-black text-secondary-900 tabular-nums">{inr(b.declared)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-secondary-500 flex items-center gap-2"><Landmark size={14} /> Accounts / bank</dt>
                                        <dd className="font-black text-secondary-900 tabular-nums">{inr(b.settled)}</dd>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-secondary-100">
                                        <dt className="font-bold text-secondary-700">Difference</dt>
                                        <dd className={`font-black tabular-nums ${b.ok ? 'text-success-700' : 'text-rose-600'}`}>{inr(b.variance)}</dd>
                                    </div>
                                </dl>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card-premium p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 flex items-center gap-1.5">
                                <TrendingDown size={12} /> Gateway fees
                            </p>
                            <p className="text-2xl font-black text-secondary-900 mt-1 tabular-nums">{inr(data.settled.feeInr)}</p>
                            <p className="text-xs text-secondary-400 mt-1">plus {inr(data.settled.taxInr)} GST on those fees</p>
                        </div>
                        <div className="card-premium p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 flex items-center gap-1.5">
                                <Clock size={12} /> In transit
                            </p>
                            <p className="text-2xl font-black text-secondary-900 mt-1 tabular-nums">{inr(data.inTransit.netInr)}</p>
                            <p className="text-xs text-secondary-400 mt-1">
                                {data.inTransit.count} payment(s) captured, not yet credited — not a mismatch
                            </p>
                        </div>
                        <div className="card-premium p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Entries compared</p>
                            <p className="text-2xl font-black text-secondary-900 mt-1 tabular-nums">
                                {data.declared.count} <span className="text-secondary-400 text-base">vs</span> {data.settled.count}
                            </p>
                            <p className="text-xs text-secondary-400 mt-1">declarations vs settlements</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-black text-secondary-900 mb-3">
                            Needs a look <span className="ml-1 text-sm font-bold text-secondary-400">{data.exceptions.length}</span>
                        </h3>
                        {data.exceptions.length === 0 ? (
                            <div className="card-premium p-8 text-center text-secondary-400">
                                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="font-bold text-secondary-600">Every line on both sides is accounted for.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data.exceptions.map((e: any, i: number) => (
                                    <div key={i} className="card-premium p-4 flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                                e.kind === 'AMOUNT_MISMATCH' || e.kind === 'MISSING_FX_RATE'
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {EXCEPTION_LABEL[e.kind] ?? e.kind}
                                            </span>
                                            <p className="text-sm text-secondary-700 mt-1.5">{e.detail}</p>
                                            {e.employeeName && <p className="text-xs text-secondary-400 mt-0.5">{e.employeeName}</p>}
                                        </div>
                                        {typeof e.amountInr === 'number' && (
                                            <span className="font-black text-secondary-900 tabular-nums shrink-0">{inr(e.amountInr)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest text-primary-600">
                        <Link href="/dashboard/revenue/my-declarations" className="hover:underline flex items-center gap-1">
                            Declare a sale <ArrowRight size={12} />
                        </Link>
                        <Link href="/dashboard/finance/reconciliation" className="hover:underline flex items-center gap-1">
                            Bank statement reconciliation <ArrowRight size={12} />
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
