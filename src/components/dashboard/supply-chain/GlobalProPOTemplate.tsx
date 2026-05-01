'use client';

import React from 'react';

interface GlobalProPOTemplateProps {
    po: any;
    companyLabel?: string;
    vendorCopy?: boolean;
}

export default function GlobalProPOTemplate({ po, companyLabel = 'Your Company', vendorCopy = false }: GlobalProPOTemplateProps) {
    const issuedOn = new Date(po?.createdAt || Date.now()).toLocaleDateString('en-IN');
    const expectedOn = po?.expectedDate ? new Date(po.expectedDate).toLocaleDateString('en-IN') : 'Not specified';
    // Vendor copy compliance: only fields listed below are permitted in external/vendor PDFs.
    // Anything not in this allowlist must be treated as internal and excluded.
    const vendorAllowlist = new Set([
        'header',
        'poNumber',
        'issuedDate',
        'vendorName',
        'vendorEmail',
        'lineItems',
        'totalAmount',
    ]);
    const canShow = (field: string) => !vendorCopy || vendorAllowlist.has(field);

    return (
        <div
            className="po-copy"
            style={{
                fontFamily: "'Segoe UI', Arial, sans-serif",
                fontSize: '11px',
                color: '#0f172a',
                background: '#fff',
                border: '1px solid #dbe3ef',
                borderRadius: '4px',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(120deg, #0f172a 0%, #1d4ed8 65%, #2563eb 100%)',
                    color: '#fff',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div>
                    <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.8px' }}>{companyLabel}</div>
                    <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px' }}>Supply Chain Procurement</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div
                        style={{
                            fontSize: '10px',
                            letterSpacing: '2px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.4)',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            marginBottom: '6px',
                        }}
                    >
                        Purchase Order
                    </div>
                    {vendorCopy && (
                        <div
                            style={{
                                fontSize: '9px',
                                letterSpacing: '1px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                background: 'rgba(255,255,255,0.9)',
                                color: '#1e3a8a',
                                borderRadius: '999px',
                                padding: '2px 10px',
                                marginBottom: '6px',
                                display: 'inline-block',
                            }}
                        >
                            Vendor Copy
                        </div>
                    )}
                    <div style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'monospace' }}>{po?.poNumber || '--'}</div>
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                }}
            >
                <div style={{ padding: '12px 14px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Issued Date</div>
                    <div style={{ marginTop: '4px', fontWeight: 800 }}>{issuedOn}</div>
                </div>
                {canShow('expectedDelivery') ? (
                    <div style={{ padding: '12px 14px', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Expected Delivery</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>{expectedOn}</div>
                    </div>
                ) : (
                    <div style={{ padding: '12px 14px', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Delivery Schedule</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>Shared Separately</div>
                    </div>
                )}
                <div style={{ padding: '12px 14px' }} className="internal-only">
                    <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Status</div>
                    <div style={{ marginTop: '4px', fontWeight: 900 }}>{po?.status || 'DRAFT'}</div>
                </div>
            </div>

            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#334155', textTransform: 'uppercase', fontWeight: 900, marginBottom: '8px' }}>
                    Vendor Information
                </div>
                <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '2px' }}>{po?.vendor?.name || 'Unknown Vendor'}</div>
                <div style={{ color: '#475569', lineHeight: 1.6 }}>
                    {canShow('vendorContactName') && <div>{po?.vendor?.contactName || '-'}</div>}
                    {canShow('vendorEmail') && <div>{po?.vendor?.email || '-'}</div>}
                </div>
            </div>

            <div style={{ padding: '12px 12px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Description</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Unit Price</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(po?.items || []).map((item: any) => (
                            <tr key={item.id}>
                                <td style={tdStyle}>{item.description}</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>₹{Number(item.unitPrice || 0).toLocaleString('en-IN')}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>₹{Number(item.total || 0).toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '0 16px 16px',
                }}
            >
                <div
                    style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '12px',
                        minWidth: '260px',
                        padding: '10px 14px',
                        textAlign: 'right',
                    }}
                >
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#1d4ed8', fontWeight: 900, letterSpacing: '1px' }}>
                        Total Amount
                    </div>
                    <div style={{ marginTop: '2px', fontSize: '24px', fontWeight: 900, color: '#1e3a8a' }}>
                        ₹{Number(po?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    background: '#f8fafc',
    color: '#475569',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontWeight: 900,
    textAlign: 'left',
    padding: '9px 10px',
    borderBottom: '1px solid #e2e8f0',
};

const tdStyle: React.CSSProperties = {
    padding: '9px 10px',
    borderBottom: '1px solid #f1f5f9',
    color: '#0f172a',
};
