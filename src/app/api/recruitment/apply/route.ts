import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { applicationStatusToken } from '@/lib/application-status-token';

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
            }
        });

        // Generate Mock Exam Link (In real app, this would be emailed)
        const examLink = `/careers/exam?appId=${application.id}`;

        // Tokenized tracking link — the candidate's only handle on their
        // application status (no account is created by applying).
        const token = applicationStatusToken(application.id);
        const statusUrl = token ? `/careers/application/${application.id}?token=${token}` : null;

        return NextResponse.json({ ...application, examLink, statusUrl });
    } catch (error: any) {
        return createErrorResponse(error);
    }
}
