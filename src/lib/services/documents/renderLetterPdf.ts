import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Render a hydrated HTML letter (from DigitalDocument.content) into a clean, professional
 * PDF. Not pixel-perfect — it lays out headings, paragraphs, lists, and tables on a company
 * letterhead, preserving bold/italic/underline/strike, alignment and bullet/numbered lists
 * produced by the rich-text editor. Reuses the jspdf stack already in the repo (see
 * renderPayslipPdf).
 *
 * Template authoring guidance: use <h1..h3> for headings, <table> for the salary annexure,
 * and either literal "1. ..." numbering in a <p> or a real <ol>/<ul> — both render correctly.
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

interface Run {
    text: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
}

interface Token {
    word: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    isSpace: boolean;
}

type Align = 'left' | 'center' | 'right';

const mmToPt = (mm: number) => (mm * 72) / 25.4;

function decodeEntities(s: string): string {
    return s
        // A real non-breaking space, not a plain space — so runs of &nbsp; (a common trick for
        // widening a signature-line gap) survive the whitespace-collapse in tokenizeWords below.
        .replace(/&nbsp;/g, '\u00A0')
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

// Void elements never get a closing tag — if pushed onto the style stack they'd never be
// popped, permanently corrupting bold/italic state for the rest of the document.
const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);

/**
 * Parses inline HTML into style-tagged text runs, tracking nested <strong>/<em>/<u>/<s>.
 * Matches ANY tag (not just the known style ones) so unrecognized markup like <span>/<a>/<div>
 * — which can appear via the template editor's raw-HTML mode — is stripped rather than leaking
 * its literal tag text into the PDF; such tags just inherit the current run's style.
 */
function parseInlineRuns(html: string): Run[] {
    const runs: Run[] = [];
    const stack: Array<{ bold: boolean; italic: boolean; underline: boolean; strike: boolean }> = [
        { bold: false, italic: false, underline: false, strike: false },
    ];
    const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/)?>/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    const pushText = (raw: string) => {
        const text = decodeEntities(raw);
        if (text) runs.push({ text, ...stack[stack.length - 1] });
    };

    while ((m = tagRe.exec(html))) {
        if (m.index > lastIndex) pushText(html.slice(lastIndex, m.index));
        lastIndex = tagRe.lastIndex;
        const closing = m[1] === '/';
        const tag = m[2].toLowerCase();
        const selfClosing = !!m[3];

        if (tag === 'br') {
            runs.push({ text: '\n', bold: false, italic: false, underline: false, strike: false });
            continue;
        }
        if (closing) {
            if (stack.length > 1) stack.pop();
            continue;
        }
        if (VOID_TAGS.has(tag) || selfClosing) continue;

        const top = { ...stack[stack.length - 1] };
        if (tag === 'strong' || tag === 'b') top.bold = true;
        else if (tag === 'em' || tag === 'i') top.italic = true;
        else if (tag === 'u') top.underline = true;
        else if (tag === 's' || tag === 'strike') top.strike = true;
        stack.push(top);
    }
    if (lastIndex < html.length) pushText(html.slice(lastIndex));
    return runs;
}

function tokenizeWords(runs: Run[]): Token[] {
    const tokens: Token[] = [];
    for (const r of runs) {
        // Collapse ordinary whitespace like HTML does, but leave \u00A0 (&nbsp;) runs intact —
        // otherwise repeated &nbsp; used to pad a signature line collapse to a single space.
        const normalized = r.text.replace(/[ \t\n\r\f\v]+/g, ' ');
        for (const p of normalized.split(/( )/)) {
            if (!p) continue;
            tokens.push({ word: p, bold: r.bold, italic: r.italic, underline: r.underline, strike: r.strike, isSpace: p === ' ' });
        }
    }
    while (tokens.length && tokens[0].isSpace) tokens.shift();
    while (tokens.length && tokens[tokens.length - 1].isSpace) tokens.pop();
    return tokens;
}

function fontStyleFor(bold: boolean, italic: boolean): string {
    if (bold && italic) return 'bolditalic';
    if (bold) return 'bold';
    if (italic) return 'italic';
    return 'normal';
}

function measure(doc: jsPDF, token: Token, fontSize: number): number {
    doc.setFont('helvetica', fontStyleFor(token.bold, token.italic));
    doc.setFontSize(fontSize);
    return doc.getTextWidth(token.word);
}

function wrapTokens(doc: jsPDF, tokens: Token[], boxW: number, fontSize: number): Token[][] {
    const lines: Token[][] = [];
    let current: Token[] = [];
    let currentW = 0;
    for (const t of tokens) {
        const w = measure(doc, t, fontSize);
        if (t.isSpace) {
            if (current.length) { current.push(t); currentW += w; }
            continue;
        }
        if (current.length && currentW + w > boxW) {
            while (current.length && current[current.length - 1].isSpace) current.pop();
            lines.push(current);
            current = [];
            currentW = 0;
        }
        current.push(t);
        currentW += w;
    }
    while (current.length && current[current.length - 1].isSpace) current.pop();
    if (current.length) lines.push(current);
    return lines;
}

