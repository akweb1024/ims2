import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            const now = new Date();
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(now.getMonth() - 11);
            twelveMonthsAgo.setDate(1);

            // 1. Fetch Expenses (FinancialRecord where type is EXPENSE)
            const expenses = await prisma.financialRecord.findMany({
                where: {
                    companyId: companyId || undefined,
                    type: 'EXPENSE',
                    date: { gte: twelveMonthsAgo },
                    status: 'COMPLETED'
                },
                orderBy: { date: 'asc' }
            });

            // 2. Fetch Revenue (RevenueTransaction) for more granular control
            // We want both Verified (Actual Revenue) and Pending (Forecast/Pipeline)
            const revenues = await prisma.revenueTransaction.findMany({
                where: {
                    companyId: companyId || undefined,
                    paymentDate: { gte: twelveMonthsAgo }
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

            // Burn Rate (Average Monthly Expense over last 3 months)
            // Simplified logic: Total Expenses / 12 (or however many months found)
            // Better: Filter last 3 months
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(now.getMonth() - 3);
            const recentExpenses = expenses
                .filter(e => e.date >= threeMonthsAgo)
                .reduce((sum, e) => sum + e.amount, 0);
            const burnRate = recentExpenses / 3;

            // 4. Monthly Trend Data (Revenue vs Expense)
            const monthlyData: Record<string, { month: string, revenue: number, expense: number, pending: number }> = {};

            // Initialize last 12 months map
            for (let i = 0; i < 12; i++) {
                const d = new Date(twelveMonthsAgo);
                d.setMonth(twelveMonthsAgo.getMonth() + i);
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
            const last3MonthsData = actuals.slice(-3);
            const avgRev = last3MonthsData.reduce((a, b) => a + b.revenue, 0) / 3 || 0;
            const avgExp = last3MonthsData.reduce((a, b) => a + b.expense, 0) / 3 || 0;

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
