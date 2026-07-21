import assert from 'node:assert/strict';
import test from 'node:test';

import { metricKey, metricDirection, distributeWeights } from '../../src/lib/kra/materialize-templates';
import { normalizePeriod } from '../../src/lib/kra/period';

test('metricKey slugs titles stably', () => {
  assert.equal(metricKey('Weekly manuscript processing throughput'), 'weekly_manuscript_processing_throughput');
  assert.equal(metricKey('Cost per acquisition (CAC)'), 'cost_per_acquisition_cac');
  assert.equal(metricKey('  Email & social engagement rate  '), 'email_social_engagement_rate');
});

test('metricDirection: *_MAX capped units are lower-better', () => {
  assert.equal(metricDirection('PERCENT_MAX'), 'LOWER_BETTER');
  assert.equal(metricDirection('HOURS_MAX'), 'LOWER_BETTER');
  assert.equal(metricDirection('INR_MAX'), 'LOWER_BETTER');
  assert.equal(metricDirection('PERCENT'), 'HIGHER_BETTER');
  assert.equal(metricDirection('MANUSCRIPTS'), 'HIGHER_BETTER');
});

test('distributeWeights sums to exactly 100', () => {
  for (const n of [1, 2, 3, 6, 7, 9, 14]) {
    const w = distributeWeights(n);
    assert.equal(w.length, n);
    assert.equal(w.reduce((a, b) => a + b, 0), 100, `n=${n}`);
    // spread is at most 1 between any two weights
    assert.ok(Math.max(...w) - Math.min(...w) <= 1, `n=${n} uneven`);
  }
  assert.deepEqual(distributeWeights(0), []);
});

test('normalizePeriod whitelists and defaults to MONTHLY', () => {
  assert.equal(normalizePeriod('DAILY'), 'DAILY');
  assert.equal(normalizePeriod('weekly'), 'WEEKLY');
  assert.equal(normalizePeriod('bogus'), 'MONTHLY');
  assert.equal(normalizePeriod(''), 'MONTHLY');
});
