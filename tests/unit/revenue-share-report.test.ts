import assert from 'node:assert/strict';
import test from 'node:test';

import { aggregateDepartmentShares, type ShareLite, type DeptLite } from '../../src/lib/revenue-share-report-core';

const DEPTS: DeptLite[] = [
    { id: 'marketing', name: 'Marketing', departmentType: 'REVENUE', companyId: 'reinste', companyName: 'Reinste' },
    { id: 'it', name: 'IT', departmentType: 'SUPPORT', companyId: 'itbreak', companyName: 'ITBreak' },
    { id: 'hr', name: 'HR', departmentType: 'SUPPORT', companyId: 'reinste', companyName: 'Reinste' },
];

// Marketing billed 1000; IT earns 15% + 10% (cross-company), Marketing keeps 75%.
const SHARES: ShareLite[] = [
    { beneficiaryDepartmentId: 'it', sourceDepartmentId: 'marketing', amount: 150, isResidual: false, isLocked: true },
    { beneficiaryDepartmentId: 'it', sourceDepartmentId: 'marketing', amount: 100, isResidual: false, isLocked: true },
    { beneficiaryDepartmentId: 'marketing', sourceDepartmentId: 'marketing', amount: 750, isResidual: true, isLocked: true },
];

function run(shares: ShareLite[], grossByDept: Record<string, number> = { marketing: 1000 }) {
    return aggregateDepartmentShares({ month: 6, year: 2026, shares, grossByDept, departments: DEPTS });
}

test('maps shares-in / shares-out / residual to the right departments', () => {
    const r = run(SHARES);
    const mkt = r.rows.find((x) => x.departmentId === 'marketing')!;
    const it = r.rows.find((x) => x.departmentId === 'it')!;

    assert.equal(mkt.grossRevenue, 1000);
    assert.equal(mkt.sharesOut, 250);
    assert.equal(mkt.residualKept, 750);
    assert.equal(mkt.sharesIn, 0);
    assert.equal(mkt.netAttributed, 750);

    assert.equal(it.grossRevenue, 0);
    assert.equal(it.sharesOut, 0);
    assert.equal(it.residualKept, 0);
    assert.equal(it.sharesIn, 250);
    assert.equal(it.netAttributed, 250);
    assert.equal(it.companyName, 'ITBreak'); // cross-company carried through
});

test('conservation: total net equals total gross', () => {
    const r = run(SHARES);
    assert.equal(r.totals.grossRevenue, 1000);
    assert.equal(r.totals.netAttributed, 1000);
    assert.equal(r.totals.sharesOut, 250);
    assert.equal(r.totals.residualKept, 750);
    assert.equal(r.totals.sharesIn, 250);
});

test('rows are sorted by netAttributed descending', () => {
    const r = run(SHARES);
    assert.deepEqual(r.rows.map((x) => x.departmentId), ['marketing', 'it']);
});

test('departments with no activity are excluded', () => {
    const r = run(SHARES);
    assert.equal(r.rows.find((x) => x.departmentId === 'hr'), undefined);
});

test('locked is true only when every share row is locked', () => {
    assert.equal(run(SHARES).locked, true);

    const partial = SHARES.map((s, i) => (i === 0 ? { ...s, isLocked: false } : s));
    assert.equal(run(partial).locked, false);
});

test('empty period: no rows, zero totals, not locked', () => {
    const r = run([], {});
    assert.equal(r.rows.length, 0);
    assert.equal(r.locked, false);
    assert.equal(r.totals.grossRevenue, 0);
    assert.equal(r.totals.netAttributed, 0);
});

test('gross-only department (verified txn but no shares) shows gross with zero net', () => {
    // e.g. a transaction verified before any rule existed, or skipped for over-allocation.
    const r = run([], { marketing: 500 });
    const mkt = r.rows.find((x) => x.departmentId === 'marketing')!;
    assert.equal(mkt.grossRevenue, 500);
    assert.equal(mkt.netAttributed, 0);
    assert.equal(r.locked, false); // no shares to lock
});

test('whole-company share (null source department) contributes to sharesIn but not sharesOut', () => {
    const shares: ShareLite[] = [
        { beneficiaryDepartmentId: 'it', sourceDepartmentId: null, amount: 200, isResidual: false, isLocked: false },
    ];
    const r = run(shares, {});
    const it = r.rows.find((x) => x.departmentId === 'it')!;
    assert.equal(it.sharesIn, 200);
    // No department carries this as sharesOut (source was whole-company).
    assert.equal(r.totals.sharesOut, 0);
});
