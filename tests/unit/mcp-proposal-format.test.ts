import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPreview, requireTarget, McpProposalError, type ProposalPayload } from '../../src/lib/kra/mcp-proposal-format';

function payload(over: Partial<ProposalPayload> = {}): ProposalPayload {
  return {
    metricId: 'm1',
    metricName: 'Projects Delivered',
    unit: 'projects',
    period: 'MONTHLY',
    windowStart: '2026-07-01T00:00:00.000Z',
    windowEnd: '2026-07-31T23:59:59.999Z',
    windowLabel: '2026-07',
    title: 'Projects Delivered',
    isKra: true,
    weight: 1,
    reviewerId: null,
    reviewerName: null,
    items: [
      {
        employeeProfileId: 'p1',
        employeeName: 'Amit Kumar',
        employeeEmail: 'amit@x.com',
        companyId: 'c1',
        target: 5,
        dailyTarget: null,
        existingGoalId: null,
      },
    ],
    ...over,
  };
}

test('buildPreview shows metric, window, employee targets and CREATE/UPDATE mode', () => {
  const p = payload({
    items: [
      { ...payload().items[0] },
      {
        employeeProfileId: 'p2',
        employeeName: null,
        employeeEmail: 'no-name@x.com',
        companyId: 'c1',
        target: 8,
        dailyTarget: 2,
        existingGoalId: 'g-existing',
      },
    ],
  });
  const text = buildPreview(p, 'Set July delivery targets');
  assert.match(text, /requires approve_proposal/);
  assert.match(text, /Instruction: Set July delivery targets/);
  assert.match(text, /Projects Delivered \[projects\] · Period: MONTHLY \(2026-07\)/);
  assert.match(text, /Amit Kumar → target 5 projects \[CREATE\]/);
  // Nameless employee falls back to email; existing goal reads as UPDATE.
  assert.match(text, /no-name@x\.com → target 8 projects, daily 2 \[UPDATE existing goal\]/);
});

test('buildPreview includes reviewer only when set', () => {
  assert.doesNotMatch(buildPreview(payload(), 'x'), /Reviewer:/);
  const withRev = payload({ reviewerId: 'u9', reviewerName: 'Boss Person' });
  assert.match(buildPreview(withRev, 'x'), /Reviewer: Boss Person/);
});

test('requireTarget prefers the per-item value over the fallback', () => {
  assert.equal(requireTarget(7, 3, 'amit'), 7);
  assert.equal(requireTarget(undefined, 3, 'amit'), 3);
});

test('requireTarget rejects missing, zero, negative and non-finite targets', () => {
  for (const [value, fallback] of [
    [undefined, undefined],
    [0, undefined],
    [-2, undefined],
    [undefined, 0],
    [Number.NaN, undefined],
    [Number.POSITIVE_INFINITY, undefined],
  ] as Array<[number | undefined, number | undefined]>) {
    assert.throws(() => requireTarget(value, fallback, 'ref-x'), McpProposalError);
  }
});
