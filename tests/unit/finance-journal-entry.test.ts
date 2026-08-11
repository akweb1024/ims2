import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prepareJournalEntry } from '../../src/lib/finance/journal-entry';

/**
 * Debits equal credits is the one rule the entire ledger rests on. Everything downstream —
 * general ledger, trial balance, P&L, balance sheet — is a view over entries that satisfied it,
 * so an entry that slips through wrong is not recoverable by any later report.
 */

const line = (accountId: string, debit?: number, credit?: number) => ({ accountId, debit, credit });

describe('prepareJournalEntry: the balance invariant', () => {
    it('accepts a balanced two-line entry', () => {
        const entry = prepareJournalEntry([line('cash', 1_000), line('sales', undefined, 1_000)], 'Sale');

        assert.equal(entry.totalDebit.toString(), '1000');
        assert.equal(entry.totalCredit.toString(), '1000');
        assert.equal(entry.lines.length, 2);
    });

    it('accepts a compound entry where many lines balance in aggregate', () => {
        // One debit against two credits — a sale split across revenue and tax payable.
        const entry = prepareJournalEntry(
            [line('cash', 1_180), line('sales', undefined, 1_000), line('gst-payable', undefined, 180)],
            'Sale with GST',
        );
        assert.equal(entry.totalDebit.toString(), '1180');
        assert.equal(entry.totalCredit.toString(), '1180');
    });

    it('rejects an unbalanced entry and names both totals', () => {
        assert.throws(
            () => prepareJournalEntry([line('cash', 1_000), line('sales', undefined, 900)], 'Sale'),
            /not balanced.*Total Debit: 1000.*Total Credit: 900/,
        );
    });

    it('rejects an entry that nets to zero on both sides', () => {
        // Two empty lines balance trivially. An entry that moves no money is not an entry.
        assert.throws(
            () => prepareJournalEntry([line('cash', 0), line('sales', undefined, 0)], 'Nothing'),
            /cannot be empty/,
        );
    });

    it('rejects an empty line list', () => {
        assert.throws(() => prepareJournalEntry([], 'Nothing'), /cannot be empty/);
    });
});

describe('prepareJournalEntry: decimal arithmetic', () => {
    it('balances amounts that floating point would not', () => {
        // 0.1 + 0.2 === 0.30000000000000004 as a float, which would fail the equality check
        // and reject a perfectly good entry. Decimal arithmetic is why this holds.
        const entry = prepareJournalEntry(
            [line('a', 0.1), line('b', 0.2), line('c', undefined, 0.3)],
            'Fractions',
        );
        assert.equal(entry.totalDebit.toString(), '0.3');
        assert.equal(entry.totalCredit.toString(), '0.3');
    });

    it('holds precision across many paise-level lines', () => {
        const debits = Array.from({ length: 10 }, (_, i) => line(`d${i}`, 0.01));
        const entry = prepareJournalEntry([...debits, line('credit', undefined, 0.1)], 'Paise');
        assert.equal(entry.totalDebit.toString(), '0.1');
    });

    it('catches an imbalance smaller than a paisa rather than rounding it away', () => {
        assert.throws(
            () => prepareJournalEntry([line('cash', 100.001), line('sales', undefined, 100)], 'Drift'),
            /not balanced/,
        );
    });

    it('accepts amounts given as strings', () => {
        const entry = prepareJournalEntry(
            [{ accountId: 'cash', debit: '1000.50' }, { accountId: 'sales', credit: '1000.50' }],
            'Sale',
        );
        assert.equal(entry.totalDebit.toString(), '1000.5');
    });
});

describe('prepareJournalEntry: negative amounts', () => {
    it('rejects a negative debit', () => {
        // A negative debit is a credit in disguise. Two of them cancel out and satisfy the
        // balance check while leaving the ledger meaningless, so they are refused outright.
        assert.throws(
            () => prepareJournalEntry([line('cash', -1_000), line('sales', undefined, -1_000)], 'Reversal'),
            /cannot contain negative amounts/,
        );
    });

    it('rejects a negative credit', () => {
        assert.throws(
            () => prepareJournalEntry([line('cash', 1_000), line('sales', undefined, -1_000)], 'Odd'),
            /cannot contain negative amounts/,
        );
    });

    it('rejects a negative line even when the entry balances overall', () => {
        // Debits 1000 + (-200) = 800, credits 800. Balanced, and still nonsense.
        assert.throws(
            () => prepareJournalEntry(
                [line('cash', 1_000), line('discount', -200), line('sales', undefined, 800)],
                'Netted',
            ),
            /cannot contain negative amounts/,
        );
    });
});

describe('prepareJournalEntry: line normalisation', () => {
    it('fills a missing side with zero rather than undefined', () => {
        const entry = prepareJournalEntry([line('cash', 500), line('sales', undefined, 500)], 'Sale');

        assert.equal(entry.lines[0].credit.toString(), '0');
        assert.equal(entry.lines[1].debit.toString(), '0');
    });

    it('treats null and empty string as no amount', () => {
        const entry = prepareJournalEntry(
            [
                { accountId: 'cash', debit: 500, credit: null },
                { accountId: 'sales', debit: '', credit: 500 },
            ],
            'Sale',
        );
        assert.equal(entry.totalDebit.toString(), '500');
        assert.equal(entry.totalCredit.toString(), '500');
    });

    it('falls back to the entry description when a line has none', () => {
        const entry = prepareJournalEntry(
            [{ accountId: 'cash', debit: 500, description: 'Cash received' }, line('sales', undefined, 500)],
            'July invoice',
        );
        assert.equal(entry.lines[0].description, 'Cash received');
        assert.equal(entry.lines[1].description, 'July invoice', 'the entry description stands in');
    });

    it('preserves line order', () => {
        const entry = prepareJournalEntry(
            [line('a', 100), line('b', 200), line('c', undefined, 300)],
            'Ordered',
        );
        assert.deepEqual(entry.lines.map((l) => l.accountId), ['a', 'b', 'c']);
    });
});
