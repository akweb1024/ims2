import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

const PERIOD_MONTHS = {
    '3m': 3,
    '6m': 6,
    '12m': 12,
} as const;

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            const now = new Date();
            const requestedPeriod = (req.nextUrl.searchParams.get('period') || '12m') as keyof typeof PERIOD_MONTHS;
            const period = requestedPeriod in PERIOD_MONTHS ? requestedPeriod : '12m';
            const monthsToInclude = PERIOD_MONTHS[period];
            const rangeStart = new Date();
            rangeStart.setMonth(now.getMonth() - (monthsToInclude - 1));
            rangeStart.setDate(1);

            // 1. Fetch Expenses (FinancialRecord where type is EXPENSE)
            const expenses = await prisma.financialRecord.findMany({
                where: {
                    companyId: companyId || undefined,
                    type: 'EXPENSE',
                    date: { gte: rangeStart },
                    status: 'COMPLETED'
                },
                orderBy: { date: 'asc' }
            });

            // 2. Fetch Revenue (RevenueTransaction) for more granular control
            // We want both Verified (Actual Revenue) and Pending (Forecast/Pipeline)
            const revenues = await prisma.revenueTransaction.findMany({
                where: {
                    companyId: companyId || undefined,
                    paymentDate: { gte: rangeStart }
                },
                orderBy: { paymentDate: 'asc' }
            });

            // 3. Aggregate Key Metrics
            const totalVerifiedRevenue = revenues
                .filter(r => r.verificationStatus === 'VERIFIED')
                .reduce((sum, r) => sum + r.amount, 0);

            const totalPendingRevenue = revenues
                .filter(r => r.verificationStatus === 'UNVERIFIED' || r.verificationStatus === 'NEEDS_PROOF')
                .reduce((sum, r) => sum + r.amount, 0);

            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

            const netCashFlow = totalVerifiedRevenue - totalExpenses;

            // Burn Rate (Average Monthly Expense over the trailing three months, or fewer if the period is shorter)
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(now.getMonth() - 3);
            const recentExpenses = expenses
                .filter(e => e.date >= threeMonthsAgo)
                .reduce((sum, e) => sum + e.amount, 0);
            const burnRateWindow = Math.min(3, monthsToInclude);
            const burnRate = recentExpenses / burnRateWindow;

            // 4. Monthly Trend Data (Revenue vs Expense)
            const monthlyData: Record<string, { month: string, revenue: number, expense: number, pending: number }> = {};

            // Initialize selected period map
            for (let i = 0; i < monthsToInclude; i++) {
                const d = new Date(rangeStart);
                d.setMonth(rangeStart.getMonth() + i);
                const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                monthlyData[key] = {
                    month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
                    revenue: 0,
                    expense: 0,
                    pending: 0
                };
            }

            // Fill Expenses
            expenses.forEach(rec => {
                const key = `${rec.date.getFullYear()}-${(rec.date.getMonth() + 1).toString().padStart(2, '0')}`;
                if (monthlyData[key]) {
                    monthlyData[key].expense += rec.amount;
                }
            });

            // Fill Revenue
            revenues.forEach(rec => {
                const key = `${rec.paymentDate.getFullYear()}-${(rec.paymentDate.getMonth() + 1).toString().padStart(2, '0')}`;
                if (monthlyData[key]) {
                    if (rec.verificationStatus === 'VERIFIED') {
                        monthlyData[key].revenue += rec.amount;
                    } else if (rec.verificationStatus === 'UNVERIFIED' || rec.verificationStatus === 'NEEDS_PROOF') {
                        monthlyData[key].pending += rec.amount;
                    }
                }
            });

            const actuals = Object.values(monthlyData);

            // 5. Forecast (Simple Projection)
            // Based on avg growth of verified revenue
            const trailingWindow = actuals.slice(-Math.min(3, actuals.length));
            const divisor = trailingWindow.length || 1;
            const avgRev = trailingWindow.reduce((a, b) => a + b.revenue, 0) / divisor || 0;
            const avgExp = trailingWindow.reduce((a, b) => a + b.expense, 0) / divisor || 0;

            const forecast = [];
            for (let i = 1; i <= 3; i++) {
                const d = new Date();
                d.setMonth(now.getMonth() + i);
                forecast.push({
                    month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
                    projectedRevenue: Number((avgRev * (1 + (i * 0.05))).toFixed(2)), // +5% growth
                    projectedExpense: Number((avgExp * (1 + (i * 0.02))).toFixed(2)), // +2% inflation
                    isForecast: true
                });
            }

            // 6. Composition Data (Revenue Sources)
            // Group by revenueType (NEW, RENEWAL, SERVICES, TRAINING, etc.)
            const compositionMap: Record<string, number> = {};
            revenues.forEach(r => {
                if (r.verificationStatus === 'VERIFIED') {
                    // Use revenueType or fallback to description/category
                    // Normalize the name
                    const type = (r.revenueType || 'OTHER').toUpperCase().replace('_', ' ');
                    compositionMap[type] = (compositionMap[type] || 0) + r.amount;
                }
            });

            // If empty, add a placeholder so the chart isn't blank during demo
            if (Object.keys(compositionMap).length === 0 && totalVerifiedRevenue > 0) {
                compositionMap['UNCATEGORIZED'] = totalVerifiedRevenue;
            }

            const revenueComposition = Object.entries(compositionMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value); // Sort by value desc

            // 7. Expense Categories
            const expenseCategories = await prisma.financialRecord.groupBy({
                by: ['category'],
                where: {
                    companyId: companyId || undefined,
                    type: 'EXPENSE',
                    status: 'COMPLETED'
                },
                _sum: { amount: true }
            });

            const expenseComposition = expenseCategories.map(c => ({
                name: c.category || 'UNCATEGORIZED',
                value: c._sum.amount || 0
            })).sort((a, b) => b.value - a.value);

            return NextResponse.json({
                period,
                stats: {
                    totalVerifiedRevenue,
                    totalPendingRevenue,
                    totalExpenses,
                    netCashFlow,
                    burnRate
                },
                charts: {
                    cashFlow: actuals,
                    forecast,
                    revenueComposition,
                    expenseComposition
                }
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
