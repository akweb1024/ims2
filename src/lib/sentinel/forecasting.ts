import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface DepletionForecast {
  itemId: string;
  itemName: string;
  daysToZero: number;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RunwayForecast {
  monthlyBurn: number;
  remainingCash: number;
  monthsLeft: number;
  riskLevel: 'STABLE' | 'WARNING' | 'CRITICAL';
}

/**
 * Predicts inventory depletion dates based on historical stock movements.
 */
export async function predictInventoryDepletion(companyId: string): Promise<DepletionForecast[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { companyId },
    include: {
      stockMovements: {
        where: { type: 'OUT' },
        orderBy: { createdAt: 'desc' },
        take: 50
      }
    }
  });

  const forecasts: DepletionForecast[] = [];

  for (const item of items) {
    if (item.stockMovements.length < 3) continue;

    // Calculate average daily velocity
    const totalOut = item.stockMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const earliest = item.stockMovements[item.stockMovements.length - 1].createdAt;
    const latest = item.stockMovements[0].createdAt;
    const daysDiff = Math.max(1, (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));

    const velocity = totalOut / daysDiff; // items per day
    const daysToZero = velocity > 0 ? item.quantity / velocity : 999;

    forecasts.push({
      itemId: item.id,
      itemName: item.name,
      daysToZero: Math.round(daysToZero),
      confidence: Math.min(100, item.stockMovements.length * 2),
      riskLevel: daysToZero < 7 ? 'HIGH' : daysToZero < 21 ? 'MEDIUM' : 'LOW'
    });
  }

  return forecasts.sort((a, b) => a.daysToZero - b.daysToZero);
}

/**
 * Predicts cash runway based on journal entry trends.
 */
export async function predictCashRunway(companyId: string): Promise<RunwayForecast> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch all expense journal lines in the last 30 days
  const expenseLines = await prisma.journalLine.findMany({
    where: {
      account: {
        companyId,
        type: 'EXPENSE'
      },
      journalEntry: {
        date: { gte: thirtyDaysAgo },
        status: 'POSTED'
      }
    }
  });

  // Fetch current bank balance (Liquid Assets)
  const bankAccounts = await prisma.account.findMany({
    where: { companyId, code: '1000' }, // Bank Account
    include: { journalLines: { where: { journalEntry: { status: 'POSTED' } } } }
  });

  let totalCash = 0;
  bankAccounts.forEach(acc => {
    acc.journalLines.forEach(line => {
      totalCash += (line.debit.toNumber() - line.credit.toNumber());
    });
  });

  const monthlyBurn = expenseLines.reduce((sum, line) => sum + line.debit.toNumber(), 0);
  const monthsLeft = monthlyBurn > 0 ? totalCash / monthlyBurn : 99;

  return {
    monthlyBurn,
    remainingCash: totalCash,
    monthsLeft: Math.round(monthsLeft * 10) / 10,
    riskLevel: monthsLeft < 2 ? 'CRITICAL' : monthsLeft < 6 ? 'WARNING' : 'STABLE'
  };
}
