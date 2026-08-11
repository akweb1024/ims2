/**
 * Goods receiving against a purchase order.
 *
 * Receiving used to be a status flip: set the PO to COMPLETED and nothing else happened — no
 * stock moved, no cost was captured, and a delivery that arrived in two drops had nowhere to
 * be recorded. This module holds the rules that make a receipt a real event.
 *
 * Pure — no Prisma, no IO. The route wraps the plan this returns in a transaction.
 */

/**
 * The order's own vocabulary, unchanged. `PARTIAL` and `COMPLETED` already existed and are
 * already rendered by the PO list, so receiving drives those rather than introducing a second
 * set of names for the same two states.
 */
export const PO_STATUS = {
    DRAFT: 'DRAFT',
    ISSUED: 'ISSUED',
    PARTIAL: 'PARTIAL',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export type PoStatus = (typeof PO_STATUS)[keyof typeof PO_STATUS];

/** A PO line as it stands before this receipt. */
export interface OrderLine {
    id: string;
    inventoryItemId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    quantityReceived: number;
}

/** What the user says arrived for one line. */
export interface ReceiptLineInput {
    purchaseOrderItemId: string;
    quantityReceived: number;
    quantityRejected?: number;
    /** Price on the delivery note. Falls back to the PO's unitPrice when not supplied. */
    unitCost?: number | null;
    notes?: string | null;
}

export interface PlannedReceiptLine {
    purchaseOrderItemId: string;
    inventoryItemId: string | null;
    quantityReceived: number;
    quantityRejected: number;
    unitCost: number;
    notes: string | null;
    /** The line's cumulative received quantity once this receipt is applied. */
    newQuantityReceived: number;
}

export interface ReceiptPlan {
    lines: PlannedReceiptLine[];
    /** Status the PO should move to once this receipt is applied. */
    nextStatus: PoStatus;
    /** Total value accepted into stock, for the audit trail. */
    totalReceivedValue: number;
    totalQuantityReceived: number;
    totalQuantityRejected: number;
}

export class ReceivingError extends Error {}

const isNonNegativeInt = (n: unknown): n is number =>
    typeof n === 'number' && Number.isInteger(n) && n >= 0;

/**
 * Work out what a receipt does to a purchase order, or reject it.
 *
 * Rejects rather than clamping when more arrives than was ordered: a delivery of 12 against an
 * order of 10 is either a supplier error or a typo, and silently accepting it puts stock on the
 * books that nobody agreed to buy. The receiver should amend the order or reject the surplus.
 */
export function planReceipt(
    orderLines: readonly OrderLine[],
    inputs: readonly ReceiptLineInput[],
    currentStatus: string,
): ReceiptPlan {
    if (currentStatus === PO_STATUS.CANCELLED) {
        throw new ReceivingError('This purchase order is cancelled and cannot receive stock.');
    }
    if (currentStatus === PO_STATUS.DRAFT) {
        throw new ReceivingError('Issue the purchase order to the vendor before receiving against it.');
    }

    const byId = new Map(orderLines.map((l) => [l.id, l]));
    const seen = new Set<string>();
    const planned: PlannedReceiptLine[] = [];

    for (const input of inputs) {
        const line = byId.get(input.purchaseOrderItemId);
        if (!line) {
            throw new ReceivingError(`Line ${input.purchaseOrderItemId} is not on this purchase order.`);
        }
        if (seen.has(input.purchaseOrderItemId)) {
            throw new ReceivingError(`Line "${line.description}" appears twice in this receipt.`);
        }
        seen.add(input.purchaseOrderItemId);

        const received = input.quantityReceived;
        const rejected = input.quantityRejected ?? 0;

        if (!isNonNegativeInt(received) || !isNonNegativeInt(rejected)) {
            throw new ReceivingError(`Quantities for "${line.description}" must be whole numbers of zero or more.`);
        }
        if (received === 0 && rejected === 0) continue;

        const outstanding = line.quantity - line.quantityReceived;
        if (received > outstanding) {
            throw new ReceivingError(
                `"${line.description}": receiving ${received} would exceed the ${outstanding} still outstanding on this order.`,
            );
        }

        const unitCost = input.unitCost ?? line.unitPrice;
        if (typeof unitCost !== 'number' || !Number.isFinite(unitCost) || unitCost < 0) {
            throw new ReceivingError(`"${line.description}": unit cost must be zero or more.`);
        }

        planned.push({
            purchaseOrderItemId: line.id,
            inventoryItemId: line.inventoryItemId ?? null,
            quantityReceived: received,
            quantityRejected: rejected,
            unitCost,
            notes: input.notes ?? null,
            newQuantityReceived: line.quantityReceived + received,
        });
    }

    if (planned.length === 0) {
        throw new ReceivingError('Enter a quantity for at least one line before recording the receipt.');
    }

    // Fold this receipt into the order to see whether anything is still outstanding.
    const appliedById = new Map(planned.map((p) => [p.purchaseOrderItemId, p.newQuantityReceived]));
    const fullyReceived = orderLines.every((l) => (appliedById.get(l.id) ?? l.quantityReceived) >= l.quantity);

    return {
        lines: planned,
        nextStatus: fullyReceived ? PO_STATUS.COMPLETED : PO_STATUS.PARTIAL,
        totalReceivedValue: planned.reduce((t, l) => t + l.quantityReceived * l.unitCost, 0),
        totalQuantityReceived: planned.reduce((t, l) => t + l.quantityReceived, 0),
        totalQuantityRejected: planned.reduce((t, l) => t + l.quantityRejected, 0),
    };
}

/** Quantity still to arrive on a line, floored at zero. */
export function outstandingQuantity(line: Pick<OrderLine, 'quantity' | 'quantityReceived'>): number {
    return Math.max(0, line.quantity - line.quantityReceived);
}

/** Whether a purchase order still has anything outstanding. */
export function hasOutstanding(orderLines: readonly OrderLine[]): boolean {
    return orderLines.some((l) => outstandingQuantity(l) > 0);
}
