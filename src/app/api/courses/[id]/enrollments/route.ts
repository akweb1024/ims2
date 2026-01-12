import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: courseId } = params;

            const enrollments = await prisma.courseEnrollment.findMany({
                where: { courseId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { enrolledAt: 'desc' }
            });

            return NextResponse.json(enrollments);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: courseId } = params;
            const body = await req.json();
            const { userIds } = body; // Array of user IDs for bulk enrollment

            if (!Array.isArray(userIds) || userIds.length === 0) {
                return createErrorResponse('userIds must be a non-empty array', 400);
            }

            // Check if course exists
            const course = await prisma.course.findUnique({
                where: { id: courseId }
            });

            if (!course) {
                return createErrorResponse('Course not found', 404);
            }

            // Bulk create enrollments (skip if already enrolled)
            const enrollments = await Promise.all(
                userIds.map(async (userId: string) => {
                    try {
                        return await prisma.courseEnrollment.create({
                            data: {
                                courseId,
                                userId,
                                status: 'ACTIVE'
                            },
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        });
                    } catch (error: any) {
                        // Skip if already enrolled (unique constraint)
                        if (error.code === 'P2002') {
                            return null;
                        }
                        throw error;
                    }
                })
            );

            const successfulEnrollments = enrollments.filter(e => e !== null);

            return NextResponse.json({
                success: true,
                enrolled: successfulEnrollments.length,
                total: userIds.length,
                enrollments: successfulEnrollments
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
