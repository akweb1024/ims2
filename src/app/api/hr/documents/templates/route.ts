import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET: Fetch all templates for company
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const userCompanyId = user.companyId;

            const templates = await prisma.documentTemplate.findMany({
                where: { companyId: userCompanyId },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(templates);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST: Create a new template
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { title, type, content } = body;
            const userCompanyId = user.companyId;
            if (!userCompanyId) return createErrorResponse('Company context required', 400);

            const template = await prisma.documentTemplate.create({
                data: {
                    companyId: userCompanyId,
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
