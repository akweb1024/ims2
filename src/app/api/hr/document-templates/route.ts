import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const templates = await prisma.documentTemplate.findMany({
                where: { companyId: user.companyId, isActive: true },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(templates);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const body = await req.json();
            const { title, type, content } = body;

            if (!title || !type || !content) {
                return createErrorResponse('Missing required fields', 400);
            }

            const template = await prisma.documentTemplate.create({
                data: {
                    companyId: user.companyId,
                    title,
                    type,
                    content
                }
            });

            return NextResponse.json(template);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, ...updateData } = body;

            if (!id) return createErrorResponse('ID is required', 400);
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const template = await prisma.documentTemplate.updateMany({
                where: { id, companyId: user.companyId, isActive: true },
                data: updateData
            });

            if (template.count === 0) {
                return createErrorResponse('Template not found', 404);
            }

            const updatedTemplate = await prisma.documentTemplate.findUnique({ where: { id } });
            return NextResponse.json(updatedTemplate);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) return createErrorResponse('ID is required', 400);
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const template = await prisma.documentTemplate.updateMany({
                where: { id, companyId: user.companyId, isActive: true },
                data: { isActive: false }
            });

            if (template.count === 0) {
                return createErrorResponse('Template not found', 404);
            }

            return NextResponse.json({ message: 'Template deactivated' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
