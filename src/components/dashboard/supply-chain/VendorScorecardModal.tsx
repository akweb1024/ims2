'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Clock, PackageCheck, ShieldAlert, Wallet } from 'lucide-react';

/**
 * Supplier performance, derived on read from the vendor's orders and the receipts against them.
 *
 * Every figure is null-able on purpose: a vendor with nothing delivered is unrated, not
 * zero-rated, and showing 0% for "on time" when no order has an expected date would be a
 * verdict the data does not support.
 */

const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const GRADE_STYLE: Record<string, string> = {
    EXCELLENT: 'bg-emerald-100 text-emerald-700',
    GOOD: 'bg-sky-100 text-sky-700',
    FAIR: 'bg-amber-100 text-amber-700',
    POOR: 'bg-rose-100 text-rose-700',
    UNRATED: 'bg-secondary-100 text-secondary-600',
};

function Metric({
    icon,
    label,
    value,
    hint,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="rounded-xl border border-secondary-200 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-secondary-500 font-bold">
                {icon}
                {label}
            </p>
            <p className="mt-1 text-xl font-black text-secondary-900 tabular-nums">{value}</p>
            {hint && <p className="text-[11px] text-secondary-400 font-medium">{hint}</p>}
        </div>
    );
}

export default function VendorScorecardModal({ vendorId, onClose }: { vendorId: string; onClose: () => void }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/supply-chain/vendors/${vendorId}/scorecard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    }, [vendorId]);

    useEffect(() => {
        load();
    }, [load]);

    const s = data?.scorecard;
    const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v}%`);

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-start justify-between gap-4 p-6 border-b border-secondary-100">
                    <div>
                        <h2 className="text-xl font-black text-secondary-900">
                            {loading ? 'Loading…' : data?.vendor?.name}
                        </h2>
                        <p className="text-xs text-secondary-500 font-medium">
                            Performance across every order placed with this vendor.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {s && (
                            <span className={`px-3 py-1 rounded-lg text-xs font-black ${GRADE_STYLE[data.grade] ?? GRADE_STYLE.UNRATED}`}>
                                {data.grade}
                                {s.overallScore !== null ? ` · ${s.overallScore}` : ''}
                            </span>
                        )}
                        <button onClick={onClose} aria-label="Close scorecard" className="text-secondary-400 hover:text-secondary-700">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-sm font-bold text-secondary-500">Loading scorecard…</div>
                ) : !s ? (
                    <div className="p-10 text-center text-sm font-bold text-secondary-500">Could not load this scorecard.</div>
                ) : (
                    <div className="p-6 space-y-6">
                        {s.overallScore === null && (
                            <p className="rounded-xl bg-secondary-50 border border-secondary-200 px-4 py-3 text-xs font-medium text-secondary-600">
                                Nothing has been received from this vendor yet, so there is no performance to report.
                                Record a delivery against one of their orders and the figures appear here.
                            </p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Metric
                                icon={<Clock size={11} />}
                                label="On time"
                                value={pct(s.onTimeRate)}
                                hint={
                                    s.averageDaysLate === null
                                        ? 'no dated orders'
                                        : s.averageDaysLate > 0
                                            ? `${s.averageDaysLate}d late on average`
                                            : `${Math.abs(s.averageDaysLate)}d early on average`
                                }
                            />
                            <Metric icon={<PackageCheck size={11} />} label="Fill rate" value={pct(s.fillRate)} hint="of units ordered" />
                            <Metric icon={<ShieldAlert size={11} />} label="Rejected" value={pct(s.rejectionRate)} hint="of units delivered" />
                            <Metric icon={<Wallet size={11} />} label="Total spend" value={money(s.totalSpend)} hint={`${s.ordersPlaced} orders`} />
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-secondary-900 mb-2">Orders</h3>
                            {data.orders.length === 0 ? (
                                <p className="text-sm text-secondary-500 font-medium">No purchase orders yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-[11px] uppercase tracking-wide text-secondary-500 border-b border-secondary-200">
                                                <th className="py-2 pr-3 font-bold">PO</th>
                                                <th className="py-2 px-3 font-bold">Status</th>
                                                <th className="py-2 px-3 font-bold">Expected</th>
                                                <th className="py-2 px-3 font-bold text-right">Received</th>
                                                <th className="py-2 pl-3 font-bold text-right">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.orders.map((o: any) => (
                                                <tr key={o.id} className="border-b border-secondary-100 last:border-0">
                                                    <td className="py-2 pr-3 font-bold text-secondary-900">{o.poNumber}</td>
                                                    <td className="py-2 px-3 text-secondary-600 font-medium">{o.status}</td>
                                                    <td className="py-2 px-3 text-secondary-600 font-medium">
                                                        {o.expectedDate
                                                            ? new Date(o.expectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
                                                            : '—'}
                                                    </td>
                                                    <td className="py-2 px-3 text-right tabular-nums text-secondary-700">
                                                        {o.receivedQuantity} / {o.orderedQuantity}
                                                    </td>
                                                    <td className="py-2 pl-3 text-right tabular-nums font-bold text-secondary-900">
                                                        {money(o.totalAmount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <p className="text-[11px] text-secondary-400 font-medium">
                            Orders still arriving are left out of the on-time and fill figures — they have not had their
                            chance to be complete yet. Rejections count from the moment they happen.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
