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
            const userWhere: any = {};

            if (companyId && companyId !== 'all') {
                userWhere.companyId = companyId;
                where.user = userWhere;
            }

            if (teamId && teamId !== 'all') {
                userWhere.departmentId = teamId;
                where.user = userWhere;
            }

            // Get employee count
            const totalEmployees = await prisma.employeeProfile.count({ 
                where 
            });

            // Get today's range (24 hours to be robust against localized date mismatches)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(todayStart);
            todayEnd.setDate(todayEnd.getDate() + 1);

            const companyFilter = companyId && companyId !== 'all' ? { companyId } : {};

            // Get present count
            const presentToday = await prisma.attendance.count({
                where: {
                    date: {
                        gte: todayStart,
                        lt: todayEnd
                    },
                    status: 'PRESENT',
                    ...companyFilter
                }
            });

            // Get on leave count
            const onLeave = await prisma.leaveRequest.count({
                where: {
                    status: 'APPROVED',
                    startDate: { lte: todayStart },
                    endDate: { gte: todayStart },
                    ...companyFilter
                }
            });

            // Calculate absent (only for the selected scope)
            const absent = Math.max(0, totalEmployees - presentToday - onLeave);

            // Get total salary for the filtered scope
            const salaryData = await prisma.salaryStructure.aggregate({
                where: {
                    employee: where
                },
                _sum: { grossSalary: true }
            });

            const totalSalary = (salaryData._sum.grossSalary as number) || 0;

            // Get pending and approved leaves
            const pendingLeaves = await prisma.leaveRequest.count({
                where: {
                    status: 'PENDING',
                    ...companyFilter
                }
            });

            const approvedLeaves = await prisma.leaveRequest.count({
                where: {
                    status: 'APPROVED',
                    startDate: { gte: new Date(todayStart.getFullYear(), todayStart.getMonth(), 1) },
                    ...companyFilter
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
                    where: { 
                        date: {
                            gte: todayStart,
                            lt: todayEnd
                        }, 
                        status: 'PRESENT' 
                    },
                    _count: { id: true }
                });

                const allSalaryRaw = await prisma.salaryStructure.findMany({
                    select: { 
                        grossSalary: true, 
                        employee: { 
                            select: { 
                                user: { 
                                    select: { companyId: true } 
                                } 
                            } 
                        } 
                    }
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
