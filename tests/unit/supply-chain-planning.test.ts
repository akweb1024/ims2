import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReorderList, reorderUrgency, daysOfCover, suggestedOrderQuantity, type ReorderItemInput } from '../../src/lib/supply-chain/reorder';
import { buildVendorScorecard, overallScore, vendorGrade, type ScorecardOrder } from '../../src/lib/supply-chain/vendor-scorecard';

const item = (over: Partial<ReorderItemInput> = {}): ReorderItemInput => ({
    id: 'i1',
    name: 'A4 paper',
    sku: 'PAP-A4',
    quantity: 5,
    minStockLevel: 20,
    reorderQuantity: 0,
    ...over,
});

describe('reorderUrgency', () => {
    it('separates out-of-stock from merely low', () => {
        // Zero is where work stops, so it is its own band rather than the bottom of "critical".
        assert.equal(reorderUrgency(0, 20), 'OUT_OF_STOCK');
        assert.equal(reorderUrgency(10, 20), 'CRITICAL', 'at or below half the reorder point');
        assert.equal(reorderUrgency(15, 20), 'LOW');
        assert.equal(reorderUrgency(20, 20), 'LOW', 'the reorder point itself is already low');
        assert.equal(reorderUrgency(21, 20), 'OK');
    });

    it('treats negative stock as out of stock', () => {
        assert.equal(reorderUrgency(-3, 20), 'OUT_OF_STOCK');
    });

    it('says nothing about items with no reorder point set', () => {
        assert.equal(reorderUrgency(5, 0), 'OK');
    });
});

describe('daysOfCover', () => {
    it('divides stock by the observed daily rate', () => {
        // 60 units used in 30 days is 2/day; 30 in stock is 15 days of cover.
        assert.equal(daysOfCover(30, 60, 30), 15);
    });

    it('returns null when nothing has been consumed', () => {
        // An item nobody has drawn down has no cover figure. A large number here would read
        // as "plenty" when it actually means "no data".
        assert.equal(daysOfCover(30, 0, 30), null);
        assert.equal(daysOfCover(30, undefined, 30), null);
    });

    it('reports zero cover for empty stock that is being consumed', () => {
        assert.equal(daysOfCover(0, 60, 30), 0);
    });
});

describe('suggestedOrderQuantity', () => {
    it('uses the preferred order size when one is set', () => {
        assert.equal(suggestedOrderQuantity({ quantity: 5, minStockLevel: 20, reorderQuantity: 50 }), 50);
    });

    it('tops back up to the reorder point when none is set', () => {
        assert.equal(suggestedOrderQuantity({ quantity: 5, minStockLevel: 20, reorderQuantity: 0 }), 15);
    });

    it('never suggests ordering nothing', () => {
        // At or above the reorder point the shortfall is zero or negative; a suggestion that
        // says "order 0" is not a suggestion.
        assert.equal(suggestedOrderQuantity({ quantity: 25, minStockLevel: 20, reorderQuantity: 0 }), 1);
    });

    it('counts negative stock as empty when sizing the order', () => {
        assert.equal(suggestedOrderQuantity({ quantity: -5, minStockLevel: 20, reorderQuantity: 0 }), 20);
    });
});

