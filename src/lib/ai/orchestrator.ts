import { prisma } from '@/lib/prisma';

export interface BusinessIntelligenceProfile {
    financials: {
        last6MonthsRevenue: number[];
        avgMonthlyRevenue: number;
        revenueGrowthRate: number;
        totalUnpaidInvoices: number;
    };
    employees: {
        totalCount: number;
        avgDailyProductivity: number;
        topPerformers: any[];
        atRiskEmployees: any[];
        kraComplianceAvg: number;
    };
    customers: {
        activeSubscribers: number;
        churnRiskValue: number;
        upsellOpportunityCount: number;
        engagementScoreAvg: number;
    };
    companyId: string;
}

export class StrategyOrchestrator {
    static async getBusinessProfile(companyId: string): Promise<BusinessIntelligenceProfile> {
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // 1. FINANCIALS
        const payments = await prisma.payment.findMany({
            where: { companyId, paymentDate: { gte: sixMonthsAgo } },
            select: { amount: true, paymentDate: true }
        });

        const monthlyRevenue: Record<string, number> = {};
        payments.forEach(p => {
            const monthKey = `${p.paymentDate.getFullYear()}-${p.paymentDate.getMonth()}`;
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + p.amount;
        });

        const revenueValues = Object.values(monthlyRevenue);
        const avgMonthlyRevenue = revenueValues.length > 0
            ? revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length
            : 0;

        const sortedMonths = Object.keys(monthlyRevenue).sort();
        let growthRate = 0;
        if (sortedMonths.length >= 2) {
            const latest = monthlyRevenue[sortedMonths[sortedMonths.length - 1]];
            const previous = monthlyRevenue[sortedMonths[sortedMonths.length - 2]];
            growthRate = previous > 0 ? ((latest - previous) / previous) * 100 : 0;
        }

        const unpaidInvoices = await prisma.invoice.aggregate({
            where: { companyId, status: { not: 'PAID' } as any },
            _sum: { total: true }
        });

        // 2. EMPLOYEES
        const employees = await prisma.employeeProfile.findMany({
            where: { user: { companyId, isActive: true } },
            include: {
                pointLogs: { where: { date: { gte: sixMonthsAgo } } },
                workReports: { where: { date: { gte: new Date(today.getTime() - 30 * 86400000) } } },
                user: { select: { name: true, email: true } }
            }
        });

        const employeeAggregates = employees.map(emp => {
            const totalPoints = (emp as any).pointLogs?.reduce((sum: number, log: any) => sum + (log.points || 0), 0) || 0;
            const avgKRA = (emp as any).workReports?.length > 0
                ? (emp as any).workReports.reduce((sum: number, r: any) => sum + (r.kraMatchRatio || 0), 0) / (emp as any).workReports.length
                : 0;

            return {
                id: emp.id,
                name: (emp as any).user?.name || (emp as any).user?.email?.split('@')[0] || emp.employeeId,
                totalPoints,
                avgKRA,
                reportCount: (emp as any).workReports?.length || 0
            };
        });

        const topPerformers = [...employeeAggregates]
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 5);

        const atRiskEmployees = employeeAggregates
            .filter(e => (e.reportCount < 5 && e.avgKRA < 0.4))
            .slice(0, 3);

        const kraComplianceAvg = employeeAggregates.length > 0
            ? employeeAggregates.reduce((sum, e) => sum + e.avgKRA, 0) / employeeAggregates.length
            : 0;

        // 3. CUSTOMERS
        const activeSubs = await prisma.subscription.count({
            where: { companyId, status: 'ACTIVE' }
        });

        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

        const churnRiskSubs = await prisma.subscription.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                endDate: { lte: sixtyDaysFromNow, gte: today }
            },
            select: { total: true }
        });

        const churnRiskValue = churnRiskSubs.reduce((sum, s) => sum + (s.total || 0), 0);

        return {
            financials: {
                last6MonthsRevenue: revenueValues,
                avgMonthlyRevenue,
                revenueGrowthRate: growthRate,
                totalUnpaidInvoices: (unpaidInvoices._sum as any)?.total || 0
            },
            employees: {
                totalCount: employees.length,
                avgDailyProductivity: Math.round(kraComplianceAvg * 100),
                topPerformers,
                atRiskEmployees,
                kraComplianceAvg
            },
            customers: {
                activeSubscribers: activeSubs,
                churnRiskValue,
                upsellOpportunityCount: 0,
                engagementScoreAvg: 75
            },
            companyId
        };
    }
}
