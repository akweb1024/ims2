import { BusinessIntelligenceProfile } from './orchestrator';

export interface ActionableInsight {
    type: 'GROWTH' | 'PROFIT' | 'EMPLOYEE' | 'RISK';
    title: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    icon: string;
}

export interface SpeculativeChanges {
    marketingSpendChange: number; // percentage change, e.g. +10 or -15
    supportStaffChange: number;   // headcount change, e.g. +3 or -2
    discountRateChange: number;   // percentage change, e.g. +5 or -5
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

    static simulateSpeculativeScenario(
        profile: BusinessIntelligenceProfile,
        changes: SpeculativeChanges
    ): { simulatedProfile: BusinessIntelligenceProfile; insights: ActionableInsight[] } {
        // Clone current profile values
        const simProfile: BusinessIntelligenceProfile = JSON.parse(JSON.stringify(profile));

        const mSpend = changes.marketingSpendChange / 100; // e.g. +0.10
        const sStaff = changes.supportStaffChange;         // e.g. +3
        const dRate = changes.discountRateChange / 100;   // e.g. +0.05

        // Simulate Marketing spend impact
        // Increasing marketing boosts active subscribers & growth rate, but has diminishing returns
        const marketingSubscriberMultiplier = mSpend > 0 ? (1 + mSpend * 0.4) : (1 + mSpend * 0.6);
        simProfile.customers.activeSubscribers = Math.round(simProfile.customers.activeSubscribers * marketingSubscriberMultiplier);
        simProfile.financials.revenueGrowthRate += mSpend * 12;

        // Simulate Support staff impact
        // More support staff increases daily productivity, decreases at-risk staff, and reduces churn risk
        const productivityBonus = sStaff * 4; // +4% per staff member
        simProfile.employees.avgDailyProductivity = Math.min(100, Math.max(10, simProfile.employees.avgDailyProductivity + productivityBonus));
        simProfile.employees.kraComplianceAvg = simProfile.employees.avgDailyProductivity / 100;
        
        if (sStaff > 0 && simProfile.employees.atRiskEmployees.length > 0) {
            simProfile.employees.atRiskEmployees = simProfile.employees.atRiskEmployees.slice(0, Math.max(0, simProfile.employees.atRiskEmployees.length - sStaff));
        } else if (sStaff < 0) {
            // Add a simulated at-risk employee due to burnout
            simProfile.employees.atRiskEmployees.push({
                id: 'sim-burnout',
                name: 'Systemic Team Burnout Alert',
                totalPoints: 10,
                avgKRA: 0.2,
                reportCount: 1
            });
        }

        const supportChurnReduction = sStaff * 0.05; // 5% less churn per helper
        simProfile.customers.churnRiskValue = Math.max(0, Math.round(simProfile.customers.churnRiskValue * (1 - supportChurnReduction)));

        // Simulate Discount rate impact
        // Higher discount rate increases active subscribers but drops average revenue per customer
        if (dRate > 0) {
            simProfile.customers.activeSubscribers = Math.round(simProfile.customers.activeSubscribers * (1 + dRate * 0.8));
            simProfile.financials.avgMonthlyRevenue = simProfile.financials.avgMonthlyRevenue * (1 - dRate * 0.3);
            simProfile.customers.churnRiskValue = Math.max(0, Math.round(simProfile.customers.churnRiskValue * (1 - dRate * 0.5)));
        } else if (dRate < 0) {
            simProfile.customers.activeSubscribers = Math.round(simProfile.customers.activeSubscribers * (1 + dRate * 1.2));
            simProfile.financials.avgMonthlyRevenue = simProfile.financials.avgMonthlyRevenue * (1 - dRate * 0.1);
            simProfile.customers.churnRiskValue = Math.round(simProfile.customers.churnRiskValue * (1 - dRate * 0.8));
        }

        // Recalculate average monthly revenue and last 6 months list based on active subscribers multiplier
        const generalMultiplier = (simProfile.customers.activeSubscribers / (profile.customers.activeSubscribers || 1));
        simProfile.financials.avgMonthlyRevenue = Math.round(simProfile.financials.avgMonthlyRevenue * generalMultiplier);
        simProfile.financials.last6MonthsRevenue = simProfile.financials.last6MonthsRevenue.map(rev => Math.round(rev * generalMultiplier));

        // Generate insights on simulated data
        const insights = this.generateStrategies(simProfile);

        // Add sandbox-specific insights
        if (mSpend > 0.2) {
            insights.push({
                type: 'GROWTH',
                title: 'High Expansion Cost Warning',
                description: `Aggressive marketing spend (+${changes.marketingSpendChange}%) generates higher subscriber volumes, but verify customer acquisition costs (CAC) match your margins.`,
                impact: 'MEDIUM',
                action: 'Set up strict daily acquisition budget caps.',
                icon: '⚡'
            });
        }
        if (sStaff < -2) {
            insights.push({
                type: 'RISK',
                title: 'Extreme Understaffing Risk',
                description: 'Drastic reductions in support headcount will cause critical tickets to backlog, leading to a projected spike in churn value.',
                impact: 'HIGH',
                action: 'Cancel headcount reduction or hire temporary contract staff.',
                icon: '🚨'
            });
        }
        if (dRate > 0.15) {
            insights.push({
                type: 'PROFIT',
                title: 'Margin Erosion Danger',
                description: `Discounts above 15% increase conversion rates but lead to long-term contract value dilution.`,
                impact: 'HIGH',
                action: 'Implement multi-year subscription lock-ins to offset discount dilution.',
                icon: '⚠️'
            });
        }

        return {
            simulatedProfile: simProfile,
            insights: insights.sort((a, b) => {
                const priority = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                return priority[b.impact] - priority[a.impact];
            })
        };
    }
}

