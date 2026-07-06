import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { renderLetterPdf } from '@/lib/services/documents/renderLetterPdf';
import { buildLetterVars, sampleLetterVars, hydrate } from '@/lib/services/documents/letterVars';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'];

// POST /api/hr/digital-documents/preview — render a letter to PDF WITHOUT saving it.
// Body: { content?, templateId?, employeeId?, customFields? }
//  - content or templateId supplies the HTML;
//  - employeeId → hydrate with that employee's real record (+ their company);
//    otherwise sample data is used so HR can preview the layout.
export const POST = authorizedRoute(ROLES, async (req: NextRequest, user) => {
    try {
        const body = await req.json().catch(() => ({}));

        let content: string | null = body.content ?? null;
        // Live editor previews pass settings inline; templateId previews use the stored ones.
        let settings: any = body.settings ?? null;
        if (!content && body.templateId) {
            const t = await prisma.documentTemplate.findUnique({ where: { id: body.templateId }, select: { content: true, settings: true } });
            content = t?.content ?? null;
            settings = settings ?? t?.settings ?? null;
        }
        if (!content) return createErrorResponse('Provide content or a templateId to preview', 400);

        let vars: Record<string, string>;
        let companyName: string | null = null;
        let companyAddress: string | null = null;

        if (body.employeeId) {
            const employee = await prisma.employeeProfile.findUnique({ where: { id: body.employeeId }, include: { user: true, salaryStructure: true } });
            if (!employee) return createErrorResponse('Employee not found', 404);
            const companyId = (employee.user as any)?.companyId || user.companyId || null;
            const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
            vars = buildLetterVars(employee, company, body.customFields);
            companyName = company?.name || null;
            companyAddress = company?.address || null;
        } else {
            const company = user.companyId ? await prisma.company.findUnique({ where: { id: user.companyId } }) : null;
            vars = sampleLetterVars(company, body.customFields);
            companyName = company?.name || 'Your Company';
            companyAddress = company?.address || null;
        }

        const s = (settings || {}) as any;
        const pdf = renderLetterPdf(hydrate(content, vars), {
            title: body.title || 'Preview',
            companyName,
            companyAddress,
            signedAt: null,
            signatureIp: null,
            topMarginMm: s.topMarginMm,
            footerText: s.footerText,
            showPageNumbers: s.showPageNumbers,
        });

        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="preview.pdf"',
            },
        });
    } catch (error) {
        return createErrorResponse(error);
    }
});
