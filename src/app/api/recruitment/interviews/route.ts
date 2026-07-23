import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { companyScopeWhere } from '@/lib/company-scope';
import { sendEmail, EmailTemplates } from '@/lib/email';

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
            // Skipping this when companyId was null left no company filter at all.
            where.application = { jobPosting: { ...companyScopeWhere(user) } };

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

            const application = await prisma.jobApplication.findUnique({
                where: { id: applicationId },
                select: {
                    applicantName: true,
                    applicantEmail: true,
                    jobPosting: { select: { title: true } }
                }
            });
            if (!application) return createErrorResponse('Application not found', 404);

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
                    level: level || 1
                }
            });

            // Update application status
            await prisma.jobApplication.update({
                where: { id: applicationId },
                data: { status: 'INTERVIEW' }
            });

            // Notify the candidate (non-fatal; mock-logged when no provider is set).
            // Format in server TZ — symmetric with how the datetime-local string
            // was parsed above, so the email shows the time HR actually picked.
            try {
                const whenText = interview.scheduledAt.toLocaleString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                });
                const template = EmailTemplates.interviewScheduled(
                    application.applicantName,
                    application.jobPosting.title,
                    whenText,
                    interview.type,
                    interview.meetingLink || interview.location || null,
                );
                await sendEmail({
                    to: application.applicantEmail,
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                });
            } catch (err) {
                console.error('Failed to send interview-scheduled email:', err);
            }

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
                    rating
                }
            });

            return NextResponse.json(interview);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
