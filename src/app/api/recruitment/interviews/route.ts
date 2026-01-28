import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const applicationId = searchParams.get('applicationId');

            const where: any = {};
            if (applicationId) where.applicationId = applicationId;

            // To filter by company, we need to join the application -> job -> company
            // Or use the interviewer's company if they are internal
            if (user.companyId) {
                where.application = { jobPosting: { companyId: user.companyId } };
            }

            const interviews = await prisma.recruitmentInterview.findMany({
                where,
                include: {
                    application: { select: { applicantName: true, jobPosting: { select: { title: true } } } },
                    interviewer: { select: { name: true } }
                },
                orderBy: { scheduledAt: 'asc' }
            });

            return NextResponse.json(interviews);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { applicationId, interviewerId, scheduledAt, duration, type, meetingLink, location, roundName, level } = body;

            if (!applicationId || !interviewerId || !scheduledAt) {
                return createErrorResponse('Missing required fields', 400);
            }

            const interview = await prisma.recruitmentInterview.create({
                data: {
                    applicationId,
                    interviewerId,
                    scheduledAt: new Date(scheduledAt),
                    duration: duration || 30,
                    type: type || 'VIRTUAL',
                    meetingLink,
                    location,
                    status: 'SCHEDULED',
                    level: level || 1,
                    roundName: roundName || 'HR Round'
                }
            });

            // Update application status
            await prisma.jobApplication.update({
                where: { id: applicationId },
                data: { status: 'INTERVIEW' }
            });

            return NextResponse.json(interview);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, status, feedback, rating, screenerData } = body;

            if (!id) return createErrorResponse('Interview ID required', 400);

            const interview = await prisma.recruitmentInterview.update({
                where: { id },
                data: {
                    status,
                    feedback,
                    rating,
                    screenerData
                }
            });

            return NextResponse.json(interview);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
