import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import {
    createConferenceManagementFollowup,
    getConferenceManagementFollowups,
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
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const { searchParams } = new URL(req.url);
            const page = Number.parseInt(searchParams.get('page') || '1', 10);
            const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);

            const conference = await prisma.conference.findUnique({
                where: { id },
                select: {
                    id: true,
                    title: true,
                    organizer: true,
                    companyId: true,
                    status: true,
                    startDate: true,
                    endDate: true,
                    _count: {
                        select: {
                            registrations: true,
                            papers: true,
                        },
                    },
                },
            });

            if (!conference) {
                return createErrorResponse('Conference not found', 404);
            }

            if (!conference.companyId) {
                return NextResponse.json({
                    conference,
                    customerProfileId: null,
                    followups: [],
                    summary: null,
                });
            }

            const result = await getConferenceManagementFollowups({
                conferenceId: conference.id,
                companyId: conference.companyId,
                conferenceTitle: conference.title,
                organizer: conference.organizer,
                page,
                pageSize,
            });

            return NextResponse.json({
                conference,
                customerProfileId: result.customerProfileId,
                followups: result.followups,
                pagination: result.pagination,
                summary: result.summary,
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = followupSchema.parse(await req.json());

            const conference = await prisma.conference.findUnique({
                where: { id },
                select: {
                    id: true,
                    title: true,
                    organizer: true,
                    companyId: true,
                },
            });

            if (!conference) {
                return createErrorResponse('Conference not found', 404);
            }

            if (!conference.companyId) {
                return createErrorResponse('Conference company is required for follow-up tracking', 400);
            }

            const result = await createConferenceManagementFollowup({
                conferenceId: conference.id,
                companyId: conference.companyId,
                userId: user.id,
                conferenceTitle: conference.title,
                organizer: conference.organizer,
                payload: body,
            });

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'create',
                    entity: 'conference_management_followup',
                    entityId: conference.id,
                    changes: JSON.stringify({
                        conferenceId: conference.id,
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