describe('buildReorderList', () => {
    it('leaves out anything with enough stock', () => {
        assert.deepEqual(buildReorderList([item({ quantity: 50 })]), []);
    });

    it('flags an unmanaged item only once it has actually run out', () => {
        assert.deepEqual(buildReorderList([item({ minStockLevel: 0, quantity: 5 })]), [], 'not managed, still has stock');

        const out = buildReorderList([item({ minStockLevel: 0, quantity: 0 })]);
        assert.equal(out.length, 1);
        assert.equal(out[0].urgency, 'OUT_OF_STOCK');
    });

    it('orders worst first', () => {
        const list = buildReorderList([
            item({ id: 'low', name: 'Low', quantity: 18 }),
            item({ id: 'out', name: 'Out', quantity: 0 }),
            item({ id: 'crit', name: 'Critical', quantity: 5 }),
        ]);
        assert.deepEqual(list.map((s) => s.id), ['out', 'crit', 'low']);
    });

    it('breaks ties on whichever runs out soonest, with unknown cover last', () => {
        const list = buildReorderList([
            item({ id: 'slow', name: 'Slow', quantity: 15, unitsConsumed: 15 }),
            item({ id: 'unknown', name: 'Unknown', quantity: 15 }),
            item({ id: 'fast', name: 'Fast', quantity: 15, unitsConsumed: 90 }),
        ]);

        assert.deepEqual(list.map((s) => s.id), ['fast', 'slow', 'unknown']);
        assert.equal(list[0].daysOfCover, 5);
        assert.equal(list[2].daysOfCover, null);
    });

    it('carries the order size and the shortfall through to the suggestion', () => {
        const [s] = buildReorderList([item({ quantity: 5, minStockLevel: 20, reorderQuantity: 50 })]);
        assert.equal(s.suggestedQuantity, 50);
        assert.equal(s.quantity, 5);
        assert.equal(s.minStockLevel, 20);
        assert.equal(s.sku, 'PAP-A4');
    });

    it('honours a custom consumption window', () => {
        // 30 used in 7 days is ~4.3/day, so 30 in stock covers about 7 days.
        const [s] = buildReorderList([item({ quantity: 30, minStockLevel: 40, unitsConsumed: 30 })], 7);
        assert.equal(s.daysOfCover, 7);
    });
});

const receipt = (date: string, lines: Array<{ received: number; rejected?: number; cost?: number }>) => ({
    receivedDate: new Date(date),
    lines: lines.map((l) => ({ quantityReceived: l.received, quantityRejected: l.rejected ?? 0, unitCost: l.cost ?? 100 })),
});

const order = (over: Partial<ScorecardOrder> = {}): ScorecardOrder => ({
    id: 'po1',
    status: 'COMPLETED',
    expectedDate: new Date('2026-07-10T00:00:00.000Z'),
    orderedQuantity: 10,
    receivedQuantity: 10,
    totalAmount: 1_000,
    receipts: [receipt('2026-07-09T00:00:00.000Z', [{ received: 10 }])],
    ...over,
});