function drawLine(doc: jsPDF, line: Token[], x0: number, boxW: number, y: number, fontSize: number, align: Align) {
    const w = line.reduce((sum, t) => sum + measure(doc, t, fontSize), 0);
    let x = x0;
    if (align === 'center') x = x0 + Math.max(0, (boxW - w) / 2);
    else if (align === 'right') x = x0 + Math.max(0, boxW - w);
    for (const t of line) {
        doc.setFont('helvetica', fontStyleFor(t.bold, t.italic));
        doc.setFontSize(fontSize);
        const tw = doc.getTextWidth(t.word);
        doc.text(t.word, x, y);
        if (t.underline) doc.line(x, y + 2, x + tw, y + 2);
        if (t.strike) doc.line(x, y - fontSize * 0.32, x + tw, y - fontSize * 0.32);
        x += tw;
    }
}

interface RenderTextBlockOpts {
    x0: number;
    boxW: number;
    y: number;
    fontSize: number;
    baseBold?: boolean;
    align?: Align;
    lineH?: number;
    ensure: (y: number, h: number) => number;
    /** Hanging-indent prefix (bullet/number) drawn once, before the first line only. */
    firstLinePrefix?: { text: string; width: number };
}

/** Renders inline-formatted HTML as wrapped, styled text; returns the new y. */
function renderTextBlock(doc: jsPDF, html: string, opts: RenderTextBlockOpts): number {
    const { x0, boxW, fontSize, ensure } = opts;
    const align = opts.align ?? 'left';
    const baseBold = !!opts.baseBold;
    const lineH = opts.lineH ?? fontSize * 1.3;
    const prefix = opts.firstLinePrefix;
    const effX0 = prefix ? x0 + prefix.width : x0;
    const effBoxW = prefix ? boxW - prefix.width : boxW;
    let y = opts.y;

    const runs = parseInlineRuns(html).map((r) => (r.text === '\n' ? r : { ...r, bold: r.bold || baseBold }));
    const segments: Run[][] = [[]];
    for (const r of runs) {
        if (r.text === '\n') segments.push([]);
        else segments[segments.length - 1].push(r);
    }

    let first = true;
    for (const seg of segments) {
        const lines = wrapTokens(doc, tokenizeWords(seg), effBoxW, fontSize);
        if (!lines.length) lines.push([]);
        for (const line of lines) {
            y = ensure(y, lineH);
            if (first && prefix) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.text(prefix.text, x0, y);
            }
            drawLine(doc, line, effX0, effBoxW, y, fontSize, prefix ? 'left' : align);
            y += lineH;
            first = false;
        }
    }
    return y;
}

function parseAlign(attrs: string): Align {
    const m = /ql-align-(center|right|justify|left)/.exec(attrs || '');
    if (!m || m[1] === 'justify' || m[1] === 'left') return 'left';
    return m[1] as Align;
}

function parseIndent(attrs: string): number {
    const m = /ql-indent-(\d+)/.exec(attrs || '');
    return m ? parseInt(m[1], 10) : 0;
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

    const ensure = (yy: number, h: number): number => {
        if (yy + h > pageH - M) { doc.addPage(); return top; }
        return yy;
    };

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
    const blockRe = /<(h[1-6]|p|ul|ol)([^>]*)>([\s\S]*?)<\/\1>/gi;
    const liRe = /<li([^>]*)>([\s\S]*?)<\/li>/gi;

    for (const part of parts) {
        if (!part || !part.trim()) continue;

        if (/^<table/i.test(part)) {
            const { head, body } = parseTable(part);
            if (!body.length && !head.length) continue;
            y = ensure(y, 50);
            autoTable(doc, {
                startY: y, head, body,
                margin: { left: M, right: M },
                styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
                headStyles: { fillColor: [55, 65, 81], textColor: 255 },
            });
            y = ((doc as any).lastAutoTable?.finalY || y) + 16;
            continue;
        }

        blockRe.lastIndex = 0;
        let bm: RegExpExecArray | null;
        while ((bm = blockRe.exec(part))) {
            const tag = bm[1].toLowerCase();
            const attrs = bm[2] || '';
            const inner = bm[3];

            if (tag === 'ul' || tag === 'ol') {
                let counter = 0;
                liRe.lastIndex = 0;
                let lm: RegExpExecArray | null;
                while ((lm = liRe.exec(inner))) {
                    const indent = parseIndent(lm[1] || '');
                    const indentPx = indent * 16;
                    counter += 1;
                    const bulletText = tag === 'ol' ? `${counter}.` : indent > 0 ? '-' : '•';
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    const bulletWidth = doc.getTextWidth(`${bulletText}  `);
                    y = renderTextBlock(doc, lm[2], {
                        x0: M + indentPx,
                        boxW: maxW - indentPx,
                        fontSize: 10,
                        ensure,
                        y,
                        firstLinePrefix: { text: bulletText, width: bulletWidth },
                    });
                    y += 4;
                }
                y += 4;
                continue;
            }

            const plain = decodeEntities(inner.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
            if (!plain) { y += 6; continue; }

            const isHeading = tag[0] === 'h';
            const fontSize = isHeading ? (tag === 'h1' ? 14 : tag === 'h2' ? 12 : 11) : 10;
            const lineH = isHeading ? 16 : 13;
            const align = parseAlign(attrs);
            const indentPx = parseIndent(attrs) * 16;
            y = renderTextBlock(doc, inner, {
                x0: M + indentPx,
                boxW: maxW - indentPx,
                fontSize,
                baseBold: isHeading,
                align,
                lineH,
                ensure,
                y,
            });
            y += 6;
        }
    }

    // Signature / footer
    y = ensure(y, 60);
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
