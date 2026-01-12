import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: conferenceId } = params;
            const { searchParams } = new URL(req.url);

            const status = searchParams.get('status');
            const ticketTypeId = searchParams.get('ticketTypeId');
            const search = searchParams.get('search');

            const where: any = { conferenceId };

            if (status && status !== 'all') where.status = status;
            if (ticketTypeId && ticketTypeId !== 'all') where.ticketTypeId = ticketTypeId;
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { organization: { contains: search, mode: 'insensitive' } }
                ];
            }

            const registrations = await prisma.conferenceRegistration.findMany({
                where,
                include: {
                    ticketType: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(registrations);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: conferenceId } = params;
            const body = await req.json();

            // Validate Ticket
            const ticketType = await prisma.conferenceTicketType.findUnique({
                where: { id: body.ticketTypeId }
            });

            if (!ticketType) return createErrorResponse('Invalid ticket type', 400);

            // Check Limit
            if (ticketType.limit && ticketType.soldCount >= ticketType.limit) {
                return createErrorResponse('Ticket sold out', 400);
            }

            // Create Registration
            const registration = await prisma.$transaction(async (tx) => {
                const reg = await tx.conferenceRegistration.create({
                    data: {
                        conferenceId,
                        userId: user ? user.id : null,
                        name: body.name,
                        email: body.email,
                        organization: body.organization,
                        ticketTypeId: body.ticketTypeId,
                        amountPaid: ticketType.price, // Assuming paid in full (demo)
                        status: 'REGISTERED',
                        phone: body.phone,
                        dietaryRequirements: body.dietaryRequirements,
                        tshirtSize: body.tshirtSize
                    }
                });

                // Update sold count
                await tx.conferenceTicketType.update({
                    where: { id: ticketType.id },
                    data: { soldCount: { increment: 1 } }
                });

                // Update conference registration count cache (optional, but good for list performance)
                // We rely on count queries usually, but could have a field.

                return reg;
            });

            return NextResponse.json(registration);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
