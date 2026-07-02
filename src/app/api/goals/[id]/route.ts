import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { sendEmail, EmailTemplates } from '@/lib/email';

// GET: Get goal details
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const goal = await prisma.employeeGoal.findUnique({
                where: { id },
                include: {
                    employee: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            },
                            designation: true
                        }
                    },
                    kpi: true,
                    reviewer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    workPlans: {
                        orderBy: { date: 'desc' },
                        take: 10
                    }
                } as any
            });

            if (!goal) {
                return createErrorResponse('Goal not found', 404);
            }

            // Check access permissions
            if (['EXECUTIVE'].includes(user.role)) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (goal.employeeId !== profile?.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(goal.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            return NextResponse.json(goal);
        } catch (error: any) {
            console.error('Error fetching goal:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
