import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { FinanceService } from './finance';

export class FinanceReportsService {
    /**
     * Generate Profit & Loss Statement
     */
    static async getProfitAndLoss(companyId: string, startDate: Date, endDate: Date) {
        // 1. Fetch Revenue and Expense Accounts with their totals in range
        const accounts = await prisma.account.findMany({
            where: {
                companyId: companyId,
                type: { in: ['REVENUE', 'EXPENSE'] }
            },
            include: {
                journalLines: {
                    where: {
                        journalEntry: {
                            companyId: companyId,
                            date: { gte: startDate, lte: endDate },
                            status: 'POSTED'
                        }
                    }
                }
            }
        });

        let totalRevenue = new Prisma.Decimal(0);
        let totalExpense = new Prisma.Decimal(0);

        const revenueAccounts = [];
        const expenseAccounts = [];

        for (const acc of accounts) {
            // Calculate net movement in period
            let debit = new Prisma.Decimal(0);
            let credit = new Prisma.Decimal(0);
            acc.journalLines.forEach(l => {
                debit = debit.plus(l.debit);
                credit = credit.plus(l.credit);
            });

            if (acc.type === 'REVENUE') {
                const balance = credit.minus(debit); // Credit Normal
                totalRevenue = totalRevenue.plus(balance);
                if (!balance.equals(0)) revenueAccounts.push({ ...acc, balance: balance.toNumber() });
            } else {
                const balance = debit.minus(credit); // Debit Normal
                totalExpense = totalExpense.plus(balance);
                if (!balance.equals(0)) expenseAccounts.push({ ...acc, balance: balance.toNumber() });
            }
        }

        return {
            revenue: { total: totalRevenue.toNumber(), accounts: revenueAccounts },
            expense: { total: totalExpense.toNumber(), accounts: expenseAccounts },
            netProfit: totalRevenue.minus(totalExpense).toNumber()
        };
    }

    /**
     * Generate Balance Sheet (As of Date)
     */
    static async getBalanceSheet(companyId: string, asOfDate: Date) {
        // 1. Calculate Net Profit (Retained Earnings) up to date
        // Effectively, Equity = Capital + Retained Earnings (Revenue - Expense)
        // We need to fetch ALL accounts to calculate retained earnings dynamically if we haven't closed books.
        // For simplicity, we calculate "Current Year Earnings" on the fly.

        const accounts = await prisma.account.findMany({
            where: { companyId: companyId },
            include: {
                journalLines: {
                    where: {
                        journalEntry: {
                            companyId: companyId,
                            date: { lte: asOfDate },
                            status: 'POSTED'
                        }
                    }
                }
            }
        });

        const categories = {
            ASSET: { total: new Prisma.Decimal(0), accounts: [] as any[] },
            LIABILITY: { total: new Prisma.Decimal(0), accounts: [] as any[] },
            EQUITY: { total: new Prisma.Decimal(0), accounts: [] as any[] },
        };

        let retainedEarnings = new Prisma.Decimal(0);

        for (const acc of accounts) {
            let debit = new Prisma.Decimal(0);
            let credit = new Prisma.Decimal(0);
            acc.journalLines.forEach(l => {
                debit = debit.plus(l.debit);
                credit = credit.plus(l.credit);
            });

            if (acc.type === 'ASSET') {
                const bal = debit.minus(credit);
                categories.ASSET.total = categories.ASSET.total.plus(bal);
                if (!bal.equals(0)) categories.ASSET.accounts.push({ ...acc, balance: bal.toNumber() });
            } else if (acc.type === 'LIABILITY') {
                const bal = credit.minus(debit);
                categories.LIABILITY.total = categories.LIABILITY.total.plus(bal);
                if (!bal.equals(0)) categories.LIABILITY.accounts.push({ ...acc, balance: bal.toNumber() });
            } else if (acc.type === 'EQUITY') {
                const bal = credit.minus(debit);
                categories.EQUITY.total = categories.EQUITY.total.plus(bal);
                if (!bal.equals(0)) categories.EQUITY.accounts.push({ ...acc, balance: bal.toNumber() });
            } else if (acc.type === 'REVENUE') {
                retainedEarnings = retainedEarnings.plus(credit.minus(debit));
            } else if (acc.type === 'EXPENSE') {
                retainedEarnings = retainedEarnings.minus(debit.minus(credit));
            }
        }

        // Add Retained Earnings to Equity
        categories.EQUITY.total = categories.EQUITY.total.plus(retainedEarnings);
        categories.EQUITY.accounts.push({
            id: 'retained-earnings',
            name: 'Retained Earnings (Calculated)',
            code: '3999',
            balance: retainedEarnings.toNumber()
        });

        return {
            assets: { total: categories.ASSET.total.toNumber(), accounts: categories.ASSET.accounts },
            liabilities: { total: categories.LIABILITY.total.toNumber(), accounts: categories.LIABILITY.accounts },
            equity: { total: categories.EQUITY.total.toNumber(), accounts: categories.EQUITY.accounts },
            check: categories.ASSET.total.minus(categories.LIABILITY.total.plus(categories.EQUITY.total)).toNumber() // Should be 0
        };
    }

    /**
     * Get Monthly Metrics for Forecasting
     */
    static async getMonthlyMetrics(companyId: string, months: number = 6) {
        // Get last 6 months
        const result = [];
        const bankAccount = await prisma.account.findFirst({
            where: { companyId: String(companyId), code: '1000' }
        });

        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const monthLabel = date.toLocaleString('default', { month: 'short' });

            // Revenue/Expense for this month
            const pnl = await this.getProfitAndLoss(companyId, date, new Date(nextDate.getTime() - 1));

            // Closing Cash Balance
            // Ideally we optimize this to not run full ledger calc 6 times.
            // But for now it's fine.
            let cashBalance = 0;
            if (bankAccount) {
                const ledger = await FinanceService.getAccountLedger(companyId, bankAccount.id, undefined, new Date(nextDate.getTime() - 1));
                // Ledger items are lines. We need to sum them.
                // In `getAccountLedger` output, we don't have running balance returned,
                // but we can sum debits-credits.
                // Asset: Debit - Credit
                const balance = ledger.reduce((acc, curr) => acc + (curr.debit - curr.credit), 0);
                cashBalance = balance;
            }

            result.push({
                month: monthLabel,
                inflow: pnl.revenue.total,
                outflow: pnl.expense.total,
                netCash: pnl.netProfit,
                balance: cashBalance,
                isFuture: false
            });
        }
        return result;
    }
}
