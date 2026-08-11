import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    reconcile,
    settlementBreakdown,
    type DeclarationInput,
    type SettlementInput,
} from '../../src/lib/finance/reconciliation';

/**
 * The reconciliation engine compares what employees declare they sold against what actually
 * reached the bank. It had a live bug where a $500 payment was counted as ₹500, so the FX and
 * fee arithmetic is the part most worth pinning down.
 */

const PERIOD_START = new Date('2026-07-01T00:00:00.000Z');
const PERIOD_END = new Date('2026-07-31T23:59:59.999Z');
const opts = (over: Partial<Parameters<typeof reconcile>[2]> = {}) => ({
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    ...over,
});

const declaration = (over: Partial<DeclarationInput> = {}): DeclarationInput => ({
    id: 'd1',
    employeeId: 'e1',
    employeeName: 'Asha',
    saleDate: new Date('2026-07-15T10:00:00.000Z'),
    grossAmount: 10_000,
    currency: 'INR',
    channel: 'BANK_DIRECT',
    ...over,
});

const settlement = (over: Partial<SettlementInput> = {}): SettlementInput => ({
    id: 's1',
    source: 'BANK_STATEMENT',
    captureDate: new Date('2026-07-15T10:00:00.000Z'),
    settlementDate: new Date('2026-07-16T10:00:00.000Z'),
    originalCurrency: 'INR',
    originalAmount: 10_000,
    fxRate: 1,
    grossInr: 10_000,
    feeInr: 0,
    taxInr: 0,
    netInr: 10_000,
    declarationId: 'd1',
    ...over,
});

describe('settlementBreakdown', () => {
    it('passes an INR payment through untouched by the FX rate', () => {
        // fxRate is ignored for INR — a stray rate on a domestic payment must not scale it.
        const b = settlementBreakdown({
            originalAmount: 10_000,
            originalCurrency: 'INR',
            fxRate: 85,
            feeInr: 200,
            taxInr: 36,
        });
        assert.deepEqual(b, { grossInr: 10_000, netInr: 9_764 });
    });

    it('converts a foreign payment and deducts fee and tax', () => {
        // The worked example from the module doc: $500 at 85.00, ₹1,000 fee, ₹180 GST on the fee.
        const b = settlementBreakdown({
            originalAmount: 500,
            originalCurrency: 'USD',
            fxRate: 85,
            feeInr: 1_000,
            taxInr: 180,
        });
        assert.deepEqual(b, { grossInr: 42_500, netInr: 41_320 });
    });

    it('rounds to paise rather than carrying float noise', () => {
        const b = settlementBreakdown({
            originalAmount: 99.99,
            originalCurrency: 'USD',
            fxRate: 83.333,
            feeInr: 0,
            taxInr: 0,
        });
        assert.equal(b.grossInr, 8_332.47);
    });
});

