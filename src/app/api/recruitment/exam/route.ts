import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const applicationId = searchParams.get('applicationId');

        if (!applicationId) return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });

        const application = await prisma.jobApplication.findUnique({
            where: { id: applicationId },
            include: {
                jobPosting: {
                    include: { exam: true }
                },
                examAttempt: true
            }
        });

        if (!application || !application.jobPosting.exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        if (application.examAttempt) {
            return NextResponse.json({ error: 'Exam already attempted', score: application.examAttempt.score }, { status: 400 });
        }

        // Return questions without correct answers
        const questions = (application.jobPosting.exam.questions as any[]).map(q => ({
            question: q.question,
            options: q.options
        }));

        return NextResponse.json({
            examId: application.jobPosting.exam.id,
            questions
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { applicationId, answers } = await req.json(); // answers is array of indices

        const application = await prisma.jobApplication.findUnique({
            where: { id: applicationId },
            include: { jobPosting: { include: { exam: true } } }
        });

        if (!application || !application.jobPosting.exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        const exam = application.jobPosting.exam;
        const correctAnswers = exam.questions as any[];

        let correctCount = 0;
        answers.forEach((ans: number, idx: number) => {
            if (ans === correctAnswers[idx]?.correctOption) {
                correctCount++;
            }
        });

        const score = (correctCount / correctAnswers.length) * 100;
        const isPassed = score >= exam.passPercentage;

        const attempt = await prisma.examAttempt.create({
            data: {
                applicationId,
                examId: exam.id,
                score,
                isPassed,
                answers: JSON.stringify(answers),
                completedAt: new Date()
            }
        });

        await prisma.jobApplication.update({
            where: { id: applicationId },
            data: {
                status: isPassed ? 'EXAM_PASSED' : 'EXAM_FAILED'
            }
        });

        return NextResponse.json({ score, isPassed });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