describe('buildVendorScorecard', () => {
    it('scores a vendor that delivered early and in full', () => {
        const s = buildVendorScorecard([order()]);

        assert.equal(s.onTimeRate, 100);
        assert.equal(s.fillRate, 100);
        assert.equal(s.rejectionRate, 0);
        assert.equal(s.averageDaysLate, -1, 'a day early');
        assert.equal(s.totalSpend, 1_000);
        assert.equal(s.overallScore, 100);
        assert.equal(vendorGrade(s.overallScore), 'EXCELLENT');
    });

    it('counts a same-day delivery as on time', () => {
        // The expected date is a deadline, not a cutoff.
        const s = buildVendorScorecard([
            order({ receipts: [receipt('2026-07-10T00:00:00.000Z', [{ received: 10 }])] }),
        ]);
        assert.equal(s.onTimeRate, 100);
        assert.equal(s.averageDaysLate, 0);
    });

    it('judges lateness on the final delivery, not the first', () => {
        const s = buildVendorScorecard([
            order({
                receipts: [
                    receipt('2026-07-05T00:00:00.000Z', [{ received: 4 }]),
                    receipt('2026-07-15T00:00:00.000Z', [{ received: 6 }]),
                ],
            }),
        ]);
        assert.equal(s.onTimeRate, 0, 'the order was not complete until the 15th');
        assert.equal(s.averageDaysLate, 5);
    });

    it('reports a short delivery as a fill-rate miss', () => {
        const s = buildVendorScorecard([
            order({ orderedQuantity: 10, receivedQuantity: 7, receipts: [receipt('2026-07-09T00:00:00.000Z', [{ received: 7 }])] }),
        ]);
        assert.equal(s.fillRate, 70);
        assert.ok(s.overallScore! < 100);
    });

    it('counts rejections against the vendor even on an incomplete order', () => {
        // A damaged delivery is a fact about the vendor whether or not the rest has arrived.
        const s = buildVendorScorecard([
            order({ status: 'PARTIAL', receipts: [receipt('2026-07-09T00:00:00.000Z', [{ received: 8, rejected: 2 }])] }),
        ]);
        assert.equal(s.rejectionRate, 20);
        assert.equal(s.ordersCompleted, 0);
    });

    it('does not judge an order that is still arriving on time or fill', () => {
        // Counting it would punish the vendor for time that has not run out.
        const s = buildVendorScorecard([order({ status: 'ISSUED', receipts: [] })]);

        assert.equal(s.ordersPlaced, 1);
        assert.equal(s.ordersCompleted, 0);
        assert.equal(s.onTimeRate, null);
        assert.equal(s.fillRate, null);
        assert.equal(s.totalSpend, 1_000, 'but it still counts as committed spend');
    });

    it('leaves an order with no expected date out of the timeliness figures', () => {
        const s = buildVendorScorecard([order({ expectedDate: null })]);
        assert.equal(s.onTimeRate, null);
        assert.equal(s.averageDaysLate, null);
        assert.equal(s.fillRate, 100, 'fill is still measurable');
    });

    it('averages across several orders', () => {
        const s = buildVendorScorecard([
            order({ id: 'a' }),
            order({ id: 'b', receipts: [receipt('2026-07-13T00:00:00.000Z', [{ received: 10 }])] }),
        ]);
        assert.equal(s.onTimeRate, 50);
        assert.equal(s.averageDaysLate, 1, '(-1 + 3) / 2');
        assert.equal(s.totalSpend, 2_000);
    });

    it('returns an unrated scorecard for a vendor with no deliveries', () => {
        const s = buildVendorScorecard([]);
        assert.equal(s.overallScore, null);
        assert.equal(vendorGrade(s.overallScore), 'UNRATED');
        assert.equal(s.totalSpend, 0);
    });
});

describe('overallScore', () => {
    it('weights lateness heaviest, then shortfall, then rejects', () => {
        const late = overallScore({ onTimeRate: 0, fillRate: 100, rejectionRate: 0 });
        const short = overallScore({ onTimeRate: 100, fillRate: 0, rejectionRate: 0 });
        const rejects = overallScore({ onTimeRate: 100, fillRate: 100, rejectionRate: 100 });

        assert.equal(late, 60, 'losing the 40-point timeliness weight');
        assert.equal(short, 65, 'losing the 35-point fill weight');
        assert.equal(rejects, 75, 'losing the 25-point quality weight');
    });

    it('reweights over whatever is measurable', () => {
        // With no expected date there is no timeliness component, and the score is the blend
        // of the two that remain rather than being penalised for the missing one.
        assert.equal(overallScore({ onTimeRate: null, fillRate: 100, rejectionRate: 0 }), 100);
    });

    it('caps an over-delivery from inflating the score', () => {
        assert.equal(overallScore({ onTimeRate: 100, fillRate: 150, rejectionRate: 0 }), 100);
    });

    it('is null when nothing is measurable', () => {
        assert.equal(overallScore({ onTimeRate: null, fillRate: null, rejectionRate: null }), null);
    });
});

describe('vendorGrade', () => {
    it('bands the score', () => {
        assert.equal(vendorGrade(95), 'EXCELLENT');
        assert.equal(vendorGrade(90), 'EXCELLENT');
        assert.equal(vendorGrade(80), 'GOOD');
        assert.equal(vendorGrade(60), 'FAIR');
        assert.equal(vendorGrade(59.9), 'POOR');
        assert.equal(vendorGrade(null), 'UNRATED');
    });
});
