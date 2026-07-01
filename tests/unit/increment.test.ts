import assert from 'node:assert/strict';
import test from 'node:test';

import { recommendIncrement, RATING_RANGES } from '../../src/lib/hr/increment';

test('PIP / notice blocks the increment', () => {
  const r = recommendIncrement({ rating: 'A+', compaRatio: 1.0, underPipOrNotice: true });
  assert.equal(r.mode, 'BLOCKED');
  assert.equal(r.recommendedPct, 0);
  assert.ok(r.notes.some((n) => n.key === 'pip_block' && n.severity === 'BLOCK'));
});

test('missing rating → NEEDS_RATING, no percent', () => {
  const r = recommendIncrement({ rating: null, compaRatio: 1.0 });
  assert.equal(r.mode, 'NEEDS_RATING');
  assert.equal(r.recommendedPct, null);
});

test('normal compa → rating band midpoint', () => {
  const r = recommendIncrement({ rating: 'A', compaRatio: 1.0 }); // A = 11–15 → mid 13
  assert.equal(r.mode, 'INCREMENT');
  assert.equal(r.minPct, 11);
  assert.equal(r.maxPct, 15);
  assert.equal(r.recommendedPct, 13);
});

test('bands are non-overlapping (addendum A)', () => {
  assert.deepEqual(RATING_RANGES['A+'], { min: 16, max: 25 });
  assert.deepEqual(RATING_RANGES['A'], { min: 11, max: 15 });
  assert.deepEqual(RATING_RANGES['B+'], { min: 8, max: 10 });
  assert.deepEqual(RATING_RANGES['D'], { min: 0, max: 0 });
});

test('high compa (>1.20) without promotion → bonus mode, near band min', () => {
  const r = recommendIncrement({ rating: 'A', compaRatio: 1.3 });
  assert.equal(r.mode, 'BONUS');
  assert.equal(r.moderatedForHighCompa, true);
  assert.equal(r.recommendedPct, 11); // band min
});

test('high compa but promotion → normal increment (not bonus)', () => {
  const r = recommendIncrement({ rating: 'A', compaRatio: 1.3, promotion: true });
  assert.equal(r.mode, 'INCREMENT');
});

test('below 0.85 compa with strong rating → equity correction to band top', () => {
  const r = recommendIncrement({ rating: 'B+', compaRatio: 0.8 }); // B+ 8–10
  assert.equal(r.equityCorrection, true);
  assert.equal(r.recommendedPct, 10);
});

test('below 0.85 compa with weak rating → no equity correction', () => {
  const r = recommendIncrement({ rating: 'C', compaRatio: 0.8 }); // C not strong
  assert.equal(r.equityCorrection, false);
});

test('D rating → 0%', () => {
  const r = recommendIncrement({ rating: 'D', compaRatio: 1.0 });
  assert.equal(r.recommendedPct, 0);
});
