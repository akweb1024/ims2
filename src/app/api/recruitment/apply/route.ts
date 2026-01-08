import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

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

        return NextResponse.json({ ...application, examLink });
    } catch (error: any) {
        return createErrorResponse(error);
    }
}
