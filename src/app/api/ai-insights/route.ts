import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_EXECUTIVE', 'HR_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'sales';

        if (type === 'executive') {
            // EXECUTIVE COMMAND CENTER DATA
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

            // 1. FINANCIAL HEALTH
            const currentMonthPayments = await prisma.payment.aggregate({
                where: { paymentDate: { gte: startOfMonth } },
                _sum: { amount: true }
            });
            const lastMonthPayments = await prisma.payment.aggregate({
                where: { paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
                _sum: { amount: true }
            });

            const currentRevenue = currentMonthPayments._sum.amount || 0;
            const lastRevenue = lastMonthPayments._sum.amount || 0;
            const growthParams = lastRevenue === 0 ? 100 : ((currentRevenue - lastRevenue) / lastRevenue) * 100;

            // 2. OPERATIONAL PULSE (HR)
            const activeEmployees = await prisma.employeeProfile.count({
                where: {
                    user: {
                        isActive: true,
                        ...(user.role !== 'SUPER_ADMIN' ? { companyId: user.companyId } : {})
                    }
                }
            });

            // Avg Productivity & Support Activity
            const recentReports = await prisma.workReport.findMany({
                where: {
                    date: { gte: startOfMonth },
                    ...(user.role !== 'SUPER_ADMIN' ? { companyId: user.companyId } : {})
                },
                select: {
                    hoursSpent: true,
                    selfRating: true,
                    revenueGenerated: true,
                    tasksCompleted: true,
                    ticketsResolved: true,
                    chatsHandled: true,
                    followUpsCompleted: true
                }
            });

            const aggData = (recentReports as any[]).reduce((acc: any, curr: any) => ({
                hours: acc.hours + (curr.hoursSpent || 0),
                rating: acc.rating + (curr.selfRating || 0),
                tickets: acc.tickets + (curr.ticketsResolved || 0),
                chats: acc.chats + (curr.chatsHandled || 0),
                followups: acc.followups + (curr.followUpsCompleted || 0)
            }), { hours: 0, rating: 0, tickets: 0, chats: 0, followups: 0 });

            const productivityScore = recentReports.length ? (aggData.rating / recentReports.length).toFixed(1) : 0;
            const supportVelocity = recentReports.length ? ((aggData.tickets + aggData.chats + aggData.followups) / recentReports.length).toFixed(1) : 0;

            // 3. MARKET REACH (Customers)
            const activeSubscribers = await prisma.subscription.count({
                where: { status: 'ACTIVE' }
            });

            // 4. AI DECISION FEED (Aggregated Risks)
            // -- Flight Risk (High Severity Only)
            const employees = await prisma.employeeProfile.findMany({
                where: { user: { isActive: true } },
                include: { attendance: { take: 30, orderBy: { date: 'desc' } } }
            });
            const flightRisks = employees.filter(e => {
                const present = e.attendance.filter(a => a.status === 'PRESENT').length;
                return (present / 30) < 0.5; // Critical attendance
            }).map(e => ({
                id: e.id,
                type: 'HR_ALERT',
                title: 'Critical Flight Risk',
                description: `Employee ${e.employeeId || 'Unknown'} has < 50% attendance.`,
                action: 'Review / Replacement',
                severity: 'critical'
            }));

            // -- Churn Risk (High Value)
            const expiringSubs = await prisma.subscription.findMany({
                where: { status: 'ACTIVE', endDate: { lte: new Date(Date.now() + 86400000 * 30) }, total: { gte: 10000 } },
                include: { customerProfile: true }
            });
            const revenueRisks = expiringSubs.map(s => ({
                id: s.id,
                type: 'REVENUE_ALERT',
                title: 'High Value Churn',
                description: `${s.customerProfile.name} subscription of ₹${s.total} expires soon.`,
                action: 'Trigger Retention Sequence',
                severity: 'critical'
            }));

            return NextResponse.json({
                metrics: {
                    revenue: { current: currentRevenue, growth: growthParams.toFixed(1) },
                    workforce: { headcount: activeEmployees, productivityIndex: productivityScore, supportVelocity },
                    market: { activeClients: activeSubscribers }
                },
                decisionFeed: [...flightRisks, ...revenueRisks].slice(0, 5)
            });
        }

        if (type === 'hr') {
            // HR AI MODEL SIMULATION
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Fetch comprehensive data
            const employees = await prisma.employeeProfile.findMany({
                where: { user: { isActive: true } },
                include: {
                    user: { select: { email: true, role: true } },
                    attendance: { where: { date: { gte: thirtyDaysAgo } } },
                    performance: { orderBy: { date: 'desc' }, take: 1 },
                    workReports: { where: { date: { gte: thirtyDaysAgo } } }
                }
            });

            // 1. FLIGHT RISK & PRODUCTIVITY (Original Logic Optimized)
            const flightRisks: any[] = [];
            let totalHours = 0;
            let totalReports = 0;

            // 2. TEAM PERFORMANCE BREAKDOWN
            const teamStats: Record<string, { count: number, totalRating: number, totalAttendance: number, activeUsers: number }> = {};

            // 3. TOP PERFORMERS SCORING
            const scoredEmployees = (employees as any[]).map(e => {
                // Calc Attendance Rate
                const daysPresent = e.attendance.filter((a: any) => a.status === 'PRESENT').length;
                const attendanceRate = daysPresent / 30;

                // Calc Avg Productivity (Hours) & Revenue Impact
                const empHours = e.workReports.reduce((acc: number, curr: any) => acc + (curr.hoursSpent || 0), 0);

                // Calc Support & Activity Impact
                const empTickets = e.workReports.reduce((acc: number, curr: any) => acc + (curr.ticketsResolved || 0), 0);
                const empChats = e.workReports.reduce((acc: number, curr: any) => acc + (curr.chatsHandled || 0), 0);
                const empFollowUps = e.workReports.reduce((acc: number, curr: any) => acc + (curr.followUpsCompleted || 0), 0);
                const empActivity = empTickets + empChats + empFollowUps;

                totalHours += empHours;
                totalReports += e.workReports.length;

                // Get Average Self Rating as Productivity Proxy
                const avgSelfRating = e.workReports.length > 0
                    ? e.workReports.reduce((acc: number, curr: any) => acc + (curr.selfRating || 0), 0) / e.workReports.length
                    : 0;

                // Get Latest Performance Review Rating
                const reviewRating = e.performance[0]?.rating || 3;

                // Risk Logic: Low attendance OR Low Productivity (Self-Rated < 4 consistently)
                if (attendanceRate < 0.7 || (avgSelfRating > 0 && avgSelfRating < 4)) {
                    flightRisks.push({
                        id: e.id,
                        name: e.user.email,
                        reason: attendanceRate < 0.7 ? 'Low Attendance' : 'Low Daily Productivity',
                        severity: attendanceRate < 0.5 ? 'critical' : 'warning'
                    });
                }

                // Team Stats Aggregation
                const role = e.user.role;
                if (!teamStats[role]) teamStats[role] = { count: 0, totalRating: 0, totalAttendance: 0, activeUsers: 0 };
                teamStats[role].count++;
                teamStats[role].totalRating += reviewRating;
                teamStats[role].totalAttendance += attendanceRate;
                if (e.user.isActive) teamStats[role].activeUsers++;

                // Score for Leaderboard (New Weighted Formula)
                // 30% Review | 20% Hours | 30% Support/Activity | 15% Consistency | 5% Attendance
                const outputScore = Math.min(empHours / 160, 1) * 5; // Hours
                const activityScore = Math.min(empActivity / 50, 1) * 5; // Support impact (normalized to 50 items/month)
                const consistencyScore = (avgSelfRating / 10) * 5;

                const score = (reviewRating * 0.3) +
                    (outputScore * 0.2) +
                    (activityScore * 0.3) +
                    (consistencyScore * 0.15) +
                    (attendanceRate * 5 * 0.05);

                return {
                    id: e.id,
                    email: e.user.email,
                    role: e.user.role,
                    score: score * 20, // Scale to 100
                    metrics: {
                        rating: reviewRating,
                        attendanceRate,
                        hours: empHours,
                        productivity: avgSelfRating,
                        activity: empActivity
                    }
                };
            });

            // Sort Top Performers
            const topPerformers = scoredEmployees
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map(e => ({
                    name: e.email.split('@')[0],
                    role: e.role,
                    score: e.score.toFixed(1),
                    details: `⭐ ${e.metrics.rating}/5 • 🕒 ${(e.metrics.attendanceRate * 100).toFixed(0)}% Att.`
                }));

            // Format Team Stats
            const teamAnalysis = Object.entries(teamStats).map(([role, stat]) => ({
                role: role.replace('_', ' '),
                headcount: stat.count,
                avgRating: (stat.totalRating / stat.count).toFixed(1),
                avgAttendance: ((stat.totalAttendance / stat.count) * 100).toFixed(0) + '%'
            }));

            // Global Metrics
            const avgDailyProductivity = employees.length > 0 && totalReports > 0
                ? (totalHours / totalReports).toFixed(1) // Avg hours per report ~ daily
                : 0;

            const insights = flightRisks.map(r => ({
                id: r.id,
                title: `Risk: ${r.name.split('@')[0]}`,
                description: `${r.reason} detected in last 30 days.`,
                severity: r.severity,
                icon: '📉'
            }));

            return NextResponse.json({
                metrics: {
                    flightRiskCount: flightRisks.length,
                    avgDailyProductivity,
                    activeWorkforce: employees.length,
                    teamCount: Object.keys(teamStats).length
                },
                insights: insights,
                teamAnalysis,
                topPerformers
            });
        }

        // SALES / ORIGINAL LOGIC
        // 1. Calculate Projected Revenue (Simple Forecast)
        // Get last 6 months revenue
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const payments = await prisma.payment.findMany({
            where: { paymentDate: { gte: sixMonthsAgo } },
            select: { amount: true, paymentDate: true }
        });

        // Group by month
        const monthlyRevenue: Record<string, number> = {};
        payments.forEach(p => {
            const key = `${p.paymentDate.getFullYear()}-${p.paymentDate.getMonth()}`;
            monthlyRevenue[key] = (monthlyRevenue[key] || 0) + p.amount;
        });

        const revenueValues = Object.values(monthlyRevenue);
        const currentAvg = revenueValues.length > 0
            ? revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length
            : 0;

        // Simple projection: Avg + 10% growth
        const projectedRevenue = currentAvg * 1.1;
        const growthRate = 10; // Hardcoded expectation for this heuristic

        // 2. Identify Churn Risks
        // Logic: Active accounts expiring in < 60 days with NO "Renewal confirmed" or "Inteested" outcome in last 90 days log
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

        const expiringSubs = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                endDate: { lte: sixtyDaysFromNow, gte: new Date() }
            },
            include: {
                customerProfile: {
                    include: {
                        communications: {
                            orderBy: { date: 'desc' },
                            take: 5
                        }
                    }
                }
            }
        });

        const churnRisks = expiringSubs
            .filter(sub => {
                const recentPositiveComms = sub.customerProfile.communications.some(c =>
                    ['Renewal confirmed', 'Interested'].includes(c.outcome || '')
                );
                return !recentPositiveComms; // Risk if no recent positive signs
            })
            .map(sub => ({
                id: sub.customerProfile.id,
                name: sub.customerProfile.name,
                reason: `Subscription expires in ${Math.ceil((sub.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days with no detailed positive engagement log.`,
                value: sub.total,
                type: 'churn'
            }));

        // 3. Identify Upsell Opportunities
        // Logic: Customers with > 1 active subscription OR high value single subs, suggesting they are power users
        // For heuristic: Customers with "Interested" outcome recently but no new sub created (simplified)
        // Alternative Heuristic: Institutional customers with large user base (if we had that data) or just high value customers.
        // Let's go with: Customers who have logged "Interested" in potential new products in Comm Logs

        const interestedCustomers = await prisma.customerProfile.findMany({
            where: {
                communications: {
                    some: {
                        outcome: 'Interested',
                        date: { gte: sixMonthsAgo }
                    }
                }
            },
            select: { id: true, name: true }
        });

        const upsellOpportunities = interestedCustomers.map(c => ({
            id: c.id,
            name: c.name,
            reason: 'Expressed interest in recent communications.',
            value: 5000, // Estimated value
            type: 'upsell'
        }));


        const totalChurnRiskValue = churnRisks.reduce((acc, c) => acc + c.value, 0);
        const totalUpsellValue = upsellOpportunities.reduce((acc, c) => acc + c.value, 0);

        const insights = [
            ...churnRisks.slice(0, 3).map(i => ({ ...i, severity: 'high', icon: '⚠️', title: `Churn Risk: ${i.name}`, description: i.reason })),
            ...upsellOpportunities.slice(0, 3).map(i => ({ ...i, severity: 'medium', icon: '🚀', title: `Upsell: ${i.name}`, description: i.reason }))
        ];

        return NextResponse.json({
            metrics: {
                projectedRevenue: Math.round(projectedRevenue),
                projectedGrowth: growthRate,
                churnRiskCount: churnRisks.length,
                churnRiskValue: Math.round(totalChurnRiskValue),
                upsellCount: upsellOpportunities.length,
                upsellPotential: Math.round(totalUpsellValue)
            },
            insights: insights
        });

    } catch (error: any) {
        console.error('AI Insights Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
