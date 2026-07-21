import assert from 'node:assert/strict';
import test from 'node:test';

import {
  contributionSums,
  countableValue,
  verifiedOnlyValue,
  progressStatusFlip,
  type ContributionLike,
} from '../../src/lib/kra/recount';
import { planItemPropagation, itemKey, type GoalForPropagation } from '../../src/lib/kra/template-propagation';

const c = (over: Partial<ContributionLike>): ContributionLike => ({
  status: 'PENDING', source: 'MANUAL', reportedValue: 0, verifiedValue: null, ...over,
});

// ---- counting ------------------------------------------------------------

test('countableValue: verified use verifiedValue, pending MANUAL counts, SYSTEM waits, REJECTED never', () => {
  assert.equal(countableValue(c({ status: 'MANAGER_APPROVED', reportedValue: 5, verifiedValue: 4 })), 4);
  assert.equal(countableValue(c({ status: 'AUTO_VERIFIED', reportedValue: 3, verifiedValue: null })), 3); // falls back to reported
  assert.equal(countableValue(c({ status: 'PENDING', source: 'MANUAL', reportedValue: 7 })), 7);
  assert.equal(countableValue(c({ status: 'PENDING', source: 'SYSTEM', reportedValue: 9 })), 0);
  assert.equal(countableValue(c({ status: 'REJECTED', reportedValue: 9, verifiedValue: 9 })), 0);
});

test('verifiedOnlyValue counts only verified statuses', () => {
  assert.equal(verifiedOnlyValue(c({ status: 'MANAGER_APPROVED', reportedValue: 5, verifiedValue: 4 })), 4);
  assert.equal(verifiedOnlyValue(c({ status: 'PENDING', source: 'MANUAL', reportedValue: 7 })), 0);
  assert.equal(verifiedOnlyValue(c({ status: 'REJECTED', verifiedValue: 9, reportedValue: 9 })), 0);
});

test('contributionSums: countable ⊇ verified — the two layers diverge exactly by pending self-reports', () => {
  const sums = contributionSums([
    c({ status: 'MANAGER_APPROVED', reportedValue: 10, verifiedValue: 8 }),
    c({ status: 'PENDING', source: 'MANUAL', reportedValue: 5 }),
    c({ status: 'PENDING', source: 'SYSTEM', reportedValue: 100 }),
    c({ status: 'REJECTED', reportedValue: 50 }),
  ]);
  assert.equal(sums.verified, 8);
  assert.equal(sums.countable, 13); // 8 verified + 5 pending manual
});

// ---- status flips --------------------------------------------------------

test('progressStatusFlip: forward-only transitions', () => {
  assert.deepEqual(progressStatusFlip('PENDING', 0, 0), {});
  assert.deepEqual(progressStatusFlip('PENDING', 3, 30), { status: 'IN_PROGRESS' });
  assert.deepEqual(progressStatusFlip('PENDING', 10, 100), { status: 'ACHIEVED' });
  assert.deepEqual(progressStatusFlip('IN_PROGRESS', 10, 100), { status: 'ACHIEVED' });
  assert.deepEqual(progressStatusFlip('IN_PROGRESS', 5, 50), {});
  // verification-chain states are never touched
  assert.deepEqual(progressStatusFlip('SUBMITTED', 10, 100), {});
  assert.deepEqual(progressStatusFlip('MANAGER_VERIFIED', 10, 100), {});
});

// ---- template propagation planning --------------------------------------

const goal = (over: Partial<GoalForPropagation>): GoalForPropagation => ({
  id: 'g', baseTargetValue: 10, targetValue: 10, carriedInValue: 0, ...over,
});

const item = { metricId: 'm1', periodType: 'MONTHLY', defaultTarget: 20, weight: 15, dimension: 'OUTPUT', dailyTarget: null, ratePerUnit: null };

test('planItemPropagation updates untweaked goals and preserves carry-forward', () => {
  const plan = planItemPropagation(item, [
    goal({ id: 'a', baseTargetValue: 10, targetValue: 10 }),               // matches old default → update
    goal({ id: 'b', baseTargetValue: 10, targetValue: 14, carriedInValue: 4 }), // carry-in preserved
  ], 10);
  assert.equal(plan.skippedTweaked, 0);
  assert.equal(plan.updates.length, 2);
  assert.equal(plan.updates[0].targetValue, 20);
  assert.equal(plan.updates[1].targetValue, 24); // new base 20 + carriedIn 4
  assert.equal(plan.updates[1].baseTargetValue, 20);
  assert.equal(plan.updates[0].weight, 15);
});

test('planItemPropagation skips per-employee tweaked goals', () => {
  const plan = planItemPropagation(item, [
    goal({ id: 'a', baseTargetValue: 10 }),  // untweaked
    goal({ id: 'b', baseTargetValue: 12 }),  // manager customized → skip
  ], 10);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].goalId, 'a');
  assert.equal(plan.skippedTweaked, 1);
});

test('planItemPropagation: item new to the template (no old default) propagates to all', () => {
  const plan = planItemPropagation(item, [goal({ id: 'a', baseTargetValue: 3 })], undefined);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.skippedTweaked, 0);
});

test('planItemPropagation: null baseTargetValue falls back to target minus carry-in', () => {
  const plan = planItemPropagation(item, [
    goal({ id: 'a', baseTargetValue: null, targetValue: 14, carriedInValue: 4 }), // implied base 10 = old default → update
    goal({ id: 'b', baseTargetValue: null, targetValue: 99, carriedInValue: 0 }), // implied base 99 ≠ 10 → tweaked
  ], 10);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].goalId, 'a');
  assert.equal(plan.skippedTweaked, 1);
});

test('itemKey is stable', () => {
  assert.equal(itemKey('m1', 'MONTHLY'), 'm1:MONTHLY');
});
