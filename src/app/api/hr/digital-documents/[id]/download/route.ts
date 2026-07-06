import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { renderLetterPdf } from '@/lib/services/documents/renderLetterPdf';

const ADMIN_CLASS = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER'];

// GET /api/hr/digital-documents/[id]/download — the issued letter as a PDF.
// The letterhead (company) is taken from the EMPLOYEE's own company record — dynamic per record.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { id } = await props.params;

        const doc = (await prisma.digitalDocument.findUnique({
            where: { id },
            include: {
                employee: { include: { user: { include: { company: true } } } },
                template: { select: { settings: true } },
            },
        })) as any;
        if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

        // Owner may download own; admin/HR/manager may download others.
        const isOwner = doc.employee?.userId === user.id;
        if (!isOwner && !ADMIN_CLASS.includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const company = doc.employee?.user?.company || null;
        const s = (doc.template?.settings || {}) as any;
        const pdf = renderLetterPdf(doc.content, {
            title: doc.title,
            companyName: company?.name || null,
            companyAddress: company?.address || null,
            signedAt: doc.signedAt,
            signatureIp: doc.signatureIp,
            topMarginMm: s.topMarginMm,
            footerText: s.footerText,
            showPageNumbers: s.showPageNumbers,
        });

        const safeName = String(doc.title || 'document').replace(/[^a-z0-9]+/gi, '_');
        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('Letter PDF generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
