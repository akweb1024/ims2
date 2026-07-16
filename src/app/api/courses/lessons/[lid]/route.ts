import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ lid: string }> }) => {
        try {
            const { lid } = await params;

            const lesson = await prisma.courseLesson.findUnique({
                where: { id: lid },
                include: {
                    module: {
                        include: {
                            course: true
                        }
                    },
                    progress: {
                        where: { userId: user.id }
                    },
                    // Questions (and their correctAnswer) must never reach the
                    // learner here — the quiz player fetches them from
                    // /api/quizzes/[qid], which strips answers and grades server-side.
                    quizzes: {
                        select: {
                            id: true,
                            title: true,
                            passingScore: true,
                            maxAttempts: true,
                            _count: {
                                select: { questions: true }
                            }
                        }
                    }
                }
            });

            if (!lesson) {
                return createErrorResponse('Lesson not found', 404);
            }

            return NextResponse.json(lesson);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ lid: string }> }) => {
        try {
            const { lid } = await params;
            const body = await req.json();

            const lesson = await prisma.courseLesson.update({
                where: { id: lid },
                data: body
            });

            return NextResponse.json(lesson);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ lid: string }> }) => {
        try {
            const { lid } = await params;

            await prisma.courseLesson.delete({
                where: { id: lid }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
