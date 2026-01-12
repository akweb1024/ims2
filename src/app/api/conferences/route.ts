import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');
            const mode = searchParams.get('mode');
            const upcoming = searchParams.get('upcoming') === 'true';

            const where: any = {};

            // Filter by status
            if (status) {
                where.status = status;
            } else {
                // By default, don't show cancelled conferences
                where.status = { not: 'CANCELLED' };
            }

            // Filter by mode
            if (mode) {
                where.mode = mode;
            }

            // Filter upcoming conferences
            if (upcoming) {
                where.startDate = { gte: new Date() };
            }

            // Multi-tenancy
            if (user.companyId && !['SUPER_ADMIN'].includes(user.role)) {
                where.companyId = user.companyId;
            }

            const conferences = await prisma.conference.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            registrations: true,
                            papers: true,
                            ticketTypes: true,
                            tracks: true,
                            sponsors: true
                        }
                    }
                },
                orderBy: { startDate: 'asc' }
            });

            return NextResponse.json(conferences);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const {
                title,
                description,
                startDate,
                endDate,
                venue,
                organizer,
                website,
                logoUrl,
                bannerUrl,
                primaryColor,
                mode,
                maxAttendees,
                cfpStartDate,
                cfpEndDate,
                reviewDeadline,
                timezone,
                registrationFee,
                currency
            } = body;

            // Validation
            if (!title || !description || !startDate || !endDate) {
                return createErrorResponse('Missing required fields', 400);
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (end <= start) {
                return createErrorResponse('End date must be after start date', 400);
            }

            const conference = await prisma.conference.create({
                data: {
                    title,
                    description,
                    startDate: start,
                    endDate: end,
                    venue,
                    organizer,
                    website,
                    logoUrl,
                    bannerUrl,
                    primaryColor: primaryColor || '#3B82F6',
                    mode: mode || 'IN_PERSON',
                    maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
                    cfpStartDate: cfpStartDate ? new Date(cfpStartDate) : null,
                    cfpEndDate: cfpEndDate ? new Date(cfpEndDate) : null,
                    reviewDeadline: reviewDeadline ? new Date(reviewDeadline) : null,
                    timezone: timezone || 'UTC',
                    registrationFee: registrationFee ? parseFloat(registrationFee) : 0,
                    currency: currency || 'INR',
                    status: 'DRAFT',
                    companyId: user.companyId,
                    isActive: true
                },
                include: {
                    _count: {
                        select: {
                            registrations: true,
                            papers: true,
                            ticketTypes: true
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
