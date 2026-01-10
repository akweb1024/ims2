import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');

            const where: any = {};

            if (user.role === 'EMPLOYEE') {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id }
                });
                if (!profile) return NextResponse.json([]);
                where.employeeId = profile.id;
            } else if (employeeId) {
                where.employeeId = employeeId;
            } else if (user.companyId) {
                where.employee = { companyId: user.companyId };
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
                include: { user: true }
            });

            if (!template || !employee) return createErrorResponse('Template or Employee not found', 404);

            // Simple placeholder replacement
            let resolvedContent = template.content;
            const placeholders = {
                '{{name}}': employee.user.name || employee.user.email,
                '{{email}}': employee.user.email,
                '{{designation}}': employee.designation || 'Staff',
                '{{date}}': new Date().toLocaleDateString(),
                ...customFields
            };

            Object.entries(placeholders).forEach(([key, val]) => {
                resolvedContent = resolvedContent.replace(new RegExp(key, 'g'), String(val));
            });

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

// Sign document
export const PATCH = authorizedRoute(
    ['EMPLOYEE'],
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
