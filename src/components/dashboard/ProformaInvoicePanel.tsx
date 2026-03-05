'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    journalId?: string;
    planId?: string;
    courseId?: string;
    workshopId?: string;
    productId?: string;
}

interface ProformaAuditEvent {
    id: string;
    actorEmail?: string;
    fromStatus?: string;
    toStatus: string;
    action: string;
    metadata?: any;
    createdAt: string;
}

interface ProformaInvoice {
    id: string;
    proformaNumber: string;
    status: 'DRAFT' | 'PAYMENT_PENDING' | 'CONVERTED' | 'CANCELLED';
    subject?: string;
    salesChannel: string;
    currency: string;
    billingFrequency: string;
    subtotal: number;
    discountAmount: number;
    discountType?: string;
    discountValue?: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    cgst: number;
    sgst: number;
    igst: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    notes?: string;
    validUntil?: string;
    startDate?: string;
    endDate?: string;
    autoRenew: boolean;
    lineItems?: LineItem[];
    convertedInvoiceId?: string;
    convertedSubId?: string;
    convertedAt?: string;
    createdAt: string;
    auditEvents: ProformaAuditEvent[];
}

interface ProformaInvoicePanelProps {
    customerId: string;
    customerName: string;
    customerEmail: string;
    currency?: string;
    userRole: string;
    onConversionSuccess?: (invoiceId: string, subscriptionId: string) => void;
}

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; bg: string; border: string }> = {
    DRAFT: {
        label: 'Draft', icon: '✏️',
        color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200'
    },
    PAYMENT_PENDING: {
        label: 'Payment Pending', icon: '⏳',
        color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200'
    },
    CONVERTED: {
        label: 'Converted', icon: '✅',
        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200'
    },
    CANCELLED: {
        label: 'Cancelled', icon: '🚫',
        color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200'
    },
};