describe('reconcile: the FX case it exists for', () => {
    it('reconciles a $500 sale against its ₹41,320 bank credit', () => {
        const r = reconcile(
            [declaration({ grossAmount: 500, currency: 'USD', channel: 'RAZORPAY' })],
            [
                settlement({
                    source: 'RAZORPAY',
                    originalCurrency: 'USD',
                    originalAmount: 500,
                    fxRate: 85,
                    grossInr: 42_500,
                    feeInr: 1_000,
                    taxInr: 180,
                    netInr: 41_320,
                }),
            ],
            opts(),
        );

        // Gross is compared gross-to-gross, net net-to-net. Comparing the declared 42,500
        // against the bank's 41,320 directly would report a ₹1,180 shortfall that is really
        // just the gateway's fee and GST.
        assert.equal(r.declared.grossInr, 42_500);
        assert.equal(r.declared.netInr, 41_320);
        assert.equal(r.settled.grossInr, 42_500);
        assert.equal(r.settled.netInr, 41_320);
        assert.equal(r.variance.grossInr, 0);
        assert.equal(r.variance.netInr, 0);
        assert.equal(r.variance.matches, true);
        assert.deepEqual(r.exceptions, []);
    });

    it('prefers the rate observed on the settlement over any fallback table', () => {
        // A real conversion beats a table. The fallback would give 40,000; the settlement
        // actually converted at 85.
        const r = reconcile(
            [declaration({ grossAmount: 500, currency: 'USD' })],
            [settlement({ originalCurrency: 'USD', originalAmount: 500, fxRate: 85, grossInr: 42_500, netInr: 42_500 })],
            opts({ fallbackFxRates: { USD: 80 } }),
        );
        assert.equal(r.declared.grossInr, 42_500);
    });

    it('falls back to the supplied rate when nothing settled to observe', () => {
        const r = reconcile(
            [declaration({ grossAmount: 500, currency: 'USD' })],
            [],
            opts({ fallbackFxRates: { USD: 80 } }),
        );
        assert.equal(r.declared.grossInr, 40_000);
        assert.equal(r.declared.unconvertedCount, 0);
    });

    it('ignores a matched settlement whose currency differs from the declaration', () => {
        // The settlement converted EUR, the declaration is in USD — that rate says nothing
        // about this sale, so the fallback is used instead.
        const r = reconcile(
            [declaration({ grossAmount: 500, currency: 'USD' })],
            [settlement({ originalCurrency: 'EUR', fxRate: 95, grossInr: 47_500, netInr: 47_500 })],
            opts({ fallbackFxRates: { USD: 80 } }),
        );
        assert.equal(r.declared.grossInr, 40_000);
    });

    it('leaves an unconvertible declaration out of the totals instead of treating 1 USD as 1 INR', () => {
        const r = reconcile([declaration({ grossAmount: 500, currency: 'EUR' })], [], opts());

        assert.equal(r.declared.grossInr, 0, 'the unconvertible sale must not land in the INR total');
        assert.equal(r.declared.unconvertedCount, 1);
        assert.deepEqual(r.declared.unratedCurrencies, ['EUR']);
        assert.deepEqual(
            r.exceptions.map((e) => e.kind),
            ['MISSING_FX_RATE'],
            'it is reported as unrated, not as an unsettled declaration',
        );
        assert.equal(r.variance.matches, false, 'a period with unconverted lines is never clean');
    });

    it('refuses to call a period clean while anything is unconverted, even at zero variance', () => {
        // Both sides balance at ₹10,000; the EUR line simply is not in either total. Reporting
        // "matches" here would claim agreement over a sale nobody has valued.
        const r = reconcile(
            [declaration(), declaration({ id: 'd2', grossAmount: 500, currency: 'EUR' })],
            [settlement()],
            opts(),
        );
        assert.equal(r.variance.grossInr, 0);
        assert.equal(r.variance.netInr, 0);
        assert.equal(r.variance.grossMatches, true);
        assert.equal(r.variance.netMatches, true);
        assert.equal(r.variance.matches, false);
    });
});

describe('reconcile: why both bases are reported', () => {
    it('agrees on both bases when the gateway takes a fee, because the declaration is netted by it', () => {
        // The declared side borrows the fee actually observed on its settlement, so a normal
        // fee moves both nets together rather than opening a variance.
        const r = reconcile([declaration()], [settlement({ feeInr: 500, netInr: 9_500 })], opts());

        assert.equal(r.declared.netInr, 9_500);
        assert.equal(r.settled.netInr, 9_500);
        assert.equal(r.variance.netMatches, true);
        assert.equal(r.variance.matches, true);
    });

    it('flags a settlement whose net disagrees with its own gross less deductions', () => {
        // ₹500 of fee recorded but never taken off the credit. Gross ties on both sides, so
        // only the net basis catches it — which is why both are reported.
        const r = reconcile([declaration()], [settlement({ feeInr: 500, netInr: 10_000 })], opts());

        assert.equal(r.variance.grossMatches, true, 'gross alone would call this period clean');
        assert.equal(r.declared.netInr, 9_500, 'declared net deducts the fee the settlement claims');
        assert.equal(r.settled.netInr, 10_000, 'but the credit was never reduced by it');
        assert.equal(r.variance.netInr, -500);
        assert.equal(r.variance.netMatches, false);
        assert.equal(r.variance.matches, false);
    });

    it('flags a mis-declared sale value — the amounts disagree line by line', () => {
        const r = reconcile([declaration({ grossAmount: 12_000 })], [settlement()], opts());

        assert.equal(r.variance.grossInr, 2_000);
        assert.equal(r.variance.grossMatches, false);
        const mismatch = r.exceptions.find((e) => e.kind === 'AMOUNT_MISMATCH');
        assert.ok(mismatch, 'a line-level mismatch should be raised, not just a total');
        assert.equal(mismatch.differenceInr, 2_000);
        assert.equal(mismatch.declarationId, 'd1');
        assert.equal(mismatch.settlementId, 's1');
    });

    it('absorbs rounding inside the tolerance band but not outside it', () => {
        const near = reconcile([declaration({ grossAmount: 10_000.5 })], [settlement()], opts());
        assert.equal(near.variance.grossMatches, true, '50 paise is rounding, not a discrepancy');
        assert.equal(near.exceptions.length, 0);

        const far = reconcile([declaration({ grossAmount: 10_002 })], [settlement()], opts());
        assert.equal(far.variance.grossMatches, false);

        const widened = reconcile([declaration({ grossAmount: 10_002 })], [settlement()], opts({ toleranceInr: 5 }));
        assert.equal(widened.variance.grossMatches, true, 'the tolerance should be configurable');
    });
});

