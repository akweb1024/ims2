import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateFitment, summarizeEquity, EQUITY_EXCEED_THRESHOLD_PCT } from '../../src/lib/hr/fitment';

// G3 Executive band from the framework default ladder.
const G3 = { code: 'G3', name: 'Executive', minCtc: 28000, midCtc: 34000, maxCtc: 40000 };

test('grade required blocks approval', () => {
  const r = evaluateFitment({ proposedMonthlyCtc: 30000, grade: null });
  assert.equal(r.ok, false);
  assert.ok(r.checks.some((c) => c.key === 'grade_required' && c.severity === 'BLOCK'));
});

test('in-band, at/below midpoint → clean, no exception/justification', () => {
  const r = evaluateFitment({ proposedMonthlyCtc: 32000, grade: G3, isNewHire: true });
  assert.equal(r.ok, true);
  assert.equal(r.band, 'IN_BAND');
  assert.equal(r.needsException, false);
  assert.equal(r.needsJustification, false);
});

test('above midpoint (new hire) requires justification', () => {
  const r = evaluateFitment({ proposedMonthlyCtc: 37000, grade: G3, isNewHire: true });
  assert.equal(r.needsJustification, true);
  assert.equal(r.needsException, false); // still within band
});

test('above band maximum requires exception (and not double-counted as midpoint)', () => {
  const r = evaluateFitment({ proposedMonthlyCtc: 45000, grade: G3, isNewHire: true });
  assert.equal(r.band, 'ABOVE_MAX');
  assert.equal(r.needsException, true);
  assert.equal(r.needsJustification, false);
});

test('below band minimum requires exception', () => {
  const r = evaluateFitment({ proposedMonthlyCtc: 20000, grade: G3 });
  assert.equal(r.band, 'BELOW_MIN');
  assert.equal(r.needsException, true);
});

test('compa-ratio computed against midpoint', () => {
  const r = evaluateFitment({ proposedMonthlyCtc: 34000, grade: G3 });
  assert.equal(r.compaRatio, 1); // 34000 / 34000
  assert.equal(r.compaBucket.bucket, 'NORMAL');
});

test('internal-equity flag when exceeding peers beyond threshold', () => {
  // peers max 30000; proposing 36000 = +20% > 15% threshold
  const r = evaluateFitment({ proposedMonthlyCtc: 36000, grade: G3, isNewHire: true, peerSalaries: [26000, 28000, 30000] });
  assert.equal(r.needsEquityReview, true);
  assert.ok((r.peer.exceedByPct ?? 0) > EQUITY_EXCEED_THRESHOLD_PCT);
});

test('no equity flag when in line with peers', () => {
  const r = evaluateFitment({ proposedMonthlyCtc: 31000, grade: G3, isNewHire: true, peerSalaries: [30000, 32000] });
  assert.equal(r.needsEquityReview, false);
});

test('summarizeEquity ignores invalid peers and computes stats', () => {
  const s = summarizeEquity(40000, [30000, 0, -5, 34000]);
  assert.equal(s.count, 2);
  assert.equal(s.max, 34000);
  assert.equal(s.median, 32000);
  assert.ok((s.exceedByPct ?? 0) > 0);
});