const FMT = (n: number, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || { label: status, icon: '•', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

function AuditTimeline({ events }: { events: ProformaAuditEvent[] }) {
    const actionLabels: Record<string, string> = {
        CREATE: 'Created', EDIT: 'Edited', STATUS_CHANGE: 'Status changed',
        CONVERT: 'Converted to Invoice', DELETE: 'Deleted',
    };
    return (
        <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-3">
                {events.map((ev, i) => (
                    <div key={ev.id} className="flex gap-3 relative pl-10">
                        <div className={`absolute left-3 w-2.5 h-2.5 rounded-full mt-1.5 border-2 border-white ${i === events.length - 1 ? 'bg-primary-500' : 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-800 capitalize">
                                    {actionLabels[ev.action] || ev.action}
                                </span>
                                {ev.fromStatus && (
                                    <>
                                        <StatusBadge status={ev.fromStatus} />
                                        <span className="text-gray-400 text-xs">→</span>
                                    </>
                                )}
                                <StatusBadge status={ev.toStatus} />
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                by {ev.actorEmail || 'System'} · {new Date(ev.createdAt).toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function ProformaInvoicePanel({
    customerId, customerName, customerEmail,
    currency = 'INR', userRole, onConversionSuccess
}: ProformaInvoicePanelProps) {

    const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProforma, setEditingProforma] = useState<ProformaInvoice | null>(null);
    const [viewingProforma, setViewingProforma] = useState<ProformaInvoice | null>(null);
    const [convertingProforma, setConvertingProforma] = useState<ProformaInvoice | null>(null);
    const [deletingProforma, setDeletingProforma] = useState<ProformaInvoice | null>(null);

    // Form state for create/edit
    const [subject, setSubject] = useState('Proforma Invoice');
    const [salesChannel, setSalesChannel] = useState('DIRECT');
    const [billingFrequency, setBillingFrequency] = useState('ANNUAL');
    const [pfCurrency, setPfCurrency] = useState(currency);
    const [taxRate, setTaxRate] = useState(18);
    const [discountType, setDiscountType] = useState('');
    const [discountValue, setDiscountValue] = useState(0);
    const [notes, setNotes] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { description: '', quantity: 1, unitPrice: 0, total: 0 }
    ]);

    // Conversion form
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [conversionNotes, setConversionNotes] = useState('');
    const [convStartDate, setConvStartDate] = useState('');
    const [convEndDate, setConvEndDate] = useState('');

    // Delete form
    const [deleteReason, setDeleteReason] = useState('');
    const [hardDelete, setHardDelete] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const fetchProformas = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/proforma?customerId=${customerId}`, { headers: authHeaders });
            if (!res.ok) throw new Error('Failed to load proforma invoices');
            const data = await res.json();
            setProformas(data.data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => { fetchProformas(); }, [fetchProformas]);

    // ── Computed financials ─────────────────────────────────────────────────
    const subtotal = lineItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
    const discountAmount = discountType === 'PERCENTAGE' ? subtotal * (discountValue / 100)
        : discountType === 'FIXED' ? discountValue : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;

    // ── Line item helpers ───────────────────────────────────────────────────
    const updateLineItem = (i: number, field: keyof LineItem, value: any) => {
        setLineItems(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], [field]: value };
            updated[i].total = (updated[i].unitPrice || 0) * (updated[i].quantity || 1);
            return updated;
        });
    };

    const addLineItem = () => setLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    const removeLineItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));

    const resetForm = () => {
        setSubject('Proforma Invoice'); setSalesChannel('DIRECT'); setBillingFrequency('ANNUAL');
        setPfCurrency(currency); setTaxRate(18); setDiscountType(''); setDiscountValue(0);
        setNotes(''); setValidUntil(''); setStartDate(''); setEndDate('');
        setLineItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    };

    const populateFormFromProforma = (pf: ProformaInvoice) => {
        setSubject(pf.subject || 'Proforma Invoice');
        setSalesChannel(pf.salesChannel);
        setBillingFrequency(pf.billingFrequency);
        setPfCurrency(pf.currency);
        setTaxRate(pf.taxRate);
        setDiscountType(pf.discountType || '');
        setDiscountValue(pf.discountValue || 0);
        setNotes(pf.notes || '');
        setValidUntil(pf.validUntil ? pf.validUntil.split('T')[0] : '');
        setStartDate(pf.startDate ? pf.startDate.split('T')[0] : '');
        setEndDate(pf.endDate ? pf.endDate.split('T')[0] : '');
        setLineItems((pf.lineItems && pf.lineItems.length > 0)
            ? pf.lineItems : [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    };

    const notify = (msg: string, isError = false) => {
        if (isError) setError(msg); else setSuccess(msg);
        setTimeout(() => { setError(''); setSuccess(''); }, 5000);
    };

    // ── Create ──────────────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (lineItems.some(li => !li.description.trim())) {
            notify('All line items must have a description', true); return;
        }
        setActionLoading(true);
        try {
            const res = await fetch('/api/proforma', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    customerProfileId: customerId,
                    subject, salesChannel, billingFrequency,
                    currency: pfCurrency, taxRate, discountType: discountType || undefined,
                    discountValue, notes: notes || undefined,
                    validUntil: validUntil || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    lineItems,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Creation failed');
            notify(`Proforma ${data.proformaNumber} created successfully`);
            setShowCreateModal(false);
            resetForm();
            await fetchProformas();
        } catch (e: any) {
            notify(e.message, true);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Edit (Update) ───────────────────────────────────────────────────────
    const handleUpdate = async () => {
        if (!editingProforma) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/proforma/${editingProforma.id}`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({
                    subject, salesChannel, billingFrequency,
                    currency: pfCurrency, taxRate,
                    discountType: discountType || undefined, discountValue,
                    notes: notes || undefined,
                    validUntil: validUntil || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    lineItems,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Update failed');
            notify(`Proforma ${editingProforma.proformaNumber} updated`);
            setEditingProforma(null);
            resetForm();
            await fetchProformas();
        } catch (e: any) {
            notify(e.message, true);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Status transition ───────────────────────────────────────────────────
    const handleStatusChange = async (pf: ProformaInvoice, toStatus: string) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/proforma/${pf.id}/status`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ toStatus }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Status change failed');
            notify(`Status updated to ${toStatus.replace('_', ' ')}`);
            await fetchProformas();
        } catch (e: any) {
            notify(e.message, true);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Conversion ──────────────────────────────────────────────────────────
    const handleConvert = async () => {
        if (!convertingProforma) return;
        if (!paymentAmount) { notify('Payment amount is required', true); return; }
        setActionLoading(true);
        try {
            const res = await fetch(`/api/proforma/${convertingProforma.id}/convert`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    paymentAmount: parseFloat(paymentAmount),
                    paymentMethod, paymentReference: paymentReference || undefined,
                    paymentDate, notes: conversionNotes || undefined,
                    startDate: convStartDate || convertingProforma.startDate,
                    endDate: convEndDate || convertingProforma.endDate,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Conversion failed');
            notify(`✅ ${data.message}`);
            setConvertingProforma(null);
            setPaymentAmount(''); setPaymentReference(''); setConversionNotes('');
            setConvStartDate(''); setConvEndDate('');
            await fetchProformas();
            if (onConversionSuccess && data.invoiceId) {
                onConversionSuccess(data.invoiceId, data.subscriptionId);
            }
        } catch (e: any) {
            notify(e.message, true);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deletingProforma) return;
        setActionLoading(true);
        try {
            const params = new URLSearchParams({ hard: String(hardDelete), reason: deleteReason });
            const res = await fetch(`/api/proforma/${deletingProforma.id}?${params}`, {
                method: 'DELETE',
                headers: authHeaders,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Deletion failed');
            notify('Proforma deleted successfully');
            setDeletingProforma(null);
            setDeleteReason(''); setHardDelete(false);
            await fetchProformas();
        } catch (e: any) {
            notify(e.message, true);
        } finally {
            setActionLoading(false);
        }
    };

    const canEdit = (pf: ProformaInvoice) => pf.status === 'DRAFT';
    const canDelete = (pf: ProformaInvoice) => pf.status !== 'CONVERTED';
    const canSendPayment = (pf: ProformaInvoice) => pf.status === 'DRAFT';
    const canConvert = (pf: ProformaInvoice) => pf.status === 'PAYMENT_PENDING' && ['SUPER_ADMIN', 'MANAGER'].includes(userRole);

    // ── Form Modal (shared create + edit) ──────────────────────────────────
    const FormModal = ({ mode }: { mode: 'create' | 'edit' }) => (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-8">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {mode === 'create' ? '📄 New Proforma Invoice' : `✏️ Edit ${editingProforma?.proformaNumber}`}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {mode === 'create'
                                ? `Draft a provisional invoice for ${customerName}`
                                : 'Update draft terms — changes will be logged in audit trail'}
                        </p>
                    </div>
                    <button onClick={() => { mode === 'create' ? setShowCreateModal(false) : setEditingProforma(null); resetForm(); }}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Subject */}
                    <div>
                        <label className="label">Subject / Title</label>
                        <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Proforma for Journal Subscription 2025-26" />
                    </div>

                    {/* Terms Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="label">Sales Channel</label>
                            <select className="input" value={salesChannel} onChange={e => setSalesChannel(e.target.value)}>
                                <option value="DIRECT">Direct</option>
                                <option value="AGENCY">Agency</option>
                                <option value="ONLINE">Online</option>
                                <option value="REFERRAL">Referral</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Billing Frequency</label>
                            <select className="input" value={billingFrequency} onChange={e => setBillingFrequency(e.target.value)}>
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Quarterly</option>
                                <option value="ANNUAL">Annual</option>
                                <option value="BIENNIAL">Biennial</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Currency</label>
                            <select className="input" value={pfCurrency} onChange={e => setPfCurrency(e.target.value)}>
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Valid Until</label>
                            <input type="date" className="input" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                        </div>
                    </div>

                    {/* Provisional Dates */}
                    <div className="grid grid-cols-2 gap-4 bg-primary-50/40 p-4 rounded-xl border border-primary-100/50">
                        <div>
                            <label className="label">Provisional Start Date</label>
                            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Provisional End Date</label>
                            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <p className="col-span-2 text-[11px] text-primary-600 italic -mt-2">
                            ℹ️ Dates are provisional. Actual dates are confirmed at payment conversion.
                        </p>
                    </div>

                    {/* Line Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="label mb-0">Line Items</label>
                            <button type="button" onClick={addLineItem}
                                className="text-sm text-primary-600 font-bold hover:text-primary-800 flex items-center gap-1">
                                + Add Item
                            </button>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-gray-400 px-1">
                                <div className="col-span-6">Description</div>
                                <div className="col-span-2 text-right">Qty</div>
                                <div className="col-span-3 text-right">Unit Price</div>
                                <div className="col-span-1" />
                            </div>
                            {lineItems.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                                    <div className="col-span-6">
                                        <input
                                            className="input text-sm !py-1.5"
                                            placeholder="e.g. Journal Subscription — Physics"
                                            value={item.description}
                                            onChange={e => updateLineItem(i, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="1"
                                            className="input text-sm !py-1.5 text-right"
                                            value={item.quantity}
                                            onChange={e => updateLineItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="number" min="0" step="0.01"
                                            className="input text-sm !py-1.5 text-right"
                                            value={item.unitPrice}
                                            onChange={e => updateLineItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        {lineItems.length > 1 && (
                                            <button type="button" onClick={() => removeLineItem(i)}
                                                className="text-red-400 hover:text-red-600 text-sm font-bold">✕</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Discount + Tax */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="label">Discount Type</label>
                            <select className="input" value={discountType} onChange={e => setDiscountType(e.target.value)}>
                                <option value="">None</option>
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FIXED">Fixed Amount</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Discount Value</label>
                            <input type="number" min="0" step="0.01" className="input" disabled={!discountType}
                                value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label className="label">Tax Rate (%)</label>
                            <input type="number" min="0" max="100" step="0.5" className="input"
                                value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white">
                        <h4 className="text-xs uppercase font-black tracking-widest text-gray-400 mb-3">Financial Summary</h4>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-300">Subtotal</span>
                                <span className="font-bold">{FMT(subtotal, pfCurrency)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-300">Discount ({discountType === 'PERCENTAGE' ? `${discountValue}%` : 'Fixed'})</span>
                                    <span className="text-red-400 font-bold">− {FMT(discountAmount, pfCurrency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-300">Tax ({taxRate}%)</span>
                                <span className="font-bold">{FMT(taxAmount, pfCurrency)}</span>
                            </div>
                            <div className="border-t border-gray-600 pt-1.5 flex justify-between">
                                <span className="font-black text-white">Total</span>
                                <span className="font-black text-lg text-emerald-400">{FMT(total, pfCurrency)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="label">Internal Notes</label>
                        <textarea className="input h-20" placeholder="Add any internal notes or special terms..."
                            value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={() => { mode === 'create' ? setShowCreateModal(false) : setEditingProforma(null); resetForm(); }}
                        className="btn btn-secondary">Cancel</button>
                    <button
                        onClick={mode === 'create' ? handleCreate : handleUpdate}
                        disabled={actionLoading || lineItems.every(li => !li.description)}
                        className="btn btn-primary px-8">
                        {actionLoading ? '⏳ Saving...' : mode === 'create' ? '📄 Create Proforma' : '💾 Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );

    // ── View Detail Modal ───────────────────────────────────────────────────
    const ViewModal = () => {
        if (!viewingProforma) return null;
        const pf = viewingProforma;
        const items: LineItem[] = pf.lineItems || [];

        return (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-900">{pf.proformaNumber}</h2>
                                <StatusBadge status={pf.status} />
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{pf.subject}</p>
                        </div>
                        <button onClick={() => setViewingProforma(null)}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-400">✕</button>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Meta */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            {[
                                { label: 'Customer', value: customerName },
                                { label: 'Currency', value: pf.currency },
                                { label: 'Channel', value: pf.salesChannel },
                                { label: 'Valid Until', value: formatDate(pf.validUntil) },
                                { label: 'Start Date', value: formatDate(pf.startDate) },
                                { label: 'End Date', value: formatDate(pf.endDate) },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
                                    <p className="font-medium text-gray-800 mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Line Items */}
                        <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                        <th className="text-left p-3 text-xs font-black uppercase text-gray-500">Description</th>
                                        <th className="text-right p-3 text-xs font-black uppercase text-gray-500">Qty</th>
                                        <th className="text-right p-3 text-xs font-black uppercase text-gray-500">Unit Price</th>
                                        <th className="text-right p-3 text-xs font-black uppercase text-gray-500">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i} className="border-b border-gray-100">
                                            <td className="p-3 text-gray-800">{item.description}</td>
                                            <td className="p-3 text-right text-gray-600">{item.quantity}</td>
                                            <td className="p-3 text-right text-gray-600">{FMT(item.unitPrice, pf.currency)}</td>
                                            <td className="p-3 text-right font-bold text-gray-800">{FMT(item.total || item.unitPrice * item.quantity, pf.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 space-y-1 border-t border-gray-200">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Subtotal</span><span>{FMT(pf.subtotal, pf.currency)}</span>
                                </div>
                                {pf.discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-red-600">
                                        <span>Discount</span><span>− {FMT(pf.discountAmount, pf.currency)}</span>
                                    </div>
                                )}
                                {pf.cgst > 0 && <div className="flex justify-between text-sm text-gray-600"><span>CGST ({pf.cgstRate}%)</span><span>{FMT(pf.cgst, pf.currency)}</span></div>}
                                {pf.sgst > 0 && <div className="flex justify-between text-sm text-gray-600"><span>SGST ({pf.sgstRate}%)</span><span>{FMT(pf.sgst, pf.currency)}</span></div>}
                                {pf.igst > 0 && <div className="flex justify-between text-sm text-gray-600"><span>IGST ({pf.igstRate}%)</span><span>{FMT(pf.igst, pf.currency)}</span></div>}
                                <div className="flex justify-between font-black text-gray-900 pt-1 border-t border-gray-200">
                                    <span>Total</span><span className="text-emerald-700">{FMT(pf.total, pf.currency)}</span>
                                </div>
                            </div>
                        </div>

                        {pf.notes && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-xs font-black uppercase text-amber-600 mb-1">Notes</p>
                                <p className="text-sm text-amber-800">{pf.notes}</p>
                            </div>
                        )}

                        {/* Converted Info */}
                        {pf.status === 'CONVERTED' && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <p className="text-xs font-black uppercase text-emerald-700 mb-2">✅ Conversion Details</p>
                                <div className="grid grid-cols-2 gap-2 text-sm text-emerald-800">
                                    <div><span className="font-bold">Invoice ID:</span> {pf.convertedInvoiceId?.slice(0, 8)}...</div>
                                    <div><span className="font-bold">Converted:</span> {formatDate(pf.convertedAt)}</div>
                                </div>
                            </div>
                        )}

                        {/* Audit Trail */}
                        {pf.auditEvents?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                                    🕐 Audit Trail
                                </h4>
                                <AuditTimeline events={pf.auditEvents} />
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end">
                        <button onClick={() => setViewingProforma(null)} className="btn btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        );
    };

    // ── Conversion Modal ────────────────────────────────────────────────────
    const ConvertModal = () => {
        if (!convertingProforma) return null;
        const pf = convertingProforma;
        const amountNum = parseFloat(paymentAmount) || 0;
        const amountDiff = Math.abs(amountNum - pf.total);
        const amountOk = amountNum > 0 && amountDiff <= 0.01;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900">💰 Confirm Payment & Convert</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            This will permanently convert <strong>{pf.proformaNumber}</strong> into a legally binding Invoice and activate the Subscription.
                        </p>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Amount banner */}
                        <div className="bg-gray-900 rounded-xl p-4 text-white flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-black">Proforma Total</p>
                                <p className="text-2xl font-black text-emerald-400">{FMT(pf.total, pf.currency)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 uppercase font-black">Proforma #</p>
                                <p className="font-bold">{pf.proformaNumber}</p>
                            </div>
                        </div>

                        <div>
                            <label className="label">Payment Amount Received <span className="text-red-500">*</span></label>
                            <input type="number" step="0.01" className={`input ${paymentAmount && !amountOk ? 'border-red-400 focus:ring-red-200' : ''}`}
                                value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                                placeholder={`${pf.total.toFixed(2)}`} />
                            {paymentAmount && !amountOk && (
                                <p className="text-xs text-red-600 mt-1">
                                    ⚠️ Amount differs by ₹{amountDiff.toFixed(2)} from the proforma total. Must be within ₹0.01.
                                </p>
                            )}
                            {paymentAmount && amountOk && (
                                <p className="text-xs text-emerald-600 mt-1">✅ Amount matches proforma total</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Payment Method</label>
                                <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CHEQUE">Cheque</option>
                                    <option value="ONLINE">Online Payment</option>
                                    <option value="CASH">Cash</option>
                                    <option value="DD">Demand Draft</option>
                                    <option value="UPI">UPI</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Payment Date</label>
                                <input type="date" className="input" value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <label className="label">Transaction / Reference No.</label>
                            <input className="input" placeholder="UTR, Cheque No., Transaction ID..."
                                value={paymentReference} onChange={e => setPaymentReference(e.target.value)} />
                        </div>

                        {(!pf.startDate || !pf.endDate) && (
                            <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-200">
                                <div>
                                    <label className="label">Subscription Start Date <span className="text-red-500">*</span></label>
                                    <input type="date" className="input" value={convStartDate}
                                        onChange={e => setConvStartDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="label">Subscription End Date <span className="text-red-500">*</span></label>
                                    <input type="date" className="input" value={convEndDate}
                                        onChange={e => setConvEndDate(e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="label">Notes (optional)</label>
                            <textarea className="input h-16" value={conversionNotes}
                                onChange={e => setConversionNotes(e.target.value)}
                                placeholder="Add payment notes or reconciliation details..." />
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <p className="text-xs text-amber-800 font-bold">
                                ⚠️ This action is irreversible. The proforma will be sealed as CONVERTED and a permanent invoice + subscription will be created.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                        <button onClick={() => { setConvertingProforma(null); setPaymentAmount(''); }}
                            className="btn btn-secondary">Cancel</button>
                        <button
                            onClick={handleConvert}
                            disabled={actionLoading || !amountOk}
                            className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 px-8">
                            {actionLoading ? '⏳ Processing...' : '✅ Confirm & Convert'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ── Delete Modal ────────────────────────────────────────────────────────
    const DeleteModal = () => {
        if (!deletingProforma) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-red-700">🗑️ Delete Proforma</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            <strong>{deletingProforma.proformaNumber}</strong> — {FMT(deletingProforma.total, deletingProforma.currency)}
                        </p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="label">Reason for Deletion</label>
                            <textarea className="input h-20" value={deleteReason}
                                onChange={e => setDeleteReason(e.target.value)}
                                placeholder="Required: Explain why this proforma is being deleted..." />
                        </div>

                        {userRole === 'SUPER_ADMIN' && (
                            <div className="flex items-center gap-3 bg-red-50 border border-red-200 p-3 rounded-xl">
                                <input type="checkbox" id="hardDelete" checked={hardDelete}
                                    onChange={e => setHardDelete(e.target.checked)} className="w-4 h-4 accent-red-600" />
                                <label htmlFor="hardDelete" className="text-sm text-red-700 font-bold cursor-pointer">
                                    Hard Delete (permanent, no recovery possible)
                                </label>
                            </div>
                        )}

                        <div className={`rounded-xl p-3 ${hardDelete ? 'bg-red-100 border border-red-300' : 'bg-amber-50 border border-amber-200'}`}>
                            <p className={`text-xs font-bold ${hardDelete ? 'text-red-700' : 'text-amber-700'}`}>
                                {hardDelete
                                    ? '⛔ Hard delete will permanently remove all records including audit trail.'
                                    : '📁 Soft delete marks the proforma as cancelled and preserves the audit trail.'}
                            </p>
                        </div>
                    </div>
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                        <button onClick={() => { setDeletingProforma(null); setDeleteReason(''); setHardDelete(false); }}
                            className="btn btn-secondary">Cancel</button>
                        <button
                            onClick={handleDelete}
                            disabled={actionLoading || !deleteReason.trim()}
                            className="btn bg-red-600 hover:bg-red-700 text-white px-8">
                            {actionLoading ? '⏳ Deleting...' : hardDelete ? '⛔ Hard Delete' : '🗑️ Soft Delete'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ── Main Render ─────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Notifications */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
                    <span>⚠️</span> <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
                    <span>✅</span> <span>{success}</span>
                </div>
            )}

            {/* Panel Header */}
            <div className="card-premium">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            📄 Proforma Invoices
                            {proformas.length > 0 && (
                                <span className="bg-primary-100 text-primary-700 text-xs font-black px-2 py-0.5 rounded-full">
                                    {proformas.length}
                                </span>
                            )}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Draft provisional invoices before activating subscriptions
                        </p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="btn btn-primary flex items-center gap-2">
                        <span>+</span> New Proforma
                    </button>
                </div>

                {/* FSM Legend */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                        <span key={status} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            {cfg.icon} {cfg.label}
                        </span>
                    ))}
                    <span className="text-[11px] text-gray-400 self-center ml-1">→ lifecycle stages</span>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                    </div>
                ) : proformas.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-gray-500 font-medium">No proforma invoices yet</p>
                        <p className="text-sm text-gray-400 mt-1 mb-4">
                            Create a proforma to draft provisional terms before payment.
                        </p>
                        <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn btn-primary">
                            Create First Proforma
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {proformas.map(pf => (
                            <div key={pf.id} className={`border rounded-xl p-4 transition-all hover:shadow-sm ${pf.status === 'CONVERTED' ? 'border-emerald-200 bg-emerald-50/30' : pf.status === 'CANCELLED' ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 bg-white hover:border-primary-200'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-gray-900">{pf.proformaNumber}</span>
                                            <StatusBadge status={pf.status} />
                                        </div>
                                        <p className="text-sm text-gray-600 mt-0.5 truncate">{pf.subject}</p>
                                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                                            <span>📅 {formatDate(pf.createdAt)}</span>
                                            {pf.validUntil && <span>⏰ Valid till {formatDate(pf.validUntil)}</span>}
                                            {pf.startDate && <span>🗓️ {formatDate(pf.startDate)} → {formatDate(pf.endDate)}</span>}
                                            <span>🔄 {pf.billingFrequency}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black text-lg text-gray-900">{FMT(pf.total, pf.currency)}</p>
                                        {pf.taxAmount > 0 && (
                                            <p className="text-xs text-gray-400">incl. {FMT(pf.taxAmount, pf.currency)} tax</p>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <button onClick={() => setViewingProforma(pf)}
                                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors">
                                        👁️ View
                                    </button>

                                    {canEdit(pf) && (
                                        <button onClick={() => { populateFormFromProforma(pf); setEditingProforma(pf); }}
                                            className="text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-bold transition-colors">
                                            ✏️ Edit
                                        </button>
                                    )}

                                    {canSendPayment(pf) && (
                                        <button
                                            onClick={() => handleStatusChange(pf, 'PAYMENT_PENDING')}
                                            disabled={actionLoading}
                                            className="text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold transition-colors">
                                            📤 Send for Payment
                                        </button>
                                    )}

                                    {pf.status === 'PAYMENT_PENDING' && !['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                                        <button
                                            onClick={() => handleStatusChange(pf, 'DRAFT')}
                                            disabled={actionLoading}
                                            className="text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-bold transition-colors">
                                            ↩️ Recall to Draft
                                        </button>
                                    )}

                                    {canConvert(pf) && (
                                        <button
                                            onClick={() => { setPaymentAmount(pf.total.toFixed(2)); setConvertingProforma(pf); }}
                                            className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors">
                                            ✅ Confirm Payment & Convert
                                        </button>
                                    )}

                                    {canDelete(pf) && (
                                        <button onClick={() => setDeletingProforma(pf)}
                                            className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-bold transition-colors ml-auto">
                                            🗑️ Delete
                                        </button>
                                    )}

                                    {pf.status === 'CONVERTED' && pf.convertedInvoiceId && (
                                        <a href={`/dashboard/crm/invoices/${pf.convertedInvoiceId}`}
                                            className="text-xs px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg font-bold transition-colors">
                                            🧾 View Invoice →
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && <FormModal mode="create" />}
            {editingProforma && <FormModal mode="edit" />}
            {viewingProforma && <ViewModal />}
            {convertingProforma && <ConvertModal />}
            {deletingProforma && <DeleteModal />}
        </div>
    );
}
