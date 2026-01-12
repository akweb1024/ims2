import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id } = params;

            const conference = await prisma.conference.findUnique({
                where: { id },
                include: {
                    ticketTypes: {
                        orderBy: { price: 'asc' }
                    },
                    tracks: {
                        orderBy: { order: 'asc' }
                    },
                    sponsors: {
                        orderBy: { order: 'asc' }
                    },
                    _count: {
                        select: {
                            registrations: true,
                            papers: true
                        }
                    }
                }
            });

            if (!conference) {
                return createErrorResponse('Conference not found', 404);
            }

            return NextResponse.json(conference);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id } = params;
            const body = await req.json();

            // Convert date strings to Date objects if present
            const updateData: any = { ...body };

            if (body.startDate) updateData.startDate = new Date(body.startDate);
            if (body.endDate) updateData.endDate = new Date(body.endDate);
            if (body.cfpStartDate) updateData.cfpStartDate = new Date(body.cfpStartDate);
            if (body.cfpEndDate) updateData.cfpEndDate = new Date(body.cfpEndDate);
            if (body.reviewDeadline) updateData.reviewDeadline = new Date(body.reviewDeadline);
            if (body.maxAttendees) updateData.maxAttendees = parseInt(body.maxAttendees);
            if (body.registrationFee) updateData.registrationFee = parseFloat(body.registrationFee);

            const conference = await prisma.conference.update({
                where: { id },
                data: updateData,
                include: {
                    ticketTypes: true,
                    tracks: true,
                    sponsors: true,
                    _count: {
                        select: {
                            registrations: true,
                            papers: true
                        }
                    }
                }
            });

            return NextResponse.json(conference);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id } = params;

            // Check if conference has registrations
            const conference = await prisma.conference.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: { registrations: true }
                    }
                }
            });

            if (!conference) {
                return createErrorResponse('Conference not found', 404);
            }

            if (conference._count.registrations > 0) {
                // Don't delete, just cancel
                await prisma.conference.update({
                    where: { id },
                    data: { status: 'CANCELLED', isActive: false }
                });

                return NextResponse.json({
                    success: true,
                    message: 'Conference cancelled (has registrations)'
                });
            }

            // Safe to delete
            await prisma.conference.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
