'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, PackageX, TrendingDown, Wallet } from 'lucide-react';

/**
 * Reorder suggestions and stock valuation.
 *
 * `minStockLevel` existed as a column with nothing reading it, so stock could hit zero without
 * anyone being told. Days of cover comes from the stock-movement ledger, so it reflects the
 * rate the item is actually being used rather than a guess.
 */

const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const URGENCY_STYLE: Record<string, { chip: string; label: string }> = {
    OUT_OF_STOCK: { chip: 'bg-rose-100 text-rose-700', label: 'Out of stock' },
    CRITICAL: { chip: 'bg-orange-100 text-orange-700', label: 'Critical' },
    LOW: { chip: 'bg-amber-100 text-amber-700', label: 'Low' },
};

export default function ReorderPanel() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/logistics/inventory/reorder', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return <div className="card-premium p-6 text-sm font-bold text-secondary-500">Checking stock levels…</div>;
    }
    if (!data) return null;

    const { suggestions = [], valuation, windowDays } = data;

    return (
        <div className="card-premium p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-lg font-black text-secondary-900">Stock health</h2>
                    <p className="text-xs text-secondary-500 font-medium">
                        Cover is measured against the last {windowDays} days of actual usage.
                    </p>
                </div>
                <div className="flex items-center gap-5">
                    <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-secondary-500 font-bold">Stock value</p>
                        <p className="text-xl font-black text-secondary-900 tabular-nums">{money(valuation.totalValue)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-secondary-500 font-bold">Needs ordering</p>
                        <p className="text-xl font-black text-secondary-900 tabular-nums">{suggestions.length}</p>
                    </div>
                </div>
            </div>

            {valuation.unvaluedItems > 0 && (
                <div className="flex items-start gap-2 rounded-xl bg-sky-50 border border-sky-200 px-4 py-3">
                    <Wallet size={15} className="text-sky-600 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-sky-800">
                        <b className="font-black">{valuation.unvaluedItems}</b>{' '}
                        {valuation.unvaluedItems === 1 ? 'item holds' : 'items hold'} stock with no cost recorded yet, so
                        {valuation.unvaluedItems === 1 ? ' it is' : ' they are'} not in the value above. Cost is
                        established when stock is received against a purchase order.
                    </p>
                </div>
            )}

            {suggestions.length === 0 ? (
                <p className="text-sm font-bold text-emerald-700">Everything is above its reorder point.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wide text-secondary-500 border-b border-secondary-200">
                                <th className="py-2 pr-3 font-bold">Item</th>
                                <th className="py-2 px-3 font-bold">Status</th>
                                <th className="py-2 px-3 font-bold text-right">In stock</th>
                                <th className="py-2 px-3 font-bold text-right">Reorder at</th>
                                <th className="py-2 px-3 font-bold text-right">Cover</th>
                                <th className="py-2 pl-3 font-bold text-right">Order</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suggestions.map((s: any) => {
                                const style = URGENCY_STYLE[s.urgency] ?? URGENCY_STYLE.LOW;
                                return (
                                    <tr key={s.id} className="border-b border-secondary-100 last:border-0">
                                        <td className="py-2 pr-3">
                                            <p className="font-bold text-secondary-900">{s.name}</p>
                                            <p className="text-[11px] text-secondary-400 font-medium">{s.sku}</p>
                                        </td>
                                        <td className="py-2 px-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black ${style.chip}`}>
                                                {s.urgency === 'OUT_OF_STOCK' ? <PackageX size={11} /> : <AlertTriangle size={11} />}
                                                {style.label}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-right tabular-nums font-bold text-secondary-900">{s.quantity}</td>
                                        <td className="py-2 px-3 text-right tabular-nums text-secondary-500">{s.minStockLevel}</td>
                                        <td className="py-2 px-3 text-right tabular-nums">
                                            {s.daysOfCover === null ? (
                                                <span className="text-secondary-400 font-medium">no usage yet</span>
                                            ) : (
                                                <span className={s.daysOfCover <= 7 ? 'text-rose-600 font-black' : 'text-secondary-700 font-bold'}>
                                                    {s.daysOfCover}d
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 pl-3 text-right tabular-nums font-black text-primary-700">
                                            {s.suggestedQuantity}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {suggestions.length > 0 && (
                <p className="flex items-center gap-1.5 text-[11px] text-secondary-500 font-medium">
                    <TrendingDown size={12} />
                    Worst first. Items with no reorder point set appear only once they have run out.
                </p>
            )}
        </div>
    );
}
