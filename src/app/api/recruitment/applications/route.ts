import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER'],
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

            const application = await prisma.jobApplication.create({
                data: {
                    jobId,
                    candidateName,
                    candidateEmail,
                    candidatePhone,
                    resumeUrl,
                    status: 'APPLIED',
                    status: 'APPLIED'
                }
            });

            return NextResponse.json(application);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER'],
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

            if (jobId) where.jobId = jobId;

            const applications = await prisma.jobApplication.findMany({
                where,
                include: {
                    jobPosting: { select: { title: true, companyId: true } }
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
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER'],
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
