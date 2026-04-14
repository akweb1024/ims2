import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { buildConferenceRegistrationFollowupSummary } from '@/lib/conference-followups';
import { syncToCrmLead } from '@/lib/crm-sync';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const conferenceId = id;
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

            const conference = await prisma.conference.findUnique({
                where: { id: conferenceId },
                select: { id: true, companyId: true },
            });

            if (!conference) {
                return createErrorResponse('Conference not found', 404);
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

            const followupSummary = conference.companyId
                ? await buildConferenceRegistrationFollowupSummary({
                    companyId: conference.companyId,
                    registrations: registrations.map((registration) => ({
                        id: registration.id,
                        name: registration.name,
                        email: registration.email,
                        phone: registration.phone,
                        organization: registration.organization,
                    })),
                })
                : [];

            const summaryByRegistrationId = new Map(
                followupSummary.map((item) => [item.registrationId, item])
            );

            return NextResponse.json(
                registrations.map((registration) => ({
                    ...registration,
                    followup: summaryByRegistrationId.get(registration.id) || null,
                }))
            );
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const conferenceId = id;
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

            const conference = await prisma.conference.findUnique({
                where: { id: conferenceId },
                select: { companyId: true }
            });

            if (conference?.companyId) {
                syncToCrmLead({
                    name: body.name,
                    email: body.email,
                    phone: body.phone,
                    organization: body.organization,
                    source: 'CONFERENCE_REGISTRATION',
                    companyId: conference.companyId,
                    notes: `Registered for conference ID: ${conferenceId}. Ticket: ${ticketType.name}`
                }).catch(err => console.error('Delayed CRM Sync Failure:', err));
            }

            return NextResponse.json(registration);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
