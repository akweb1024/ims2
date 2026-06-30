import assert from 'node:assert/strict';
import test from 'node:test';

import { buildShareRows, istPeriod, roundMoney, type MatchedRule } from '../../src/lib/revenue-share-core';

const PERIOD = { month: 6, year: 2026 };
const SRC_CO = 'reinste';
const SRC_DEPT = 'marketing';
const IT = 'it';
const HR = 'hr';
const benCo = { [IT]: 'itbreak', [HR]: 'reinste' };

function base(rules: MatchedRule[], amount = 1000, sourceDepartmentId: string | null = SRC_DEPT) {
    return buildShareRows({
        revenueTransactionId: 'tx1',
        amount,
        sourceCompanyId: SRC_CO,
        sourceDepartmentId,
        period: PERIOD,
        rules,
        beneficiaryCompanyById: benCo,
    });
}

test('stacks overlapping rules and appends the source-department residual', () => {
    const rows = base([
        { id: 'r1', beneficiaryDepartmentId: IT, percentage: 15 },
        { id: 'r2', beneficiaryDepartmentId: IT, percentage: 10 },
    ]);
    assert.ok(rows);
    assert.equal(rows!.length, 3);

    const shares = rows!.filter((r) => !r.isResidual);
    assert.equal(shares.length, 2);
    assert.equal(roundMoney(shares.reduce((s, r) => s + r.amount, 0)), 250); // 15% + 10% of 1000

    const residual = rows!.find((r) => r.isResidual);
    assert.ok(residual);
    assert.equal(residual!.percentage, 75);
    assert.equal(residual!.amount, 750);
    assert.equal(residual!.beneficiaryDepartmentId, SRC_DEPT);
    assert.equal(residual!.ruleId, null);

    // Conservation: every rupee is attributed exactly once.
    assert.equal(roundMoney(rows!.reduce((s, r) => s + r.amount, 0)), 1000);
});

test('over-allocation (>100%) returns null so the engine skips the transaction', () => {
    const rows = base([
        { id: 'r1', beneficiaryDepartmentId: IT, percentage: 80 },
        { id: 'r2', beneficiaryDepartmentId: HR, percentage: 30 },
    ]);
    assert.equal(rows, null);
});

test('exactly 100% allocated produces no residual row', () => {
    const rows = base([
        { id: 'r1', beneficiaryDepartmentId: IT, percentage: 60 },
        { id: 'r2', beneficiaryDepartmentId: HR, percentage: 40 },
    ]);
    assert.ok(rows);
    assert.equal(rows!.length, 2);
    assert.equal(rows!.some((r) => r.isResidual), false);
    assert.equal(roundMoney(rows!.reduce((s, r) => s + r.amount, 0)), 1000);
});

test('no matching rules but a source department yields a single 100% residual', () => {
    const rows = base([]);
    assert.ok(rows);
    assert.equal(rows!.length, 1);
    assert.equal(rows![0].isResidual, true);
    assert.equal(rows![0].percentage, 100);
    assert.equal(rows![0].amount, 1000);
});

test('no source department and no rules yields no rows (remainder unattributable)', () => {
    const rows = base([], 1000, null);
    assert.ok(rows);
    assert.equal(rows!.length, 0);
});

test('no source department still allocates whole-company shares but no residual', () => {
    const rows = base([{ id: 'r1', beneficiaryDepartmentId: IT, percentage: 15 }], 1000, null);
    assert.ok(rows);
    assert.equal(rows!.length, 1);
    assert.equal(rows![0].isResidual, false);
    assert.equal(rows![0].amount, 150);
    assert.equal(rows![0].sourceDepartmentId, null);
});

test('beneficiary company is denormalized from the lookup, falling back to source company', () => {
    const rows = base([
        { id: 'r1', beneficiaryDepartmentId: IT, percentage: 10 }, // known -> itbreak
        { id: 'r2', beneficiaryDepartmentId: 'unknown', percentage: 10 }, // missing -> source company
    ]);
    assert.ok(rows);
    const it = rows!.find((r) => r.beneficiaryDepartmentId === IT);
    const unknown = rows!.find((r) => r.beneficiaryDepartmentId === 'unknown');
    assert.equal(it!.beneficiaryCompanyId, 'itbreak');
    assert.equal(unknown!.beneficiaryCompanyId, SRC_CO);
});

test('amounts are rounded to paise', () => {
    const rows = base([{ id: 'r1', beneficiaryDepartmentId: IT, percentage: 33.33 }], 100);
    assert.ok(rows);
    const share = rows!.find((r) => !r.isResidual)!;
    assert.equal(share.amount, 33.33); // 33.33% of 100
    const residual = rows!.find((r) => r.isResidual)!;
    assert.equal(residual.percentage, 66.67);
    assert.equal(residual.amount, 66.67);
});

test('istPeriod snapshots the month/year in IST, not UTC', () => {
    // 2026-06-30 21:00 UTC is 2026-07-01 02:30 IST -> belongs to July.
    assert.deepEqual(istPeriod(new Date('2026-06-30T21:00:00Z')), { month: 7, year: 2026 });
    // 2026-06-30 10:00 UTC is 2026-06-30 15:30 IST -> still June.
    assert.deepEqual(istPeriod(new Date('2026-06-30T10:00:00Z')), { month: 6, year: 2026 });
    // Year boundary: 2026-12-31 20:00 UTC is 2027-01-01 01:30 IST -> January 2027.
    assert.deepEqual(istPeriod(new Date('2026-12-31T20:00:00Z')), { month: 1, year: 2027 });
});
