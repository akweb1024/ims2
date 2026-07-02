import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { buildLetterVars, hydrate } from '@/lib/services/documents/letterVars';

// POST: Issue a document to an employee
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { templateId, employeeId } = body;

            const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
            const employee = await prisma.employeeProfile.findUnique({
                where: { id: employeeId },
                include: { user: true }
            });

            if (!template || !employee) {
                return createErrorResponse('Template or Employee not found', 404);
            }

            // Fetch Company Context
            const company = await prisma.company.findUnique({ where: { id: template.companyId } });

            // Shared hydration (full placeholder set — same helper the live preview + digital-documents use).
            const resolvedContent = hydrate(template.content, buildLetterVars(employee, company));

            const doc = await prisma.digitalDocument.create({
                data: {
                    templateId,
                    employeeId,
                    title: template.title,
                    content: resolvedContent,
                    status: 'PENDING'
                }
            });

            return NextResponse.json(doc);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// PATCH: Employee Sign
export const PATCH = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, action } = body; // action = SIGN

            if (action !== 'SIGN') return createErrorResponse('Invalid action', 400);

            const doc = await prisma.digitalDocument.findUnique({
                where: { id },
                include: { employee: true }
            });

            if (!doc) return createErrorResponse('Document not found', 404);

            // Verify ownership
            if (doc.employee.userId !== user.id) {
                return createErrorResponse('Forbidden', 403);
            }

            const updated = await prisma.digitalDocument.update({
                where: { id },
                data: {
                    status: 'SIGNED',
                    signedAt: new Date(),
                    signatureIp: req.headers.get('x-forwarded-for') || 'ip-unknown'
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
