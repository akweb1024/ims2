import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId') || user.companyId;

            if (!companyId) {
                return createErrorResponse('Company ID required', 400);
            }

            // 1. Calculate Monthly Revenue (Last 12 Months)
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
            twelveMonthsAgo.setDate(1);

            const invoices = await prisma.invoice.groupBy({
                by: ['createdAt'],
                where: {
                    companyId,
                    status: 'PAID',
                    createdAt: { gte: twelveMonthsAgo }
                },
                _sum: { total: true },
            });

            // 2. Calculate Monthly Payroll Expenses (Last 12 Months)
            const payroll = await prisma.salarySlip.groupBy({
                by: ['year', 'month'],
                where: {
                    companyId,
                    status: 'PAID', // Or GENERATED if we track accrual
                },
                _sum: { amountPaid: true, ctc: true },
            });

            // Format Data for Chart
            const months = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const monthName = d.toLocaleString('default', { month: 'short' });
                const year = d.getFullYear();
                const key = `${monthName} ${year}`;

                months.push({ name: key, revenue: 0, expense: 0, profit: 0, monthIndex: d.getMonth() + 1, year });
            }

            // Refetch strictly for aggregation
            const rawInvoices = await prisma.invoice.findMany({
                where: {
                    companyId,
                    status: 'PAID',
                    createdAt: { gte: twelveMonthsAgo }
                },
                select: { total: true, createdAt: true }
            });

            const rawPayroll = await prisma.salarySlip.findMany({
                where: {
                    companyId,
                    year: { gte: twelveMonthsAgo.getFullYear() },
                },
                select: { amountPaid: true, ctc: true, month: true, year: true }
            });

            // Populate Months
            months.forEach(m => {
                // Revenue Aggregation
                const monthlyInvoices = rawInvoices.filter(inv => {
                    const d = new Date(inv.createdAt);
                    return d.getMonth() + 1 === m.monthIndex && d.getFullYear() === m.year;
                });
                m.revenue = monthlyInvoices.reduce((sum, inv) => sum + inv.total, 0);

                // Expense Aggregation (Payroll)
                const monthlyPayroll = rawPayroll.filter(p => p.month === m.monthIndex && p.year === m.year);
                m.expense = monthlyPayroll.reduce((sum, p) => sum + (p.ctc || p.amountPaid), 0);

                // Profit
                m.profit = m.revenue - m.expense;
            });

            // 3. Stats
            const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0);
            const totalExpense = months.reduce((sum, m) => sum + m.expense, 0);
            const netProfit = totalRevenue - totalExpense;

            // Growth rate comparing current month to previous year same month or previous month
            // Let's use previous month for short term trend
            const growthRate = months[10].revenue > 0 ? ((months[11].revenue - months[10].revenue) / months[10].revenue) * 100 : 0;

            // 4. Forecast (Improved Linear Projection for next 3 months)
            // Using last 3 months average growth instead of just 1
            const last3Months = months.slice(-3);
            const avgMonthlyRevenue = last3Months.reduce((sum, m) => sum + m.revenue, 0) / 3;
            const forecastNextMonth = avgMonthlyRevenue * 1.05; // Predicting 5% growth over avg

            return NextResponse.json({
                chartData: months,
                stats: {
                    totalRevenue,
                    totalExpense,
                    netProfit,
                    growthRate: growthRate.toFixed(1),
                    forecastNextMonth: forecastNextMonth
                }
            });

        } catch (error: any) {
            console.error('Growth Analytics Error:', error);
            return createErrorResponse('Internal Server Error', 500);
        }
    }
);
