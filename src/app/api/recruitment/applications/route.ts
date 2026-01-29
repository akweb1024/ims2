import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const formData = await req.formData();
            const jobId = formData.get('jobId') as string;
            const candidateName = formData.get('name') as string;
            const candidateEmail = formData.get('email') as string;
            const candidatePhone = formData.get('phone') as string;
            // File upload logic would go here, currently expecting URL or simplified string if mocking
            const resumeUrl = formData.get('resumeUrl') as string;

            if (!jobId || !candidateName || !candidateEmail) {
                return createErrorResponse('Missing required fields', 400);
            }

            // Simulate AI Matching (Mock Logic)
            const aiMatchScore = Math.floor(Math.random() * (98 - 60 + 1) + 60); // Random score between 60-98
            const potentialTags = ['Strong Tech', 'Culture Fit', 'Senior Level', 'Remote', 'Leadership Potential', 'Fast Learner'];
            const aiTags = potentialTags.sort(() => 0.5 - Math.random()).slice(0, 2);

            const application = await prisma.jobApplication.create({
                data: {
                    jobPostingId: jobId,
                    applicantName: candidateName,
                    applicantEmail: candidateEmail,
                    applicantPhone: candidatePhone,
                    resumeUrl,
                    status: 'APPLIED',
                    aiMatchScore,
                    aiTags
                }
            });

            return NextResponse.json(application);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const jobId = searchParams.get('jobId');

            const where: any = {};
            // Simplified check based on updated schema where JobApplication has companyId directly?
            // Checking schema above... yes added companyId to JobApplication.
            if (user.companyId) {
                where.jobPosting = { companyId: user.companyId };
            }

            if (jobId) where.jobPostingId = jobId;

            const applications = await prisma.jobApplication.findMany({
                where,
                include: {
                    jobPosting: { select: { title: true, companyId: true } },
                    interviews: {
                        orderBy: { scheduledAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(applications);
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
            const { id, status, currentStage, rating, notes } = body;

            if (!id) return createErrorResponse('Application ID required', 400);

            const updateData: any = {};
            if (status) updateData.status = status;
            if (currentStage) updateData.currentStage = currentStage;
            if (rating) updateData.rating = rating;
            if (notes) updateData.notes = notes;

            const application = await prisma.jobApplication.update({
                where: { id },
                data: updateData
            });

            return NextResponse.json(application);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
