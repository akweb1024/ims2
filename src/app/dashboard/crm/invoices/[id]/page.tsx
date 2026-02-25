'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';

// Helper: convert number to Indian words
function numberToWords(num: number): string {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
        'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

    function convert(n: number): string {
        if (n === 0) return '';
        if (n < 20) return ones[n] + ' ';
        if (n < 100) return tens[Math.floor(n / 10)] + ' ' + convert(n % 10);
        if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED ' + convert(n % 100);
        if (n < 100000) return convert(Math.floor(n / 1000)) + 'THOUSAND ' + convert(n % 1000);
        if (n < 10000000) return convert(Math.floor(n / 100000)) + 'LAKH ' + convert(n % 100000);
        return convert(Math.floor(n / 10000000)) + 'CRORE ' + convert(n % 10000000);
    }

    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);
    let result = convert(intPart).trim() + ' ONLY';
    if (decPart > 0) result = convert(intPart).trim() + ' AND ' + convert(decPart).trim() + ' PAISE ONLY';
    return result.replace(/\s+/g, ' ').trim();
}

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
        method: 'bank-transfer',
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
                    transactionId: paymentForm.reference || `TXN-${Date.now()}`,
                    notes: paymentForm.notes || 'Payment via Portal'
                })
            });
            if (res.ok) {
                await fetchInvoice();
                setShowPaymentModal(false);
                setPaymentForm({ method: 'bank-transfer', reference: '', notes: '' });
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

    const currencySymbol = invoice.currency === 'INR' ? '₹' : (invoice.currency === 'USD' ? '$' : (invoice.currency === 'EUR' ? '€' : (invoice.currency === 'GBP' ? '£' : (invoice.currency || '₹'))));
    const customer = invoice.subscription?.customerProfile || invoice.customerProfile || {};
    const invoiceItems: any[] = Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0
        ? invoice.lineItems
        : (invoice.subscription?.items || []);
    const company = invoice.company || {};
    const isIGST = customer.country !== 'India' || (customer.state && customer.state !== company.stateCode);
    const taxLabel = invoice.currency !== 'INR' ? 'Tax (0%)' : (isIGST ? `IGST (${invoice.taxRate || 18}%)` : `CGST + SGST (${invoice.taxRate || 18}%)`);
    const subtotal = invoice.amount || 0;
    const taxAmt = invoice.tax || 0;
    const grandTotal = invoice.total || 0;

    // Status badge colors
    const statusColors: Record<string, string> = {
        PAID: 'background-color:#dcfce7;color:#16a34a;',
        UNPAID: 'background-color:#fef9c3;color:#a16207;',
        OVERDUE: 'background-color:#fee2e2;color:#dc2626;',
        PARTIALLY_PAID: 'background-color:#fef3c7;color:#d97706;',
        CANCELLED: 'background-color:#f1f5f9;color:#64748b;',
        VOID: 'background-color:#f1f5f9;color:#64748b;'
    };

    return (
        <DashboardLayout userRole={userRole}>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-content { margin: 0; padding: 0; border: none !important; box-shadow: none !important; }
                    body { background: white; }
                    .invoice-wrap { max-width: 100%; margin: 0; padding: 0; }
                }
                .inv-table { border-collapse: collapse; width: 100%; }
                .inv-table th, .inv-table td { border: 1px solid #000; padding: 5px 8px; font-size: 12px; }
                .inv-table th { font-weight: 700; background: #f8f8f8; }
                .inv-section { border: 1px solid #000; }
                .inv-section-inner { border-top: 1px solid #000; }
            `}</style>

            <div className="invoice-wrap max-w-5xl mx-auto pb-12 space-y-4">
                {/* Action Bar */}
                <div className="flex justify-between items-center no-print">
                    <button onClick={() => router.back()} className="btn btn-secondary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Invoices
                    </button>
                    <div className="flex gap-3">
                        {['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(userRole) && (
                            <button
                                className="btn btn-secondary border-danger-200 text-danger-600 hover:bg-danger-50"
                                onClick={async () => {
                                    if (!confirm('Cancel this invoice? This cannot be undone.')) return;
                                    const token = localStorage.getItem('token');
                                    const res = await fetch(`/api/invoices/${id}/metadata`, {
                                        method: 'PATCH',
                                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: 'CANCELLED' })
                                    });
                                    if (res.ok) fetchInvoice();
                                    else alert('Failed to cancel');
                                }}
                            >
                                Cancel Invoice
                            </button>
                        )}
                        <button className="btn btn-secondary" onClick={() => window.print()}>
                            🖨 Print / PDF
                        </button>
                        {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                            <button className="btn btn-primary shadow-lg shadow-primary-200" onClick={() => setShowPaymentModal(true)}>
                                💳 Settle Invoice
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── TAX INVOICE DOCUMENT ─── */}
                <div className="print-content bg-white border border-gray-300 shadow-2xl" style={{ fontFamily: 'Arial, sans-serif' }}>

                    {/* === HEADER === */}
                    <div className="inv-section" style={{ borderBottom: 'none' }}>
                        <div style={{ textAlign: 'center', padding: '12px 16px' }}>
                            <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '1px' }}>
                                {company.name || 'STM JOURNALS'}
                            </div>
                            {(company.tagline) && (
                                <div style={{ fontSize: '12px', color: '#444' }}>({company.tagline})</div>
                            )}
                            {company.legalEntityName && (
                                <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>{company.legalEntityName}</div>
                            )}
                            {company.address && (
                                <div style={{ fontSize: '11px', color: '#333', marginTop: '2px' }}>{company.address}</div>
                            )}
                        </div>

                        {/* GSTIN / State Code / CIN row */}
                        {(company.gstin || company.stateCode || company.cinNo) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #000' }}>
                                <div style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '600', borderRight: '1px solid #000' }}>
                                    GSTIN No: {company.gstin || '—'}
                                </div>
                                <div style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #000' }}>
                                    State Code: {company.stateCode || '—'}
                                </div>
                                <div style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '600', textAlign: 'right' }}>
                                    CIN No: {company.cinNo || '—'}
                                </div>
                            </div>
                        )}

                        {/* TAX INVOICE title */}
                        <div style={{ borderTop: '1px solid #000', textAlign: 'center', padding: '6px', backgroundColor: '#f8f8f8' }}>
                            <div style={{ textDecoration: 'underline', fontSize: '17px', fontWeight: '900', letterSpacing: '2px' }}>
                                TAX INVOICE
                            </div>
                        </div>

                        {/* Invoice Metadata Grid */}
                        <div style={{ borderTop: '1px solid #000', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                            <div style={{ borderRight: '1px solid #000', padding: '5px 10px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '8px', whiteSpace: 'nowrap' }}>Invoice No:</td>
                                            <td>{invoice.invoiceNumber}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '8px', whiteSpace: 'nowrap' }}>Customer&apos;s Order No./Reference:</td>
                                            <td>{invoice.subscription?.invoiceReference || invoice.description || '—'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '8px', whiteSpace: 'nowrap' }}>Subscriber Id/Subscription Id:</td>
                                            <td style={{ fontSize: '11px' }}>
                                                {invoice.subscriptionId ? `SUB-${invoice.subscriptionId.slice(0, 8).toUpperCase()}` : '—'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ padding: '5px 10px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '8px', whiteSpace: 'nowrap' }}>Invoice Date:</td>
                                            <td><FormattedDate date={invoice.createdAt} /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '8px', whiteSpace: 'nowrap' }}>Due Date:</td>
                                            <td><FormattedDate date={invoice.dueDate} /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '8px', whiteSpace: 'nowrap' }}>Status:</td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '9999px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    ...(invoice.status === 'PAID' ? { backgroundColor: '#dcfce7', color: '#16a34a' } :
                                                        invoice.status === 'OVERDUE' ? { backgroundColor: '#fee2e2', color: '#dc2626' } :
                                                        { backgroundColor: '#fef9c3', color: '#a16207' })
                                                }}>
                                                    {invoice.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Details of Receiver */}
                        <div style={{ borderTop: '1px solid #000', padding: '8px 10px' }}>
                            <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>Details of Receiver:</div>
                            <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '100%' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '16px', whiteSpace: 'nowrap', width: '160px' }}>Name :</td>
                                        <td style={{ fontWeight: '700' }}>{customer.name || 'Unknown'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '16px', verticalAlign: 'top' }}>Address :</td>
                                        <td>
                                            {customer.billingAddress || customer.shippingAddress || [customer.city, customer.state, customer.pincode, customer.country].filter(Boolean).join(', ') || '—'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '16px' }}>Contact no. :</td>
                                        <td>{customer.primaryPhone || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '16px' }}>Email ID :</td>
                                        <td>
                                            <a href={`mailto:${customer.primaryEmail}`} style={{ color: '#1155cc', textDecoration: 'underline' }}>
                                                {customer.primaryEmail || '—'}
                                            </a>
                                        </td>
                                    </tr>
                                    {customer.gstVatTaxId && (
                                        <tr>
                                            <td style={{ fontWeight: '600', paddingRight: '16px' }}>GST/Tax ID :</td>
                                            <td>{customer.gstVatTaxId}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '16px' }}>State Code :</td>
                                        <td>{customer.state || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '16px' }}>Country :</td>
                                        <td>{customer.country || 'India'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* === LINE ITEMS TABLE === */}
                    <div style={{ borderTop: '1px solid #000', overflowX: 'auto' }}>
                        <table className="inv-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '30px', textAlign: 'center' }}>Sl. No.</th>
                                    <th style={{ textAlign: 'left', minWidth: '200px' }}>Particulars</th>
                                    <th style={{ width: '80px', textAlign: 'center' }}>HSN Code</th>
                                    <th style={{ width: '40px', textAlign: 'center' }}>QTY</th>
                                    <th style={{ width: '90px', textAlign: 'right' }}>Unit Price</th>
                                    <th style={{ width: '90px', textAlign: 'right' }}>Amount</th>
                                    <th style={{ width: '70px', textAlign: 'right' }}>Discount</th>
                                    <th style={{ width: '90px', textAlign: 'right' }}>Taxable Value</th>
                                    <th style={{ width: '50px', textAlign: 'center' }}>GST %</th>
                                    <th style={{ width: '100px', textAlign: 'right' }}>Amount in {invoice.currency || 'INR'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceItems.length > 0 ? (
                                    invoiceItems.map((item: any, idx: number) => {
                                        const qty = Number(item.quantity || 1);
                                        const unitPrice = Number(item.price || item.unitPrice || 0);
                                        const amount = qty * unitPrice;
                                        const discount = Number(item.discount || 0);
                                        const taxableValue = amount - discount;
                                        const gstPct = item.gst || invoice.taxRate || (invoice.currency !== 'INR' ? 0 : 18);
                                        const lineTotal = taxableValue * (1 + gstPct / 100);
                                        return (
                                            <tr key={item.id || `item-${idx}`}>
                                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                <td>
                                                    <div style={{ fontWeight: '600' }}>{item.journal?.name || item.description || 'Item'}</div>
                                                    {item.plan && (
                                                        <div style={{ fontSize: '10px', color: '#555' }}>
                                                            {item.plan.planType} — {item.plan.format}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{item.hsnCode || '49029020'}</td>
                                                <td style={{ textAlign: 'center' }}>{qty}</td>
                                                <td style={{ textAlign: 'right' }}>{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td style={{ textAlign: 'right' }}>{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td style={{ textAlign: 'right' }}>{discount > 0 ? discount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                                <td style={{ textAlign: 'right' }}>{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td style={{ textAlign: 'center' }}>{gstPct}%</td>
                                                <td style={{ textAlign: 'right', fontWeight: '600' }}>{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    // Fallback: show single line from invoice totals
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>1</td>
                                        <td><div style={{ fontWeight: '600' }}>{invoice.description || 'Subscription / Service'}</div></td>
                                        <td style={{ textAlign: 'center' }}>49029020</td>
                                        <td style={{ textAlign: 'center' }}>1</td>
                                        <td style={{ textAlign: 'right' }}>{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td style={{ textAlign: 'right' }}>{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td style={{ textAlign: 'right' }}>-</td>
                                        <td style={{ textAlign: 'right' }}>{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td style={{ textAlign: 'center' }}>{invoice.taxRate || 18}%</td>
                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )}

                                {/* Totals rows */}
                                <tr>
                                    <td colSpan={7} rowSpan={3} style={{ verticalAlign: 'top', border: '1px solid #000' }}>
                                        <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '6px' }}>Amount in Words (INR):</div>
                                        <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                                            {numberToWords(grandTotal)}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '700', textAlign: 'right' }}>Taxable Value</td>
                                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: '600' }}>
                                        {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: '700', textAlign: 'right' }}>Add: {taxLabel}</td>
                                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: '600' }}>
                                        {taxAmt > 0 ? taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: '900', textAlign: 'right', fontSize: '13px' }}>Total Amount</td>
                                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: '900', fontSize: '13px' }}>
                                        {currencySymbol} {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* === BANK DETAILS + PAN/IEC FOOTER === */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #000', borderTop: 'none' }}>
                        <div style={{ borderRight: '1px solid #000', padding: '8px 10px' }}>
                            <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '6px' }}>Bank account details for payment:</div>
                            <table style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '12px', paddingBottom: '3px' }}>Bank Name:</td>
                                        <td>{company.bankName || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '12px', paddingBottom: '3px' }}>Account holder:</td>
                                        <td>{company.bankAccountHolder || company.legalEntityName || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '12px', paddingBottom: '3px' }}>IBAN / A/C No:</td>
                                        <td>{company.bankAccountNumber || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '12px', paddingBottom: '3px' }}>IFSC Code:</td>
                                        <td>{company.bankIfscCode || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '12px', paddingBottom: '3px' }}>Swift code:</td>
                                        <td>{company.bankSwiftCode || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '600', paddingRight: '12px', paddingBottom: '3px' }}>Payment Mode:</td>
                                        <td>{company.paymentMode || 'Online'}</td>
                                    </tr>
                                    {invoice.payments?.[0]?.transactionId && (
                                        <tr>
                                            <td style={{ fontWeight: '600', paddingRight: '12px' }}>Payment Ref:</td>
                                            <td style={{ fontFamily: 'monospace' }}>{invoice.payments[0].transactionId}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '11px', color: '#444', marginBottom: '12px' }}>
                                <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>For {company.name || 'STM Journals'}</div>
                                <div style={{ marginTop: '40px', borderTop: '1px solid #000', width: '140px', paddingTop: '4px', fontSize: '11px', color: '#555' }}>
                                    Authorised Signatory
                                </div>
                            </div>
                            <table style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
                                <tbody>
                                    {company.panNo && (
                                        <tr>
                                            <td style={{ fontWeight: '600', paddingRight: '12px' }}>Pan No :</td>
                                            <td>{company.panNo}</td>
                                        </tr>
                                    )}
                                    {company.iecCode && (
                                        <tr>
                                            <td style={{ fontWeight: '600', paddingRight: '12px' }}>IEC Code :</td>
                                            <td>{company.iecCode}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer note */}
                    <div style={{ borderTop: '1px solid #000', padding: '6px 10px', fontSize: '10px', color: '#555', textAlign: 'center' }}>
                        This is a computer-generated invoice and does not require a physical signature. For queries, contact {company.email || 'finance@stmjournals.com'}
                    </div>
                </div>
                {/* ─── End of Tax Invoice Document ─── */}

                {/* Payment History */}
                {invoice.payments?.length > 0 && (
                    <div className="card-premium no-print">
                        <h3 className="text-lg font-bold text-secondary-900 mb-4">💳 Payment History</h3>
                        <div className="space-y-3">
                            {invoice.payments.map((p: any) => (
                                <div key={p.id} className="flex justify-between items-center p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-success-100 text-success-600 flex items-center justify-center text-lg">✓</div>
                                        <div>
                                            <p className="font-bold text-secondary-900">Payment Processed</p>
                                            <p className="text-xs text-secondary-500">
                                                <FormattedDate date={p.paymentDate} /> via {p.paymentMethod}
                                            </p>
                                            {p.transactionId && <p className="text-[10px] font-mono text-secondary-400">{p.transactionId}</p>}
                                        </div>
                                    </div>
                                    <p className="font-bold text-success-600">+ {currencySymbol}{p.amount.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4 no-print">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-secondary-900">Settle Invoice</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-secondary-400 hover:text-secondary-600 text-2xl leading-none">✕</button>
                        </div>
                        <div className="bg-primary-50 p-4 rounded-xl mb-6 flex justify-between items-center">
                            <span className="text-primary-800 font-medium">Invoice: {invoice.invoiceNumber}</span>
                            <span className="text-2xl font-black text-primary-700">{currencySymbol}{grandTotal.toLocaleString()}</span>
                        </div>
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="label">Payment Method</label>
                                <select className="input" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} title="Select Payment Method">
                                    <option value="bank-transfer">Bank Transfer (NEFT/RTGS)</option>
                                    <option value="card">Credit/Debit Card</option>
                                    <option value="cheque">Cheque/DD</option>
                                    <option value="upi">UPI / QR Code</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Transaction Reference (UTR/Cheque No.)</label>
                                <input className="input" placeholder="e.g. UTR Number or Cheque#" value={paymentForm.reference}
                                    onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Notes</label>
                                <textarea className="input" rows={2} placeholder="Any additional remarks..." value={paymentForm.notes}
                                    onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                            </div>
                            <button type="submit" disabled={isPaying} className="btn btn-primary w-full py-4 text-lg font-bold shadow-xl mt-4">
                                {isPaying ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
