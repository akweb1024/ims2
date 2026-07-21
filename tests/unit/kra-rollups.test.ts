import assert from 'node:assert/strict';
import test from 'node:test';

import { aggregateEntries, groupByKey, type RollupEntry } from '../../src/lib/kra/rollups';

function entry(over: Partial<RollupEntry>): RollupEntry {
  return { employeeId: 'e', achievement: 0, index: 0, grade: null, goals: [], ...over };
}

test('aggregateEntries averages achievement and index with equal employee weight', () => {
  const agg = aggregateEntries([
    entry({ employeeId: 'a', achievement: 80, index: 70, grade: 'A' }),
    entry({ employeeId: 'b', achievement: 60, index: 50, grade: 'B' }),
    entry({ employeeId: 'c', achievement: 40, index: 30, grade: 'B' }),
  ]);
  assert.equal(agg.employeeCount, 3);
  assert.equal(agg.avgAchievement, 60);
  assert.equal(agg.avgIndex, 50);
  assert.deepEqual(agg.gradeCounts, { A: 1, B: 2 });
});

test('aggregateEntries: empty set yields zeros, not NaN', () => {
  const agg = aggregateEntries([]);
  assert.equal(agg.employeeCount, 0);
  assert.equal(agg.avgAchievement, 0);
  assert.equal(agg.avgIndex, 0);
  assert.deepEqual(agg.gradeCounts, {});
  assert.deepEqual(agg.dimensionAvgs, {});
});

test('aggregateEntries: unassessed employees count toward size but pull the average down', () => {
  const agg = aggregateEntries([
    entry({ employeeId: 'a', achievement: 100, index: 90, grade: 'A' }),
    entry({ employeeId: 'b' }), // no PerformanceIndex row → zeros
  ]);
  assert.equal(agg.employeeCount, 2);
  assert.equal(agg.avgAchievement, 50);
  assert.equal(agg.avgIndex, 45);
});

test('aggregateEntries: dimension averages across all goals, null dimension folds to OUTPUT', () => {
  const agg = aggregateEntries([
    entry({
      employeeId: 'a',
      goals: [
        { dimension: 'OUTPUT', achievementPercentage: 80 },
        { dimension: 'QUALITY', achievementPercentage: 90 },
        { dimension: null, achievementPercentage: 40 }, // → OUTPUT
      ],
    }),
    entry({ employeeId: 'b', goals: [{ dimension: 'OUTPUT', achievementPercentage: 60 }] }),
  ]);
  assert.equal(agg.goalCount, 4);
  assert.equal(agg.dimensionAvgs.OUTPUT, 60); // (80+40+60)/3
  assert.equal(agg.dimensionAvgs.QUALITY, 90);
});

test('groupByKey groups and drops null keys', () => {
  const items = [
    { id: 1, k: 'x' }, { id: 2, k: 'x' }, { id: 3, k: 'y' }, { id: 4, k: null },
  ];
  const groups = groupByKey(items, (i) => i.k);
  assert.equal(groups.size, 2);
  assert.equal(groups.get('x')!.length, 2);
  assert.equal(groups.get('y')!.length, 1);
});
