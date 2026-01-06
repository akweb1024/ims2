import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();
        const companyId = (user as any).companyId;

        // Fetch all employees and their work reports in the date range
        const employees = await prisma.employeeProfile.findMany({
            where: companyId ? { user: { companyId } } : {},
            include: {
                user: {
                    select: { name: true, email: true, role: true }
                },
                workReports: {
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                },
                attendance: {
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate
                        },
                        status: 'PRESENT'
                    }
                }
            }
        });

        const analysis = employees.map((emp: any) => {
            const reports = emp.workReports;
            const attendanceCount = emp.attendance.length;

            const totals = reports.reduce((acc: any, curr: any) => ({
                hours: acc.hours + (curr.hoursSpent || 0),
                revenue: acc.revenue + (curr.revenueGenerated || 0),
                tasks: acc.tasks + (curr.tasksCompleted || 0),
                tickets: acc.tickets + (curr.ticketsResolved || 0),
                chats: acc.chats + (curr.chatsHandled || 0),
                followUps: acc.followUps + (curr.followUpsCompleted || 0),
                managerRatings: curr.managerRating ? [...acc.managerRatings, curr.managerRating] : acc.managerRatings,
                selfRatings: curr.selfRating ? [...acc.selfRatings, curr.selfRating] : acc.selfRatings,
                kraMatchRatioSum: acc.kraMatchRatioSum + (curr.kraMatchRatio || 0)
            }), { hours: 0, revenue: 0, tasks: 0, tickets: 0, chats: 0, followUps: 0, managerRatings: [], selfRatings: [], kraMatchRatioSum: 0 });

            const avgManagerRating = totals.managerRatings.length > 0
                ? totals.managerRatings.reduce((a: number, b: number) => a + b, 0) / totals.managerRatings.length
                : 0;
            const avgSelfRating = totals.selfRatings.length > 0
                ? totals.selfRatings.reduce((a: number, b: number) => a + b, 0) / totals.selfRatings.length
                : 5; // Assume neutral 5 if not set
            const avgKRA = reports.length > 0 ? (totals.kraMatchRatioSum / reports.length) : 0;

            // Refined Heuristic:
            // High Focus Tasks: 20pts | Critical Tickets: 25pts | Active Engagement (Chats): 10pts
            // Persistence (Followups): 10pts | Revenue: 5% (0.05) | Mgr Approval: 50pts per star
            const score = (totals.tasks * 20) +
                (totals.tickets * 25) +
                (totals.chats * 10) +
                (totals.followUps * 10) +
                (totals.revenue * 0.05) +
                (avgManagerRating * 50) +
                (avgSelfRating * 5) +
                (avgKRA * 100);

            const productivityIndex = totals.hours > 0 ? (score / totals.hours) : 0;

            return {
                id: emp.id,
                name: emp.user.name || emp.user.email,
                role: emp.designation || emp.user.role,
                metrics: {
                    totalHours: totals.hours,
                    totalRevenue: totals.revenue,
                    totalTasks: totals.tasks,
                    totalTickets: totals.tickets,
                    totalChats: totals.chats,
                    totalFollowUps: totals.followUps,
                    attendanceDays: attendanceCount,
                    avgHoursPerDay: attendanceCount > 0 ? (totals.hours / attendanceCount) : 0,
                    avgManagerRating: Number(avgManagerRating.toFixed(1)),
                    avgSelfRating: Number(avgSelfRating.toFixed(1)),
                    avgKRA: Number(avgKRA.toFixed(2))
                },
                avgKRA: avgKRA,
                score: Math.round(score),
                productivityIndex: Number(productivityIndex.toFixed(2)),
                reportCount: reports.length
            };
        });

        // Calculate Team Benchmarks
        const teamMetrics = {
            avgProductivity: analysis.length > 0 ? analysis.reduce((acc: number, curr: any) => acc + curr.productivityIndex, 0) / analysis.length : 0,
            topPerformers: [...analysis].sort((a, b) => b.score - a.score).slice(0, 3),
            efficiencyLeaders: [...analysis].sort((a, b) => b.productivityIndex - a.productivityIndex).slice(0, 3)
        };

        return NextResponse.json({
            range: { startDate, endDate },
            individualAnalysis: analysis,
            teamSummary: teamMetrics
        });
    } catch (error: any) {
        console.error('Productivity API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
