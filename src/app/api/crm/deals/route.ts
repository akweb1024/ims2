import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { z } from 'zod';

const dealSchema = z.object({
    title: z.string().min(2, 'Title required'),
    value: z.number().default(0),
    currency: z.string().default('INR'),
    stage: z.enum(['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).default('DISCOVERY'),
    customerId: z.string().uuid('Valid Customer ID required'),
    ownerId: z.string().optional(),
    expectedCloseDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const stage = searchParams.get('stage');

            const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role);

            const where: any = {
                companyId: user.companyId,
                ...(!isGlobal && { ownerId: user.id }),
                ...(stage && { stage: stage })
            };

            const deals = await prisma.deal.findMany({
                where,
                include: {
                    customer: {
                        select: { id: true, name: true, organizationName: true }
                    },
                    owner: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            return NextResponse.json(deals);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const validated = dealSchema.parse(body);

            const deal = await prisma.deal.create({
                data: {
                    companyId: user.companyId,
                    title: validated.title,
                    value: validated.value,
                    currency: validated.currency,
                    stage: validated.stage,
                    customerId: validated.customerId,
                    ownerId: validated.ownerId || user.id,
                    expectedCloseDate: validated.expectedCloseDate ? new Date(validated.expectedCloseDate) : null,
                    notes: validated.notes
                }
            });

            return NextResponse.json(deal);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
