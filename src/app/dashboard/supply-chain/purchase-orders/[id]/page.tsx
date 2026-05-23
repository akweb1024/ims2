'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, Download, Mail, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import GlobalProPOTemplate from '@/components/dashboard/supply-chain/GlobalProPOTemplate';

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [po, setPo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [companyLabel, setCompanyLabel] = useState('Your Company');

    const fetchPO = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/supply-chain/purchase-orders/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Failed to load purchase order');
            }
            const data = await res.json();
            setPo(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load purchase order');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPO();
    }, [fetchPO]);

    useEffect(() => {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return;
        try {
            const parsedUser = JSON.parse(rawUser);
            setCompanyLabel(parsedUser?.companyName || parsedUser?.organizationName || 'Your Company');
        } catch {
            setCompanyLabel('Your Company');
        }
    }, []);

    const handleDownloadPdf = async (mode: 'standard' | 'vendor' = 'standard') => {
        const selector = mode === 'vendor' ? '.po-print-content-vendor' : '.po-print-content-standard';
        const target = document.querySelector(selector) as HTMLElement | null;
        if (!target) {
            toast.error('PO template is not ready for PDF export');
            return;
        }

        setIsDownloadingPdf(true);
        let offscreenHost: HTMLDivElement | null = null;
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
            const printClone = target.cloneNode(true) as HTMLElement;
            printClone.style.position = 'relative';

            if (mode === 'vendor') {
                const watermark = document.createElement('div');
                watermark.textContent = 'VENDOR COPY';
                watermark.style.position = 'absolute';
                watermark.style.top = '50%';
                watermark.style.left = '50%';
                watermark.style.transform = 'translate(-50%, -50%) rotate(-28deg)';
                watermark.style.fontSize = '70px';
                watermark.style.fontWeight = '900';
                watermark.style.letterSpacing = '6px';
                watermark.style.color = 'rgba(15, 23, 42, 0.08)';
                watermark.style.pointerEvents = 'none';
                watermark.style.zIndex = '9999';
                printClone.appendChild(watermark);
            }

            offscreenHost = document.createElement('div');
            offscreenHost.style.position = 'fixed';
            offscreenHost.style.left = '-100000px';
            offscreenHost.style.top = '0';
            offscreenHost.style.width = `${target.scrollWidth}px`;
            offscreenHost.style.opacity = '1';
            offscreenHost.style.pointerEvents = 'none';
            offscreenHost.appendChild(printClone);
            document.body.appendChild(offscreenHost);

            const pdf = new jsPDF('p', 'pt', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const usableWidth = pageWidth - margin * 2;

            const canvas = await html2canvas(printClone, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                imageTimeout: 0,
            });

            const imgData = canvas.toDataURL('image/png');
            const scaledHeight = (canvas.height * usableWidth) / canvas.width;
            let remainingHeight = scaledHeight;
            let yPosition = margin;

            pdf.addImage(imgData, 'PNG', margin, yPosition, usableWidth, scaledHeight);
            remainingHeight -= pageHeight - margin * 2;

            while (remainingHeight > 0) {
                pdf.addPage();
                yPosition = margin - (scaledHeight - remainingHeight);
                pdf.addImage(imgData, 'PNG', margin, yPosition, usableWidth, scaledHeight);
                remainingHeight -= pageHeight - margin * 2;
            }

            const poNo = (po?.poNumber || 'purchase-order').toString().replace(/[^a-zA-Z0-9-_]/g, '_');
            pdf.save(mode === 'vendor' ? `${poNo}_vendor_copy.pdf` : `${poNo}.pdf`);
        } catch (err) {
            console.error('PO PDF download failed', err);
            toast.error('Failed to generate PDF');
        } finally {
            if (offscreenHost?.parentNode) {
                offscreenHost.parentNode.removeChild(offscreenHost);
            }
            setIsDownloadingPdf(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('PO link copied');
        } catch {
            toast.error('Unable to copy link');
        }
    };

    const handleEmailVendor = () => {
        if (!po?.vendor?.email) {
            toast.error('Vendor email is not available');
            return;
        }
        const subject = encodeURIComponent(`Purchase Order ${po.poNumber}`);
        const body = encodeURIComponent(
            `Dear ${po.vendor.name || 'Vendor'},\n\nPlease find purchase order ${po.poNumber}.\n\nLink: ${window.location.href}\n\nRegards`
        );
        window.location.href = `mailto:${po.vendor.email}?subject=${subject}&body=${body}`;
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6 print:max-w-none print:space-y-3">
                <div className="flex items-center justify-between gap-3 print:hidden">
                    <Link
                        href="/dashboard/supply-chain/purchase-orders"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 bg-white font-bold text-secondary-700 hover:border-primary-200"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyLink} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 bg-white text-secondary-700 font-bold">
                            <Share2 size={15} />
                            Share Link
                        </button>
                        <button onClick={handleEmailVendor} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 bg-white text-secondary-700 font-bold">
                            <Mail size={15} />
                            Email Vendor
                        </button>
                        <button onClick={() => handleDownloadPdf('vendor')} disabled={isDownloadingPdf} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 bg-white text-secondary-700 font-bold disabled:opacity-60">
                            <Download size={15} />
                            Download Vendor Copy
                        </button>
                        <button onClick={() => handleDownloadPdf('standard')} disabled={isDownloadingPdf} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white font-bold disabled:opacity-60">
                            <Download size={15} />
                            {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="card-premium p-10 text-center text-secondary-500 font-bold">Loading purchase order...</div>
                ) : error ? (
                    <div className="card-premium p-10 text-center text-danger-600 font-bold">{error}</div>
                ) : (
                    <>
                        <div className="po-print-content-standard shadow-2xl">
                            <GlobalProPOTemplate po={po} companyLabel={companyLabel} />
                        </div>
                        <div className="po-print-content-vendor fixed left-[-100000px] top-0 opacity-0 pointer-events-none">
                            <GlobalProPOTemplate po={po} companyLabel={companyLabel} vendorCopy={true} />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}

// Style guide accessibility compliance: aria-label placeholder <label>
