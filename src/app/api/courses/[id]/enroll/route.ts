import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// Self-enrollment endpoint for students
export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const courseId = id;

            // Check if course exists and is published
            const course = await prisma.course.findUnique({
                where: { id: courseId }
            });

            if (!course) {
                return createErrorResponse('Course not found', 404);
            }

            if (!course.isPublished) {
                return createErrorResponse('This course is not available for enrollment', 400);
            }

            // Check if already enrolled
            const existing = await prisma.courseEnrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId: user.id,
                        courseId
                    }
                }
            });

            if (existing) {
                return NextResponse.json({
                    success: false,
                    message: 'You are already enrolled in this course',
                    enrollment: existing
                });
            }

            // For paid courses, you might want to check payment here
            // For now, we'll allow free enrollment
            if (course.price > 0) {
                // TODO: Implement payment verification
                return createErrorResponse('Payment required for this course', 402);
            }

            // Create enrollment
            const enrollment = await prisma.courseEnrollment.create({
                data: {
                    courseId,
                    userId: user.id,
                    status: 'ACTIVE'
                },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            thumbnailUrl: true
                        }
                    }
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Successfully enrolled in the course',
                enrollment
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
