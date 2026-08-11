import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { planReceipt, outstandingQuantity, hasOutstanding, ReceivingError, PO_STATUS, type OrderLine } from '../../src/lib/supply-chain/receiving';
import { applyReceiptToPosition, stockValue, summariseValuation, marginPercent } from '../../src/lib/supply-chain/valuation';

const line = (over: Partial<OrderLine> = {}): OrderLine => ({
    id: 'l1',
    inventoryItemId: 'i1',
    description: 'A4 paper',
    quantity: 10,
    unitPrice: 100,
    quantityReceived: 0,
    ...over,
});

describe('planReceipt: what a delivery does to an order', () => {
    it('marks an order COMPLETED when everything ordered has arrived', () => {
        const plan = planReceipt([line()], [{ purchaseOrderItemId: 'l1', quantityReceived: 10 }], PO_STATUS.ISSUED);

        assert.equal(plan.nextStatus, PO_STATUS.COMPLETED);
        assert.equal(plan.lines[0].newQuantityReceived, 10);
        assert.equal(plan.totalReceivedValue, 1_000);
        assert.equal(plan.totalQuantityReceived, 10);
    });

    it('marks an order PARTIAL when a drop is short', () => {
        const plan = planReceipt([line()], [{ purchaseOrderItemId: 'l1', quantityReceived: 4 }], PO_STATUS.ISSUED);

        assert.equal(plan.nextStatus, PO_STATUS.PARTIAL);
        assert.equal(plan.lines[0].newQuantityReceived, 4);
    });

    it('completes an order across two deliveries', () => {
        const first = planReceipt([line()], [{ purchaseOrderItemId: 'l1', quantityReceived: 4 }], PO_STATUS.ISSUED);
        assert.equal(first.nextStatus, PO_STATUS.PARTIAL);

        // The second drop is planned against the line as it now stands.
        const second = planReceipt(
            [line({ quantityReceived: 4 })],
            [{ purchaseOrderItemId: 'l1', quantityReceived: 6 }],
            PO_STATUS.PARTIAL,
        );
        assert.equal(second.nextStatus, PO_STATUS.COMPLETED);
        assert.equal(second.lines[0].newQuantityReceived, 10);
    });

    it('stays partial while any other line is still outstanding', () => {
        const plan = planReceipt(
            [line({ id: 'l1' }), line({ id: 'l2', description: 'Toner' })],
            [{ purchaseOrderItemId: 'l1', quantityReceived: 10 }],
            PO_STATUS.ISSUED,
        );
        assert.equal(plan.nextStatus, PO_STATUS.PARTIAL, 'line 2 has not arrived');
    });

    it('uses the delivery-note price over the ordered price', () => {
        // Stock is valued at what was actually charged, not what was quoted.
        const plan = planReceipt(
            [line()],
            [{ purchaseOrderItemId: 'l1', quantityReceived: 10, unitCost: 110 }],
            PO_STATUS.ISSUED,
        );
        assert.equal(plan.lines[0].unitCost, 110);
        assert.equal(plan.totalReceivedValue, 1_100);
    });

    it('falls back to the ordered price when the delivery note gives none', () => {
        const plan = planReceipt([line()], [{ purchaseOrderItemId: 'l1', quantityReceived: 10 }], PO_STATUS.ISSUED);
        assert.equal(plan.lines[0].unitCost, 100);
    });

    it('records rejected units without letting them into stock', () => {
        const plan = planReceipt(
            [line()],
            [{ purchaseOrderItemId: 'l1', quantityReceived: 8, quantityRejected: 2 }],
            PO_STATUS.ISSUED,
        );

        assert.equal(plan.lines[0].quantityReceived, 8);
        assert.equal(plan.lines[0].quantityRejected, 2);
        assert.equal(plan.totalQuantityRejected, 2);
        assert.equal(plan.lines[0].newQuantityReceived, 8, 'only accepted units count against the order');
        assert.equal(plan.totalReceivedValue, 800, 'rejected units are not paid for as stock');
    });

    it('skips lines with nothing on them', () => {
        const plan = planReceipt(
            [line({ id: 'l1' }), line({ id: 'l2' })],
            [
                { purchaseOrderItemId: 'l1', quantityReceived: 10 },
                { purchaseOrderItemId: 'l2', quantityReceived: 0, quantityRejected: 0 },
            ],
            PO_STATUS.ISSUED,
        );
        assert.equal(plan.lines.length, 1, 'a zero line is not a receipt line');
    });
});

