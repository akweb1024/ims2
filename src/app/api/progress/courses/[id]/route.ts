import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: courseId } = params;

            // Get enrollment
            const enrollment = await prisma.courseEnrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId: user.id,
                        courseId
                    }
                }
            });

            if (!enrollment) {
                return createErrorResponse('Not enrolled in this course', 404);
            }

            // Get all lessons progress
            const lessonsProgress = await prisma.userLessonProgress.findMany({
                where: {
                    userId: user.id,
                    lesson: {
                        module: {
                            courseId
                        }
                    }
                },
                include: {
                    lesson: {
                        select: {
                            id: true,
                            title: true,
                            moduleId: true,
                            order: true
                        }
                    }
                }
            });

            // Get course structure
            const course = await prisma.course.findUnique({
                where: { id: courseId },
                include: {
                    modules: {
                        include: {
                            lessons: {
                                select: {
                                    id: true,
                                    title: true,
                                    order: true,
                                    duration: true
                                },
                                orderBy: { order: 'asc' }
                            }
                        },
                        orderBy: { order: 'asc' }
                    }
                }
            });

            // Calculate statistics
            const totalLessons = course?.modules.reduce((sum, m) => sum + m.lessons.length, 0) || 0;
            const completedLessons = lessonsProgress.filter(p => p.isCompleted).length;
            const totalTimeSpent = lessonsProgress.reduce((sum, p) => sum + p.timeSpent, 0);

            return NextResponse.json({
                enrollment,
                progress: {
                    totalLessons,
                    completedLessons,
                    percentage: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
                    totalTimeSpent, // in seconds
                    lessonsProgress
                },
                course: {
                    id: course?.id,
                    title: course?.title,
                    modules: course?.modules
                }
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
