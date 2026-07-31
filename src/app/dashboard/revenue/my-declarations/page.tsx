'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Receipt, Plus, X, Info, CheckCircle2, Clock } from 'lucide-react';

/**
 * Employee side of revenue reconciliation: you record what YOU sold, in the currency the
 * customer was billed. Finance records what arrived separately, and the two are compared.
 *
 * Deliberately asks for gross only. Gateway fees, GST and exchange rates are finance's side of
 * the picture — asking a salesperson to net them down would make the second opinion worthless.
 */

const CHANNELS = [
    { value: 'BANK_DIRECT', label: 'Paid straight to our bank (INR)' },
    { value: 'RAZORPAY', label: 'Razorpay' },
    { value: 'PAYPAL', label: 'PayPal' },
    { value: 'OTHER', label: 'Other' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'];

const EMPTY = {
    saleDate: new Date().toISOString().slice(0, 10),
    customerName: '',
    reference: '',
    grossAmount: '',
    currency: 'INR',
    channel: 'BANK_DIRECT',
    note: '',
};

const money = (n: number, ccy: string) =>
    `${ccy} ${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MyDeclarationsPage() {
    const qc = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['my-declarations'],
        queryFn: async () => {
            const res = await fetch('/api/revenue/declarations?scope=mine');
            if (!res.ok) throw new Error('Could not load declarations');
            return res.json();
        },
        select: (d: any) => (Array.isArray(d) ? d : []),
    });

    const create = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch('/api/revenue/declarations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save');
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['my-declarations'] });
            setCreating(false);
            setForm(EMPTY);
            toast.success('Sale declared');
        },
        onError: (e: any) => toast.error(e?.message || 'Could not save'),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const gross = Number(form.grossAmount);
        if (!Number.isFinite(gross) || gross <= 0) return toast.error('Enter a positive amount');
        create.mutate({ ...form, grossAmount: gross });
    };

    const totalByCurrency = (rows as any[]).reduce<Record<string, number>>((acc, r) => {
        acc[r.currency] = (acc[r.currency] ?? 0) + r.grossAmount;
        return acc;
    }, {});

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-2">
                        <Receipt size={26} className="text-primary-500" /> My Revenue Declarations
                    </h1>
                    <p className="text-secondary-500 font-medium mt-1">
                        Record what you sold. Finance records what arrived, and the two get compared.
                    </p>
                </div>
                <button onClick={() => setCreating(true)} className="btn btn-primary flex items-center gap-2 px-6 py-3 font-bold shadow-lg shadow-primary-500/20">
                    <Plus size={20} /> Declare a Sale
                </button>
            </div>

            <p className="flex items-start gap-2 text-xs text-secondary-500 bg-secondary-50 border border-secondary-200 rounded-xl p-4">
                <Info size={16} className="mt-0.5 shrink-0 text-secondary-400" />
                <span>
                    Enter the <strong>gross</strong> amount the customer was billed, in their currency. Do not deduct
                    Razorpay or PayPal charges — finance captures those separately, and the comparison only works if
                    each side records what it actually knows.
                </span>
            </p>

            {Object.keys(totalByCurrency).length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {Object.entries(totalByCurrency).map(([ccy, total]) => (
                        <div key={ccy} className="card-premium px-5 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Declared, {ccy}</p>
                            <p className="text-xl font-black text-secondary-900 tabular-nums">{money(total, ccy)}</p>
                        </div>
                    ))}
                </div>
            )}

            {isLoading ? (
                <div className="p-10 text-center animate-pulse text-secondary-400">Loading…</div>
            ) : rows.length === 0 ? (
                <div className="card-premium p-12 text-center text-secondary-400">
                    <Receipt size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-bold text-secondary-600">You haven&apos;t declared any sales yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {(rows as any[]).map((r) => {
                        const settled = (r.settlements ?? []).some((s: any) => s.settlementDate);
                        return (
                            <div key={r.id} className="card-premium p-5 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary-400">
                                            {new Date(r.saleDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-secondary-50 text-secondary-600 border-secondary-200">
                                            {r.channel.replace('_', ' ')}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                            settled
                                                ? 'bg-success-50 text-success-700 border-success-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {settled ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                            {settled ? 'Money received' : 'Awaiting money'}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-secondary-900 truncate">
                                        {r.customerName || 'Unnamed customer'}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-secondary-500">
                                        {r.reference && <span>Ref {r.reference}</span>}
                                        {r.note && <span className="truncate">{r.note}</span>}
                                    </div>
                                </div>
                                <span className="font-black text-secondary-900 tabular-nums shrink-0">
                                    {money(r.grossAmount, r.currency)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {creating && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-secondary-900">Declare a Sale</h3>
                            <button onClick={() => setCreating(false)} className="p-2 rounded-lg hover:bg-secondary-100 text-secondary-400"><X size={18} /></button>
                        </div>
                        <form onSubmit={submit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Sale date</label>
                                    <input required type="date" value={form.saleDate}
                                        onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">How were you paid</label>
                                    <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none">
                                        {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Gross amount billed</label>
                                    <input required type="number" step="0.01" min="0.01" value={form.grossAmount}
                                        onChange={(e) => setForm({ ...form, grossAmount: e.target.value })}
                                        placeholder="Before any fees"
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Currency</label>
                                    <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none">
                                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Customer</label>
                                <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                    placeholder="Who paid you" className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Reference</label>
                                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                                    placeholder="Invoice or order number, if you have one"
                                    className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Note</label>
                                <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none" />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setCreating(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 font-bold hover:bg-secondary-50">Cancel</button>
                                <button type="submit" disabled={create.isPending}
                                    className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-60">
                                    {create.isPending ? 'Saving…' : 'Declare Sale'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
