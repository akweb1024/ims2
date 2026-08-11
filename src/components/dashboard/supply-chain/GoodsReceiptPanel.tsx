'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PackageCheck, Truck, AlertTriangle, Check } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Receiving against a purchase order.
 *
 * Marking a PO "completed" used to be the whole of receiving — it moved no stock and recorded
 * no cost. This panel records what actually turned up: quantities accepted, quantities refused,
 * and the price on the delivery note, which is what the stock gets valued at.
 */

interface OrderItem {
    id: string;
    description: string;
    quantity: number;
    quantityReceived: number;
    unitPrice: number;
    inventoryItemId?: string | null;
}

interface Props {
    purchaseOrderId: string;
    status: string;
    items: OrderItem[];
    onReceived?: () => void;
}

type DraftLine = { received: string; rejected: string; unitCost: string };

const RECEIVABLE_STATUSES = ['ISSUED', 'PARTIAL', 'COMPLETED'];

const money = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function GoodsReceiptPanel({ purchaseOrderId, status, items, onReceived }: Props) {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');
    const [draft, setDraft] = useState<Record<string, DraftLine>>({});

    const outstanding = useMemo(
        () => items.map((i) => ({ ...i, outstanding: Math.max(0, i.quantity - (i.quantityReceived ?? 0)) })),
        [items],
    );
    const anythingOutstanding = outstanding.some((i) => i.outstanding > 0);

    const fetchReceipts = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/supply-chain/purchase-orders/${purchaseOrderId}/receive`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setReceipts(await res.json());
        } finally {
            setLoading(false);
        }
    }, [purchaseOrderId]);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    const setLine = (id: string, patch: Partial<DraftLine>) =>
        setDraft((prev) => {
            const current: DraftLine = prev[id] ?? { received: '', rejected: '', unitCost: '' };
            return { ...prev, [id]: { ...current, ...patch } };
        });

    // "Everything on this order arrived, at the price we agreed" is the common case, so it is
    // one click rather than a row-by-row transcription.
    const fillOutstanding = () => {
        const next: Record<string, DraftLine> = {};
        for (const item of outstanding) {
            if (item.outstanding <= 0) continue;
            next[item.id] = {
                received: String(item.outstanding),
                rejected: '',
                unitCost: String(item.unitPrice),
            };
        }
        setDraft(next);
    };

    const plannedValue = outstanding.reduce((total, item) => {
        const line = draft[item.id];
        if (!line?.received) return total;
        const qty = Number(line.received) || 0;
        const cost = line.unitCost === '' ? item.unitPrice : Number(line.unitCost) || 0;
        return total + qty * cost;
    }, 0);

    const handleSubmit = async () => {
        const lines = Object.entries(draft)
            .map(([purchaseOrderItemId, line]) => ({
                purchaseOrderItemId,
                quantityReceived: Number(line.received) || 0,
                quantityRejected: Number(line.rejected) || 0,
                unitCost: line.unitCost === '' ? null : Number(line.unitCost),
            }))
            .filter((l) => l.quantityReceived > 0 || l.quantityRejected > 0);

        if (lines.length === 0) {
            toast.error('Enter a quantity for at least one line.');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/supply-chain/purchase-orders/${purchaseOrderId}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ lines, notes: notes || null }),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Could not record the delivery.');
                return;
            }

            toast.success(
                data.orderStatus === 'COMPLETED'
                    ? 'Delivery recorded — this order is now complete.'
                    : 'Delivery recorded. Stock and costs updated.',
            );
            setDraft({});
            setNotes('');
            await fetchReceipts();
            onReceived?.();
        } catch {
            toast.error('Could not record the delivery.');
        } finally {
            setSaving(false);
        }
    };

    if (!RECEIVABLE_STATUSES.includes(status)) {
        return (
            <div className="card-premium p-6 print:hidden">
                <div className="flex items-center gap-3 text-secondary-500">
                    <Truck size={18} />
                    <p className="font-bold text-sm">
                        {status === 'CANCELLED'
                            ? 'This order is cancelled, so nothing can be received against it.'
                            : 'Issue this order to the vendor before recording a delivery.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card-premium p-6 space-y-6 print:hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <PackageCheck size={20} className="text-primary-600" />
                    <div>
                        <h2 className="text-lg font-black text-secondary-900">Deliveries</h2>
                        <p className="text-xs text-secondary-500 font-medium">
                            Recording a delivery moves stock and updates each item&apos;s average cost.
                        </p>
                    </div>
                </div>
                {anythingOutstanding && (
                    <button
                        type="button"
                        onClick={fillOutstanding}
                        className="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs font-bold text-secondary-700 hover:border-primary-300"
                    >
                        Receive everything outstanding
                    </button>
                )}
            </div>

            {!anythingOutstanding ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <Check size={16} className="text-emerald-600" />
                    <p className="text-sm font-bold text-emerald-800">Everything on this order has been received.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wide text-secondary-500 border-b border-secondary-200">
                                    <th className="py-2 pr-3 font-bold">Item</th>
                                    <th className="py-2 px-3 font-bold text-right">Ordered</th>
                                    <th className="py-2 px-3 font-bold text-right">Outstanding</th>
                                    <th className="py-2 px-3 font-bold text-right">Accepted</th>
                                    <th className="py-2 px-3 font-bold text-right">Rejected</th>
                                    <th className="py-2 pl-3 font-bold text-right">Unit cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {outstanding.map((item) => (
                                    <tr key={item.id} className="border-b border-secondary-100 last:border-0">
                                        <td className="py-2 pr-3">
                                            <p className="font-bold text-secondary-900">{item.description}</p>
                                            {!item.inventoryItemId && (
                                                <p className="text-[11px] text-secondary-400 font-medium">
                                                    Not a stocked item — recorded, but no inventory movement
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-2 px-3 text-right tabular-nums text-secondary-600">{item.quantity}</td>
                                        <td className="py-2 px-3 text-right tabular-nums font-bold text-secondary-900">
                                            {item.outstanding}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <input
                                                type="number"
                                                min={0}
                                                max={item.outstanding}
                                                disabled={item.outstanding === 0}
                                                aria-label={`Quantity accepted for ${item.description}`}
                                                value={draft[item.id]?.received ?? ''}
                                                onChange={(e) => setLine(item.id, { received: e.target.value })}
                                                className="w-20 px-2 py-1 rounded-lg border border-secondary-200 text-right tabular-nums disabled:bg-secondary-50"
                                            />
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <input
                                                type="number"
                                                min={0}
                                                aria-label={`Quantity rejected for ${item.description}`}
                                                value={draft[item.id]?.rejected ?? ''}
                                                onChange={(e) => setLine(item.id, { rejected: e.target.value })}
                                                className="w-20 px-2 py-1 rounded-lg border border-secondary-200 text-right tabular-nums"
                                            />
                                        </td>
                                        <td className="py-2 pl-3 text-right">
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                aria-label={`Unit cost for ${item.description}`}
                                                placeholder={String(item.unitPrice)}
                                                value={draft[item.id]?.unitCost ?? ''}
                                                onChange={(e) => setLine(item.id, { unitCost: e.target.value })}
                                                className="w-24 px-2 py-1 rounded-lg border border-secondary-200 text-right tabular-nums"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-[11px] text-secondary-500 font-medium">
                        Leave unit cost blank to use the ordered price. Enter the delivery-note price when it differs —
                        stock is valued at what was actually charged.
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-1">
                            <label htmlFor="grn-notes" className="block text-xs font-bold text-secondary-600 mb-1">
                                Notes (optional)
                            </label>
                            <input
                                id="grn-notes"
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Delivery note number, condition on arrival, who signed for it"
                                className="w-full px-3 py-2 rounded-xl border border-secondary-200"
                            />
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] uppercase tracking-wide text-secondary-500 font-bold">Value</p>
                            <p className="text-lg font-black text-secondary-900 tabular-nums">{money(plannedValue)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold disabled:opacity-60"
                        >
                            {saving ? 'Recording…' : 'Record delivery'}
                        </button>
                    </div>
                </div>
            )}

            <div className="pt-2 border-t border-secondary-100">
                <h3 className="text-sm font-black text-secondary-900 mb-3">Delivery history</h3>
                {loading ? (
                    <p className="text-sm text-secondary-500 font-medium">Loading deliveries…</p>
                ) : receipts.length === 0 ? (
                    <p className="text-sm text-secondary-500 font-medium">Nothing has been received against this order yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {receipts.map((receipt) => {
                            const accepted = receipt.lines.reduce((t: number, l: any) => t + l.quantityReceived, 0);
                            const rejected = receipt.lines.reduce((t: number, l: any) => t + l.quantityRejected, 0);
                            const value = receipt.lines.reduce((t: number, l: any) => t + l.quantityReceived * l.unitCost, 0);

                            return (
                                <li key={receipt.id} className="rounded-xl border border-secondary-200 px-4 py-3">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <p className="font-bold text-secondary-900">{receipt.receiptNumber}</p>
                                            <p className="text-xs text-secondary-500 font-medium">
                                                {new Date(receipt.receivedDate).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                                {receipt.receiver?.name ? ` · received by ${receipt.receiver.name}` : ''}
                                                {receipt.warehouse?.name ? ` · ${receipt.warehouse.name}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 text-right">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wide text-secondary-500 font-bold">Accepted</p>
                                                <p className="font-black text-secondary-900 tabular-nums">{accepted}</p>
                                            </div>
                                            {rejected > 0 && (
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-rose-500 font-bold">Rejected</p>
                                                    <p className="font-black text-rose-600 tabular-nums">{rejected}</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wide text-secondary-500 font-bold">Value</p>
                                                <p className="font-black text-secondary-900 tabular-nums">{money(value)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {receipt.notes && (
                                        <p className="mt-2 text-xs text-secondary-600 font-medium">{receipt.notes}</p>
                                    )}
                                    {rejected > 0 && (
                                        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                                            <AlertTriangle size={12} />
                                            Rejected units never entered stock and count against this vendor&apos;s quality score.
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
