import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeTrackingNumber,
    getDispatchPartnerName,
    buildTrackingMetadata,
    summarizeInvoiceLineItems,
    buildInvoiceFulfillmentPlan,
    deriveDispatchDates,
} from '../../src/lib/dispatch-core';

describe('normalizeTrackingNumber', () => {
    it('strips whitespace and upper-cases', () => {
        assert.equal(normalizeTrackingNumber('  ab 123 456 in '), 'AB123456IN');
    });

    it('returns null for anything empty rather than an empty string', () => {
        // Downstream treats null as "no tracking yet"; '' would read as a real value.
        for (const v of ['', '   ', null, undefined]) {
            assert.equal(normalizeTrackingNumber(v), null, `${JSON.stringify(v)} should normalise to null`);
        }
    });

    it('coerces non-strings', () => {
        assert.equal(normalizeTrackingNumber(12345), '12345');
    });
});

describe('getDispatchPartnerName', () => {
    it('prefers the name recorded on the dispatch over the linked courier', () => {
        const name = getDispatchPartnerName({ partnerName: 'Blue Dart', courier: { name: 'DTDC' } });
        assert.equal(name, 'Blue Dart');
    });

    it('falls back to the linked courier', () => {
        assert.equal(getDispatchPartnerName({ courier: { name: 'DTDC' } }), 'DTDC');
    });

    it('returns null when neither is set', () => {
        assert.equal(getDispatchPartnerName({}), null);
        assert.equal(getDispatchPartnerName({ partnerName: null, courier: null }), null);
    });
});

describe('buildTrackingMetadata', () => {
    it('resolves a known carrier to its tracking page', () => {
        const meta = buildTrackingMetadata({ trackingNumber: 'ab123in', partnerName: 'India Post' });

        assert.equal(meta.trackingNumber, 'AB123IN');
        assert.equal(meta.partnerName, 'India Post');
        assert.match(meta.trackingUrl!, /indiapost\.gov\.in/);
        assert.equal(meta.canTrack, true);
    });

    it('matches carrier names loosely on spacing and case', () => {
        // The lookup key is normalised, so "speed post" and "Speed Post" hit the same entry.
        const meta = buildTrackingMetadata({ trackingNumber: 'X1', partnerName: 'speed  post' });
        assert.match(meta.trackingUrl!, /indiapost\.gov\.in/);
    });

    it('falls back to the courier website for an unknown carrier', () => {
        const meta = buildTrackingMetadata({
            trackingNumber: 'X1',
            partnerName: 'Local Courier',
            courier: { name: 'Local Courier', website: 'https://local.example' },
        });
        assert.equal(meta.trackingUrl, 'https://local.example');
        assert.equal(meta.canTrack, true);
    });

    it('cannot track without a number, even for a known carrier', () => {
        const meta = buildTrackingMetadata({ trackingNumber: null, partnerName: 'DTDC' });
        assert.equal(meta.trackingNumber, null);
        assert.equal(meta.canTrack, false);
    });

    it('cannot track without a destination, even with a number', () => {
        const meta = buildTrackingMetadata({ trackingNumber: 'X1', partnerName: 'Nobody' });
        assert.equal(meta.trackingUrl, null);
        assert.equal(meta.canTrack, false);
    });
});

describe('summarizeInvoiceLineItems', () => {
    it('numbers lines from one and reads whichever field carries the description', () => {
        const rows = summarizeInvoiceLineItems([
            { description: 'Annual subscription', quantity: 2, total: 5000, sku: 'SUB-1' },
            { name: 'Back issue' },
            { journal: { name: 'Journal of Testing' } },
        ]);

        assert.equal(rows[0].line, 1);
        assert.equal(rows[0].description, 'Annual subscription');
        assert.equal(rows[0].quantity, 2);
        assert.equal(rows[0].amount, 5000);
        assert.equal(rows[1].description, 'Back issue');
        assert.equal(rows[2].description, 'Journal of Testing');
    });

    it('defaults an unnamed line rather than emitting an empty label', () => {
        const [row] = summarizeInvoiceLineItems([{}]);
        assert.equal(row.description, 'Invoice Item');
        assert.equal(row.quantity, 1, 'a line with no quantity still ships one of something');
        assert.equal(row.amount, 0);
        assert.equal(row.sku, null);
    });

    it('treats a non-array as no line items', () => {
        for (const v of [null, undefined, {}, 'nope']) {
            assert.deepEqual(summarizeInvoiceLineItems(v), []);
        }
    });

    it('falls back to 1 for an unparseable quantity', () => {
        const [row] = summarizeInvoiceLineItems([{ quantity: 'many' }]);
        assert.equal(row.quantity, 1);
    });
});

