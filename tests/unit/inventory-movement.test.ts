import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    movementDirection,
    signedQuantity,
    consumptionOverWindow,
    daysOfCoverFromRate,
    forecastConfidence,
} from '../../src/lib/inventory/movement';

/**
 * StockMovement.quantity is stored as a positive magnitude with the direction in `type`.
 * Nothing in the table is negative, so any consumption figure that filters on `quantity < 0`
 * silently matches nothing and reports every item as never used. These tests exist to keep
 * that mistake from being made again.
 */

const move = (type: string, quantity: number, daysAgo = 0) => ({
    type,
    quantity,
    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
});

describe('movementDirection', () => {
    it('classifies stock coming in', () => {
        for (const t of ['IN', 'RELEASE', 'PURCHASE_RECEIPT', 'RETURN']) {
            assert.equal(movementDirection(t), 'IN', `${t} should add to stock`);
        }
    });

    it('classifies stock going out', () => {
        for (const t of ['OUT', 'RESERVE', 'ISSUE', 'DISPATCH', 'WRITE_OFF']) {
            assert.equal(movementDirection(t), 'OUT', `${t} should take stock out`);
        }
    });

    it('counts a reservation as consumption', () => {
        // The units are committed to an invoice and are no longer available to anyone else,
        // so a forecast that ignores reservations over-reports what is on the shelf.
        assert.equal(movementDirection('RESERVE'), 'OUT');
        assert.equal(movementDirection('RELEASE'), 'IN', 'and returning them puts stock back');
    });

    it('refuses to guess at an unknown type', () => {
        assert.equal(movementDirection('SOMETHING_NEW'), 'UNKNOWN');
        assert.equal(movementDirection(''), 'UNKNOWN');
    });

    it('is case-insensitive', () => {
        assert.equal(movementDirection('out'), 'OUT');
    });
});

describe('signedQuantity', () => {
    it('signs by type, not by the stored value', () => {
        assert.equal(signedQuantity({ type: 'IN', quantity: 10 }), 10);
        assert.equal(signedQuantity({ type: 'OUT', quantity: 10 }), -10, 'stored positive, means -10');
    });

    it('ignores a stray sign on the stored quantity', () => {
        // Defensive: the column holds magnitudes, but a negative that slipped in must not
        // flip an outbound movement into an inbound one.
        assert.equal(signedQuantity({ type: 'OUT', quantity: -10 }), -10);
        assert.equal(signedQuantity({ type: 'IN', quantity: -10 }), 10);
    });

    it('scores an unclassifiable movement as zero rather than guessing', () => {
        assert.equal(signedQuantity({ type: 'MYSTERY', quantity: 500 }), 0);
    });
});

describe('consumptionOverWindow', () => {
    it('sums only what went out', () => {
        const c = consumptionOverWindow(
            [move('OUT', 30, 5), move('IN', 100, 10), move('RESERVE', 20, 2), move('PURCHASE_RECEIPT', 50, 1)],
            30,
        );

        assert.equal(c.unitsConsumed, 50, 'the two outbound movements, not the receipts');
        assert.equal(c.movementCount, 2);
    });

    it('averages over the whole window, not the span between movements', () => {
        // Two withdrawals a day apart inside a 30-day window is a slow-moving item. Dividing
        // by the one day between them would call it 30x faster than it is.
        const c = consumptionOverWindow([move('OUT', 15, 10), move('OUT', 15, 9)], 30);
        assert.equal(c.unitsConsumed, 30);
        assert.equal(c.dailyRate, 1);
    });

    it('weights by quantity, not by number of movements', () => {
        const many = consumptionOverWindow([move('OUT', 1), move('OUT', 1), move('OUT', 1)], 30);
        const few = consumptionOverWindow([move('OUT', 300)], 30);

        assert.ok(few.dailyRate > many.dailyRate, 'one big withdrawal outweighs three tiny ones');
        assert.equal(few.movementCount, 1);
    });

    it('reports nothing consumed when only stock came in', () => {
        const c = consumptionOverWindow([move('IN', 100), move('PURCHASE_RECEIPT', 50)], 30);
        assert.equal(c.unitsConsumed, 0);
        assert.equal(c.dailyRate, 0);
    });

    it('ignores movements it cannot classify', () => {
        const c = consumptionOverWindow([move('MYSTERY', 999), move('OUT', 10)], 30);
        assert.equal(c.unitsConsumed, 10);
    });

    it('handles an empty ledger and a zero window', () => {
        assert.deepEqual(consumptionOverWindow([], 30), { unitsConsumed: 0, dailyRate: 0, movementCount: 0 });
        assert.deepEqual(consumptionOverWindow([move('OUT', 10)], 0), { unitsConsumed: 0, dailyRate: 0, movementCount: 0 });
    });
});

describe('daysOfCoverFromRate', () => {
    it('divides stock by the rate', () => {
        assert.equal(daysOfCoverFromRate(30, 2), 15);
    });

    it('returns null rather than a large sentinel when nothing is moving', () => {
        // The old code returned 999 here, which reads as "plenty of cover" on a dashboard
        // when what it means is "we have no idea".
        assert.equal(daysOfCoverFromRate(30, 0), null);
    });

    it('reports zero cover for an empty shelf that is being drawn on', () => {
        assert.equal(daysOfCoverFromRate(0, 2), 0);
    });

    it('treats negative stock as empty', () => {
        assert.equal(daysOfCoverFromRate(-5, 2), 0);
    });
});

describe('forecastConfidence', () => {
    it('is zero with nothing to go on', () => {
        assert.equal(forecastConfidence(0), 0);
    });

    it('rises with the number of observations and never exceeds 100', () => {
        const few = forecastConfidence(2);
        const some = forecastConfidence(10);
        const many = forecastConfidence(100);

        assert.ok(few < some && some < many, 'more movements, more confidence');
        assert.ok(few < 40, 'a forecast from two withdrawals is a guess');
        assert.ok(many <= 100);
    });
});
