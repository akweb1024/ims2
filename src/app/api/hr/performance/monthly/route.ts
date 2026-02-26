import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import prisma from '@/lib/prisma';

/**
 * Monthly Performance Calculator
 * Calculates comprehensive performance metrics for employees, departments, and companies
 * Should be run at the end of each month (can be triggered manually or via cron)
 */

async function calculateEmployeePerformance(employeeId: string, month: number, year: number, companyId: string) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get employee profile
    const employee = await prisma.employeeProfile.findUnique({
        where: { id: employeeId },
        include: { user: { include: { department: true } } }
    });

    if (!employee) return null;

    // Calculate working days (excluding weekends and holidays)
    const holidays = await prisma.holiday.findMany({
        where: {
            companyId,
            date: { gte: startDate, lte: endDate }
        }
    });

    const totalDays = endDate.getDate();
    const holidayDates = holidays.map(h => h.date.getDate());
    const totalWorkingDays = Array.from({ length: totalDays }, (_, i) => i + 1)
        .filter(day => {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            return dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.includes(day);
        }).length;

    // Attendance Metrics
    const attendance = await prisma.attendance.findMany({
        where: {
            employeeId,
            date: { gte: startDate, lte: endDate }
        }
    });

    const daysPresent = attendance.filter(a => a.status === 'PRESENT').length;
    const daysAbsent = totalWorkingDays - daysPresent;
    const daysLate = attendance.filter(a => a.lateMinutes > 0).length;
    const totalLateMinutes = attendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
    const totalWorkHours = attendance.reduce((sum, a) => {
        if (a.checkIn && a.checkOut) {
            const diff = new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime();
            return sum + (diff / (1000 * 60 * 60));
        }
        return sum;
    }, 0);
    const averageWorkHours = daysPresent > 0 ? totalWorkHours / daysPresent : 0;
    const overtimeHours = Math.max(0, totalWorkHours - (daysPresent * 8));

    // Attendance Score (0-100)
    const attendanceScore = Math.min(100,
        ((daysPresent / totalWorkingDays) * 70) + // 70% weight for presence
        (Math.max(0, 100 - (daysLate / totalWorkingDays * 100)) * 0.2) + // 20% for punctuality
        (Math.min(10, overtimeHours / 10) * 1) // 10% bonus for overtime
    );

    // Leaves
    const leaves = await prisma.leaveRequest.findMany({
        where: {
            employeeId,
            status: 'APPROVED',
            startDate: { gte: startDate, lte: endDate }
        }
    });
    const leavesTaken = leaves.length;

    // Points & Tasks
    const pointLogs = await prisma.employeePointLog.findMany({
        where: {
            employeeId,
            date: { gte: startDate, lte: endDate }
        }
    });
    const totalPointsEarned = pointLogs.reduce((sum, p) => sum + p.points, 0);

    // Work Reports
    const workReports = await prisma.workReport.findMany({
        where: {
            employeeId,
            date: { gte: startDate, lte: endDate }
        }
    });

    const reportsSubmitted = workReports.length;
    const reportsExpected = totalWorkingDays;
    const reportSubmissionRate = (reportsSubmitted / reportsExpected) * 100;
    const averageSelfRating = workReports.length > 0
        ? workReports.reduce((sum, r) => sum + (r.selfRating || 0), 0) / workReports.length
        : 0;
    const averageManagerRating = workReports.filter(r => r.managerRating).length > 0
        ? workReports.filter(r => r.managerRating).reduce((sum, r) => sum + (r.managerRating || 0), 0) / workReports.filter(r => r.managerRating).length
        : 0;

    // Aggregate sub-metrics from evaluations (-3..3 scale)
    const validEvals = workReports.filter(r => r.evaluation && typeof r.evaluation === 'object');
    const avgWorkQuality = validEvals.length > 0
        ? validEvals.reduce((sum, r) => sum + ((r.evaluation as any).workQuality || 0), 0) / validEvals.length
        : 0;
    const avgEfficiency = validEvals.length > 0
        ? validEvals.reduce((sum, r) => sum + ((r.evaluation as any).efficiency || 0), 0) / validEvals.length
        : 0;

    // Composite Quality Score (normalized to 1-10)
    // Map -3..3 eval to 0..10 and blend with managerRating
    const normalizedEvalQuality = (avgWorkQuality + 3) * (10 / 6);
    const normalizedEfficiency = (avgEfficiency + 3) * (10 / 6);
    
    const compositeQuality = averageManagerRating > 0
        ? (averageManagerRating * 0.6) + (normalizedEvalQuality * 0.4)
        : normalizedEvalQuality;

    const tasksCompleted = workReports.reduce((sum, r) => sum + (r.tasksCompleted || 0), 0);
    const tasksAssigned = workReports.reduce((sum, r) => {
        const snapshot = r.tasksSnapshot as any[];
        return sum + (snapshot?.length || 0);
    }, 0);
    const taskCompletionRate = tasksAssigned > 0 ? (tasksCompleted / tasksAssigned) * 100 : 0;

    // Calculate Verified Revenue from Claims
    const approvedClaims = await prisma.revenueClaim.findMany({
        where: {
            employeeId,
            status: 'APPROVED',
            revenueTransaction: {
                paymentDate: { gte: startDate, lte: endDate }
            }
        }
    });
    const totalRevenueGenerated = approvedClaims.reduce((sum, c) => sum + c.claimAmount, 0);

    // Communication Score (based on work report metrics + evaluation)
    const totalCalls = workReports.reduce((sum, r) => sum + (r.followUpsCompleted || 0), 0);
    const totalChats = workReports.reduce((sum, r) => sum + (r.chatsHandled || 0), 0);
    
    // Extract communication from evaluations if present (avg of 1-5 scales mapped to 1-100)
    const evaluationComm = workReports
        .filter(r => (r.evaluation as any)?.communication !== undefined)
        .map(r => (r.evaluation as any).communication);
    const avgEvalComm = evaluationComm.length > 0 
        ? (evaluationComm.reduce((a, b) => a + b, 0) / evaluationComm.length + 3) * (100 / 6) // Map -3..3 to 0..100
        : 0;

    const communicationScore = Math.min(100, 
        avgEvalComm > 0 ? avgEvalComm : ((totalCalls + totalChats) / 10)
    );

    // Calculate Overall Score (weighted composite)
    const overallScore = (
        (attendanceScore * 0.25) +           // 25% attendance
        (Math.min(100, totalPointsEarned / 10) * 0.25) + // 25% points/tasks
        (reportSubmissionRate * 0.15) +      // 15% report submission
        (averageManagerRating * 10 * 0.15) + // 15% manager rating
        (taskCompletionRate * 0.10) +        // 10% task completion
        (communicationScore * 0.10)          // 10% communication
    );

    // Determine Grade
    let performanceGrade = 'F';
    if (overallScore >= 95) performanceGrade = 'A+';
    else if (overallScore >= 90) performanceGrade = 'A';
    else if (overallScore >= 85) performanceGrade = 'B+';
    else if (overallScore >= 80) performanceGrade = 'B';
    else if (overallScore >= 70) performanceGrade = 'C';
    else if (overallScore >= 60) performanceGrade = 'D';

    // Determine Trend (compare with previous month)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const previousSnapshot = await prisma.monthlyPerformanceSnapshot.findUnique({
        where: {
            employeeId_month_year: {
                employeeId,
                month: prevMonth,
                year: prevYear
            }
        }
    });

    let trend = 'STABLE';
    let improvementScore = 0;
    if (previousSnapshot) {
        const scoreDiff = overallScore - previousSnapshot.overallScore;
        improvementScore = scoreDiff;
        if (scoreDiff > 5) trend = 'IMPROVING';
        else if (scoreDiff < -5) trend = 'DECLINING';
    }

    // Flags
    const needsAttention = overallScore < 60 || attendanceScore < 70 || reportSubmissionRate < 60;
    const isTopPerformer = overallScore >= 90;

    const warningFlags = [];
    if (attendanceScore < 70) warningFlags.push('LOW_ATTENDANCE');
    if (reportSubmissionRate < 60) warningFlags.push('POOR_REPORTING');
    if (daysLate > totalWorkingDays * 0.3) warningFlags.push('FREQUENT_LATE');
    if (averageManagerRating < 5) warningFlags.push('LOW_MANAGER_RATING');

    return {
        employeeId,
        companyId,
        departmentId: employee.user.departmentId,
        month,
        year,

        // Attendance
        totalWorkingDays,
        daysPresent,
        daysAbsent,
        daysLate,
        totalLateMinutes,
        averageWorkHours,
        overtimeHours,
        leavesTaken,
        attendanceScore,

        // Tasks & Points
        totalPointsEarned,
        tasksCompleted,
        tasksAssigned,
        taskCompletionRate,
        averageTaskQuality: compositeQuality,

        // Reports & Ratings
        reportsSubmitted,
        reportsExpected,
        reportSubmissionRate,
        averageSelfRating,
        averageManagerRating,
        totalRevenueGenerated,
        revenueTarget: 0,
        revenueAchievement: 0,
        deadlinesMet: tasksCompleted,
        deadlinesMissed: tasksAssigned - tasksCompleted,
        initiativesCount: 0,
        improvementScore,

        // Communication
        communicationScore,
        teamCollaboration: averageManagerRating,

        // Overall
        overallScore,
        performanceGrade,
        trend,

        // Flags
        needsAttention,
        isTopPerformer,
        warningFlags: warningFlags.length > 0 ? warningFlags : undefined,

        calculatedAt: new Date()
    };
}

