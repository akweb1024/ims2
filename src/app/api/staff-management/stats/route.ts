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
                companyId && companyId !== 'all' ? companyId : 'all',
                5
            );

            // Fetch Company Breakdown if 'all' is selected
            let companyBreakdown: any[] = [];
            if (!companyId || companyId === 'all') {
                const companies = await prisma.company.findMany({ select: { id: true, name: true, logoUrl: true } });
                
                const allEmployeesRaw = await prisma.user.groupBy({
                    by: ['companyId'],
                    where: {
                        employeeProfile: { isNot: null }
                    },
                    _count: { id: true }
                });
                
                const allAttendanceRaw = await prisma.attendance.groupBy({
                    by: ['companyId'],
                    where: { date: today, status: 'PRESENT' },
                    _count: { id: true }
                });

                const allSalaryRaw = await prisma.salaryStructure.findMany({
                    select: { grossSalary: true, employee: { select: { user: { select: { companyId: true } } } } }
                });

                companyBreakdown = companies.map(c => {
                    const empCount = allEmployeesRaw.find((e: any) => e.companyId === c.id)?._count.id || 0;
                    const presCount = allAttendanceRaw.find((a: any) => a.companyId === c.id)?._count.id || 0;
                    
                    const companySalaries = allSalaryRaw.filter(s => s.employee?.user?.companyId === c.id);
                    const totalSal = companySalaries.reduce((sum, s) => sum + (s.grossSalary || 0), 0);

                    return {
                        id: c.id,
                        name: c.name,
                        logo: c.logoUrl,
                        totalEmployees: empCount,
                        presentToday: presCount,
                        presentPercentage: empCount > 0 ? Math.round((presCount / empCount) * 100) : 0,
                        totalSalary: totalSal
                    };
                });
            }

            return NextResponse.json({
                totalEmployees,
                presentToday,
                onLeave,
                absent,
                totalSalary,
                pendingLeaves,
                approvedLeaves,
                recentActivities: activities,
                companyBreakdown
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
