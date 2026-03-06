import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const audienceSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    queryFilter: z.any().optional(),
});

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req, user) => {
        try {
            const audiences = await (prisma as any).campaignAudience.findMany({
                where: { companyId: user.companyId },
                include: { _count: { select: { campaigns: true } } },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(audiences);
        } catch (error) {
            return handleApiError(error, 'Failed to fetch audiences');
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req, user) => {
        try {
            const body = await req.json();
            const validated = audienceSchema.parse(body);

            const audience = await (prisma as any).campaignAudience.create({
                data: {
                    companyId: user.companyId,
                    ...validated,
                    queryFilter: validated.queryFilter || {}
                }
            });

            return NextResponse.json(audience);
        } catch (error) {
            return handleApiError(error, 'Failed to create audience');
        }
    }
);
