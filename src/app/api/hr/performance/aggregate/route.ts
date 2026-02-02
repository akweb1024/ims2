import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import prisma from '@/lib/prisma';

export const GET = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'], async (req: NextRequest, user: any) => {
    try {
        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period'); // 'QUARTERLY', 'YEARLY'
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const quarter = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : undefined;
        const companyId = searchParams.get('companyId') || user.companyId;

        if (!period) {
            return NextResponse.json({ error: 'Period is required' }, { status: 400 });
        }

        let monthFilter = {};
        if (period === 'QUARTERLY') {
            if (!quarter) return NextResponse.json({ error: 'Quarter (1-4) is required for quarterly view' }, { status: 400 });
            if (quarter === 1) monthFilter = { in: [1, 2, 3] };
            if (quarter === 2) monthFilter = { in: [4, 5, 6] };
            if (quarter === 3) monthFilter = { in: [7, 8, 9] };
            if (quarter === 4) monthFilter = { in: [10, 11, 12] };
        } else if (period === 'YEARLY') {
            monthFilter = { gte: 1, lte: 12 };
        } else {
            return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
        }

        // Fetch snapshots
        const snapshots = await prisma.monthlyPerformanceSnapshot.findMany({
            where: {
                companyId,
                year,
                month: monthFilter
            },
            include: {
                employee: {
                    include: {
                        user: { select: { name: true, email: true, role: true } }
                    }
                },
                department: { select: { name: true } }
            }
        });

        // Group by Employee
        const grouped: any = {};
        snapshots.forEach(snap => {
            if (!grouped[snap.employeeId]) {
                grouped[snap.employeeId] = {
                    employee: snap.employee,
                    department: snap.department,
                    snapshots: []
                };
            }
            grouped[snap.employeeId].snapshots.push(snap);
        });

        // Calculate Aggregates
        const results = Object.values(grouped).map((item: any) => {
            const snaps = item.snapshots;
            const count = snaps.length;

            const totalRevenue = snaps.reduce((sum: number, s: any) => sum + s.totalRevenueGenerated, 0);
            const totalTarget = snaps.reduce((sum: number, s: any) => sum + s.revenueTarget, 0);
            const totalPoints = snaps.reduce((sum: number, s: any) => sum + s.totalPointsEarned, 0);

            const avgScore = snaps.reduce((sum: number, s: any) => sum + s.overallScore, 0) / count;
            const avgAttendance = snaps.reduce((sum: number, s: any) => sum + s.attendanceScore, 0) / count;

            return {
                id: item.employee.id, // Virtual ID
                employee: item.employee,
                department: item.department,

                // Aggregated Metrics
                totalRevenueGenerated: totalRevenue,
                revenueTarget: totalTarget,
                revenueAchievement: totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0,

                totalPointsEarned: totalPoints,
                attendanceScore: avgAttendance, // Average
                overallScore: avgScore, // Average

                performanceGrade: getGrade(avgScore),

                // Meta
                period,
                year,
                quarter,
                monthsIncluded: count
            };
        });

        return NextResponse.json(results.sort((a: any, b: any) => b.overallScore - a.overallScore));

    } catch (error: any) {
        console.error('Error Aggregating Performance:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

function getGrade(score: number) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}
