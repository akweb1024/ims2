'use client';

import { X } from 'lucide-react';

interface PaymentDetailModalProps {
    payment: any;
    onClose: () => void;
}

export default function PaymentDetailModal({ payment, onClose }: PaymentDetailModalProps) {
    if (!payment) return null;

    const exchangeRates: Record<string, number> = {
        'INR': 1,
        'USD': 83.5,
        'EUR': 90.2,
        'GBP': 105.8,
        'AED': 22.7,
        'SGD': 61.5,
        'AUD': 55.4,
        'CAD': 61.2
    };

    const currency = (payment.currency || 'INR').toUpperCase();
    const rate = exchangeRates[currency] || 1;
    const inrValue = payment.amount * rate;

    return (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                    <div>
                        <h2 className="text-xl font-black text-secondary-900 tracking-tight">Transaction Details</h2>
                        <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest">
                            {payment.razorpayPaymentId ? (payment.razorpayPaymentId.slice(0, -4) + '****') : 'N/A'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-200 rounded-full transition-colors">
                        <X size={20} className="text-secondary-500" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Amount Header */}
                    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-2xl border border-primary-100">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] mb-2">Original Amount Received</p>
                        <h3 className="text-5xl font-black text-secondary-900 tracking-tighter">
                            {currency} {payment.amount.toLocaleString()}
                        </h3>
                        {currency !== 'INR' && (
                            <div className="mt-4 flex items-center gap-2">
                                <span className="text-secondary-400 font-bold">≈</span>
                                <p className="text-lg font-black text-primary-600">
                                    ₹{inrValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <span className="text-[10px] font-black bg-primary-200 text-primary-700 px-2 py-0.5 rounded-full uppercase">Real-time INR</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Payment Info */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2">Payment Infrastructure</h4>
                            <div className="space-y-3">
                                <DetailItem label="Status" value={payment.status} isBadge status={payment.status} />
                                <DetailItem label="Method" value={payment.paymentMethod} />
                                <DetailItem label="Razorpay Order" value={payment.razorpayOrderId || 'N/A'} />
                                <DetailItem label="Transaction Date" value={new Date(payment.paymentDate).toLocaleString()} />
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2">Customer & Context</h4>
                            <div className="space-y-3">
                                <DetailItem label="Customer" value={payment.invoice?.subscription?.customerProfile?.name || 'Manual / Walk-in'} />
                                <DetailItem label="Organization" value={payment.company?.name || 'Direct'} />
                                <DetailItem label="Invoice No" value={payment.invoice?.invoiceNumber || 'N/A'} />
                                <DetailItem label="Gateway ID" value={payment.razorpayPaymentId ? (payment.razorpayPaymentId.slice(0, -4) + '****') : 'N/A'} />
                            </div>
                        </div>
                    </div>

                    {/* Metadata / Notes */}
                    {payment.notes && (
                        <div className="space-y-3 bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                            <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Gateway Notes</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(JSON.parse(payment.notes)).map(([key, value]) => (
                                    <div key={key}>
                                        <p className="text-[8px] font-black text-secondary-400 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                                        <p className="text-xs font-bold text-secondary-700">{String(value)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex justify-end gap-3">
                    <button
                        onClick={() => window.print()}
                        className="px-6 py-2 bg-white border border-secondary-200 text-secondary-600 font-black text-[10px] uppercase rounded-xl hover:bg-secondary-50 transition-all shadow-sm"
                    >
                        Print Receipt
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-secondary-900 text-white font-black text-[10px] uppercase rounded-xl hover:bg-secondary-800 transition-all shadow-lg"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
}

function DetailItem({ label, value, isBadge, status }: { label: string, value: string, isBadge?: boolean, status?: string }) {
    return (
        <div>
            <p className="text-[9px] font-black text-secondary-400 uppercase tracking-tight mb-1">{label}</p>
            {isBadge ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${status === 'captured' ? 'bg-success-100 text-success-700' :
                    status === 'failed' ? 'bg-danger-100 text-danger-700' :
                        'bg-warning-100 text-warning-700'
                    }`}>
                    {value}
                </span>
            ) : (
                <p className="text-xs font-bold text-secondary-900">{value}</p>
            )}
        </div>
    );
}
