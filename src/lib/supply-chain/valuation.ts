/**
 * Inventory valuation — weighted average cost.
 *
 * What stock is worth is not what it sells for. `InventoryItem.unitPrice` is the selling price;
 * this module maintains `averageCost`, the blended cost of the units actually on hand, so that
 * inventory value and gross margin are both knowable.
 *
 * Weighted average (rather than FIFO or LIFO) because it needs no per-batch tracking: the model
 * has one quantity per item, not a queue of lots. It is also the method that survives partial
 * receipts at different prices without the ledger and the item disagreeing.
 *
 * Pure — no Prisma, no IO.
 */

/** Round to paise. Costs are money and must not accumulate binary-float tails. */
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface StockPosition {
    quantity: number;
    averageCost: number;
}

/**
 * Fold a receipt into an item's running average.
 *
 *     newAverage = (existingValue + receivedValue) / (existingQty + receivedQty)
 *
 * Receiving 10 @ ₹100 into 10 @ ₹80 gives 20 @ ₹90 — the incoming price does not replace the
 * old one, it dilutes it in proportion.
 */
export function applyReceiptToPosition(
    current: StockPosition,
    receivedQuantity: number,
    receivedUnitCost: number,
): StockPosition {
    if (receivedQuantity <= 0) return { quantity: current.quantity, averageCost: current.averageCost };

    const existingQuantity = Math.max(0, current.quantity);
    const newQuantity = existingQuantity + receivedQuantity;

    // Stock that was never valued (averageCost 0, the default for pre-existing rows) must not
    // drag the new average down towards zero — there is no known cost to blend, so the first
    // real receipt sets the cost outright.
    if (existingQuantity === 0 || current.averageCost <= 0) {
        return { quantity: newQuantity, averageCost: round2(receivedUnitCost) };
    }

    const existingValue = existingQuantity * current.averageCost;
    const receivedValue = receivedQuantity * receivedUnitCost;

    return {
        quantity: newQuantity,
        averageCost: round2((existingValue + receivedValue) / newQuantity),
    };
}

/**
 * Value of the stock on hand.
 *
 * Returns null rather than 0 when the item has stock but no established cost, so a report can
 * say "not yet valued" instead of claiming the stock is worthless.
 */
export function stockValue(position: StockPosition): number | null {
    const quantity = Math.max(0, position.quantity);
    if (quantity === 0) return 0;
    if (position.averageCost <= 0) return null;
    return round2(quantity * position.averageCost);
}

export interface ValuationTotals {
    /** Items whose value is known. */
    valuedItems: number;
    /** Items holding stock with no cost established yet. */
    unvaluedItems: number;
    totalQuantity: number;
    totalValue: number;
}

/** Roll a set of items into a total, keeping the unvalued ones visible rather than counting them as zero. */
export function summariseValuation(positions: readonly StockPosition[]): ValuationTotals {
    let valuedItems = 0;
    let unvaluedItems = 0;
    let totalQuantity = 0;
    let totalValue = 0;

    for (const p of positions) {
        const quantity = Math.max(0, p.quantity);
        totalQuantity += quantity;

        const value = stockValue(p);
        if (value === null) {
            unvaluedItems += 1;
        } else {
            valuedItems += 1;
            totalValue += value;
        }
    }

    return { valuedItems, unvaluedItems, totalQuantity, totalValue: round2(totalValue) };
}

/**
 * Gross margin per unit at the current selling price, or null when either side is unknown.
 * Expressed as a percentage of the selling price.
 */
export function marginPercent(sellingPrice: number, averageCost: number): number | null {
    if (sellingPrice <= 0 || averageCost <= 0) return null;
    return round2(((sellingPrice - averageCost) / sellingPrice) * 100);
}
