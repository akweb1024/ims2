import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ lid: string }> }) => {
        try {
            const params = await context.params;
            const { lid: lessonId } = params;

            const quizzes = await prisma.quiz.findMany({
                where: { lessonId },
                include: {
                    questions: {
                        orderBy: { order: 'asc' }
                    },
                    _count: {
                        select: { questions: true, attempts: true }
                    }
                }
            });

            return NextResponse.json(quizzes);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, context: { params: Promise<{ lid: string }> }) => {
        try {
            const params = await context.params;
            const { lid: lessonId } = params;
            const body = await req.json();
            const {
                title,
                description,
                passingScore,
                timeLimit,
                maxAttempts,
                shuffleQuestions,
                showAnswers,
                questions
            } = body;

            // Create quiz with questions
            const quiz = await prisma.quiz.create({
                data: {
                    lessonId,
                    title,
                    description,
                    passingScore: passingScore || 70,
                    timeLimit: timeLimit ? parseInt(timeLimit) : null,
                    maxAttempts: maxAttempts || 3,
                    shuffleQuestions: shuffleQuestions || false,
                    showAnswers: showAnswers !== false,
                    questions: {
                        create: questions?.map((q: any, idx: number) => ({
                            question: q.question,
                            type: q.type || 'MULTIPLE_CHOICE',
                            options: q.options || null,
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation,
                            points: q.points || 1,
                            order: idx + 1
                        })) || []
                    }
                },
                include: {
                    questions: true
                }
            });

            return NextResponse.json(quiz);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