describe('buildInvoiceFulfillmentPlan', () => {
    const START = new Date('2026-01-01T00:00:00.000Z');
    const invoice = (lineItems: any[], over: any = {}) => ({
        createdAt: START,
        subscription: { startDate: START, endDate: new Date('2026-12-31T00:00:00.000Z') },
        lineItems,
        ...over,
    });

    it('splits a quarterly print subscription into four dated dispatches', () => {
        const plan = buildInvoiceFulfillmentPlan(
            invoice([{ description: 'Quarterly journal', productAttributes: { subscriptionOptions: { frequency: 'QUARTERLY', mode: 'PRINT' } } }]),
        );

        assert.equal(plan.length, 4);
        assert.deepEqual(plan.map((p) => p.cycleNumber), [1, 2, 3, 4]);
        assert.equal(plan[0].fulfillmentType, 'PRINT');
        assert.equal(plan[0].cycleLabel, 'Dispatch 1 of 4');
        // 12 months / 4 cycles = one dispatch every 3 months from the subscription start.
        assert.equal(plan[0].plannedDispatchDate!.getMonth(), 0);
        assert.equal(plan[1].plannedDispatchDate!.getMonth(), 3);
        assert.equal(plan[3].plannedDispatchDate!.getMonth(), 9);
    });

    it('labels a single annual dispatch without a cycle count', () => {
        const plan = buildInvoiceFulfillmentPlan(
            invoice([{ productAttributes: { subscriptionOptions: { frequency: 'ANNUAL', mode: 'PRINT' } } }]),
        );
        assert.equal(plan.length, 1);
        assert.equal(plan[0].cycleLabel, 'Print Dispatch');
    });

    it('gives digital access one record spanning the subscription', () => {
        const plan = buildInvoiceFulfillmentPlan(
            invoice([{ productAttributes: { subscriptionOptions: { frequency: 'MONTHLY', mode: 'ONLINE' } } }]),
        );

        assert.equal(plan.length, 1, 'digital access is not dispatched monthly');
        assert.equal(plan[0].fulfillmentType, 'DIGITAL');
        assert.equal(plan[0].accessStartDate!.toISOString(), START.toISOString());
        assert.equal(plan[0].accessEndDate!.toISOString(), new Date('2026-12-31T00:00:00.000Z').toISOString());
    });

    it('produces both halves for a print-and-online subscription', () => {
        const plan = buildInvoiceFulfillmentPlan(
            invoice([{ productAttributes: { subscriptionOptions: { frequency: 'BI_ANNUAL', mode: 'PRINT + ONLINE' } } }]),
        );

        const types = plan.map((p) => p.fulfillmentType);
        assert.deepEqual(types, ['PRINT', 'PRINT', 'DIGITAL']);
        assert.equal(plan[2].accessEndDate!.getFullYear(), 2026);
    });

    it('defaults to print when no mode is specified', () => {
        // An unmarked subscription is a physical one — the safe assumption, since failing to
        // ship something is worse than granting access nobody uses.
        const plan = buildInvoiceFulfillmentPlan(invoice([{ description: 'Unmarked' }]));
        assert.equal(plan.length, 1);
        assert.equal(plan[0].fulfillmentType, 'PRINT');
    });

    it('still plans one dispatch for line items that resolve to nothing', () => {
        const plan = buildInvoiceFulfillmentPlan(invoice([{ productAttributes: { subscriptionOptions: { mode: '' } } }]));
        assert.equal(plan.length, 1);
        assert.equal(plan[0].items.length, 1);
    });

    it('plans nothing for an invoice with no line items', () => {
        assert.deepEqual(buildInvoiceFulfillmentPlan(invoice([])), []);
    });

    it('takes the cycle count from the heaviest line when they differ', () => {
        const plan = buildInvoiceFulfillmentPlan(
            invoice([
                { description: 'Annual', productAttributes: { subscriptionOptions: { frequency: 'ANNUAL', mode: 'PRINT' } } },
                { description: 'Quarterly', productAttributes: { subscriptionOptions: { frequency: 'QUARTERLY', mode: 'PRINT' } } },
            ]),
        );

        assert.equal(plan.length, 4, 'four dispatches, because the quarterly line needs four');
        assert.equal(plan[0].items.length, 2, 'the first carries both items');
        assert.equal(plan[1].items.length, 1, 'later ones carry only the quarterly line');
        assert.equal(plan[1].items[0].description, 'Quarterly');
    });

    it('falls back to the invoice date and a 12-month window with no subscription', () => {
        const plan = buildInvoiceFulfillmentPlan({
            createdAt: START,
            lineItems: [{ productAttributes: { subscriptionOptions: { mode: 'ONLINE' } } }],
        });
        assert.equal(plan[0].accessStartDate!.toISOString(), START.toISOString());
        assert.equal(plan[0].accessEndDate!.getFullYear(), 2027);
    });
});

describe('deriveDispatchDates', () => {
    it('stamps the packed date once the order is being processed', () => {
        const d = deriveDispatchDates('PROCESSING');
        assert.ok(d.packedDate instanceof Date);
        assert.equal(d.shippedDate, null);
        assert.equal(d.deliveredDate, null);
    });

    it('backfills earlier stages when an order jumps straight to delivered', () => {
        // A courier can report delivery without the intermediate updates ever arriving; the
        // record should not be left claiming the parcel was never packed or shipped.
        const d = deriveDispatchDates('DELIVERED');
        assert.ok(d.packedDate instanceof Date);
        assert.ok(d.shippedDate instanceof Date);
        assert.ok(d.deliveredDate instanceof Date);
    });

    it('never overwrites a date already recorded', () => {
        const packed = new Date('2026-01-01T00:00:00.000Z');
        const shipped = new Date('2026-01-02T00:00:00.000Z');
        const d = deriveDispatchDates('DELIVERED', { packedDate: packed, shippedDate: shipped, deliveredDate: null });

        assert.equal(d.packedDate!.toISOString(), packed.toISOString());
        assert.equal(d.shippedDate!.toISOString(), shipped.toISOString());
        assert.ok(d.deliveredDate instanceof Date, 'only the missing one is filled in');
    });

    it('leaves every date alone for a status that implies no progress', () => {
        for (const status of ['PENDING', 'CANCELLED', 'RETURNED']) {
            assert.deepEqual(
                deriveDispatchDates(status),
                { packedDate: null, shippedDate: null, deliveredDate: null },
                `${status} should not stamp any date`,
            );
        }
    });

    it('treats in-transit as shipped', () => {
        const d = deriveDispatchDates('IN_TRANSIT');
        assert.ok(d.shippedDate instanceof Date);
        assert.equal(d.deliveredDate, null);
    });
});
