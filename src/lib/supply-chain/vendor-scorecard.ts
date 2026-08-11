/**
 * Supplier performance, derived rather than stored.
 *
 * Every figure here falls out of purchase orders and their goods receipts, so there is nothing
 * to keep in sync and nothing that can drift from the underlying records. A vendor's score is
 * always a statement about deliveries that actually happened.
 *
 * Pure — no Prisma, no IO.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ScorecardReceiptLine {
    quantityReceived: number;
    quantityRejected: number;
    unitCost: number;
}

export interface ScorecardReceipt {
    receivedDate: Date;
    lines: readonly ScorecardReceiptLine[];
}

export interface ScorecardOrder {
    id: string;
    status: string;
    expectedDate: Date | null;
    orderedQuantity: number;
    receivedQuantity: number;
    totalAmount: number;
    receipts: readonly ScorecardReceipt[];
}

export interface VendorScorecard {
    ordersPlaced: number;
    ordersCompleted: number;
    /** Share of completed orders whose last delivery landed on or before the expected date. */
    onTimeRate: number | null;
    /** Share of ordered units that actually arrived, across completed orders. */
    fillRate: number | null;
    /** Share of delivered units refused on inspection. */
    rejectionRate: number | null;
    /** Mean days between the expected date and the final delivery. Negative is early. */
    averageDaysLate: number | null;
    totalSpend: number;
    /** 0–100, or null when the vendor has no completed orders to judge. */
    overallScore: number | null;
}

/** The latest delivery against an order — the one that decides whether it was on time. */
function finalDelivery(order: ScorecardOrder): Date | null {
    if (order.receipts.length === 0) return null;
    return order.receipts.reduce(
        (latest, r) => (latest === null || r.receivedDate > latest ? r.receivedDate : latest),
        null as Date | null,
    );
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildVendorScorecard(orders: readonly ScorecardOrder[]): VendorScorecard {
    const totalSpend = round2(orders.reduce((t, o) => t + o.totalAmount, 0));

    // Only fully-received orders can be judged on lateness or fill: an order still arriving has
    // not had its chance to be complete yet, and counting it would punish the vendor for time
    // that has not run out.
    const completed = orders.filter((o) => o.status === 'COMPLETED');

    let onTimeCount = 0;
    let datedCount = 0;
    let latenessTotal = 0;
    let orderedTotal = 0;
    let receivedTotal = 0;

    for (const order of completed) {
        orderedTotal += order.orderedQuantity;
        receivedTotal += order.receivedQuantity;

        const delivered = finalDelivery(order);
        if (!delivered || !order.expectedDate) continue;

        datedCount += 1;
        const daysLate = (delivered.getTime() - order.expectedDate.getTime()) / DAY_MS;
        latenessTotal += daysLate;
        // Same-day counts as on time; the expected date is a deadline, not a cutoff.
        if (daysLate <= 0) onTimeCount += 1;
    }

    // Rejections are counted across every receipt, complete or not — a damaged delivery is a
    // fact about the vendor whether or not the rest of the order has arrived.
    let deliveredUnits = 0;
    let rejectedUnits = 0;
    for (const order of orders) {
        for (const receipt of order.receipts) {
            for (const line of receipt.lines) {
                deliveredUnits += line.quantityReceived + line.quantityRejected;
                rejectedUnits += line.quantityRejected;
            }
        }
    }

    const onTimeRate = datedCount > 0 ? round1((onTimeCount / datedCount) * 100) : null;
    const fillRate = orderedTotal > 0 ? round1((receivedTotal / orderedTotal) * 100) : null;
    const rejectionRate = deliveredUnits > 0 ? round1((rejectedUnits / deliveredUnits) * 100) : null;
    const averageDaysLate = datedCount > 0 ? round1(latenessTotal / datedCount) : null;

    return {
        ordersPlaced: orders.length,
        ordersCompleted: completed.length,
        onTimeRate,
        fillRate,
        rejectionRate,
        averageDaysLate,
        totalSpend,
        overallScore: overallScore({ onTimeRate, fillRate, rejectionRate }),
    };
}

/**
 * Blend the three rates into one number, weighting what each failure actually costs:
 * a late delivery stops work (40), a short delivery half-stops it (35), and a rejected
 * unit is waste that was at least caught (25).
 *
 * Null when nothing has been delivered yet — an unscored vendor is not a zero-scored one.
 */
export function overallScore(rates: {
    onTimeRate: number | null;
    fillRate: number | null;
    rejectionRate: number | null;
}): number | null {
    const parts: Array<{ value: number; weight: number }> = [];

    if (rates.onTimeRate !== null) parts.push({ value: rates.onTimeRate, weight: 40 });
    if (rates.fillRate !== null) parts.push({ value: Math.min(100, rates.fillRate), weight: 35 });
    if (rates.rejectionRate !== null) parts.push({ value: 100 - rates.rejectionRate, weight: 25 });

    if (parts.length === 0) return null;

    const weightUsed = parts.reduce((t, p) => t + p.weight, 0);
    const earned = parts.reduce((t, p) => t + p.value * p.weight, 0);
    return round1(earned / weightUsed);
}

export type VendorGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNRATED';

export function vendorGrade(score: number | null): VendorGrade {
    if (score === null) return 'UNRATED';
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 60) return 'FAIR';
    return 'POOR';
}
