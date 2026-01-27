'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        method: 'card',
        reference: '',
        notes: ''
    });

    const fetchInvoice = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/invoices/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setInvoice(data);
            } else {
                const err = await res.json();
                setError(err.error || 'Invoice not found');
            }
        } catch (err) {
            setError('Failed to load invoice');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchInvoice();
    }, [id, fetchInvoice]);

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPaying(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/invoices/${id}/pay`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: invoice.total,
                    paymentMethod: paymentForm.method,
                    transactionId: paymentForm.reference || `TXN-${Date.now()}`, // Auto-gen if empty
                    notes: paymentForm.notes || 'Payment via Portal'
                })
            });

            if (res.ok) {
                await fetchInvoice(); // Refresh data
                setShowPaymentModal(false);
                setPaymentForm({ method: 'card', reference: '', notes: '' });
                alert('Payment processed successfully!');
            } else {
                const err = await res.json();
                alert(err.error || 'Payment failed');
            }
        } catch (err) {
            alert('Payment simulation failed');
        } finally {
            setIsPaying(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !invoice) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="card-premium p-12 text-center">
                    <div className="text-danger-500 text-4xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-secondary-900">{error || 'Invoice not found'}</h2>
                    <button onClick={() => router.back()} className="btn btn-primary mt-6">Go Back</button>
                </div>
            </DashboardLayout>
        );
    }

    const currencySymbol = invoice.currency === 'INR' ? '₹' : '$';

    // Robustly resolve customer details (Subscription -> Invoice Direct)
    const customer = invoice.subscription?.customerProfile || invoice.customerProfile || {};

    // Robustly resolve items
    const invoiceItems = invoice.subscription?.items || (Array.isArray(invoice.lineItems) ? invoice.lineItems : []) || [];

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-5xl mx-auto space-y-6 pb-12">
                {/* Header Actions */}
                <div className="flex justify-between items-center no-print">
                    <button onClick={() => router.back()} className="btn btn-secondary flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back</span>
                    </button>
                    <div className="flex space-x-3">
                        {['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(userRole) && (
                            <button
                                className="btn btn-secondary border-danger-200 text-danger-600 hover:bg-danger-50"
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to CANCEL this invoice? This cannot be undone.')) return;
                                    try {
                                        const token = localStorage.getItem('token');
                                        const res = await fetch(`/api/invoices/${id}/metadata`, {
                                            method: 'PATCH',
                                            headers: {
                                                'Authorization': `Bearer ${token}`,
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ status: 'CANCELLED' })
                                        });
                                        if (res.ok) fetchInvoice();
                                        else alert('Failed to cancel');
                                    } catch (e) { alert('Error'); }
                                }}
                            >
                                Cancel Invoice
                            </button>
                        )}
                        <button className="btn btn-secondary" onClick={() => window.print()}>
                            Print PDF
                        </button>
                        {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                            <button
                                className="btn btn-primary shadow-lg shadow-primary-200"
                                onClick={() => setShowPaymentModal(true)}
                            >
                                Settle Invoice
                            </button>
                        )}
                    </div>
                </div>

                {/* Invoice Document */}
                <div className="card-premium p-0 overflow-hidden shadow-2xl border-0 ring-1 ring-secondary-200 print-content">
                    <div className="p-8 sm:p-12 space-y-12">
                        {/* Top Branding & Status */}
                        <div className="flex flex-col sm:flex-row justify-between gap-8">
                            <div>
                                <h1 className="text-4xl font-extrabold text-primary-600 tracking-tight">STM JOURNALS</h1>
                                <p className="text-secondary-500 mt-2 font-medium">Subscription Management Division</p>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-4 py-1.5 rounded-full font-bold text-sm mb-4 ${invoice.status === 'PAID' ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                                    }`}>
                                    {invoice.status.replace('_', ' ')}
                                </span>
                                <div className="space-y-1">
                                    <p className="text-3xl font-bold text-secondary-900">{invoice.invoiceNumber}</p>
                                    <p className="text-sm text-secondary-500">Date: <FormattedDate date={invoice.createdAt} /></p>
                                </div>
                            </div>
                        </div>

                        {/* Customer & Billing Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-secondary-100">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Billed To</h3>
                                <div>
                                    <p className="text-lg font-bold text-secondary-900">{customer.name || 'Unknown Client'}</p>
                                    <p className="text-secondary-600 font-medium">{customer.organizationName || 'Individual'}</p>
                                    <p className="text-secondary-500 text-sm mt-1">{customer.primaryEmail}</p>
                                    <p className="text-secondary-500 text-sm">{customer.billingAddress}</p>
                                </div>
                            </div>
                            <div className="space-y-4 md:text-right">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Payment Details</h3>
                                <div className="space-y-2">
                                    <p className="text-sm">
                                        <span className="text-secondary-500">Due Date:</span>{' '}
                                        <span className="font-bold text-secondary-900"><FormattedDate date={invoice.dueDate} /></span>
                                    </p>
                                    <p className="text-sm">
                                        <span className="text-secondary-500">Method:</span>{' '}
                                        <span className="font-bold text-secondary-900">{invoice.payments[0]?.paymentMethod || 'TBD'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="overflow-x-auto pt-8">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-secondary-900">
                                        <th className="py-4 text-sm font-bold text-secondary-900 uppercase">Item Description</th>
                                        <th className="py-4 text-sm font-bold text-secondary-900 uppercase text-center">Qty</th>
                                        <th className="py-4 text-sm font-bold text-secondary-900 uppercase text-right">Unit Price</th>
                                        <th className="py-4 text-sm font-bold text-secondary-900 uppercase text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {invoiceItems.length > 0 ? (
                                        invoiceItems.map((item: any) => (
                                            <tr key={item.id}>
                                                <td className="py-6">
                                                    <div className="font-bold text-secondary-900">{item.journal?.name || item.description || 'Item'}</div>
                                                    <div className="text-sm text-secondary-500">
                                                        {item.plan?.planType ? `${item.plan.planType} - ${item.plan.format}` : ''}
                                                    </div>
                                                </td>
                                                <td className="py-6 text-center font-medium">{item.quantity || 1}</td>
                                                <td className="py-6 text-right font-medium">{currencySymbol}{(item.price || item.unitPrice || 0).toLocaleString()}</td>
                                                <td className="py-6 text-right font-bold text-secondary-900">{currencySymbol}{((item.price || item.unitPrice || 0) * (item.quantity || 1)).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="py-6 text-center text-secondary-500 italic">
                                                No specific line items. Refer to total amount.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end pt-8">
                            <div className="w-full sm:w-80 space-y-4">
                                <div className="flex justify-between text-secondary-600">
                                    <span>Subtotal</span>
                                    <span className="font-bold">{currencySymbol}{invoice.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-secondary-600">
                                    <span>Tax (0%)</span>
                                    <span className="font-bold">+{currencySymbol}0.00</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t-2 border-secondary-900">
                                    <span className="text-xl font-bold text-secondary-900 uppercase">Total Due</span>
                                    <span className="text-3xl font-extrabold text-primary-600">{currencySymbol}{invoice.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Notes */}
                        <div className="pt-12 border-t border-secondary-100 italic text-sm text-secondary-400">
                            <p>Thank you for choosing STM Journals. Subscription periods start from the first confirmed payment date.</p>
                            <p className="mt-1">For billing inquiries, please contact finance@stm.com quoting the invoice number above.</p>
                        </div>
                    </div>
                </div>

                {/* Payment History (if any) */}
                {invoice.payments.length > 0 && (
                    <div className="card-premium no-print">
                        <h3 className="text-lg font-bold text-secondary-900 mb-4">Payment History</h3>
                        <div className="space-y-4">
                            {invoice.payments.map((p: any) => (
                                <div key={p.id} className="flex justify-between items-center p-4 bg-secondary-50 rounded-xl">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-success-100 text-success-600 flex items-center justify-center">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-secondary-900">Payment Processed</p>
                                            <p className="text-xs text-secondary-500">
                                                <FormattedDate date={p.paymentDate} /> via {p.paymentMethod}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-success-600">+ {currencySymbol}{p.amount.toLocaleString()}</p>
                                        <p className="text-[10px] text-secondary-400 font-mono italic">{p.transactionId}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4 no-print">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-secondary-900 font-primary">Settle Invoice</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
                        </div>

                        <div className="bg-primary-50 p-4 rounded-xl mb-6 flex justify-between items-center">
                            <span className="text-primary-800 font-medium">Total Payable</span>
                            <span className="text-2xl font-black text-primary-700">{currencySymbol}{invoice.total.toLocaleString()}</span>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="label">Payment Method</label>
                                <select
                                    className="input"
                                    value={paymentForm.method}
                                    onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                    title="Select Payment Method"
                                >
                                    <option value="card">Credit/Debit Card</option>
                                    <option value="bank-transfer">Bank Transfer (NEFT/RTGS)</option>
                                    <option value="cheque">Cheque/DD</option>
                                    <option value="upi">UPI / QR Code</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Transaction Reference (Optional)</label>
                                <input
                                    className="input"
                                    placeholder="e.g. UTR Number or Cheque#"
                                    value={paymentForm.reference}
                                    onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="label">Notes</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Any additional remarks..."
                                    value={paymentForm.notes}
                                    onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={isPaying}
                                className="btn btn-primary w-full py-4 text-lg font-bold shadow-xl mt-4"
                            >
                                {isPaying ? 'Processing Payment...' : 'Confirm Payment'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
