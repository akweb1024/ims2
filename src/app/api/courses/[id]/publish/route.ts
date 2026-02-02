import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            // Check if course has at least one module with lessons
            const course = await prisma.course.findUnique({
                where: { id },
                include: {
                    modules: {
                        include: {
                            lessons: true
                        }
                    }
                }
            });

            if (!course) {
                return createErrorResponse('Course not found', 404);
            }

            // Validation: Must have at least one module with lessons
            if (course.modules.length === 0) {
                return createErrorResponse('Cannot publish: Course must have at least one module', 400);
            }

            const hasLessons = course.modules.some(m => m.lessons.length > 0);
            if (!hasLessons) {
                logger.warn('Publish validation failed for course: No lessons found', { courseId: id });
                return createErrorResponse('Cannot publish: Modules must have at least one lesson', 400);
            }

            logger.info('Publishing course', { courseId: id });
            // Publish the course
            const updated = await prisma.course.update({
                where: { id },
                data: { isPublished: true }
            });

            return NextResponse.json({
                success: true,
                course: updated,
                message: 'Course published successfully'
            });

        } catch (error) {
            logger.error('API Course Publish Error', error, { courseId: (await params).id });
            return createErrorResponse(error);
        }
    }
);
