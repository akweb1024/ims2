import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/reviewer/dashboard - Get reviewer dashboard data
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any) => {
        try {
            // Get reviewer profiles for this user
            const reviewerProfiles = await prisma.journalReviewer.findMany({
                where: {
                    userId: user.id,
                    isActive: true
                },
                include: {
                    journal: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (reviewerProfiles.length === 0) {
                return NextResponse.json({
                    isReviewer: false,
                    message: 'You are not registered as a reviewer for any journal'
                });
            }

            const reviewerIds = reviewerProfiles.map(r => r.id);

            // Get assignments statistics
            const [
                pendingAssignments,
                inProgressAssignments,
                submittedAssignments,
                validatedAssignments,
                totalCertificates,
                recentAssignments
            ] = await Promise.all([
                prisma.reviewAssignment.count({
                    where: {
                        reviewerId: { in: reviewerIds },
                        status: 'PENDING'
                    }
                }),
                prisma.reviewAssignment.count({
                    where: {
                        reviewerId: { in: reviewerIds },
                        status: 'IN_PROGRESS'
                    }
                }),
                prisma.reviewAssignment.count({
                    where: {
                        reviewerId: { in: reviewerIds },
                        status: 'SUBMITTED'
                    }
                }),
                prisma.reviewAssignment.count({
                    where: {
                        reviewerId: { in: reviewerIds },
                        status: 'VALIDATED'
                    }
                }),
                prisma.reviewCertificate.count({
                    where: {
                        reviewerId: { in: reviewerIds }
                    }
                }),
                prisma.reviewAssignment.findMany({
                    where: {
                        reviewerId: { in: reviewerIds }
                    },
                    include: {
                        article: {
                            select: {
                                id: true,
                                title: true,
                                status: true
                            }
                        },
                        reviewer: {
                            include: {
                                journal: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        },
                        report: {
                            select: {
                                id: true,
                                isValidated: true,
                                submittedDate: true
                            }
                        }
                    },
                    orderBy: { assignedDate: 'desc' },
                    take: 10
                })
            ]);

            // Get overdue assignments
            const overdueAssignments = await prisma.reviewAssignment.count({
                where: {
                    reviewerId: { in: reviewerIds },
                    status: { in: ['PENDING', 'IN_PROGRESS'] },
                    dueDate: { lt: new Date() }
                }
            });

            // Get recommendations distribution
            const recommendationStats = await prisma.reviewReport.groupBy({
                by: ['recommendation'],
                where: {
                    assignment: {
                        reviewerId: { in: reviewerIds }
                    }
                },
                _count: {
                    _all: true
                }
            });

            // Get monthly submission trends (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const monthlySubmissions = await prisma.reviewReport.findMany({
                where: {
                    assignment: { reviewerId: { in: reviewerIds } },
                    submittedDate: { gte: sixMonthsAgo }
                },
                select: { submittedDate: true }
            });

            const activityTrend = monthlySubmissions.reduce((acc: any, curr) => {
                const month = curr.submittedDate.toLocaleString('default', { month: 'short' });
                acc[month] = (acc[month] || 0) + 1;
                return acc;
            }, {});

            const upcomingDeadlines = await prisma.reviewAssignment.findMany({
                where: {
                    reviewerId: { in: reviewerIds },
                    status: { in: ['PENDING', 'IN_PROGRESS'] },
                    dueDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    }
                },
                include: {
                    article: {
                        select: {
                            id: true,
                            title: true
                        }
                    },
                    reviewer: {
                        include: {
                            journal: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: { dueDate: 'asc' }
            });

            return NextResponse.json({
                isReviewer: true,
                reviewerProfiles,
                statistics: {
                    pending: pendingAssignments,
                    inProgress: inProgressAssignments,
                    submitted: submittedAssignments,
                    validated: validatedAssignments,
                    total: pendingAssignments + inProgressAssignments + submittedAssignments + validatedAssignments,
                    certificates: totalCertificates,
                    overdue: overdueAssignments,
                    recommendations: recommendationStats.map(r => ({
                        type: r.recommendation,
                        count: r._count._all
                    })),
                    activityTrend: Object.entries(activityTrend).map(([month, count]) => ({ month, count }))
                },
                recentAssignments,
                upcomingDeadlines
            });
        } catch (error) {
            console.error('Reviewer Dashboard Error:', error);
            return createErrorResponse(error);
        }
    }
);
