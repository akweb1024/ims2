import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import {
    buildConferenceRegistrationFollowupSummary,
    createConferenceFollowup,
    ensureConferenceLeadForRegistration,
} from '@/lib/conference-followups';

const followupSchema = z.object({
    channel: z.string().min(1),
    type: z.enum(['COMMENT', 'EMAIL', 'CALL', 'INVOICE_SENT', 'CATALOGUE_SENT', 'MEETING']).optional(),
    subject: z.string().min(3),
    notes: z.string().min(3),
    outcome: z.string().optional().nullable(),
    nextFollowUpDate: z.string().optional().nullable(),
    previousFollowUpId: z.string().optional().nullable(),
    checklist: z.object({
        checkedItems: z.array(z.string()).min(1),
    }),
});

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string; registrationId: string }> }) => {
        try {
            const { id, registrationId } = await params;

            const registration = await prisma.conferenceRegistration.findUnique({
                where: { id: registrationId },
                include: {
                    conference: {
                        select: {
                            id: true,
                            title: true,
                            companyId: true,
                        },
                    },
                    ticketType: true,
                },
            });

            if (!registration || registration.conferenceId !== id) {
                return createErrorResponse('Registration not found', 404);
            }

            if (!registration.conference.companyId) {
                return NextResponse.json({
                    registration,
                    customerProfileId: null,
                    followups: [],
                    analytics: null,
                });
            }

            const lead = await ensureConferenceLeadForRegistration({
                companyId: registration.conference.companyId,
                conferenceTitle: registration.conference.title,
                registration: {
                    id: registration.id,
                    name: registration.name,
                    email: registration.email,
                    phone: registration.phone,
                    organization: registration.organization,
                },
            });

            const followups = await prisma.communicationLog.findMany({
                where: {
                    customerProfileId: lead.id,
                    category: 'CONFERENCE_FOLLOWUP',
                },
                include: {
                    checklist: true,
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            const [summary] = await buildConferenceRegistrationFollowupSummary({
                companyId: registration.conference.companyId,
                registrations: [{
                    id: registration.id,
                    name: registration.name,
                    email: registration.email,
                    phone: registration.phone,
                    organization: registration.organization,
                }],
            });

            return NextResponse.json({
                registration,
                customerProfileId: lead.id,
                followups,
                analytics: summary || null,
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string; registrationId: string }> }) => {
        try {
            const { id, registrationId } = await params;
            const body = followupSchema.parse(await req.json());

            const registration = await prisma.conferenceRegistration.findUnique({
                where: { id: registrationId },
                include: {
                    conference: {
                        select: {
                            id: true,
                            title: true,
                            companyId: true,
                        },
                    },
                },
            });

            if (!registration || registration.conferenceId !== id) {
                return createErrorResponse('Registration not found', 404);
            }

            if (!registration.conference.companyId) {
                return createErrorResponse('Conference company is required for follow-up tracking', 400);
            }

            const result = await createConferenceFollowup({
                companyId: registration.conference.companyId,
                userId: user.id,
                conferenceTitle: registration.conference.title,
                registration: {
                    id: registration.id,
                    name: registration.name,
                    email: registration.email,
                    phone: registration.phone,
                    organization: registration.organization,
                },
                payload: body,
            });

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'create',
                    entity: 'conference_followup',
                    entityId: registration.id,
                    changes: JSON.stringify({
                        conferenceId: id,
                        registrationId,
                        subject: body.subject,
                        nextFollowUpDate: body.nextFollowUpDate,
                    }),
                },
            });

            return NextResponse.json({
                ok: true,
                customerProfileId: result.customerProfileId,
                predictions: result.predictions,
            }, { status: 201 });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
