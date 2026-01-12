import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            // Get all enrollments for the user
            const enrollments = await prisma.courseEnrollment.findMany({
                where: { userId: user.id },
                include: {
                    course: {
                        include: {
                            _count: {
                                select: {
                                    modules: true
                                }
                            }
                        }
                    }
                },
                orderBy: { lastAccessedAt: 'desc' }
            });

            // Categorize enrollments
            const active = enrollments.filter(e => e.status === 'ACTIVE' && e.progress < 100);
            const completed = enrollments.filter(e => e.status === 'COMPLETED' || e.progress === 100);
            const dropped = enrollments.filter(e => e.status === 'DROPPED');

            // Get certificates
            const certificates = await prisma.certificate.findMany({
                where: { userId: user.id },
                include: {
                    enrollment: {
                        include: {
                            course: {
                                select: {
                                    id: true,
                                    title: true,
                                    thumbnailUrl: true
                                }
                            }
                        }
                    }
                },
                orderBy: { issuedAt: 'desc' }
            });

            // Calculate statistics
            const totalTimeSpent = await prisma.userLessonProgress.aggregate({
                where: { userId: user.id },
                _sum: { timeSpent: true }
            });

            const totalLessonsCompleted = await prisma.userLessonProgress.count({
                where: {
                    userId: user.id,
                    isCompleted: true
                }
            });

            return NextResponse.json({
                enrollments: {
                    active,
                    completed,
                    dropped,
                    total: enrollments.length
                },
                certificates,
                statistics: {
                    totalCourses: enrollments.length,
                    completedCourses: completed.length,
                    activeCourses: active.length,
                    totalLessonsCompleted,
                    totalTimeSpent: totalTimeSpent._sum.timeSpent || 0, // in seconds
                    certificatesEarned: certificates.length
                }
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
