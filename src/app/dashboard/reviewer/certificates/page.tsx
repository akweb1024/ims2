'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Award,
    Download,
    ExternalLink,
    Search,
    Calendar,
    BookOpen,
    ChevronLeft,
    CheckCircle,
    Copy,
    Share2,
    Shield
} from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';

export default function ReviewerCertificatesPage() {
    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/reviewer/certificates', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setCertificates(await res.json());
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const filteredCertificates = certificates.filter(c =>
        c.articleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.journalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Certificate number copied!');
    };

    const downloadCertificate = (cert: any) => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. Decorative Border
        doc.setDrawColor(20, 20, 20); // Dark secondary
        doc.setLineWidth(1);
        doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
        doc.setLineWidth(0.5);
        doc.rect(7, 7, pageWidth - 14, pageHeight - 14);

        // 2. Background Pattern/Texture (Subtle)
        doc.setDrawColor(240, 240, 240);
        for (let i = 10; i < pageWidth; i += 20) {
            doc.line(i, 10, i, pageHeight - 10);
        }

        // 3. Header Area
        doc.setTextColor(20, 20, 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(40);
        doc.text('CERTIFICATE', pageWidth / 2, 45, { align: 'center' });

        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('OF PEER REVIEW EXCELLENCE', pageWidth / 2, 55, { align: 'center' });

        // 4. Main Body
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text('This certificate is proudly presented to', pageWidth / 2, 80, { align: 'center' });

        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235); // primary-600
        const userName = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).name : 'Esteemed Reviewer';
        doc.text(userName, pageWidth / 2, 95, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text('in recognition of their significant contribution and expertise as a peer reviewer for', pageWidth / 2, 110, { align: 'center' });

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        doc.text(cert.journalName, pageWidth / 2, 122, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('Manuscript Title:', pageWidth / 2, 135, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        const splitTitle = doc.splitTextToSize(cert.articleTitle, pageWidth - 60);
        doc.text(splitTitle, pageWidth / 2, 142, { align: 'center' });

        // 5. Footer / Verification Info
        const footerY = 175;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);

        doc.text(`Certificate No: ${cert.certificateNumber}`, 30, footerY);
        doc.text(`Issued Date: ${new Date(cert.issueDate).toLocaleDateString()}`, 30, footerY + 5);

        doc.text('Verification URL:', pageWidth - 80, footerY);
        doc.setTextColor(37, 99, 235);
        doc.text('https://stm-journals.com/verify', pageWidth - 80, footerY + 5);

        // 6. Signatures (Placeholder style)
        doc.setDrawColor(200, 200, 200);
        doc.line(pageWidth / 2 - 30, footerY, pageWidth / 2 + 30, footerY);
        doc.setFontSize(10);
        doc.setTextColor(20, 20, 20);
        doc.text('Editorial Board', pageWidth / 2, footerY + 5, { align: 'center' });

        // Save
        doc.save(`Certificate_${cert.certificateNumber}.pdf`);
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard/reviewer" className="p-3 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-secondary-100 flex items-center justify-center bg-secondary-50">
                        <ChevronLeft size={24} />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-secondary-900 leading-tight">My Credentials</h1>
                        <p className="text-secondary-500 mt-1 font-medium">Earned certificates for your valuable peer review contributions.</p>
                    </div>
                </div>

                {/* Search & Stats Card */}
                <div className="card-premium p-8 bg-white flex flex-col md:flex-row gap-8 items-center justify-between border-primary-100">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search certificates by title, journal, or ID..."
                            className="input pl-12 h-14 text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-12 px-8 border-l border-secondary-100 hidden lg:flex">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Total Earned</p>
                            <p className="text-3xl font-black text-primary-600">{certificates.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Impact Score</p>
                            <p className="text-3xl font-black text-secondary-900">A+</p>
                        </div>
                    </div>
                </div>

                {/* Certificates Grid */}
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : filteredCertificates.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-[3rem] border border-secondary-100 shadow-sm">
                        <Award size={80} className="mx-auto mb-6 text-secondary-100" />
                        <h2 className="text-2xl font-black text-secondary-900 mb-2">No Certificates Found</h2>
                        <p className="text-secondary-500 max-w-sm mx-auto">
                            Complete assignments and wait for editorial validation to receive your official recognition certificates.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCertificates.map(certificate => (
                            <div key={certificate.id} className="card-premium p-0 bg-white border border-secondary-100 overflow-hidden group hover:border-primary-300 hover:shadow-2xl hover:shadow-primary-100/30 transition-all flex flex-col h-full">
                                {/* Visual Header */}
                                <div className="p-6 bg-secondary-900 relative overflow-hidden h-32 flex flex-col justify-end">
                                    <div className="absolute top-0 right-0 p-8 transform translate-x-1/4 -translate-y-1/4 opacity-10">
                                        <Award size={120} className="text-white" />
                                    </div>
                                    <div className="relative">
                                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.2em] mb-1">Certificate of Excellence</p>
                                        <h3 className="text-white font-black text-sm truncate uppercase tracking-tighter" title={certificate.journalName}>
                                            {certificate.journalName}
                                        </h3>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex-1 space-y-6">
                                        <div>
                                            <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-2">Manuscript Title</p>
                                            <p className="text-sm font-black text-secondary-900 leading-tight line-clamp-2" title={certificate.articleTitle}>
                                                {certificate.articleTitle}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t border-secondary-50 pt-4">
                                            <div>
                                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                    <Calendar size={10} /> Date
                                                </p>
                                                <p className="text-xs font-bold text-secondary-700">
                                                    {new Date(certificate.issueDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                    <Shield size={10} /> Authenticity
                                                </p>
                                                <div
                                                    onClick={() => copyToClipboard(certificate.certificateNumber)}
                                                    className="text-[10px] font-mono font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-2 hover:bg-primary-100 transition-colors"
                                                >
                                                    {certificate.certificateNumber.substring(0, 12)}... <Copy size={10} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="mt-8 flex gap-2">
                                        <button
                                            onClick={() => downloadCertificate(certificate)}
                                            className="flex-1 btn btn-primary h-11 text-xs font-black tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <Download size={16} /> Download
                                        </button>
                                        <button
                                            onClick={() => alert('Certificate link copied to clipboard!')}
                                            className="p-3 bg-secondary-50 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                        >
                                            <Share2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

