import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId');
            const teamId = searchParams.get('teamId');

            // Build filter conditions
            const where: any = {};

            if (companyId && companyId !== 'all') {
                where.companyId = companyId;
            }

            if (teamId && teamId !== 'all') {
                where.user = { departmentId: teamId };
            }

            // Get employee count
            const totalEmployees = await prisma.employeeProfile.count({ where });

            // Get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get present count
            const presentToday = await prisma.attendance.count({
                where: {
                    date: today,
                    status: 'PRESENT',
                    ...(companyId && companyId !== 'all' ? { companyId } : {})
                }
            });

            // Get on leave count
            const onLeave = await prisma.leaveRequest.count({
                where: {
                    status: 'APPROVED',
                    startDate: { lte: today },
                    endDate: { gte: today },
                    ...(companyId && companyId !== 'all' ? { companyId } : {})
                }
            });

            // Calculate absent
            const absent = Math.max(0, totalEmployees - presentToday - onLeave);

            // Get total salary (simplified calculation)
            const salaryData = await prisma.salaryStructure.aggregate({
                _sum: { grossSalary: true }
            });

            const totalSalary = (salaryData._sum.grossSalary as number) || 0;

            // Get pending and approved leaves
            const pendingLeaves = await prisma.leaveRequest.count({
                where: {
                    status: 'PENDING',
                    ...(companyId && companyId !== 'all' ? { companyId } : {})
                }
            });

            const approvedLeaves = await prisma.leaveRequest.count({
                where: {
                    status: 'APPROVED',
                    startDate: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
                    ...(companyId && companyId !== 'all' ? { companyId } : {})
                }
            });

            // Fetch recent activities
            const { getCompanyActivity } = await import('@/lib/services/activity-service');
            const activities = await getCompanyActivity(
                companyId && companyId !== 'all' ? companyId : user.companyId || '',
                5
            );

            return NextResponse.json({
                totalEmployees,
                presentToday,
                onLeave,
                absent,
                totalSalary,
                pendingLeaves,
                approvedLeaves,
                recentActivities: activities
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
