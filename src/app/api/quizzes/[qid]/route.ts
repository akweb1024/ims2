import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ qid: string }> }, user) => {
        try {
            const params = await context.params;
            const { qid: quizId } = params;

            const quiz = await prisma.quiz.findUnique({
                where: { id: quizId },
                include: {
                    questions: {
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            question: true,
                            type: true,
                            options: true,
                            explanation: true,
                            points: true,
                            order: true
                            // Don't include correctAnswer for students
                        }
                    },
                    lesson: {
                        include: {
                            module: {
                                include: {
                                    course: true
                                }
                            }
                        }
                    }
                }
            });

            if (!quiz) {
                return createErrorResponse('Quiz not found', 404);
            }

            // Get user's attempts
            const attempts = await prisma.quizAttempt.findMany({
                where: {
                    quizId,
                    userId: user.id
                },
                orderBy: { attemptedAt: 'desc' }
            });

            return NextResponse.json({
                ...quiz,
                userAttempts: attempts.length,
                canAttempt: attempts.length < quiz.maxAttempts,
                bestScore: attempts.length > 0
                    ? Math.max(...attempts.map(a => a.score))
                    : null
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ qid: string }> }, user) => {
        try {
            const params = await context.params;
            const { qid: quizId } = params;
            const body = await req.json();
            const { answers, timeSpent } = body; // answers: { questionId: answer }

            // Get quiz with questions
            const quiz = await prisma.quiz.findUnique({
                where: { id: quizId },
                include: {
                    questions: true
                }
            });

            if (!quiz) {
                return createErrorResponse('Quiz not found', 404);
            }

            // Check attempt limit
            const previousAttempts = await prisma.quizAttempt.count({
                where: {
                    quizId,
                    userId: user.id
                }
            });

            if (previousAttempts >= quiz.maxAttempts) {
                return createErrorResponse('Maximum attempts reached', 400);
            }

            // Grade the quiz
            let totalPoints = 0;
            let earnedPoints = 0;

            quiz.questions.forEach(question => {
                totalPoints += question.points;
                const userAnswer = answers[question.id];

                if (userAnswer && userAnswer.toString().toLowerCase() === question.correctAnswer.toLowerCase()) {
                    earnedPoints += question.points;
                }
            });

            const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
            const passed = score >= quiz.passingScore;

            // Save attempt
            const attempt = await prisma.quizAttempt.create({
                data: {
                    quizId,
                    userId: user.id,
                    score,
                    passed,
                    answers,
                    timeSpent: timeSpent || null
                }
            });

            // If passed, mark lesson as complete
            if (passed) {
                await prisma.userLessonProgress.upsert({
                    where: {
                        userId_lessonId: {
                            userId: user.id,
                            lessonId: quiz.lessonId
                        }
                    },
                    update: {
                        isCompleted: true,
                        completedAt: new Date()
                    },
                    create: {
                        userId: user.id,
                        lessonId: quiz.lessonId,
                        isCompleted: true,
                        completedAt: new Date()
                    }
                });
            }

            // Return results with correct answers if showAnswers is true
            const results = {
                attempt,
                score,
                passed,
                earnedPoints,
                totalPoints,
                correctAnswers: quiz.showAnswers ? quiz.questions.map(q => ({
                    questionId: q.id,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation
                })) : null
            };

            return NextResponse.json(results);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
