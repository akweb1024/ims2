import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const employeeId = id;

            // 1. Get the User ID associated with this Employee Profile
            const employeeProfile = await prisma.employeeProfile.findUnique({
                where: { id: employeeId },
                select: { userId: true, user: true }
            });

            if (!employeeProfile || !employeeProfile.userId) {
                return NextResponse.json({
                    courses: [],
                    conferences: [],
                    papers: [],
                    quizzes: []
                });
            }

            const userId = employeeProfile.userId;

            // 2. Fetch LMS Data
            const courseEnrollments = await prisma.courseEnrollment.findMany({
                where: { userId },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            category: true,
                            level: true,
                            thumbnailUrl: true
                        }
                    }
                },
                orderBy: { enrolledAt: 'desc' }
            });

            const quizAttempts = await prisma.quizAttempt.findMany({
                where: { userId },
                include: {
                    quiz: {
                        select: {
                            title: true,
                            lesson: {
                                select: {
                                    module: {
                                        select: {
                                            course: { select: { title: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { attemptedAt: 'desc' },
                take: 10
            });

            // 3. Fetch Conference Data
            const conferenceRegistrations = await prisma.conferenceRegistration.findMany({
                where: { userId },
                include: {
                    conference: {
                        select: {
                            id: true,
                            title: true,
                            startDate: true,
                            endDate: true,
                            mode: true,
                            status: true
                        }
                    },
                    ticketType: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            const papers = await prisma.conferencePaper.findMany({
                where: { userId },
                include: {
                    conference: { select: { title: true } },
                    track: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            // 4. Construct Response
            return NextResponse.json({
                courses: courseEnrollments.map(e => ({
                    id: e.courseId,
                    title: e.course.title,
                    category: e.course.category,
                    level: e.course.level,
                    thumbnailUrl: e.course.thumbnailUrl,
                    progress: e.progress,
                    status: e.status,
                    enrolledAt: e.enrolledAt,
                    completedAt: e.completedAt,
                    certificateUrl: e.certificateUrl
                })),
                conferences: conferenceRegistrations.map(r => ({
                    id: r.conferenceId,
                    title: r.conference.title,
                    startDate: r.conference.startDate,
                    endDate: r.conference.endDate,
                    mode: r.conference.mode,
                    ticketType: r.ticketType.name,
                    status: r.status,
                    registrationId: r.id
                })),
                papers: papers.map(p => ({
                    id: p.id,
                    title: p.title,
                    conference: p.conference.title,
                    track: p.track?.name,
                    status: p.status,
                    submissionType: p.submissionType,
                    reviewStatus: p.reviewStatus,
                    submittedAt: p.createdAt
                })),
                recentQuizzes: quizAttempts.map(q => ({
                    id: q.id,
                    quizTitle: q.quiz.title,
                    courseTitle: q.quiz.lesson.module.course.title,
                    score: q.score,
                    passed: q.passed,
                    date: q.attemptedAt
                }))
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
