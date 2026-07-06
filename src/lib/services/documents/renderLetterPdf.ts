import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Render a hydrated HTML letter (from DigitalDocument.content) into a clean, professional
 * PDF. Not pixel-perfect — it lays out headings, paragraphs, and tables on a company
 * letterhead. Reuses the jspdf stack already in the repo (see renderPayslipPdf).
 *
 * Template authoring guidance: numbered clauses should be plain <p> with literal numbers
 * (e.g. "<p>1. ...</p>"); use <h1..h3> for headings and <table> for the salary annexure.
 */
export interface LetterPdfMeta {
    title: string;
    companyName?: string | null;
    companyAddress?: string | null;
    signedAt?: Date | string | null;
    signatureIp?: string | null;
    /** Extra top margin in mm (e.g. to clear pre-printed letterhead paper). Default 4mm. */
    topMarginMm?: number | null;
    /** Custom per-page footer line. Use " | " to split into a left and right label. */
    footerText?: string | null;
    /** Show the "Page X of Y" footer (default true). */
    showPageNumbers?: boolean | null;
}

const mmToPt = (mm: number) => (mm * 72) / 25.4;

function decodeEntities(s: string): string {
    return s
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;|&apos;|&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        // jsPDF's standard fonts have no ₹ glyph (renders as ¹) — use "Rs." in PDFs.
        .replace(/₹\s?|&rupee;|&#8377;/g, 'Rs. ');
}

function stripInline(html: string): string {
    return decodeEntities(
        html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|h[1-6]|div|tr)>/gi, '\n')
            .replace(/<[^>]+>/g, '')
    )
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function parseTable(tableHtml: string): { head: string[][]; body: string[][] } {
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
    const parsed = rows.map((r) =>
        [...r.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi)].map((c) => stripInline(c[2]))
    );
    if (!parsed.length) return { head: [], body: [] };
    const firstIsHead = /<th/i.test(rows[0] || '');
    return firstIsHead ? { head: [parsed[0]], body: parsed.slice(1) } : { head: [parsed[0]], body: parsed.slice(1) };
}

export function renderLetterPdf(contentHtml: string, meta: LetterPdfMeta): ArrayBuffer {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const M = 56;
    const top = M + mmToPt(meta.topMarginMm ?? 4);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const maxW = pageW - M * 2;
    let y = top;

    const ensure = (h: number) => { if (y + h > pageH - M) { doc.addPage(); y = top; } };

    // Letterhead
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(meta.companyName || 'Company', pageW / 2, y, { align: 'center' });
    y += 20;
    if (meta.companyAddress) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(90);
        const addr = doc.splitTextToSize(meta.companyAddress, maxW);
        doc.text(addr, pageW / 2, y, { align: 'center' });
        y += addr.length * 11;
        doc.setTextColor(0);
    }
    y += 8;
    doc.setDrawColor(210);
    doc.line(M, y, pageW - M, y);
    y += 22;

    // Body — split into table and non-table segments, preserving order.
    const parts = contentHtml.split(/(<table[\s\S]*?<\/table>)/gi);
    for (const part of parts) {
        if (!part || !part.trim()) continue;

        if (/^<table/i.test(part)) {
            const { head, body } = parseTable(part);
            if (!body.length && !head.length) continue;
            ensure(50);
            autoTable(doc, {
                startY: y, head, body,
                margin: { left: M, right: M },
                styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
                headStyles: { fillColor: [55, 65, 81], textColor: 255 },
            });
            y = ((doc as any).lastAutoTable?.finalY || y) + 16;
            continue;
        }

        const blocks = [...part.matchAll(/<(h[1-6]|p)[^>]*>([\s\S]*?)<\/(h[1-6]|p)>/gi)];
        for (const b of blocks) {
            const tag = b[1].toLowerCase();
            const text = stripInline(b[2]);
            if (!text) { y += 6; continue; }
            const isHeading = tag[0] === 'h';
            doc.setFont('helvetica', isHeading ? 'bold' : 'normal');
            doc.setFontSize(isHeading ? (tag === 'h1' ? 14 : tag === 'h2' ? 12 : 11) : 10);
            const lineH = isHeading ? 16 : 13;
            const lines = text.split('\n').flatMap((seg) => (seg.trim() ? doc.splitTextToSize(seg, maxW) : ['']));
            for (const ln of lines) { ensure(lineH); doc.text(ln, M, y); y += lineH; }
            y += isHeading ? 6 : 6;
        }
    }

    // Signature / footer
    ensure(60);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (meta.signedAt) {
        doc.setTextColor(16, 122, 87);
        doc.text(`Digitally accepted on ${new Date(meta.signedAt).toLocaleString('en-IN')}${meta.signatureIp ? ` · IP ${meta.signatureIp}` : ''}`, M, y);
        doc.setTextColor(0);
    } else {
        doc.text('_____________________________', M, y);
        doc.text('Authorized Signatory', M, y + 14);
    }

    // Per-page footer — everything sits on ONE baseline so it never stacks:
    // custom footer left | right at the margins, page number in the middle.
    const pages = doc.getNumberOfPages();
    const footerY = pageH - 28;
    const pageNumbers = meta.showPageNumbers !== false;
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        const [left, right] = (meta.footerText || '').split(' | ');
        const hasSplit = meta.footerText && right !== undefined;

        if (meta.footerText) {
            doc.setFontSize(9);
            doc.setTextColor(90);
            if (hasSplit) {
                doc.text(left, M, footerY);
                doc.text(right, pageW - M, footerY, { align: 'right' });
            } else {
                // Single-part footer: left-aligned so the page number can share the line.
                doc.text(meta.footerText, M, footerY);
            }
        }
        if (pageNumbers) {
            doc.setFontSize(8);
            doc.setTextColor(140);
            // Center it when the sides are free, else tuck it to the right.
            const label = `${meta.title} · Page ${i} of ${pages}`;
            if (hasSplit || !meta.footerText) doc.text(label, pageW / 2, footerY, { align: 'center' });
            else doc.text(label, pageW - M, footerY, { align: 'right' });
        }
        doc.setTextColor(0);
    }

    return doc.output('arraybuffer');
}
