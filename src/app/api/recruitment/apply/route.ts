import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { applicationStatusToken } from '@/lib/application-status-token';
import { sendEmail, EmailTemplates } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { jobPostingId, name, email, phone, resumeUrl } = body;

        // Look up the job (and whether it has an exam) up front: the exam decides
        // the starting status, and this doubles as an existence check — a bad
        // jobPostingId used to surface as an opaque FK error on create.
        const job = await prisma.jobPosting.findUnique({
            where: { id: jobPostingId },
            select: { title: true, exam: { select: { id: true } } },
        });
        if (!job) return createErrorResponse('Job posting not found', 404);
        const hasExam = !!job.exam;

        const application = await prisma.jobApplication.create({
            data: {
                jobPostingId,
                applicantName: name,
                applicantEmail: email,
                applicantPhone: phone,
                resumeUrl,
                // Only route through the exam when the job actually has one; otherwise
                // the candidate would sit at EXAM_PENDING forever with nothing to take.
                status: hasExam ? 'EXAM_PENDING' : 'APPLIED'
            }
        });

        const examLink = hasExam ? `/careers/exam?appId=${application.id}` : null;

        // Tokenized tracking link — the candidate's only handle on their
        // application status (no account is created by applying).
        const token = applicationStatusToken(application.id);
        const statusUrl = token ? `/careers/application/${application.id}?token=${token}` : null;

        // Email the (optional) exam + tracking links; the response links only survive
        // as long as the success screen stays open. Non-fatal: the application is
        // already saved, and sendEmail mock-logs when no provider is configured.
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        try {
            const template = EmailTemplates.applicationReceived(
                application.applicantName,
                job.title,
                examLink ? `${baseUrl}${examLink}` : null,
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

        return NextResponse.json({ ...application, examLink, statusUrl, hasExam });
    } catch (error: any) {
        return createErrorResponse(error);
    }
}
