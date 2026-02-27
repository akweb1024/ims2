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
    const brand = invoice.brand || null;
    const invoiceCountry = invoice.billingCountry || customer.billingCountry || customer.country || 'India';
    const isExport = invoiceCountry.toLowerCase() !== 'india';
    const isIGST = isExport || (customer.state && customer.state !== company.stateCode);
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
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    .no-print { display: none !important; }
                    .print-content { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        border: none !important; 
                        box-shadow: none !important; 
                        width: 100% !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body { background: white !important; -webkit-print-color-adjust: exact; }
                    .invoice-wrap { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
                    
                    /* Ensure table borders are visible */
                    .inv-table { border: 1.5px solid #000 !important; border-collapse: collapse !important; width: 100% !important; }
                    .inv-table th, .inv-table td { border: 1.5px solid #000 !important; padding: 6px 10px !important; }
                    
                    /* Force background colors in print */
                    .bg-gray-100 { background-color: #f3f4f6 !important; }
                    .bg-f9 { background-color: #f9f9f9 !important; }
                }
                
                .inv-table { border-collapse: collapse; width: 100%; border: 1.5px solid #000; }
                .inv-table th, .inv-table td { border: 1.5px solid #000; padding: 8px 12px; font-size: 12px; vertical-align: middle; }
                .inv-table th { font-weight: 900; background: #f1f1f1; text-transform: uppercase; letter-spacing: 0.5px; }
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
                <div className="print-content bg-white border border-gray-300 shadow-2xl relative" style={{ fontFamily: '"Inter", "Segoe UI", Arial, sans-serif', color: '#1a1a1a' }}>
                    
                    {/* === WATERMARK (Optional/Digital Copy) === */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none no-print">
                        <div className="text-[120px] font-black rotate-[-35deg] border-[20px] border-secondary-900 px-20 py-10 rounded-[100px]">
                            {invoice.status}
                        </div>
                    </div>

                    {/* === HEADER SECTION === */}
                    <div className="inv-section" style={{ border: '1.5px solid #000', marginBottom: '-1px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px', gap: '24px' }}>
                            {/* Brand Logo */}
                            {(brand?.logoUrl || company.logoUrl) && (
                                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    {brand?.logoUrl && (
                                        <img src={brand.logoUrl} alt="Brand Logo" style={{ height: '70px', maxWidth: '140px', objectFit: 'contain' }} />
                                    )}
                                    {/* Company Logo (smaller or as requested) */}
                                    {(brand?.companyLogoUrl || company.logoUrl) && (
                                        <div style={{ borderLeft: brand?.logoUrl ? '1px solid #ddd' : 'none', paddingLeft: brand?.logoUrl ? '15px' : '0' }}>
                                            <img src={brand?.companyLogoUrl || company.logoUrl} alt="Company Logo" style={{ height: brand?.logoUrl ? '40px' : '70px', maxWidth: '140px', objectFit: 'contain' }} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div style={{ flexGrow: 1, textAlign: (brand?.logoUrl || company.logoUrl) ? 'left' : 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', color: '#000', lineHeight: '1.1' }}>
                                    {brand?.name || company.name || 'STM JOURNALS'}
                                </div>
                                {brand ? (
                                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '800', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '1px' }}>
                                        — A Brand of {company.name || 'Consortium eLearning Network Pvt Ltd'} —
                                    </div>
                                ) : (
                                    company.tagline && (
                                        <div style={{ fontSize: '13px', color: '#555', fontWeight: '500', marginTop: '2px' }}>{company.tagline}</div>
                                    )
                                )}
                                <div style={{ fontSize: '12px', color: '#444', marginTop: '8px', maxWidth: '500px', lineHeight: '1.4', margin: (brand?.logoUrl || company.logoUrl) ? '8px 0 0' : '8px auto 0' }}>
                                    {brand?.address || company.address}
                                </div>
                                <div style={{ fontSize: '11px', color: '#777', marginTop: '4px', fontWeight: '500' }}>
                                    Email: <span style={{ color: '#000' }}>{brand?.email || company.email}</span> | Web: <span style={{ color: '#000' }}>{brand?.website || company.website}</span>
                                </div>
                            </div>
                        </div>

                        {/* GSTIN / State Code / CIN row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', borderTop: '1.5px solid #000', backgroundColor: '#fdfdfd' }}>
                            <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700', borderRight: '1.5px solid #000' }}>
                                GSTIN NO: <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{company.gstin || '—'}</span>
                            </div>
                            <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700', textAlign: 'center', borderRight: '1.5px solid #000' }}>
                                STATE CODE: {company.stateCode || '—'}
                            </div>
                            <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700', textAlign: 'right' }}>
                                CIN NO: <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{company.cinNo || '—'}</span>
                            </div>
                        </div>

                        {/* DYNAMIC INVOICE TITLE */}
                        <div style={{ 
                            borderTop: '1.5px solid #000', 
                            textAlign: 'center', 
                            padding: '8px', 
                            backgroundColor: invoice.status === 'PAID' ? '#000' : '#4b5563' 
                        }}>
                            <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '4px', color: '#fff' }}>
                                {invoice.status === 'PAID' ? (isExport ? 'EXPORT INVOICE' : 'TAX INVOICE') : 'PROFORMA INVOICE'}
                            </div>
                        </div>

                        {/* Invoice Metadata Grid */}
                        <div style={{ borderTop: '1.5px solid #000', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                            <div style={{ borderRight: '1.5px solid #000', padding: '10px 15px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <tbody className="align-top">
                                        <tr>
                                            <td style={{ fontWeight: '700', padding: '3px 8px 3px 0', width: '150px' }}>Invoice No:</td>
                                            <td style={{ fontWeight: '800', color: '#000' }}>{invoice.invoiceNumber}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', padding: '3px 8px 3px 0' }}>Order/Ref No:</td>
                                            <td>{invoice.subscription?.invoiceReference || invoice.description || '—'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', padding: '3px 8px 3px 0' }}>Subscription Id:</td>
                                            <td style={{ fontSize: '11px', fontWeight: '600' }}>
                                                {invoice.subscriptionId ? `SUB-${invoice.subscriptionId.slice(0, 8).toUpperCase()}` : '—'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ padding: '10px 15px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <tbody className="align-top">
                                        <tr>
                                            <td style={{ fontWeight: '700', padding: '3px 8px 3px 0', width: '120px' }}>Invoice Date:</td>
                                            <td style={{ fontWeight: '600' }}><FormattedDate date={invoice.createdAt} /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', padding: '3px 8px 3px 0' }}>Due Date:</td>
                                            <td style={{ fontWeight: '600', color: '#d97706' }}><FormattedDate date={invoice.dueDate} /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', padding: '3px 8px 3px 0' }}>Payment Status:</td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: '900',
                                                    textTransform: 'uppercase',
                                                    border: '1px solid currentColor',
                                                    ...(invoice.status === 'PAID' ? { backgroundColor: '#f0fdf4', color: '#166534' } :
                                                        invoice.status === 'OVERDUE' ? { backgroundColor: '#fef2f2', color: '#991b1b' } :
                                                        { backgroundColor: '#fffbeb', color: '#92400e' })
                                                }}>
                                                    {invoice.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Details of Receiver (Bill To & Ship To) */}
                        <div style={{ borderTop: '1.5px solid #000', backgroundColor: '#fafafa' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '120px' }}>
                                {/* Bill To */}
                                <div style={{ padding: '10px 15px', borderRight: '1.5px solid #000' }}>
                                    <div style={{ fontWeight: '900', fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Details of Receiver (Bill To):</div>
                                    <div style={{ fontWeight: '900', fontSize: '14px', color: '#000', marginBottom: '2px' }}>{customer.name || 'Unknown Buyer'}</div>
                                    <div style={{ fontSize: '11px', lineHeight: '1.4', color: '#111' }}>
                                        {invoice.billingAddress || customer.billingAddress || 'No billing address'}
                                        <br />
                                        {(invoice.billingCity || customer.billingCity) && `${invoice.billingCity || customer.billingCity}, `}
                                        {invoice.billingState || customer.billingState || customer.state} 
                                        {` - ${invoice.billingPincode || customer.billingPincode || customer.pincode || ''}`}
                                        <br />
                                        {invoice.billingCountry || customer.billingCountry || customer.country || 'India'}
                                    </div>
                                    <table style={{ width: '100%', marginTop: '6px', fontSize: '10px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ fontWeight: '700', color: '#555', width: '80px' }}>GSTIN/Tax ID:</td>
                                                <td style={{ fontWeight: '800' }}>{invoice.gstNumber || customer.gstVatTaxId || '—'}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: '700', color: '#555' }}>State Code:</td>
                                                <td style={{ fontWeight: '700' }}>{invoice.billingStateCode || customer.billingStateCode || '—'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Ship To */}
                                <div style={{ padding: '10px 15px' }}>
                                    <div style={{ fontWeight: '900', fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Details of Consignee (Ship To):</div>
                                    <div style={{ fontWeight: '900', fontSize: '14px', color: '#000', marginBottom: '2px' }}>{customer.name || 'Unknown Buyer'}</div>
                                    <div style={{ fontSize: '11px', lineHeight: '1.4', color: '#111' }}>
                                        {invoice.shippingAddress || customer.shippingAddress || customer.billingAddress || 'No shipping address'}
                                        <br />
                                        {(invoice.shippingCity || customer.shippingCity || customer.billingCity) && `${invoice.shippingCity || customer.shippingCity || customer.billingCity}, `}
                                        {invoice.shippingState || customer.shippingState || customer.billingState || customer.state} 
                                        {` - ${invoice.shippingPincode || customer.shippingPincode || customer.pincode || ''}`}
                                        <br />
                                        {invoice.shippingCountry || customer.shippingCountry || customer.country || 'India'}
                                    </div>
                                    <table style={{ width: '100%', marginTop: '6px', fontSize: '10px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ fontWeight: '700', color: '#555', width: '100px' }}>Place of Supply:</td>
                                                <td style={{ fontWeight: '800', textTransform: 'uppercase' }}>
                                                    {invoice.placeOfSupply || invoice.billingState || customer.billingState || customer.state || '—'}
                                                    {invoice.placeOfSupplyCode && ` (${invoice.placeOfSupplyCode})`}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: '700', color: '#555' }}>Contact:</td>
                                                <td style={{ fontWeight: '600' }}>{customer.primaryPhone || '—'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* === LINE ITEMS TABLE === */}
                    <div style={{ border: '1.5px solid #000', borderTop: 'none', borderBottom: 'none' }}>
                        <table className="inv-table" style={{ border: 'none' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f1f1' }}>
                                    <th style={{ width: '40px', textAlign: 'center', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>#</th>
                                    <th style={{ textAlign: 'left', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>Item Description</th>
                                    <th style={{ width: '80px', textAlign: 'center', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>HSN</th>
                                    <th style={{ width: '50px', textAlign: 'center', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>QTY</th>
                                    <th style={{ width: '100px', textAlign: 'right', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>Rate</th>
                                    <th style={{ width: '100px', textAlign: 'right', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>Amount</th>
                                    <th style={{ width: '80px', textAlign: 'right', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>Disc.</th>
                                    <th style={{ width: '110px', textAlign: 'right', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>Taxable Val.</th>
                                    <th style={{ width: '60px', textAlign: 'center', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>GST%</th>
                                    <th style={{ width: '120px', textAlign: 'right', borderBottom: '1.5px solid #000' }}>Total ({invoice.currency || 'INR'})</th>
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
                                                <td style={{ textAlign: 'center', borderRight: '1.5px solid #000' }}>{idx + 1}</td>
                                                <td style={{ borderRight: '1.5px solid #000' }}>
                                                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{item.journal?.name || item.description || 'Item'}</div>
                                                    {item.plan && (
                                                        <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                                                            {item.plan.planType} — {item.plan.format} — ({item.plan.duration} mos)
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center', borderRight: '1.5px solid #000' }}>{item.hsnCode || '49029020'}</td>
                                                <td style={{ textAlign: 'center', borderRight: '1.5px solid #000' }}>{qty}</td>
                                                <td style={{ textAlign: 'right', borderRight: '1.5px solid #000' }}>{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td style={{ textAlign: 'right', borderRight: '1.5px solid #000' }}>{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td style={{ textAlign: 'right', borderRight: '1.5px solid #000' }}>{discount > 0 ? discount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                                <td style={{ textAlign: 'right', borderRight: '1.5px solid #000' }}>{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td style={{ textAlign: 'center', borderRight: '1.5px solid #000' }}>{gstPct}%</td>
                                                <td style={{ textAlign: 'right', fontWeight: '700' }}>{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td style={{ textAlign: 'center', borderRight: '1.5px solid #000' }}>1</td>
                                        <td style={{ borderRight: '1.5px solid #000' }}>
                                            <div style={{ fontWeight: '700' }}>{invoice.description || 'Subscription Service'}</div>
                                        </td>
                                        <td style={{ textAlign: 'center', borderRight: '1.5px solid #000' }}>49029020</td>
                                        <td style={{ textAlign: 'center', borderRight: '1.5px solid #000' }}>1</td>
                                        <td style={{ textAlign: 'right', borderRight: '1.5px solid #000' }}>{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td style={{ textAlign: 'right', borderRight: '1.5px solid #000' }}>{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td style={{ textAlign: 'right', borderRight: '1.5px solid #000' }}>-</td>
                                        <td style={{ textAlign: 'right', borderRight: '1.5px solid #000' }}>{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td style={{ textAlign: 'center', borderRight: '1.5px solid #000' }}>{invoice.taxRate || 18}%</td>
                                        <td style={{ textAlign: 'right', fontWeight: '700' }}>{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )}

                                {/* Spacer row to push totals down if short list */}
                                {invoiceItems.length < 5 && (
                                    <tr>
                                        <td style={{ height: `${150 - (invoiceItems.length * 30)}px`, borderRight: '1.5px solid #000' }}></td>
                                        <td style={{ borderRight: '1.5px solid #000' }}></td>
                                        <td style={{ borderRight: '1.5px solid #000' }}></td>
                                        <td style={{ borderRight: '1.5px solid #000' }}></td>
                                        <td style={{ borderRight: '1.5px solid #000' }}></td>
                                        <td style={{ borderRight: '1.5px solid #000' }}></td>
                                        <td style={{ borderRight: '1.5px solid #000' }}></td>
                                        <td style={{ borderRight: '1.5px solid #000' }}></td>
                                        <td style={{ borderRight: '1.5px solid #000' }}></td>
                                        <td></td>
                                    </tr>
                                )}

                                {/* Totals rows */}
                                <tr style={{ backgroundColor: '#f9f9f9' }}>
                                    <td colSpan={7} rowSpan={isIGST ? 3 : 4} style={{ verticalAlign: 'top', padding: '12px', border: '1.5px solid #000', borderLeft: 'none' }}>
                                        <div style={{ fontWeight: '900', fontSize: '11px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount in Words:</div>
                                        <div style={{ fontSize: '13px', fontWeight: '800', lineHeight: '1.4', color: '#000' }}>
                                            {invoice.currency || 'INR'} {numberToWords(grandTotal)}
                                        </div>
                                    </td>
                                    <td colSpan={2} style={{ fontWeight: '700', textAlign: 'right', padding: '6px 10px', border: '1.5px solid #000', borderRight: 'none' }}>Taxable Value</td>
                                    <td style={{ textAlign: 'right', fontWeight: '700', padding: '6px 10px', border: '1.5px solid #000', borderLeft: 'none' }}>
                                        {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                {isIGST ? (
                                    <tr style={{ backgroundColor: '#f9f9f9' }}>
                                        <td colSpan={2} style={{ fontWeight: '700', textAlign: 'right', padding: '6px 10px', border: '1.5px solid #000', borderRight: 'none', borderTop: 'none' }}>
                                            IGST ({invoice.taxRate || 18}%)
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '700', padding: '6px 10px', border: '1.5px solid #000', borderTop: 'none', borderLeft: 'none' }}>
                                            {taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        <tr style={{ backgroundColor: '#f9f9f9' }}>
                                            <td colSpan={2} style={{ fontWeight: '700', textAlign: 'right', padding: '6px 10px', border: '1.5px solid #000', borderRight: 'none', borderTop: 'none' }}>
                                                CGST ({(invoice.taxRate || 18) / 2}%)
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '700', padding: '6px 10px', border: '1.5px solid #000', borderTop: 'none', borderLeft: 'none' }}>
                                                {(taxAmt / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#f9f9f9' }}>
                                            <td colSpan={2} style={{ fontWeight: '700', textAlign: 'right', padding: '6px 10px', border: '1.5px solid #000', borderRight: 'none', borderTop: 'none' }}>
                                                SGST ({(invoice.taxRate || 18) / 2}%)
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '700', padding: '6px 10px', border: '1.5px solid #000', borderTop: 'none', borderLeft: 'none' }}>
                                                {(taxAmt / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </>
                                )}
                                <tr style={{ backgroundColor: '#eeeeee' }}>
                                    <td colSpan={2} style={{ fontWeight: '900', textAlign: 'right', padding: '10px 10px', border: '1.5px solid #000', borderRight: 'none', borderTop: 'none', fontSize: '14px' }}>
                                        GRAND TOTAL
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '900', padding: '10px 10px', border: '1.5px solid #000', borderTop: 'none', borderLeft: 'none', fontSize: '14px', color: '#000' }}>
                                        {currencySymbol} {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* === BANK DETAILS + PAN/IEC FOOTER === */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', border: '1.5px solid #000', minHeight: '180px' }}>
                        <div style={{ borderRight: '1.5px solid #000', padding: '15px 20px' }}>
                            <div style={{ fontWeight: '900', fontSize: '11px', color: '#555', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Information:</div>
                            <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ fontWeight: '700', color: '#666', padding: '2px 0', width: '130px' }}>BANK NAME:</td>
                                        <td style={{ fontWeight: '800', color: '#000' }}>{company.bankName || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '700', color: '#666', padding: '2px 0' }}>BENEFICIARY:</td>
                                        <td style={{ fontWeight: '800', color: '#000' }}>{company.bankAccountHolder || company.legalEntityName || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '700', color: '#666', padding: '2px 0' }}>ACCOUNT NO / IBAN:</td>
                                        <td style={{ fontWeight: '800', color: '#000', fontFamily: 'monospace', fontSize: '13px' }}>{company.bankAccountNumber || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '700', color: '#666', padding: '2px 0' }}>IFSC CODE (INDIA):</td>
                                        <td style={{ fontWeight: '800', color: '#000', fontFamily: 'monospace' }}>{company.bankIfscCode || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '700', color: '#666', padding: '2px 0' }}>SWIFT CODE:</td>
                                        <td style={{ fontWeight: '800', color: '#000', fontFamily: 'monospace' }}>{company.bankSwiftCode || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: '700', color: '#666', padding: '2px 0' }}>PAYMENT MODE:</td>
                                        <td style={{ fontWeight: '600' }}>{company.paymentMode || 'Online / NEFT / RTGS'}</td>
                                    </tr>
                                    {company.panNo && (
                                        <tr>
                                            <td style={{ fontWeight: '700', color: '#666', padding: '8px 0 2px 0' }}>PAN NO:</td>
                                            <td style={{ fontWeight: '700', padding: '8px 0 2px 0' }}>{company.panNo}</td>
                                        </tr>
                                    )}
                                    {company.iecCode && (
                                        <tr>
                                            <td style={{ fontWeight: '700', color: '#666', padding: '2px 0' }}>IEC CODE:</td>
                                            <td style={{ fontWeight: '700' }}>{company.iecCode}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '15px 20px', display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa' }}>
                            <div style={{ flexGrow: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#555', textTransform: 'uppercase', marginBottom: '8px' }}>For {company.name || 'STM Journals'}</div>
                                
                                {/* Placeholder for Signature */}
                                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {(invoice.status === 'PAID') && (
                                        <div style={{ border: '3px double #166534', color: '#166534', padding: '4px 12px', fontSize: '16px', fontWeight: '900', borderRadius: '8px', transform: 'rotate(-5deg)', opacity: 0.8 }}>
                                            RECEIVED
                                        </div>
                                    )}
                                </div>

                                <div style={{ borderTop: '1px solid #000', width: '90%', margin: '0 auto', paddingTop: '6px', fontSize: '12px', fontWeight: '900', color: '#000' }}>
                                    Authorised Signatory
                                </div>
                            </div>
                            
                            <div style={{ fontSize: '9px', lineHeight: '1.2', color: '#888', textAlign: 'center', marginTop: '10px' }}>
                                This is a computer generated document and does not require a physical signature.
                            </div>
                        </div>
                    </div>

                    {/* Footer Support Info */}
                    <div style={{ borderTop: 'none', padding: '10px 20px', fontSize: '10px', color: '#777', textAlign: 'center', fontStyle: 'italic' }}>
                        Thank you for your business. For any queries concerning this invoice, please contact <span style={{ fontWeight: '700', color: '#444' }}>{company.email || 'accounts@stmjournals.com'}</span>
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
