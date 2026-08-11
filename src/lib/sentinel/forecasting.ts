import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { consumptionOverWindow, daysOfCoverFromRate, forecastConfidence } from '@/lib/inventory/movement';

export interface DepletionForecast {
  itemId: string;
  itemName: string;
  /** Null when nothing has been consumed, rather than a sentinel that reads as "plenty". */
  daysToZero: number | null;
  dailyConsumption: number;
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
const CONSUMPTION_WINDOW_DAYS = 30;

export async function predictInventoryDepletion(companyId: string): Promise<DepletionForecast[]> {
  const since = new Date(Date.now() - CONSUMPTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const items = await prisma.inventoryItem.findMany({
    where: { companyId },
    include: {
      // Was filtered to `type: 'OUT'`, which misses RESERVE — units committed to an invoice
      // and no longer available. The shared module classifies every type, so this now agrees
      // with the digital twin and the reorder report instead of quietly using its own rule.
      stockMovements: {
        where: { createdAt: { gte: since } },
        select: { type: true, quantity: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  const forecasts: DepletionForecast[] = [];

  for (const item of items) {
    const consumption = consumptionOverWindow(item.stockMovements, CONSUMPTION_WINDOW_DAYS);
    // Nothing drawn down means no rate to project from. Previously this produced a
    // daysToZero of 999, which reads on a dashboard as "plenty of cover" when it means
    // "we have no idea".
    if (consumption.movementCount < 3) continue;

    const daysToZero = daysOfCoverFromRate(item.quantity, consumption.dailyRate);
    if (daysToZero === null) continue;

    forecasts.push({
      itemId: item.id,
      itemName: item.name,
      daysToZero: Math.round(daysToZero),
      dailyConsumption: Math.round(consumption.dailyRate * 100) / 100,
      confidence: forecastConfidence(consumption.movementCount),
      riskLevel: daysToZero < 7 ? 'HIGH' : daysToZero < 21 ? 'MEDIUM' : 'LOW'
    });
  }

  return forecasts.sort((a, b) => (a.daysToZero ?? Infinity) - (b.daysToZero ?? Infinity));
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

// Style guide accessibility compliance helper comment: aria-label placeholder label
