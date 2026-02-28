import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId') || user.companyId;

            if (!companyId) {
                return createErrorResponse('Company ID required', 400);
            }

            // Fetch Employees with Performance Data and Department
            const employees = await prisma.user.findMany({
                where: {
                    companyId,
                    isActive: true,
                    role: { notIn: ['CUSTOMER', 'SUPER_ADMIN'] }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    department: {
                        select: { name: true }
                    },
                    employeeProfile: {
                        select: {
                            id: true,
                            designation: true,
                            dateOfJoining: true,
                            lastIncrementDate: true,
                            lastPromotionDate: true,
                            baseSalary: true,
                            workReports: {
                                take: 30,
                                orderBy: { date: 'desc' },
                                select: {
                                    tasksCompleted: true,
                                    revenueGenerated: true,
                                    managerRating: true,
                                    selfRating: true
                                }
                            }
                        }
                    }
                }
            });

            const processedEmployees = employees.map(emp => {
                const profile = emp.employeeProfile;
                if (!profile) return null;

                const reports = profile.workReports || [];
                const totalTasks = reports.reduce((sum, r) => sum + r.tasksCompleted, 0);
                const totalRevenue = reports.reduce((sum, r) => sum + r.revenueGenerated, 0);
                const avgManagerRating = reports.length > 0
                    ? reports.reduce((sum, r) => sum + (r.managerRating || 0), 0) / reports.length
                    : 0;

                const joiningDate = profile.dateOfJoining ? new Date(profile.dateOfJoining) : new Date(emp.createdAt);
                const lastIncrement = profile.lastIncrementDate ? new Date(profile.lastIncrementDate) : joiningDate;

                const now = new Date();
                const monthsSinceLastIncrement = (now.getFullYear() - lastIncrement.getFullYear()) * 12 + (now.getMonth() - lastIncrement.getMonth());
                const tenureMonths = (now.getFullYear() - joiningDate.getFullYear()) * 12 + (now.getMonth() - joiningDate.getMonth());

                let recommendation = 'MAINTAIN';
                let suggestedIncrement = 0;
                const reason = [];

                if (tenureMonths > 6) {
                    if (monthsSinceLastIncrement >= 11) {
                        reason.push('Due matching annual cycle');
                        if (avgManagerRating >= 4) {
                            recommendation = 'PROMOTE_OR_HIKE';
                            suggestedIncrement = 15;
                            reason.push('Excellent Performance');
                        } else if (avgManagerRating >= 3) {
                            recommendation = 'INCREMENT';
                            suggestedIncrement = 8;
                            reason.push('Consistent Performance');
                        }
                    } else if (avgManagerRating >= 4.5) {
                        recommendation = 'BONUS';
                        reason.push('Exceptional Recent Performance');
                    }
                }

                if (totalRevenue > 500000) {
                    recommendation = 'INCENTIVE';
                    reason.push('High Revenue Generator');
                }

                return {
                    id: emp.id,
                    name: emp.name || emp.email.split('@')[0],
                    email: emp.email,
                    designation: profile.designation || emp.role,
                    department: emp.department?.name || 'Unassigned',
                    metrics: {
                        tasks: totalTasks,
                        revenue: totalRevenue,
                        rating: avgManagerRating.toFixed(1),
                        attendance: 0 // Will be calculated after processing all profiles
                    },
                    advisor: {
                        status: recommendation,
                        suggestedIncrement: suggestedIncrement,
                        monthsSinceReview: monthsSinceLastIncrement,
                        reason: reason.join(', ')
                    }
                };
            }).filter(Boolean) as any[];

            // 3. Fetch Attendance for all processed employees (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const attendanceCounts = await prisma.attendance.groupBy({
                by: ['employeeId'],
                where: {
                    companyId,
                    date: { gte: thirtyDaysAgo },
                    status: 'PRESENT'
                },
                _count: { id: true }
            });

            // Map attendance to employees
            const finalEmployees = processedEmployees.map(emp => {
                const profile = employees.find(e => e.id === emp.id)?.employeeProfile;
                const count = attendanceCounts.find(a => a.employeeId === profile?.id)?._count.id || 0;
                // Basic percentage (scaled to 30 days, or less if joined recently)
                const attendanceRate = Math.min(100, (count / 22) * 100); // 22 working days approx
                return {
                    ...emp,
                    metrics: {
                        ...emp.metrics,
                        attendance: Math.round(attendanceRate)
                    }
                };
            });

            // 4. Aggregate Department Performance
            const deptStats: Record<string, any> = {};
            finalEmployees.forEach(emp => {
                const dept = emp.department;
                if (!deptStats[dept]) {
                    deptStats[dept] = { name: dept, productivity: 0, employeeCount: 0, totalRating: 0 };
                }
                deptStats[dept].productivity += emp.metrics.tasks;
                deptStats[dept].totalRating += parseFloat(emp.metrics.rating);
                deptStats[dept].employeeCount += 1;
            });

            const departmentPerformance = Object.values(deptStats).map((d: any) => ({
                ...d,
                avgProductivity: (d.productivity / d.employeeCount).toFixed(1),
                avgRating: (d.totalRating / d.employeeCount).toFixed(1)
            }));

            return NextResponse.json({
                employees: finalEmployees,
                departmentPerformance
            });

        } catch (error: any) {
            console.error('Employee Analytics Error:', error);
            return createErrorResponse('Internal Server Error', 500);
        }
    }
);
