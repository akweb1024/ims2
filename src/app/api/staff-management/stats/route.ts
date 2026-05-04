import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getISTToday } from '@/lib/date-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId');
            const teamId = searchParams.get('teamId');
            const scopedCompanyId = companyId && companyId !== 'all' ? companyId : undefined;
            const scopedTeamId = teamId && teamId !== 'all' ? teamId : undefined;

            const userScopeWhere: any = {
                isActive: true,
                employeeProfile: { isNot: null }
            };

            if (scopedCompanyId) userScopeWhere.companyId = scopedCompanyId;
            if (scopedTeamId) userScopeWhere.departmentId = scopedTeamId;

            const scopedProfiles = await prisma.employeeProfile.findMany({
                where: { user: userScopeWhere },
                select: { id: true }
            });
            const scopedEmployeeIds = scopedProfiles.map((p) => p.id);
            const totalEmployees = scopedEmployeeIds.length;

            const todayStart = getISTToday();
            const todayEnd = new Date(todayStart);
            todayEnd.setDate(todayEnd.getDate() + 1);

            const todayAttendance = scopedEmployeeIds.length > 0 ? await prisma.attendance.findMany({
                where: {
                    employeeId: { in: scopedEmployeeIds },
                    date: {
                        gte: todayStart,
                        lt: todayEnd
                    }
                },
                select: {
                    employeeId: true,
                    checkIn: true,
                    checkOut: true
                }
            }) : [];

            const presentToday = todayAttendance.filter((r) => r.checkIn && !r.checkOut).length;
            const leftOffice = todayAttendance.filter((r) => !!r.checkOut).length;

            // Get on leave count
            const onLeave = await prisma.leaveRequest.count({
                where: {
                    employeeId: { in: scopedEmployeeIds },
                    status: 'APPROVED',
                    startDate: { lte: todayStart },
                    endDate: { gte: todayStart }
                }
            });

            const absent = Math.max(0, totalEmployees - presentToday - leftOffice - onLeave);

            const salaryData = await prisma.salaryStructure.aggregate({
                where: {
                    employeeId: { in: scopedEmployeeIds }
                },
                _sum: { grossSalary: true }
            });

            const totalSalary = (salaryData._sum.grossSalary as number) || 0;

            // Get pending and approved leaves
            const pendingLeaves = await prisma.leaveRequest.count({
                where: {
                    employeeId: { in: scopedEmployeeIds },
                    status: 'PENDING'
                }
            });

            const approvedLeaves = await prisma.leaveRequest.count({
                where: {
                    employeeId: { in: scopedEmployeeIds },
                    status: 'APPROVED',
                    startDate: { gte: new Date(todayStart.getFullYear(), todayStart.getMonth(), 1) }
                }
            });

            // Fetch recent activities
            const { getCompanyActivity } = await import('@/lib/services/activity-service');
            const activities = await getCompanyActivity(
                scopedCompanyId || 'all',
                5
            );

            // Fetch Company Breakdown only when viewing all companies (without a team filter)
            let companyBreakdown: any[] = [];
            if (!scopedCompanyId && !scopedTeamId) {
                const companies = await prisma.company.findMany({ select: { id: true, name: true, logoUrl: true } });

                const allEmployeesRaw = await prisma.user.groupBy({
                    by: ['companyId'],
                    where: {
                        isActive: true,
                        employeeProfile: { isNot: null }
                    },
                    _count: { id: true }
                });

                const todayAttendanceAll = await prisma.attendance.findMany({
                    where: {
                        date: {
                            gte: todayStart,
                            lt: todayEnd
                        },
                        employee: {
                            user: {
                                isActive: true
                            }
                        }
                    },
                    select: {
                        companyId: true,
                        checkIn: true,
                        checkOut: true
                    }
                });

                const companyAttendanceSnapshot = new Map<string, { presentToday: number; leftOffice: number }>();
                for (const row of todayAttendanceAll) {
                    const key = row.companyId || '';
                    if (!key) continue;
                    const snapshot = companyAttendanceSnapshot.get(key) || { presentToday: 0, leftOffice: 0 };
                    if (row.checkIn && !row.checkOut) snapshot.presentToday += 1;
                    else if (row.checkOut) snapshot.leftOffice += 1;
                    companyAttendanceSnapshot.set(key, snapshot);
                }

                const allSalaryRaw = await prisma.salaryStructure.findMany({
                    where: {
                        employee: {
                            user: {
                                isActive: true
                            }
                        }
                    },
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
                    const attendanceSnapshot = companyAttendanceSnapshot.get(c.id) || { presentToday: 0, leftOffice: 0 };
                    const engagedToday = attendanceSnapshot.presentToday + attendanceSnapshot.leftOffice;

                    const companySalaries = allSalaryRaw.filter(s => s.employee?.user?.companyId === c.id);
                    const totalSal = companySalaries.reduce((sum, s) => sum + (s.grossSalary || 0), 0);

                    return {
                        id: c.id,
                        name: c.name,
                        logo: c.logoUrl,
                        totalEmployees: empCount,
                        presentToday: attendanceSnapshot.presentToday,
                        leftOffice: attendanceSnapshot.leftOffice,
                        presentPercentage: empCount > 0 ? Math.round((engagedToday / empCount) * 100) : 0,
                        totalSalary: totalSal
                    };
                });
            }

            return NextResponse.json({
                totalEmployees,
                presentToday,
                leftOffice,
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