describe('planReceipt: what it refuses', () => {
    it('refuses more than was ordered rather than silently accepting it', () => {
        // A delivery of 12 against an order of 10 is a supplier error or a typo. Clamping it
        // would put stock on the books nobody agreed to buy.
        assert.throws(
            () => planReceipt([line()], [{ purchaseOrderItemId: 'l1', quantityReceived: 12 }], PO_STATUS.ISSUED),
            (e: Error) => e instanceof ReceivingError && /exceed the 10 still outstanding/.test(e.message),
        );
    });

    it('counts what has already arrived when checking the surplus', () => {
        assert.throws(
            () => planReceipt([line({ quantityReceived: 7 })], [{ purchaseOrderItemId: 'l1', quantityReceived: 4 }], PO_STATUS.PARTIAL),
            /exceed the 3 still outstanding/,
        );
    });

    it('refuses to receive against a draft or cancelled order', () => {
        assert.throws(
            () => planReceipt([line()], [{ purchaseOrderItemId: 'l1', quantityReceived: 1 }], PO_STATUS.DRAFT),
            /Issue the purchase order/,
        );
        assert.throws(
            () => planReceipt([line()], [{ purchaseOrderItemId: 'l1', quantityReceived: 1 }], PO_STATUS.CANCELLED),
            /cancelled/,
        );
    });

    it('refuses a line that is not on the order', () => {
        assert.throws(
            () => planReceipt([line()], [{ purchaseOrderItemId: 'ghost', quantityReceived: 1 }], PO_STATUS.ISSUED),
            /not on this purchase order/,
        );
    });

    it('refuses the same line twice in one receipt', () => {
        assert.throws(
            () => planReceipt(
                [line()],
                [
                    { purchaseOrderItemId: 'l1', quantityReceived: 3 },
                    { purchaseOrderItemId: 'l1', quantityReceived: 3 },
                ],
                PO_STATUS.ISSUED,
            ),
            /appears twice/,
        );
    });

    it('refuses fractional and negative quantities', () => {
        for (const q of [1.5, -1]) {
            assert.throws(
                () => planReceipt([line()], [{ purchaseOrderItemId: 'l1', quantityReceived: q }], PO_STATUS.ISSUED),
                /whole numbers of zero or more/,
                `${q} should be refused`,
            );
        }
    });

    it('refuses a negative unit cost', () => {
        assert.throws(
            () => planReceipt([line()], [{ purchaseOrderItemId: 'l1', quantityReceived: 1, unitCost: -5 }], PO_STATUS.ISSUED),
            /unit cost must be zero or more/,
        );
    });

    it('refuses an empty receipt', () => {
        assert.throws(() => planReceipt([line()], [], PO_STATUS.ISSUED), /at least one line/);
    });
});

describe('outstanding quantity helpers', () => {
    it('reports what is still to come', () => {
        assert.equal(outstandingQuantity({ quantity: 10, quantityReceived: 4 }), 6);
        assert.equal(outstandingQuantity({ quantity: 10, quantityReceived: 10 }), 0);
    });

    it('floors at zero if more was somehow received than ordered', () => {
        assert.equal(outstandingQuantity({ quantity: 10, quantityReceived: 12 }), 0);
    });

    it('reports whether an order has anything left', () => {
        assert.equal(hasOutstanding([line({ quantityReceived: 10 })]), false);
        assert.equal(hasOutstanding([line({ quantityReceived: 10 }), line({ id: 'l2', quantityReceived: 3 })]), true);
    });
});

describe('weighted average valuation', () => {
    it('blends an incoming price into the existing cost', () => {
        // 10 @ 80 plus 10 @ 100 is 20 @ 90 — the new price dilutes, it does not replace.
        const next = applyReceiptToPosition({ quantity: 10, averageCost: 80 }, 10, 100);
        assert.deepEqual(next, { quantity: 20, averageCost: 90 });
    });

    it('weights by quantity, not by number of receipts', () => {
        // 90 @ 100 plus 10 @ 200 is much closer to 100 than to 150.
        const next = applyReceiptToPosition({ quantity: 90, averageCost: 100 }, 10, 200);
        assert.deepEqual(next, { quantity: 100, averageCost: 110 });
    });

    it('sets the cost outright for stock that had none', () => {
        // Pre-existing rows default to averageCost 0. Blending against that zero would halve
        // the real cost of the first delivery.
        const next = applyReceiptToPosition({ quantity: 5, averageCost: 0 }, 5, 100);
        assert.equal(next.averageCost, 100);
        assert.equal(next.quantity, 10);
    });

    it('sets the cost outright when there was no stock at all', () => {
        assert.deepEqual(applyReceiptToPosition({ quantity: 0, averageCost: 0 }, 4, 250), { quantity: 4, averageCost: 250 });
    });

    it('leaves the position untouched for a zero receipt', () => {
        assert.deepEqual(applyReceiptToPosition({ quantity: 5, averageCost: 80 }, 0, 100), { quantity: 5, averageCost: 80 });
    });

    it('rounds the average to paise', () => {
        const next = applyReceiptToPosition({ quantity: 3, averageCost: 10 }, 1, 11);
        assert.equal(next.averageCost, 10.25);
    });
});

describe('stock value and totals', () => {
    it('values stock at its average cost', () => {
        assert.equal(stockValue({ quantity: 20, averageCost: 90 }), 1_800);
    });

    it('reports null — not zero — for stock with no established cost', () => {
        // "Not yet valued" and "worth nothing" are different claims, and only one is true.
        assert.equal(stockValue({ quantity: 20, averageCost: 0 }), null);
    });

    it('values an empty shelf at zero, not unknown', () => {
        assert.equal(stockValue({ quantity: 0, averageCost: 0 }), 0);
    });

    it('keeps unvalued items visible in a roll-up instead of counting them as zero', () => {
        const totals = summariseValuation([
            { quantity: 10, averageCost: 50 },
            { quantity: 5, averageCost: 20 },
            { quantity: 7, averageCost: 0 },
        ]);

        assert.equal(totals.totalValue, 600);
        assert.equal(totals.valuedItems, 2);
        assert.equal(totals.unvaluedItems, 1, 'the unpriced item is reported, not silently dropped');
        assert.equal(totals.totalQuantity, 22);
    });

    it('computes margin only when both sides are known', () => {
        assert.equal(marginPercent(200, 150), 25);
        assert.equal(marginPercent(200, 0), null);
        assert.equal(marginPercent(0, 150), null);
    });
});
