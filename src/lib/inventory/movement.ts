/**
 * The stock-movement vocabulary.
 *
 * `StockMovement.quantity` is stored as a positive magnitude and the direction lives in
 * `type` — there are no negative quantities in the table. That is easy to get wrong, and
 * getting it wrong is silent: a consumption figure that filters on `quantity < 0` matches
 * nothing and reports every item as never used.
 *
 * This module is the single place that knows which types take stock out and which put it
 * back, so that anything measuring consumption agrees with everything else.
 *
 * Pure — no Prisma, no IO.
 */

/** Types that add to stock on hand. */
export const INBOUND_TYPES = ['IN', 'RELEASE', 'PURCHASE_RECEIPT', 'RETURN'] as const;

/** Types that take stock out. RESERVE counts: the units are committed and no longer available. */
export const OUTBOUND_TYPES = ['OUT', 'RESERVE', 'ISSUE', 'DISPATCH', 'WRITE_OFF'] as const;

export type MovementDirection = 'IN' | 'OUT' | 'UNKNOWN';

export interface Movement {
    type: string;
    quantity: number;
    createdAt: Date;
}

export function movementDirection(type: string): MovementDirection {
    const t = String(type || '').toUpperCase();
    if ((INBOUND_TYPES as readonly string[]).includes(t)) return 'IN';
    if ((OUTBOUND_TYPES as readonly string[]).includes(t)) return 'OUT';
    return 'UNKNOWN';
}

/**
 * The movement as a signed change to stock on hand. An unrecognised type returns 0 rather
 * than guessing a direction — a movement nobody can classify must not quietly count as
 * consumption and skew a forecast.
 */
export function signedQuantity(movement: Pick<Movement, 'type' | 'quantity'>): number {
    const magnitude = Math.abs(movement.quantity);
    switch (movementDirection(movement.type)) {
        case 'IN':
            return magnitude;
        case 'OUT':
            return -magnitude;
        default:
            return 0;
    }
}

export interface Consumption {
    /** Units taken out over the window. */
    unitsConsumed: number;
    /** Units per day across the whole window, not just the days with movement. */
    dailyRate: number;
    /** How many outbound movements the rate is based on — the basis for confidence. */
    movementCount: number;
}

/**
 * How fast an item is being used.
 *
 * Averaged over the whole window rather than over the span between first and last movement:
 * two withdrawals a day apart inside a 30-day window is a slow-moving item, and dividing by
 * one day would call it 30× faster than it is.
 */
export function consumptionOverWindow(movements: readonly Movement[], windowDays: number): Consumption {
    if (windowDays <= 0) return { unitsConsumed: 0, dailyRate: 0, movementCount: 0 };

    let unitsConsumed = 0;
    let movementCount = 0;

    for (const movement of movements) {
        const signed = signedQuantity(movement);
        if (signed >= 0) continue;
        unitsConsumed += -signed;
        movementCount += 1;
    }

    return {
        unitsConsumed,
        dailyRate: unitsConsumed / windowDays,
        movementCount,
    };
}

/**
 * Days the stock on hand lasts at the observed rate.
 *
 * Null when nothing has been consumed. The alternative — a large sentinel like 999 — reads
 * as "plenty of cover" on a dashboard when what it actually means is "we have no idea".
 */
export function daysOfCoverFromRate(quantity: number, dailyRate: number): number | null {
    if (dailyRate <= 0) return null;
    return Math.round((Math.max(0, quantity) / dailyRate) * 10) / 10;
}

/**
 * How much to trust a rate built from this many movements, 0–100.
 *
 * A forecast from two withdrawals is a guess; one from twenty is a measurement. Surfacing
 * this alongside the number is what stops the two being read the same way.
 */
export function forecastConfidence(movementCount: number): number {
    if (movementCount <= 0) return 0;
    return Math.min(100, Math.round((1 - Math.exp(-movementCount / 8)) * 100));
}
