import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { getDownlineUserIds } from '@/lib/hierarchy';

interface WorkReportAgg {
    hours: number;
    rating: number;
    tickets: number;
    chats: number;
    followups: number;
}

type PerformanceMetrics = {
    tasks: number;
    tickets: number;
    revenue: number;
    rating: number;
    ratingCount: number;
    hours: number;
    kraCompliance: number;
};

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'HR_ADMIN'].includes(user.role)) {
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
            const workforceWhere: any = { user: { isActive: true } };
            const reportWhere: any = { date: { gte: startOfMonth } };

            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                workforceWhere.userId = { in: subIds };
                reportWhere.employee = { userId: { in: subIds } };
            } else if (user.role !== 'SUPER_ADMIN' && user.companyId) {
                workforceWhere.user.companyId = user.companyId;
                reportWhere.companyId = user.companyId;
            }

            const activeEmployees = await prisma.employeeProfile.count({
                where: workforceWhere
            });

            // Avg Productivity & Support Activity
            const recentReports = await prisma.workReport.findMany({
                where: reportWhere,
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

            const aggData = (recentReports as any[]).reduce((acc: WorkReportAgg, curr: any) => ({
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
                where: {
                    status: 'ACTIVE',
                    ...(user.role !== 'SUPER_ADMIN' ? { companyId: user.companyId } : {})
                }
            });

            // 4. AI DECISION FEED (Aggregated Risks)
            // -- Flight Risk (High Severity Only)
            const employees = await prisma.employeeProfile.findMany({
                where: workforceWhere,
                include: { attendance: { take: 30, orderBy: { date: 'desc' } } }
            });
            const flightRisks = employees.filter((e: any) => {
                const present = e.attendance.filter((a: any) => a.status === 'PRESENT').length;
                return (present / 30) < 0.5; // Critical attendance
            }).map((e: any) => ({
                id: e.id,
                type: 'HR_ALERT',
                title: 'Critical Flight Risk',
                description: `Employee ${e.employeeId || 'Unknown'} has < 50% attendance.`,
                action: 'Review / Replacement',
                severity: 'critical'
            }));

            // -- Churn Risk (High Value)
            const subscriptionFilter = (user.role !== 'SUPER_ADMIN' && user.companyId) ? { companyId: user.companyId } : {};
            const expiringSubs = await prisma.subscription.findMany({
                where: {
                    status: 'ACTIVE',
                    endDate: { lte: new Date(Date.now() + 86400000 * 30) },
                    total: { gte: 10000 },
                    ...subscriptionFilter
                },
                include: { customerProfile: true }
            });
            const revenueRisks = expiringSubs.map((s: any) => ({
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
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const where: any = { user: { isActive: true } };
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                where.userId = { in: subIds };
            } else if (user.companyId) {
                where.user.companyId = user.companyId;
            }

            // 1. Team Performance Aggregation
            const employees = await prisma.employeeProfile.findMany({
                where,
                include: {
                    workReports: {
                        where: { date: { gte: startOfMonth } }
                    },
                    user: { select: { name: true, email: true } }
                }
            });

            const metrics = employees.map(emp => {
                const reports = emp.workReports;
                const avgCompliance = reports.length ?
                    reports.reduce((acc, curr) => acc + (curr.kraMatchRatio || 0), 0) / reports.length : 0;
                const totalRevenue = reports.reduce((acc, curr) => acc + (curr.revenueGenerated || 0), 0);

                return {
                    name: (emp as any).user?.name || (emp as any).user?.email?.split('@')[0],
                    role: (emp as any).designation || (emp as any).user?.role,
                    avgCompliance,
                    totalRevenue,
                    reportCount: reports.length
                };
            });

            // 2. High Value Alerts
            const lowCompliance = metrics.filter(m => m.reportCount > 3 && m.avgCompliance < 0.4);
            const highContributors = metrics.filter(m => m.totalRevenue > 20000 || (m.avgCompliance > 0.8 && m.reportCount > 5));

            const insights = [
                ...lowCompliance.map(m => ({
                    title: `KRA Drift: ${m.name}`,
                    description: `${m.name} is consistently logging tasks that don't align with their defined KRA (${(m.avgCompliance * 100).toFixed(0)}% match).`,
                    severity: 'warning',
                    icon: '🎯'
                })),
                ...highContributors.map(m => ({
                    title: `Elite Performer: ${m.name}`,
                    description: `${m.name} shows exceptional alignment and contribution this month.`,
                    severity: 'success',
                    icon: '⭐'
                }))
            ];

            return NextResponse.json({
                metrics: {
                    avgDailyProductivity: (metrics.reduce((acc, m) => acc + m.reportCount, 0) / (employees.length || 1)).toFixed(1),
                    flightRiskCount: employees.length - metrics.filter(m => m.reportCount > 10).length,
                    teamCount: employees.length
                },
                insights: insights.slice(0, 5),
                teamAnalysis: Object.entries(
                    metrics.reduce((acc: any, curr) => {
                        const role = curr.role || 'Unspecified';
                        if (!acc[role]) {
                            acc[role] = { headcount: 0, totalRating: 0, totalAttendance: 0 };
                        }
                        acc[role].headcount += 1;
                        acc[role].totalRating += (curr.avgCompliance * 5);
                        acc[role].totalAttendance += curr.reportCount;
                        return acc;
                    }, {})
                ).map(([role, data]: [string, any]) => ({
                    role,
                    headcount: data.headcount,
                    avgRating: (data.totalRating / data.headcount).toFixed(1),
                    avgAttendance: Math.round(data.totalAttendance / data.headcount)
                }))
            });
        }
        if (type === 'productivity') {
            const { searchParams } = new URL(req.url);
            const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();

            const where: any = { user: { isActive: true } };
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                where.userId = { in: subIds };
            } else if (user.companyId) {
                where.user.companyId = user.companyId;
            }

            const employees = await prisma.employeeProfile.findMany({
                where,
                include: {
                    user: { select: { name: true, email: true } as any },
                    workReports: {
                        where: { date: { gte: startDate, lte: endDate } }
                    }
                }
            });

            const analysis = (employees as any[]).map((emp) => {
                const reports = emp.workReports;
                const totals = reports.reduce((acc: PerformanceMetrics, curr: any) => ({
                    tasks: acc.tasks + (curr.tasksCompleted || 0),
                    tickets: acc.tickets + (curr.ticketsResolved || 0),
                    revenue: acc.revenue + (curr.revenueGenerated || 0),
                    rating: acc.rating + (curr.managerRating || 0),
                    ratingCount: acc.ratingCount + (curr.managerRating ? 1 : 0),
                    hours: acc.hours + (curr.hoursSpent || 0),
                    kraCompliance: acc.kraCompliance + (curr.kraMatchRatio || 0)
                }), { tasks: 0, tickets: 0, revenue: 0, rating: 0, ratingCount: 0, hours: 0, kraCompliance: 0 });

                const avgRating = totals.ratingCount > 0 ? totals.rating / totals.ratingCount : 0;
                const avgKRA = reports.length > 0 ? totals.kraCompliance / reports.length : 0;
                const score = (totals.tasks * 20) + (totals.tickets * 25) + (totals.revenue * 0.05) + (avgRating * 50) + (avgKRA * 100);

                return {
                    id: emp.id,
                    name: emp.user.name || emp.user.email.split('@')[0],
                    score,
                    metrics: totals,
                    avgRating,
                    avgKRA
                };
            }).sort((a, b) => b.score - a.score);

            const topPerformers = analysis.slice(0, 3);
            const lowPerformers = analysis.filter((emp: any) => emp.score < 50 || emp.avgRating < 2.5);

            const summaries = topPerformers.map((emp) => {
                const reasons = [];
                if (emp.metrics.revenue > 10000) reasons.push(`generating ₹${emp.metrics.revenue.toLocaleString()} in revenue`);
                if (emp.metrics.tasks > 20) reasons.push(`completing ${emp.metrics.tasks} high-priority tasks`);
                if (emp.metrics.tickets > 10) reasons.push(`resolving ${emp.metrics.tickets} support tickets`);
                if (emp.avgRating >= 4.5) reasons.push(`maintaining near-perfect quality ratings (★${emp.avgRating.toFixed(1)})`);

                const reasonText = reasons.length > 0
                    ? `due to ${reasons.join(', ')}.`
                    : "showing consistent performance across all operational categories.";

                return `**${emp.name}** is currently trending high ${reasonText}`;
            });

            const warnings = lowPerformers.map((emp: any) => {
                const redFlags = [];
                if (emp.metrics.hours > 40 && emp.score < 20) redFlags.push("high activity but critically low output");
                if (emp.avgRating > 0 && emp.avgRating < 2) redFlags.push(`critically low manager satisfaction (★${emp.avgRating.toFixed(1)})`);
                if (emp.metrics.hours === 0) redFlags.push("zero operational artifacts logged in this period");

                const warningText = redFlags.length > 0
                    ? `flagged for ${redFlags.join(', ')}.`
                    : "showing a significant drop in operational velocity.";

                return {
                    id: emp.id,
                    name: emp.name,
                    description: warningText,
                    severity: emp.avgRating < 1.5 ? 'critical' : 'warning'
                };
            });

            return NextResponse.json({
                summaries,
                warnings,
                timestamp: new Date().toISOString(),
                model: "STM-Productivity-Gen-2.1"
            });
        }

        if (type === 'consultant') {
            const { StrategyOrchestrator } = await import('@/lib/ai/orchestrator');
            const { StrategyEngine } = await import('@/lib/ai/strategy-engine');

            const profile = await StrategyOrchestrator.getBusinessProfile(user.companyId || '');
            const insightfulStrategies = StrategyEngine.generateStrategies(profile);

            return NextResponse.json({
                profile,
                insights: insightfulStrategies,
                timestamp: new Date().toISOString()
            });
        }

        // SALES / ORIGINAL LOGIC
        // ... (existing code)
        const companyFilter = (user.role !== 'SUPER_ADMIN' && user.companyId) ? { companyId: user.companyId } : {};

        // Get last 6 months revenue
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const payments = await prisma.payment.findMany({
            where: {
                paymentDate: { gte: sixMonthsAgo },
                ...companyFilter
            },
            select: { amount: true, paymentDate: true }
        });

        // Group by month
        const monthlyRevenue: Record<string, number> = {};
        payments.forEach((p) => {
            const key = `${p.paymentDate.getFullYear()}-${p.paymentDate.getMonth()}`;
            monthlyRevenue[key] = (monthlyRevenue[key] || 0) + p.amount;
        });

        const revenueValues = Object.values(monthlyRevenue);
        const currentAvg = revenueValues.length > 0
            ? revenueValues.reduce((a: number, b: number) => a + b, 0) / revenueValues.length
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
                endDate: { lte: sixtyDaysFromNow, gte: new Date() },
                ...companyFilter
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
            .filter((sub: any) => {
                const recentPositiveComms = sub.customerProfile.communications.some((c: any) =>
                    ['Renewal confirmed', 'Interested'].includes(c.outcome || '')
                );
                return !recentPositiveComms; // Risk if no recent positive signs
            })
            .map((sub: any) => ({
                id: sub.customerProfile.id,
                name: sub.customerProfile.name,
                reason: `Subscription expires in ${Math.ceil((sub.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days with no detailed positive engagement log.`,
                value: sub.total,
                type: 'churn'
            }));

        // 3. Identify Upsell Opportunities
        // Logic: Customers who have logged "Interested" in potential new products in Comm Logs
        const interestedCustomers = await prisma.customerProfile.findMany({
            where: {
                communications: {
                    some: {
                        outcome: 'Interested',
                        date: { gte: sixMonthsAgo }
                    }
                },
                ...companyFilter
            },
            select: { id: true, name: true }
        });

        const upsellOpportunities = interestedCustomers.map((c: any) => ({
            id: c.id,
            name: c.name,
            reason: 'Expressed interest in recent communications.',
            value: 5000, // Estimated value
            type: 'upsell'
        }));


        const totalChurnRiskValue = churnRisks.reduce((acc: number, c: any) => acc + c.value, 0);
        const totalUpsellValue = upsellOpportunities.reduce((acc: number, c: any) => acc + c.value, 0);

        const insights = [
            ...churnRisks.slice(0, 3).map((i: any) => ({ ...i, severity: 'high', icon: '⚠️', title: `Churn Risk: ${i.name}`, description: i.reason })),
            ...upsellOpportunities.slice(0, 3).map((i: any) => ({ ...i, severity: 'medium', icon: '🚀', title: `Upsell: ${i.name}`, description: i.reason }))
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

    } catch (error) {
        console.error('AI Insights Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
