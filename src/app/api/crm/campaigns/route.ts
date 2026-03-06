import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const campaignSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    audienceId: z.string().uuid(),
    templateId: z.string().uuid(),
    startDate: z.string(),
    endDate: z.string().optional().nullable(),
    status: z.string().default('DRAFT'),
});

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req, user) => {
        try {
            const campaigns = await (prisma as any).marketingCampaign.findMany({
                where: { companyId: user.companyId },
                include: {
                    audience: true,
                    template: { select: { id: true, name: true, subject: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(campaigns);
        } catch (error) {
            return handleApiError(error, 'Failed to fetch campaigns');
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req, user) => {
        try {
            const body = await req.json();
            const validated = campaignSchema.parse(body);

            const campaign = await (prisma as any).marketingCampaign.create({
                data: {
                    companyId: user.companyId,
                    ...validated,
                    startDate: new Date(validated.startDate),
                    endDate: validated.endDate ? new Date(validated.endDate) : null
                }
            });

            return NextResponse.json(campaign);
        } catch (error) {
            return handleApiError(error, 'Failed to create campaign');
        }
    }
);
