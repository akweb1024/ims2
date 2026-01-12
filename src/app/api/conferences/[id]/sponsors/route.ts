import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: conferenceId } = params;

            const sponsors = await prisma.conferenceSponsor.findMany({
                where: { conferenceId },
                orderBy: { order: 'asc' }
            });

            return NextResponse.json(sponsors);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: conferenceId } = params;
            const body = await req.json();
            const { name, logo, tier, website, description } = body;

            if (!name) {
                return createErrorResponse('Name is required', 400);
            }

            // Get the highest order number
            const lastSponsor = await prisma.conferenceSponsor.findFirst({
                where: { conferenceId },
                orderBy: { order: 'desc' }
            });

            const newOrder = (lastSponsor?.order || 0) + 1;

            const sponsor = await prisma.conferenceSponsor.create({
                data: {
                    conferenceId,
                    name,
                    logo,
                    tier: tier || 'BRONZE',
                    website,
                    description,
                    order: newOrder
                }
            });

            return NextResponse.json(sponsor);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