export const POST = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'], async (req: NextRequest, user: any) => {
    try {
        const { month, year, employeeId, companyId } = await req.json();

        // Validate inputs
        if (!month || !year) {
            return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
        }

        const targetMonth = parseInt(month);
        const targetYear = parseInt(year);
        const targetCompanyId = companyId || user.companyId;

        if (!targetCompanyId) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        // If specific employee, calculate for them
        if (employeeId) {
            const snapshot = await calculateEmployeePerformance(employeeId, targetMonth, targetYear, targetCompanyId);

            if (snapshot) {
                const saved = await prisma.monthlyPerformanceSnapshot.upsert({
                    where: {
                        employeeId_month_year: {
                            employeeId,
                            month: targetMonth,
                            year: targetYear
                        }
                    },
                    create: snapshot,
                    update: snapshot
                });

                return NextResponse.json({ success: true, snapshot: saved });
            }

            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Calculate for all employees in the company
        const employees = await prisma.employeeProfile.findMany({
            where: {
                user: {
                    companyId: targetCompanyId,
                    isActive: true
                }
            }
        });

        const snapshots = [];
        for (const emp of employees) {
            const snapshot = await calculateEmployeePerformance(emp.id, targetMonth, targetYear, targetCompanyId);
            if (snapshot) {
                const saved = await prisma.monthlyPerformanceSnapshot.upsert({
                    where: {
                        employeeId_month_year: {
                            employeeId: emp.id,
                            month: targetMonth,
                            year: targetYear
                        }
                    },
                    create: snapshot,
                    update: snapshot
                });
                snapshots.push(saved);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Calculated performance for ${snapshots.length} employees`,
            snapshots
        });

    } catch (error: any) {
        console.error('Performance calculation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// GET: Retrieve performance snapshots
export const GET = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'EXECUTIVE'], async (req: NextRequest, user: any) => {
    try {
        const { searchParams } = new URL(req.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');
        const employeeId = searchParams.get('employeeId');
        const departmentId = searchParams.get('departmentId');
        const companyId = searchParams.get('companyId') || user.companyId;

        let targetEmployeeId = employeeId;
        if (targetEmployeeId === 'self' || user.role === 'EXECUTIVE') {
            const profile = await prisma.employeeProfile.findFirst({ where: { userId: user.id } });
            if (!profile) return NextResponse.json([]);
            targetEmployeeId = profile.id;
        }

        const where: any = { companyId };

        if (month) where.month = parseInt(month);
        if (year) where.year = parseInt(year);
        if (targetEmployeeId) where.employeeId = targetEmployeeId;
        if (departmentId) where.departmentId = departmentId;

        const snapshots = await prisma.monthlyPerformanceSnapshot.findMany({
            where,
            include: {
                employee: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                },
                department: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' },
                { overallScore: 'desc' }
            ]
        });

        return NextResponse.json(snapshots);

    } catch (error: any) {
        console.error('Error fetching performance snapshots:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
