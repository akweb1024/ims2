import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { applicationStatusToken } from '@/lib/application-status-token';
import { sendEmail, EmailTemplates } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { jobPostingId, name, email, phone, resumeUrl } = body;

        const application = await prisma.jobApplication.create({
            data: {
                jobPostingId,
                applicantName: name,
                applicantEmail: email,
                applicantPhone: phone,
                resumeUrl,
                status: 'EXAM_PENDING'
            },
            include: {
                jobPosting: { select: { title: true, exam: { select: { id: true } } } }
            }
        });

        const examLink = `/careers/exam?appId=${application.id}`;

        // Tokenized tracking link — the candidate's only handle on their
        // application status (no account is created by applying).
        const token = applicationStatusToken(application.id);
        const statusUrl = token ? `/careers/application/${application.id}?token=${token}` : null;

        // Email the exam + tracking links; the response links only survive as
        // long as the success screen stays open. Non-fatal: the application is
        // already saved, and sendEmail mock-logs when no provider is configured.
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        try {
            const template = EmailTemplates.applicationReceived(
                application.applicantName,
                application.jobPosting.title,
                application.jobPosting.exam ? `${baseUrl}${examLink}` : null,
                statusUrl ? `${baseUrl}${statusUrl}` : null,
            );
            await sendEmail({
                to: application.applicantEmail,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
        } catch (err) {
            console.error('Failed to send application-received email:', err);
        }

        const { jobPosting: _jobPosting, ...applicationData } = application;
        return NextResponse.json({ ...applicationData, examLink, statusUrl });
    } catch (error: any) {
        return createErrorResponse(error);
    }
}
