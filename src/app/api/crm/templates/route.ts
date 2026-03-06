import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const templateSchema = z.object({
    name: z.string().min(2),
    subject: z.string().min(2),
    htmlBody: z.string().min(1),
    designState: z.any().optional(),
});

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req, user) => {
        try {
            const templates = await (prisma as any).emailTemplate.findMany({
                where: { companyId: user.companyId },
                include: { _count: { select: { campaigns: true } } },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(templates);
        } catch (error) {
            return handleApiError(error, 'Failed to fetch templates');
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req, user) => {
        try {
            const body = await req.json();
            const validated = templateSchema.parse(body);

            const template = await (prisma as any).emailTemplate.create({
                data: {
                    companyId: user.companyId,
                    ...validated,
                    designState: validated.designState || {}
                }
            });

            return NextResponse.json(template);
        } catch (error) {
            return handleApiError(error, 'Failed to create template');
        }
    }
);