describe('reconcile: exceptions', () => {
    it('raises DECLARED_NOT_SETTLED for a sale with no money behind it', () => {
        const r = reconcile([declaration()], [], opts());

        assert.deepEqual(r.exceptions.map((e) => e.kind), ['DECLARED_NOT_SETTLED']);
        assert.equal(r.exceptions[0].declarationId, 'd1');
        assert.equal(r.exceptions[0].employeeName, 'Asha');
        assert.equal(r.exceptions[0].amountInr, 10_000);
    });

    it('raises SETTLED_NOT_DECLARED for money nobody claimed', () => {
        const r = reconcile([], [settlement({ declarationId: null, externalRef: 'pay_abc' })], opts());

        assert.deepEqual(r.exceptions.map((e) => e.kind), ['SETTLED_NOT_DECLARED']);
        assert.equal(r.exceptions[0].settlementId, 's1');
        assert.match(r.exceptions[0].detail, /pay_abc/);
    });

    it('raises SETTLED_NOT_DECLARED when the matched declaration falls outside the period', () => {
        // The settlement points at a declaration, but that sale belongs to another month, so
        // within this period the credit is genuinely unclaimed.
        const r = reconcile(
            [declaration({ saleDate: new Date('2026-06-15T10:00:00.000Z') })],
            [settlement()],
            opts(),
        );
        assert.ok(r.exceptions.some((e) => e.kind === 'SETTLED_NOT_DECLARED'));
        assert.equal(r.declared.count, 0);
    });
});

describe('reconcile: period and in-transit handling', () => {
    it('includes both endpoints of the period', () => {
        const r = reconcile(
            [
                declaration({ id: 'first', saleDate: PERIOD_START }),
                declaration({ id: 'last', saleDate: PERIOD_END }),
                declaration({ id: 'before', saleDate: new Date(PERIOD_START.getTime() - 1) }),
                declaration({ id: 'after', saleDate: new Date(PERIOD_END.getTime() + 1) }),
            ],
            [],
            opts(),
        );
        assert.equal(r.declared.count, 2, 'a sale on the first or last day belongs to the period');
    });

    it('keeps captured-but-uncredited money out of the settled totals', () => {
        // It has not arrived, so it cannot reconcile yet — it is reported separately so the
        // variance it causes has a visible explanation.
        const r = reconcile(
            [],
            [settlement({ settlementDate: null, declarationId: null })],
            opts(),
        );

        assert.equal(r.settled.count, 0);
        assert.equal(r.settled.netInr, 0);
        assert.equal(r.inTransit.count, 1);
        assert.equal(r.inTransit.netInr, 10_000);
        assert.deepEqual(r.exceptions, [], 'in-transit money is not an exception on its own');
    });

    it('does not count money captured after the period as in transit', () => {
        const r = reconcile(
            [],
            [settlement({ settlementDate: null, captureDate: new Date(PERIOD_END.getTime() + 1) })],
            opts(),
        );
        assert.equal(r.inTransit.count, 0);
    });

    it('sums fees and tax across the settled side', () => {
        const r = reconcile(
            [],
            [
                settlement({ id: 's1', declarationId: null, feeInr: 200, taxInr: 36, netInr: 9_764 }),
                settlement({ id: 's2', declarationId: null, feeInr: 300, taxInr: 54, netInr: 9_646 }),
            ],
            opts(),
        );
        assert.equal(r.settled.count, 2);
        assert.equal(r.settled.feeInr, 500);
        assert.equal(r.settled.taxInr, 90);
        assert.equal(r.settled.grossInr, 20_000);
        assert.equal(r.settled.netInr, 19_410);
    });

    it('reports an empty period as balanced', () => {
        const r = reconcile([], [], opts());
        assert.equal(r.variance.matches, true);
        assert.equal(r.declared.count, 0);
        assert.equal(r.settled.count, 0);
        assert.deepEqual(r.exceptions, []);
    });
});
