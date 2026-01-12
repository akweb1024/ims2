import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ lid: string }> }, user) => {
        try {
            const params = await context.params;
            const { lid: lessonId } = params;

            const progress = await prisma.userLessonProgress.findUnique({
                where: {
                    userId_lessonId: {
                        userId: user.id,
                        lessonId
                    }
                }
            });

            return NextResponse.json(progress || {
                lessonId,
                userId: user.id,
                isCompleted: false,
                lastPosition: 0,
                timeSpent: 0
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ lid: string }> }, user) => {
        try {
            const params = await context.params;
            const { lid: lessonId } = params;
            const body = await req.json();
            const { lastPosition, isCompleted, timeSpent } = body;

            // Upsert progress
            const progress = await prisma.userLessonProgress.upsert({
                where: {
                    userId_lessonId: {
                        userId: user.id,
                        lessonId
                    }
                },
                update: {
                    lastPosition: lastPosition !== undefined ? lastPosition : undefined,
                    isCompleted: isCompleted !== undefined ? isCompleted : undefined,
                    timeSpent: timeSpent !== undefined ? timeSpent : undefined,
                    completedAt: isCompleted ? new Date() : undefined
                },
                create: {
                    userId: user.id,
                    lessonId,
                    lastPosition: lastPosition || 0,
                    isCompleted: isCompleted || false,
                    timeSpent: timeSpent || 0,
                    completedAt: isCompleted ? new Date() : null
                }
            });

            // Update course enrollment progress
            const lesson = await prisma.courseLesson.findUnique({
                where: { id: lessonId },
                include: {
                    module: {
                        include: {
                            course: {
                                include: {
                                    modules: {
                                        include: {
                                            lessons: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (lesson) {
                const courseId = lesson.module.course.id;
                const totalLessons = lesson.module.course.modules.reduce(
                    (sum, m) => sum + m.lessons.length,
                    0
                );

                const completedLessons = await prisma.userLessonProgress.count({
                    where: {
                        userId: user.id,
                        isCompleted: true,
                        lesson: {
                            module: {
                                courseId
                            }
                        }
                    }
                });

                const progressPercentage = totalLessons > 0
                    ? (completedLessons / totalLessons) * 100
                    : 0;

                await prisma.courseEnrollment.updateMany({
                    where: {
                        userId: user.id,
                        courseId
                    },
                    data: {
                        progress: progressPercentage,
                        lastAccessedAt: new Date(),
                        completedAt: progressPercentage === 100 ? new Date() : null,
                        status: progressPercentage === 100 ? 'COMPLETED' : 'ACTIVE'
                    }
                });
            }

            return NextResponse.json({
                success: true,
                progress
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
