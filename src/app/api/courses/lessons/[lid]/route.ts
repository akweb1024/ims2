import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ lid: string }> }, user) => {
        try {
            const params = await context.params;
            const { lid } = params;

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
                    quizzes: {
                        include: {
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
    async (req: NextRequest, context: { params: Promise<{ lid: string }> }) => {
        try {
            const params = await context.params;
            const { lid } = params;
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
    async (req: NextRequest, context: { params: Promise<{ lid: string }> }) => {
        try {
            const params = await context.params;
            const { lid } = params;

            await prisma.courseLesson.delete({
                where: { id: lid }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
