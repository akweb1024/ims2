import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/analytics - Get staff analytics
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyIdParam = searchParams.get('companyId');
            const companyId = companyIdParam && companyIdParam !== 'all' ? companyIdParam : undefined;
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            const companyFilter = companyId ? { companyId } : {};

            // Get employee count
            const totalEmployees = await prisma.user.count({
                where: {
                    ...companyFilter,
                    employeeProfile: {
                        isNot: null
                    }
                }
            });

            // Get active employees
            const activeEmployees = await prisma.user.count({
                where: {
                    ...companyFilter,
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
                    ...companyFilter,
                    status: 'PENDING'
                }
            });

            const approvedLeaves = await prisma.leaveRequest.count({
                where: {
                    ...companyFilter,
                    status: 'APPROVED'
                }
            });

            // Get department-wise breakdown
            const departmentStats = await prisma.department.findMany({
                where: companyFilter,
                include: {
                    _count: {
                        select: {
                            users: true
                        }
                    }
                }
            });

            // --- AGGREGATION FOR CHARTS ---
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            // 1. Attendance Trends (Last 6 Months)
            const attendanceRecords = await prisma.attendance.findMany({
                where: {
                    ...companyFilter,
                    date: { gte: sixMonthsAgo }
                },
                select: {
                    date: true,
                    status: true
                }
            });

            // Aggregate attendance by month
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const attendanceMap = new Map<string, { present: number; absent: number }>();

            attendanceRecords.forEach(record => {
                const monthIndex = record.date.getMonth();
                const monthName = monthNames[monthIndex];
                if (!attendanceMap.has(monthName)) {
                    attendanceMap.set(monthName, { present: 0, absent: 0 });
                }
                const entry = attendanceMap.get(monthName)!;
                if (record.status === 'PRESENT') entry.present++;
                else entry.absent++;
            });

            const attendanceChartData = Array.from(attendanceMap.entries()).map(([month, stats]) => ({
                month,
                present: stats.present,
                absent: stats.absent
            }));

            // 2. Leave Breakdown
            const leaveBreakdown = await prisma.leaveRequest.groupBy({
                by: ['type'],
                where: {
                    ...companyFilter,
                    status: 'APPROVED',
                    startDate: { gte: new Date(new Date().getFullYear(), 0, 1) } // Current year
                },
                _count: { _all: true }
            });

            const leaveChartData = leaveBreakdown.map(item => ({
                type: item.type,
                days: item._count._all // Approximate days as count of requests (should ideally sum duration)
            }));

            // 3. Salary by Department
            const usersWithSalary = await prisma.user.findMany({
                where: {
                    ...companyFilter,
                    isActive: true,
                    departmentId: { not: null },
                    employeeProfile: { isNot: null }
                },
                include: {
                    department: { select: { name: true } },
                    employeeProfile: { select: { fixedSalary: true } }
                }
            });

            const salaryMap = new Map<string, number>();
            usersWithSalary.forEach(user => {
                const deptName = user.department?.name || 'Unassigned';
                const salary = user.employeeProfile?.fixedSalary || 0;
                salaryMap.set(deptName, (salaryMap.get(deptName) || 0) + salary);
            });

            const salaryChartData = Array.from(salaryMap.entries()).map(([department, amount]) => ({
                department,
                amount
            }));

            // 4. Performance Distribution (Latest Snapshot)
            // Use averageManagerRating (1-5 scale)
            const performanceData = await prisma.monthlyPerformanceSnapshot.findMany({
                where: {
                    ...companyFilter,
                    month: new Date().getMonth() === 0 ? 12 : new Date().getMonth(), // Previous month
                    year: new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()
                },
                select: { averageManagerRating: true }
            });

            const performanceMap = new Map<string, number>();
            performanceData.forEach(p => {
                const rating = Math.round(p.averageManagerRating || 0);
                const key = `${rating} Stars`; // e.g., "4 Stars"
                performanceMap.set(key, (performanceMap.get(key) || 0) + 1);
            });
            // Ensure 1-5 keys exist
            for (let i = 1; i <= 5; i++) {
                if (!performanceMap.has(`${i} Stars`)) performanceMap.set(`${i} Stars`, 0);
            }
            // Sort by stars descending
            const performanceChartData = Array.from(performanceMap.entries())
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([rating, count]) => ({ rating, count }));

            // 5. Historical Trends (Preserve existing logic roughly)
            const performanceTrends = await prisma.monthlyPerformanceSnapshot.groupBy({
                by: ['month', 'year'],
                where: {
                    ...companyFilter,
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
                })),
                charts: {
                    attendance: attendanceChartData.length > 0 ? attendanceChartData : [{ month: 'No Data', present: 0, absent: 0 }],
                    leave: leaveChartData,
                    salary: salaryChartData,
                    performance: performanceChartData
                },
                stats: {
                    attendance: {
                        average: attendanceChartData.length > 0 ? Math.round((attendanceChartData.reduce((sum, d) => sum + d.present, 0) / (attendanceChartData.reduce((sum, d) => sum + d.present + d.absent, 0) || 1)) * 100) : 0,
                        late: attendanceRecords.filter(r => (r as any).lateMinutes > 0).length,
                        early: 0 // Early departure not tracked in schema yet
                    },
                    leave: {
                        total: leaveChartData.reduce((sum, d) => sum + d.days, 0),
                        pending: pendingLeaves,
                        available: totalEmployees * 25 // Approximate entitlement
                    },
                    salary: {
                        total: usersWithSalary.reduce((sum, u) => sum + (u.employeeProfile?.fixedSalary || 0), 0),
                        average: usersWithSalary.length > 0 ? Math.round(usersWithSalary.reduce((sum, u) => sum + (u.employeeProfile?.fixedSalary || 0), 0) / usersWithSalary.length) : 0,
                        highest: Math.max(...usersWithSalary.map(u => u.employeeProfile?.fixedSalary || 0), 0)
                    },
                    performance: {
                        average: performanceData.length > 0 ? (performanceData.reduce((sum, p) => sum + (p.averageManagerRating || 0), 0) / performanceData.length).toFixed(1) : "0.0",
                        top: performanceData.filter(p => (p.averageManagerRating || 0) >= 4.5).length,
                        improvement: performanceData.filter(p => (p.averageManagerRating || 0) < 3).length
                    }
                }
            });
        } catch (error) {
            logger.error('Error fetching staff analytics:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
