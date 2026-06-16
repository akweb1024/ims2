import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const applicationId = searchParams.get('applicationId');

        if (!applicationId) return createErrorResponse('Missing applicationId', 400);

        const application = await prisma.jobApplication.findUnique({
            where: { id: applicationId },
            include: {
                jobPosting: {
                    include: { exam: true }
                },
                examAttempt: true
            }
        });

        if (!application || !application.jobPosting?.exam) {
            return createErrorResponse('Exam not found', 404);
        }

        if (application.examAttempt) {
            return createErrorResponse('Exam already attempted', 400);
        }

        const examQuestions = application.jobPosting.exam.questions;
        if (!Array.isArray(examQuestions)) {
            return createErrorResponse('Exam is misconfigured', 500);
        }

        // Return questions without correct answers
        const questions = (examQuestions as any[]).map(q => ({
            question: q.question,
            options: q.options
        }));

        return NextResponse.json({
            examId: application.jobPosting.exam.id,
            questions
        });
    } catch (error: any) {
        return createErrorResponse(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const { applicationId, answers } = await req.json(); // answers is array of indices

        if (!applicationId || typeof applicationId !== 'string') {
            return createErrorResponse('Missing applicationId', 400);
        }
        if (!Array.isArray(answers)) {
            return createErrorResponse('answers must be an array', 400);
        }

        const application = await prisma.jobApplication.findUnique({
            where: { id: applicationId },
            include: {
                jobPosting: { include: { exam: true } },
                examAttempt: true
            }
        });

        if (!application || !application.jobPosting?.exam) {
            return createErrorResponse('Exam not found', 404);
        }

        // Block re-submission: a single attempt per application. Without this an
        // attacker (or candidate) can repeatedly POST different answer sets and
        // read back the score to brute-force a passing result.
        if (application.examAttempt) {
            return createErrorResponse('Exam already attempted', 400);
        }

        const exam = application.jobPosting.exam;
        const correctAnswers = exam.questions;

        if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
            return createErrorResponse('Exam is misconfigured', 500);
        }

        let correctCount = 0;
        (correctAnswers as any[]).forEach((q, idx) => {
            if (answers[idx] === q?.correctOption) {
                correctCount++;
            }
        });

        const score = (correctCount / correctAnswers.length) * 100;
        const isPassed = score >= exam.passPercentage;

        // Persist attempt + status atomically; the examAttempt's unique applicationId
        // constraint also rejects a racing concurrent submission.
        await prisma.$transaction([
            prisma.examAttempt.create({
                data: {
                    applicationId,
                    examId: exam.id,
                    score,
                    isPassed,
                    answers: JSON.stringify(answers),
                    completedAt: new Date()
                }
            }),
            prisma.jobApplication.update({
                where: { id: applicationId },
                data: {
                    status: isPassed ? 'EXAM_PASSED' : 'EXAM_FAILED'
                }
            })
        ]);

        return NextResponse.json({ score, isPassed });
    } catch (error: any) {
        return createErrorResponse(error);
    }
}
