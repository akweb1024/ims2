import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { buildLetterVars, hydrate } from '@/lib/services/documents/letterVars';

/**
 * HR-admin surface for generating and managing employee documents.
 *
 * Staff self-service lives at /api/hr/my-documents, which is open to every role and is on the
 * module-access exception list. This route previously listed a role called `EMPLOYEE` — not a
 * member of the UserRole enum — alongside a `user.role === 'EMPLOYEE'` branch that scoped the
 * query to the caller's own documents. Neither could ever fire, and `/api/hr/*` requires the HR
 * module regardless, so staff never reached it by either path. Both are removed rather than
 * repointed at EXECUTIVE: widening an HR-admin endpoint is not the way to serve staff when the
 * self-service endpoint already exists.
 */
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');

            const where: any = {};

            if (employeeId) {
                where.employeeId = employeeId;
            } else if (user.companyId) {
                where.employee = { user: { companyId: user.companyId } };
            }

            const documents = await prisma.digitalDocument.findMany({
                where,
                include: {
                    template: true,
                    employee: { include: { user: { select: { name: true, email: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(documents);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Generate document for employee
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { templateId, employeeId, customFields } = body;

            if (!templateId || !employeeId) {
                return createErrorResponse('Template ID and Employee ID are required', 400);
            }

            const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
            const employee = await prisma.employeeProfile.findUnique({
                where: { id: employeeId },
                include: { user: true, salaryStructure: true }
            });

            if (!template || !employee) return createErrorResponse('Template or Employee not found', 404);

            // Company from the EMPLOYEE's own record (dynamic per record), not the HR actor's —
            // so a group admin issuing across companies always gets the right letterhead.
            const employeeCompanyId = (employee.user as any)?.companyId || user.companyId || null;
            const company = employeeCompanyId ? await prisma.company.findUnique({ where: { id: employeeCompanyId } }) : null;

            // Shared hydration (same helper the live preview uses, so they never drift).
            const placeholders = buildLetterVars(employee, company, customFields);
            const resolvedContent = hydrate(template.content, placeholders);

            const digitalDoc = await prisma.digitalDocument.create({
                data: {
                    templateId,
                    employeeId,
                    title: template.title,
                    content: resolvedContent,
                    status: 'PENDING'
                }
            });

            return NextResponse.json(digitalDoc);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Sign document. Still self-scoped below by doc.employeeId === the caller's own profile.
// The dead `EMPLOYEE` role is dropped rather than repointed, for the reason given on GET.
export const PATCH = authorizedRoute(
    ['MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id } = body;

            if (!id) return createErrorResponse('Document ID required', 400);

            const profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
            if (!profile) return createErrorResponse('Profile not found', 404);

            const doc = await prisma.digitalDocument.findUnique({ where: { id } });
            if (!doc || doc.employeeId !== profile.id) return createErrorResponse('Document not found or unauthorized', 404);

            const updated = await prisma.digitalDocument.update({
                where: { id },
                data: {
                    status: 'SIGNED',
                    signedAt: new Date(),
                    signatureIp: req.headers.get('x-forwarded-for') || '127.0.0.1'
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
