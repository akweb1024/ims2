import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { applicationCommunicationSchema, applicationCommunicationReviewSchema } from '@/lib/validators/hr';

const RECRUITMENT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'];

// GET /api/recruitment/applications/[id]/communications
// Communication history + follow-ups for one candidate application.
export const GET = authorizedRoute(
    RECRUITMENT_ROLES,
    async (_req: NextRequest, _user, props: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await props.params;
            const communications = await prisma.applicationCommunication.findMany({
                where: { applicationId: id },
                include: { user: { select: { name: true, email: true } } },
                orderBy: { date: 'desc' },
            });
            return NextResponse.json({ communications });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST — HR logs a call/email/meeting with the candidate, optionally
// scheduling the next follow-up (same shape as the CRM communication log).
export const POST = authorizedRoute(
    RECRUITMENT_ROLES,
    async (req: NextRequest, user, props: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await props.params;
            const parsed = applicationCommunicationSchema.safeParse(await req.json());
            if (!parsed.success) return createErrorResponse(parsed.error);

            const application = await prisma.jobApplication.findUnique({ where: { id }, select: { id: true } });
            if (!application) return createErrorResponse('Application not found', 404);

            const communication = await prisma.applicationCommunication.create({
                data: {
                    applicationId: id,
                    userId: user.id,
                    type: parsed.data.type,
                    subject: parsed.data.subject,
                    notes: parsed.data.notes,
                    outcome: parsed.data.outcome,
                    nextFollowUpDate: parsed.data.nextFollowUpDate ? new Date(parsed.data.nextFollowUpDate) : null,
                },
                include: { user: { select: { name: true, email: true } } },
            });

            return NextResponse.json({ communication });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// PATCH — mark a follow-up as completed (or reopen it).
export const PATCH = authorizedRoute(
    RECRUITMENT_ROLES,
    async (req: NextRequest, _user, props: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await props.params;
            const parsed = applicationCommunicationReviewSchema.safeParse(await req.json());
            if (!parsed.success) return createErrorResponse(parsed.error);

            const existing = await prisma.applicationCommunication.findFirst({
                where: { id: parsed.data.communicationId, applicationId: id },
                select: { id: true },
            });
            if (!existing) return createErrorResponse('Communication not found', 404);

            const communication = await prisma.applicationCommunication.update({
                where: { id: existing.id },
                data: { isFollowUpCompleted: parsed.data.isFollowUpCompleted },
                include: { user: { select: { name: true, email: true } } },
            });

            return NextResponse.json({ communication });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
