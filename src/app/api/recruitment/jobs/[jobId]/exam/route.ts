import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { authorizedRoute } from '@/lib/middleware-auth';

// GET: Fetch exam for a specific job
export const GET = authorizedRoute(['HR', 'HR_MANAGER', 'ADMIN'], async (req: NextRequest, user: any, context: any) => {
    try {
        const { jobId } = context.params;

        const exam = await prisma.recruitmentExam.findUnique({
            where: { jobPostingId: jobId }
        });

        return NextResponse.json(exam || null);
    } catch (error) {
        return createErrorResponse(error);
    }
});

// POST: Create or Update exam for a job
export const POST = authorizedRoute(['HR', 'HR_MANAGER', 'ADMIN'], async (req: NextRequest, user: any, context: any) => {
    try {
        const { jobId } = context.params;
        const body = await req.json();
        const { questions, timeLimit, passPercentage } = body;

        if (!Array.isArray(questions) || questions.length === 0) {
            return createErrorResponse('At least one question is required', 400);
        }

        // Validate questions structure
        for (const q of questions) {
            if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
                return createErrorResponse('Invalid question format. Must have text and at least 2 options.', 400);
            }
            if (typeof q.correctOption !== 'number' || q.correctOption < 0 || q.correctOption >= q.options.length) {
                return createErrorResponse('Invalid correct option index.', 400);
            }
        }

        const exam = await prisma.recruitmentExam.upsert({
            where: { jobPostingId: jobId },
            update: {
                questions,
                timeLimit: Number(timeLimit),
                passPercentage: Number(passPercentage)
            },
            create: {
                jobPostingId: jobId,
                questions,
                timeLimit: Number(timeLimit),
                passPercentage: Number(passPercentage)
            }
        });

        return NextResponse.json(exam);
    } catch (error) {
        return createErrorResponse(error);
    }
});

// DELETE: Remove exam from a job
export const DELETE = authorizedRoute(['HR', 'HR_MANAGER', 'ADMIN'], async (req: NextRequest, user: any, context: any) => {
    try {
        const { jobId } = context.params;

        await prisma.recruitmentExam.delete({
            where: { jobPostingId: jobId }
        });

        return NextResponse.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        return createErrorResponse(error);
    }
});
