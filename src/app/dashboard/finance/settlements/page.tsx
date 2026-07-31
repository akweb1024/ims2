'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
    Landmark, Plus, Upload, X, ArrowRight, Clock, Info, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { parseCsv, mapSettlementRow, type MappedSettlementRow } from '@/lib/finance/csv';

/**
 * Accounts side of revenue reconciliation: record what actually arrived, either a line at a
 * time from the bank statement or in bulk from a gateway settlement report.
 *
 * The fee and its GST are asked for explicitly because they are the whole reason a ₹42,500 sale
 * credits ₹41,320. Leaving them blank does not break anything — it just means the gross basis
 * of the reconciliation will show that gap as a variance instead of as a cost.
 */

const SOURCES = [
    { value: 'BANK_STATEMENT', label: 'Bank statement' },
    { value: 'RAZORPAY', label: 'Razorpay' },
    { value: 'PAYPAL', label: 'PayPal' },
    { value: 'MANUAL', label: 'Manual' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'];

const inr = (n: number) =>
    `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY = {
    source: 'BANK_STATEMENT',
    externalRef: '',
    captureDate: new Date().toISOString().slice(0, 10),
    settlementDate: new Date().toISOString().slice(0, 10),
    originalAmount: '',
    originalCurrency: 'INR',
    fxRate: '1',
    feeInr: '',
    taxInr: '',
    netInr: '',
    narration: '',
};

export default function SettlementsPage() {
    const qc = useQueryClient();
    const [adding, setAdding] = useState(false);
    const [importing, setImporting] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [importSource, setImportSource] = useState('BANK_STATEMENT');
    const [preview, setPreview] = useState<MappedSettlementRow[]>([]);
    const [fileName, setFileName] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['settlements'],
        queryFn: async () => {
            const res = await fetch('/api/finance/settlements');
            if (!res.ok) throw new Error('Could not load settlements');
            return res.json();
        },
        select: (d: any) => (Array.isArray(d) ? d : []),
    });

    const post = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch('/api/finance/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save');
            return res.json();
        },
        onSuccess: (r: any) => {
            qc.invalidateQueries({ queryKey: ['settlements'] });
            qc.invalidateQueries({ queryKey: ['revenue-reconciliation'] });
            if (typeof r?.created === 'number') {
                toast.success(`${r.created} added, ${r.updated} updated${r.skipped?.length ? `, ${r.skipped.length} skipped` : ''}`);
                if (r.skipped?.length) {
                    // Say which rows were dropped and why — a silent partial import is worse
                    // than none, because the totals look plausible and are wrong.
                    toast.error(`Skipped: ${r.skipped.slice(0, 3).map((s: any) => `row ${s.row} (${s.reason})`).join('; ')}${r.skipped.length > 3 ? '…' : ''}`, { duration: 8000 });
                }
            } else {
                toast.success('Settlement recorded');
            }
            setAdding(false); setImporting(false); setForm(EMPTY); setPreview([]); setFileName('');
        },
        onError: (e: any) => toast.error(e?.message || 'Could not save'),
    });

    const submitOne = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(form.originalAmount);
        if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a positive amount');
        const fx = Number(form.fxRate);
        if (form.originalCurrency !== 'INR' && (!Number.isFinite(fx) || fx <= 0)) {
            return toast.error(`Enter the ${form.originalCurrency}→INR rate, or the amount cannot be converted`);
        }
        post.mutate({
            ...form,
            originalAmount: amount,
            fxRate: form.originalCurrency === 'INR' ? 1 : fx,
            feeInr: Number(form.feeInr) || 0,
            taxInr: Number(form.taxInr) || 0,
            netInr: form.netInr === '' ? undefined : Number(form.netInr),
            settlementDate: form.settlementDate || undefined,
        });
    };

    const onFile = async (file: File) => {
        setFileName(file.name);
        try {
            const text = await file.text();
            const parsed = parseCsv(text).map(mapSettlementRow);
            if (parsed.length === 0) return toast.error('No data rows found in that file');
            setPreview(parsed);
        } catch {
            toast.error('Could not read that file');
        }
    };

    const usable = useMemo(() => preview.filter((r) => !r.error), [preview]);
    const rejected = useMemo(() => preview.filter((r) => r.error), [preview]);

    const totals = useMemo(() => {
        const list = rows as any[];
        return {
            gross: list.reduce((t, r) => t + r.grossInr, 0),
            net: list.reduce((t, r) => t + r.netInr, 0),
            fee: list.reduce((t, r) => t + r.feeInr + r.taxInr, 0),
            inTransit: list.filter((r) => !r.settlementDate).length,
        };
    }, [rows]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-2">
                        <Landmark size={26} className="text-primary-500" /> Money Received
                    </h1>
                    <p className="text-secondary-500 font-medium mt-1">
                        What actually reached the bank — entered from statements or imported from a gateway report.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setImporting(true)} className="flex items-center gap-2 px-5 py-3 rounded-lg border border-secondary-200 bg-white text-secondary-700 font-bold hover:bg-secondary-50">
                        <Upload size={18} /> Import Report
                    </button>
                    <button onClick={() => setAdding(true)} className="btn btn-primary flex items-center gap-2 px-6 py-3 font-bold shadow-lg shadow-primary-500/20">
                        <Plus size={20} /> Add Entry
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Gross', value: inr(totals.gross) },
                    { label: 'Net received', value: inr(totals.net) },
                    { label: 'Fees + GST', value: inr(totals.fee) },
                    { label: 'In transit', value: String(totals.inTransit) },
                ].map((s) => (
                    <div key={s.label} className="card-premium p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">{s.label}</p>
                        <p className="text-xl font-black text-secondary-900 mt-1 tabular-nums">{s.value}</p>
                    </div>
                ))}
            </div>

            {isLoading ? (
                <div className="p-10 text-center animate-pulse text-secondary-400">Loading…</div>
            ) : rows.length === 0 ? (
                <div className="card-premium p-12 text-center text-secondary-400">
                    <Landmark size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-bold text-secondary-600">Nothing recorded yet.</p>
                    <p className="text-sm mt-1">Add a bank statement line, or import a Razorpay/PayPal settlement report.</p>
                </div>
            ) : (
                <div className="card-premium overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-secondary-400 border-b border-secondary-100">
                                <th className="px-4 py-3">Settled</th>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3 text-right">Original</th>
                                <th className="px-4 py-3 text-right">Gross ₹</th>
                                <th className="px-4 py-3 text-right">Fee + GST</th>
                                <th className="px-4 py-3 text-right">Net ₹</th>
                                <th className="px-4 py-3">Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(rows as any[]).map((r) => (
                                <tr key={r.id} className="border-b border-secondary-50 last:border-0">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {r.settlementDate
                                            ? new Date(r.settlementDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                            : <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700"><Clock size={11} /> in transit</span>}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-bold text-secondary-500">{r.source.replace('_', ' ')}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {r.originalCurrency} {r.originalAmount.toLocaleString('en-IN')}
                                        {r.originalCurrency !== 'INR' && <span className="text-secondary-400 text-xs"> @{r.fxRate}</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">{inr(r.grossInr)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-secondary-500">{inr(r.feeInr + r.taxInr)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums font-black text-secondary-900">{inr(r.netInr)}</td>
                                    <td className="px-4 py-3 text-xs text-secondary-400 truncate max-w-[16rem]">{r.externalRef || r.narration || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Link href="/dashboard/finance/revenue-reconciliation" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-primary-600 hover:underline">
                Reconcile against declarations <ArrowRight size={12} />
            </Link>

            {/* Manual entry */}
            {adding && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-secondary-900">Add a Receipt</h3>
                            <button onClick={() => setAdding(false)} className="p-2 rounded-lg hover:bg-secondary-100 text-secondary-400"><X size={18} /></button>
                        </div>
                        <form onSubmit={submitOne} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Source</label>
                                    <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500">
                                        {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Reference</label>
                                    <input value={form.externalRef} onChange={(e) => setForm({ ...form, externalRef: e.target.value })}
                                        placeholder="UTR / transaction id"
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Customer paid on</label>
                                    <input required type="date" value={form.captureDate} onChange={(e) => setForm({ ...form, captureDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Credited to bank on</label>
                                    <input type="date" value={form.settlementDate} onChange={(e) => setForm({ ...form, settlementDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500" />
                                    <p className="text-[10px] text-secondary-400 mt-1">Leave blank if it hasn&apos;t landed yet</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Amount</label>
                                    <input required type="number" step="0.01" min="0.01" value={form.originalAmount}
                                        onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Currency</label>
                                    <select value={form.originalCurrency}
                                        onChange={(e) => setForm({ ...form, originalCurrency: e.target.value, fxRate: e.target.value === 'INR' ? '1' : '' })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500">
                                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Rate to ₹</label>
                                    <input type="number" step="0.0001" min="0" value={form.fxRate}
                                        disabled={form.originalCurrency === 'INR'}
                                        onChange={(e) => setForm({ ...form, fxRate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500 disabled:bg-secondary-50" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Gateway fee ₹</label>
                                    <input type="number" step="0.01" min="0" value={form.feeInr} onChange={(e) => setForm({ ...form, feeInr: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">GST on fee ₹</label>
                                    <input type="number" step="0.01" min="0" value={form.taxInr} onChange={(e) => setForm({ ...form, taxInr: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Net credited ₹</label>
                                    <input type="number" step="0.01" min="0" value={form.netInr} onChange={(e) => setForm({ ...form, netInr: e.target.value })}
                                        placeholder="auto"
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500" />
                                </div>
                            </div>

                            <p className="flex items-start gap-2 text-xs text-secondary-500 bg-secondary-50 border border-secondary-200 rounded-lg p-3">
                                <Info size={14} className="mt-0.5 shrink-0 text-secondary-400" />
                                Net is worked out as gross − fee − GST when left blank. Enter it from the statement if the
                                bank credited a slightly different figure — the statement wins.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Narration</label>
                                <input value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500" />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setAdding(false)} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 font-bold hover:bg-secondary-50">Cancel</button>
                                <button type="submit" disabled={post.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-60">
                                    {post.isPending ? 'Saving…' : 'Record Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CSV import */}
            {importing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-secondary-900">Import a Settlement Report</h3>
                            <button onClick={() => { setImporting(false); setPreview([]); setFileName(''); }} className="p-2 rounded-lg hover:bg-secondary-100 text-secondary-400"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-end gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Source</label>
                                    <select value={importSource} onChange={(e) => setImportSource(e.target.value)}
                                        className="px-4 py-2 rounded-lg border border-secondary-200 outline-none focus:border-primary-500">
                                        {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                                        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                                    <button onClick={() => fileRef.current?.click()}
                                        className="flex items-center gap-2 px-5 py-2 rounded-lg border border-secondary-200 bg-white text-secondary-700 font-bold hover:bg-secondary-50">
                                        <Upload size={16} /> Choose CSV
                                    </button>
                                </div>
                                {fileName && <span className="text-xs text-secondary-500 pb-2">{fileName}</span>}
                            </div>

                            <p className="text-xs text-secondary-500">
                                Recognised columns: date, gross/amount, currency, fee, tax/gst, net, exchange rate,
                                settlement date, transaction id, description. Dates are read day-first.
                            </p>

                            {preview.length > 0 && (
                                <>
                                    <div className="flex gap-3">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-success-50 border border-success-200 text-success-700 text-xs font-black uppercase tracking-widest">
                                            <CheckCircle2 size={12} /> {usable.length} importable
                                        </span>
                                        {rejected.length > 0 && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-widest">
                                                <AlertTriangle size={12} /> {rejected.length} will be skipped
                                            </span>
                                        )}
                                    </div>

                                    {rejected.length > 0 && (
                                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-1 max-h-32 overflow-y-auto">
                                            {rejected.slice(0, 10).map((r, i) => (
                                                <p key={i} className="text-xs text-rose-700">Row {preview.indexOf(r) + 1}: {r.error}</p>
                                            ))}
                                        </div>
                                    )}

                                    <div className="border border-secondary-200 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0 bg-secondary-50">
                                                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-secondary-400">
                                                    <th className="px-3 py-2">Date</th>
                                                    <th className="px-3 py-2 text-right">Amount</th>
                                                    <th className="px-3 py-2 text-right">Fee</th>
                                                    <th className="px-3 py-2 text-right">Net</th>
                                                    <th className="px-3 py-2">Ref</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usable.slice(0, 50).map((r, i) => (
                                                    <tr key={i} className="border-t border-secondary-100">
                                                        <td className="px-3 py-2">{r.captureDate?.slice(0, 10)}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{r.originalCurrency} {r.originalAmount}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{r.feeInr || 0}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{r.netInr ?? '—'}</td>
                                                        <td className="px-3 py-2 text-secondary-400 truncate max-w-[10rem]">{r.externalRef || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => { setImporting(false); setPreview([]); setFileName(''); }}
                                    className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 font-bold hover:bg-secondary-50">Cancel</button>
                                <button
                                    type="button"
                                    disabled={usable.length === 0 || post.isPending}
                                    onClick={() => post.mutate({ source: importSource, rows: usable })}
                                    className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-60"
                                >
                                    {post.isPending ? 'Importing…' : `Import ${usable.length} row(s)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
