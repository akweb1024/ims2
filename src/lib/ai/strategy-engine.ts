import { BusinessIntelligenceProfile } from './orchestrator';

export interface ActionableInsight {
    type: 'GROWTH' | 'PROFIT' | 'EMPLOYEE' | 'RISK';
    title: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    icon: string;
}

export class StrategyEngine {
    static generateStrategies(profile: BusinessIntelligenceProfile): ActionableInsight[] {
        const insights: ActionableInsight[] = [];

        // 1. FINANCIAL / PROFIT INSIGHTS
        if (profile.financials.revenueGrowthRate < 0) {
            insights.push({
                type: 'PROFIT',
                title: 'Revenue Downturn Detected',
                description: `Company revenue has dropped by ${Math.abs(profile.financials.revenueGrowthRate).toFixed(1)}% compared to last month.`,
                impact: 'HIGH',
                action: 'Review client retention and pending invoice collections immediately.',
                icon: '📉'
            });
        }

        if (profile.financials.totalUnpaidInvoices > profile.financials.avgMonthlyRevenue * 0.5) {
            insights.push({
                type: 'PROFIT',
                title: 'High Accounts Receivable',
                description: `Total unpaid invoices (₹${profile.financials.totalUnpaidInvoices.toLocaleString()}) exceed 50% of average monthly revenue.`,
                impact: 'HIGH',
                action: 'Trigger automatic payment reminders and follow up with top 5 debtors.',
                icon: '💸'
            });
        }

        // 2. EMPLOYEE OPTIMIZATION
        if (profile.employees.kraComplianceAvg < 0.6) {
            insights.push({
                type: 'EMPLOYEE',
                title: 'KRA Alignment Drift',
                description: `Team tasks are only ${(profile.employees.kraComplianceAvg * 100).toFixed(0)}% aligned with their defined KRAs.`,
                impact: 'MEDIUM',
                action: 'Hold a KRA review meeting to realign team focus with company goals.',
                icon: '🎯'
            });
        }

        profile.employees.atRiskEmployees.forEach(emp => {
            insights.push({
                type: 'EMPLOYEE',
                title: `Performance Dip: ${emp.name}`,
                description: `${emp.name} has low attendance and KRA compliance this period.`,
                impact: 'MEDIUM',
                action: 'Schedule a one-on-one mentorship session to identify bottlenecks.',
                icon: '👤'
            });
        });

        // 3. COMPANY GROWTH
        if (profile.financials.revenueGrowthRate > 5) {
            insights.push({
                type: 'GROWTH',
                title: 'Strong Growth Momentum',
                description: `Steady ${profile.financials.revenueGrowthRate.toFixed(1)}% growth indicates market fit.`,
                impact: 'HIGH',
                action: 'Consider reinvesting 15% of surplus into high-margin service expansion.',
                icon: '🚀'
            });
        }

        if (profile.customers.churnRiskValue > profile.financials.avgMonthlyRevenue * 0.2) {
            insights.push({
                type: 'RISK',
                title: 'Critical Churn Concentration',
                description: `₹${profile.customers.churnRiskValue.toLocaleString()} worth of subscriptions expire within 60 days.`,
                impact: 'HIGH',
                action: 'Personalized outreach from senior management to top at-risk accounts.',
                icon: '⚠️'
            });
        }

        return insights.sort((a, b) => {
            const priority = { HIGH: 3, MEDIUM: 2, LOW: 1 };
            return priority[b.impact] - priority[a.impact];
        });
    }
}
