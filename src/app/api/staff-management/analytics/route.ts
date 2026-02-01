import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/analytics - Get staff analytics
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId') || user.companyId;
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            // Get employee count
            const totalEmployees = await prisma.user.count({
                where: {
                    companyId,
                    employeeProfile: {
                        isNot: null
                    }
                }
            });

            // Get active employees
            const activeEmployees = await prisma.user.count({
                where: {
                    companyId,
                    isActive: true,
                    employeeProfile: {
                        isNot: null
                    }
                }
            });

            // Get attendance stats (if attendance records exist)
            const attendanceStats = {
                presentToday: 0,
                absentToday: 0,
                onLeave: 0
            };

            // Get leave stats
            const pendingLeaves = await prisma.leaveRequest.count({
                where: {
                    employee: {
                        user: {
                            companyId
                        }
                    },
                    status: 'PENDING'
                }
            });

            const approvedLeaves = await prisma.leaveRequest.count({
                where: {
                    employee: {
                        user: {
                            companyId
                        }
                    },
                    status: 'APPROVED'
                }
            });

            // Get department-wise breakdown
            const departmentStats = await prisma.department.findMany({
                where: {
                    companyId
                },
                include: {
                    _count: {
                        select: {
                            users: true
                        }
                    }
                }
            });

            // Get performance trends (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const performanceTrends = await prisma.monthlyPerformanceSnapshot.groupBy({
                by: ['month', 'year'],
                where: {
                    companyId,
                    calculatedAt: {
                        gte: sixMonthsAgo
                    }
                },
                _avg: {
                    overallScore: true,
                    attendanceScore: true,
                    taskCompletionRate: true
                },
                orderBy: [
                    { year: 'asc' },
                    { month: 'asc' }
                ]
            });

            return NextResponse.json({
                overview: {
                    totalEmployees,
                    activeEmployees,
                    inactiveEmployees: totalEmployees - activeEmployees,
                    ...attendanceStats
                },
                leaves: {
                    pending: pendingLeaves,
                    approved: approvedLeaves
                },
                departments: departmentStats.map(dept => ({
                    name: dept.name,
                    employeeCount: dept._count.users
                })),
                performanceTrends: performanceTrends.map(trend => ({
                    month: `${trend.year}-${String(trend.month).padStart(2, '0')}`,
                    averageScore: trend._avg.overallScore || 0,
                    attendanceScore: trend._avg.attendanceScore || 0,
                    taskCompletion: trend._avg.taskCompletionRate || 0
                }))
            });
        } catch (error) {
            logger.error('Error fetching staff analytics:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
