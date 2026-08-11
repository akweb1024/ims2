/**
 * Reorder suggestions.
 *
 * `InventoryItem.minStockLevel` has existed as a column for a long time with nothing reading it,
 * so stock could fall to zero without anyone being told. This turns it into an actionable list:
 * what is below its reorder point, how much to order, and how long the remaining stock lasts at
 * the rate it is actually being consumed.
 *
 * Consumption comes from the StockMovement ledger rather than a guess, which is why receiving
 * had to write to that ledger first.
 *
 * Pure — no Prisma, no IO.
 */

export type ReorderUrgency = 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'OK';

export interface ReorderItemInput {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    /** The reorder point. Zero means the item is not managed by reorder level. */
    minStockLevel: number;
    /** Preferred order size. Zero means "top up to the reorder point". */
    reorderQuantity: number;
    /** Units issued out over `consumptionWindowDays`. */
    unitsConsumed?: number;
}

export interface ReorderSuggestion {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    minStockLevel: number;
    /** How many units to order. Always at least 1 when a suggestion is raised. */
    suggestedQuantity: number;
    urgency: ReorderUrgency;
    /** Days of cover left at the observed consumption rate, or null when nothing has moved. */
    daysOfCover: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Classify how urgent a shortfall is.
 *
 * Out of stock is its own category rather than the worst end of "low", because zero is the
 * point at which work actually stops.
 */
export function reorderUrgency(quantity: number, minStockLevel: number): ReorderUrgency {
    if (quantity <= 0) return 'OUT_OF_STOCK';
    if (minStockLevel <= 0) return 'OK';
    if (quantity <= minStockLevel / 2) return 'CRITICAL';
    if (quantity <= minStockLevel) return 'LOW';
    return 'OK';
}

/**
 * Days the remaining stock covers at the observed rate, or null when consumption is unknown.
 * An item nobody has drawn down has no meaningful cover figure — reporting a large number
 * would read as "plenty" when it really means "no data".
 */
export function daysOfCover(
    quantity: number,
    unitsConsumed: number | undefined,
    windowDays: number,
): number | null {
    if (!unitsConsumed || unitsConsumed <= 0 || windowDays <= 0) return null;
    const perDay = unitsConsumed / windowDays;
    if (perDay <= 0) return null;
    return round1(Math.max(0, quantity) / perDay);
}

/**
 * How much to order: the item's preferred order size, or enough to reach the reorder point
 * when none is set. Never less than one — a suggestion to order nothing is not a suggestion.
 */
export function suggestedOrderQuantity(item: Pick<ReorderItemInput, 'quantity' | 'minStockLevel' | 'reorderQuantity'>): number {
    if (item.reorderQuantity > 0) return item.reorderQuantity;
    return Math.max(1, item.minStockLevel - Math.max(0, item.quantity));
}

const URGENCY_ORDER: Record<ReorderUrgency, number> = {
    OUT_OF_STOCK: 0,
    CRITICAL: 1,
    LOW: 2,
    OK: 3,
};

/**
 * Everything that needs ordering, worst first.
 *
 * Items with no reorder point set are skipped unless they have actually run out — an unmanaged
 * item at zero is still worth flagging, but an unmanaged item with stock is not a shortfall.
 */
export function buildReorderList(
    items: readonly ReorderItemInput[],
    consumptionWindowDays = 30,
): ReorderSuggestion[] {
    const suggestions: ReorderSuggestion[] = [];

    for (const item of items) {
        const urgency = reorderUrgency(item.quantity, item.minStockLevel);
        if (urgency === 'OK') continue;
        if (item.minStockLevel <= 0 && item.quantity > 0) continue;

        suggestions.push({
            id: item.id,
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            minStockLevel: item.minStockLevel,
            suggestedQuantity: suggestedOrderQuantity(item),
            urgency,
            daysOfCover: daysOfCover(item.quantity, item.unitsConsumed, consumptionWindowDays),
        });
    }

    return suggestions.sort((a, b) => {
        const byUrgency = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
        if (byUrgency !== 0) return byUrgency;
        // Within a band, whatever runs out soonest comes first; unknown cover sorts last.
        const aCover = a.daysOfCover ?? Number.POSITIVE_INFINITY;
        const bCover = b.daysOfCover ?? Number.POSITIVE_INFINITY;
        if (aCover !== bCover) return aCover - bCover;
        return a.name.localeCompare(b.name);
    });
}
