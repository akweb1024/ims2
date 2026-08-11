import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { companyScopeWhere } from '@/lib/company-scope';
import { buildReorderList } from '@/lib/supply-chain/reorder';
import { summariseValuation, stockValue, marginPercent } from '@/lib/supply-chain/valuation';

const DEFAULT_WINDOW_DAYS = 30;

/**
 * What needs ordering, and what the stock on hand is worth.
 *
 * `minStockLevel` has been a column with nothing reading it, so stock could reach zero without
 * anyone being told. Consumption comes from the StockMovement ledger — outbound movements over
 * the window — rather than a guess, which is what makes days-of-cover a real number.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const windowDays = Math.max(1, Number(searchParams.get('windowDays')) || DEFAULT_WINDOW_DAYS);
        const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

        const items = await prisma.inventoryItem.findMany({
            where: companyScopeWhere(user),
            select: {
                id: true,
                name: true,
                sku: true,
                quantity: true,
                minStockLevel: true,
                reorderQuantity: true,
                unitPrice: true,
                averageCost: true,
                warehouse: { select: { id: true, name: true } },
                stockMovements: {
                    where: { createdAt: { gte: since } },
                    select: { quantity: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        const suggestions = buildReorderList(
            items.map((item) => ({
                id: item.id,
                name: item.name,
                sku: item.sku,
                quantity: item.quantity,
                minStockLevel: item.minStockLevel,
                reorderQuantity: item.reorderQuantity,
                // Outbound movements are recorded as negatives; their magnitude is what was used.
                unitsConsumed: item.stockMovements
                    .filter((m) => m.quantity < 0)
                    .reduce((total, m) => total + Math.abs(m.quantity), 0),
            })),
            windowDays,
        );

        const valuation = summariseValuation(items.map((i) => ({ quantity: i.quantity, averageCost: i.averageCost })));

        return NextResponse.json({
            windowDays,
            suggestions,
            valuation,
            items: items.map((item) => ({
                id: item.id,
                name: item.name,
                sku: item.sku,
                quantity: item.quantity,
                minStockLevel: item.minStockLevel,
                warehouse: item.warehouse,
                averageCost: item.averageCost,
                unitPrice: item.unitPrice,
                // null means "no cost established yet", which is different from worthless.
                stockValue: stockValue({ quantity: item.quantity, averageCost: item.averageCost }),
                marginPercent: marginPercent(item.unitPrice, item.averageCost),
            })),
        });
    } catch (error: any) {
        console.error('Reorder report error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
