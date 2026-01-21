import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const conferenceId = id;

            const ticketTypes = await prisma.conferenceTicketType.findMany({
                where: { conferenceId },
                orderBy: { price: 'asc' }
            });

            return NextResponse.json(ticketTypes);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const conferenceId = id;
            const body = await req.json();
            const { name, price, currency, limit } = body;

            if (!name || price === undefined) {
                return createErrorResponse('Name and price are required', 400);
            }

            const ticketType = await prisma.conferenceTicketType.create({
                data: {
                    conferenceId,
                    name,
                    price: parseFloat(price),
                    currency: currency || 'INR',
                    limit: limit ? parseInt(limit) : null
                }
            });

            return NextResponse.json(ticketType);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
