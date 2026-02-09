/**
 * Unified Performance & KPI API
 * 
 * Cross-company performance and KPI viewing for managers.
 * Allows managers to view KPIs and performance reviews for all team members.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getManagerTeamUserIds } from '@/lib/team-auth';
import { getUnifiedPerformance } from '@/lib/team-service';

/**
 * GET /api/manager/team/performance
 * 
 * Get unified performance and KPI data across all team members
 * 
 * Query params:
 * - userId (optional): Filter by specific team member
 * - companyId (optional): Filter by company
 * - period (optional): Filter by period (monthly, quarterly, yearly)
 */
export const GET = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const userId = searchParams.get('userId') || undefined;
            const companyId = searchParams.get('companyId') || undefined;
            const period = searchParams.get('period') || undefined;

            // Get all team member user IDs
            const allowedUserIds = await getManagerTeamUserIds(user.id, companyId);

            // Filter by specific user if provided
            const targetUserIds = userId ? [userId] : allowedUserIds;

            // Verify user has access if specific userId requested
            if (userId && !allowedUserIds.includes(userId)) {
                return createErrorResponse('Forbidden: User not in your team', 403);
            }

            // Get users with employee profiles, KPIs, and performance reviews
            const users = await prisma.user.findMany({
                where: {
                    id: { in: targetUserIds.filter(id => id !== user.id) } // Exclude manager themselves
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    employeeProfile: {
                        select: {
                            id: true,
                            designation: true,
                            kpis: {
                                where: period ? { period } : {},
                                select: {
                                    id: true,
                                    title: true,
                                    target: true,
                                    current: true,
                                    period: true,
                                    category: true,
                                    createdAt: true
                                },
                                orderBy: { createdAt: 'desc' },
                                take: 20
                            },
                            performanceReviews: {
                                select: {
                                    id: true,
                                    period: true,
                                    rating: true,
                                    feedback: true,
                                    createdAt: true,
                                    reviewer: {
                                        select: {
                                            name: true,
                                            email: true
                                        }
                                    }
                                },
                                orderBy: { createdAt: 'desc' },
                                take: 10
                            },
                            performanceInsights: {
                                select: {
                                    id: true,
                                    content: true,
                                    type: true,
                                    date: true
                                },
                                orderBy: { date: 'desc' },
                                take: 10
                            }
                        }
                    }
                }
            });

            // Transform response
            const performance = users.map(u => ({
                userId: u.id,
                userName: u.name,
                userEmail: u.email,
                companyId: u.companyId || '',
                companyName: u.company?.name || 'Unknown',
                kpis: u.employeeProfile?.kpis || [],
                reviews: u.employeeProfile?.performanceReviews.map(p => ({
                    id: p.id,
                    period: p.period,
                    rating: p.rating,
                    feedback: p.feedback,
                    createdAt: p.createdAt,
                    reviewer: p.reviewer
                })) || [],
                insights: u.employeeProfile?.performanceInsights || []
            }));

            return NextResponse.json({ performance });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
