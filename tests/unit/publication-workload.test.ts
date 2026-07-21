import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPipeline,
  dueInfo,
  groupQueue,
  issueCompletion,
  kpiDirection,
  kpiState,
  periodFromGoalType,
  releaseState,
  stageGroupOf,
  summarize,
  toKpi,
  toRelease,
  LIVE_STATUSES,
  type AssignmentInput,
  type GoalInput,
  type IssueInput,
} from '../../src/lib/publication/workload';

const NOW = new Date('2026-07-21T09:00:00Z');

// ---- dueInfo -------------------------------------------------------------

test('dueInfo classifies overdue / today / upcoming / none by whole day', () => {
  assert.deepEqual(dueInfo('2026-07-19T23:00:00Z', NOW), { dueState: 'OVERDUE', daysToDue: -2 });
  assert.deepEqual(dueInfo('2026-07-21T23:59:00Z', NOW), { dueState: 'DUE_TODAY', daysToDue: 0 });
  assert.deepEqual(dueInfo('2026-07-24T01:00:00Z', NOW), { dueState: 'UPCOMING', daysToDue: 3 });
  assert.deepEqual(dueInfo(null, NOW), { dueState: 'NONE', daysToDue: null });
});

// ---- stage folding -------------------------------------------------------

test('LIVE_STATUSES excludes terminal statuses', () => {
  for (const terminal of ['PUBLISHED', 'REJECTED', 'WITHDRAWN']) {
    assert.ok(!LIVE_STATUSES.includes(terminal as any), `${terminal} must not be live`);
  }
  assert.ok(LIVE_STATUSES.includes('UNDER_REVIEW'));
  assert.ok(LIVE_STATUSES.includes('GALLEY_PROOF'));
});

test('stageGroupOf maps statuses to chip groups', () => {
  assert.equal(stageGroupOf('SUBMITTED'), 'INTAKE');
  assert.equal(stageGroupOf('PLAGIARISM_CHECK'), 'QUALITY');
  assert.equal(stageGroupOf('UNDER_REVIEW'), 'REVIEW');
  assert.equal(stageGroupOf('FORMATTING'), 'PRODUCTION');
  assert.equal(stageGroupOf('PUBLISHED'), 'PUBLISHED');
});

test('buildPipeline folds live counts and appends today transitions', () => {
  const p = buildPipeline(
    { SUBMITTED: 8, INITIAL_REVIEW: 6, UNDER_REVIEW: 5, ACCEPTED: 3, FORMATTING: 4, GALLEY_PROOF: 4 },
    5,
    2,
    '2026-07-21T00:00:00.000Z',
  );
  const byKey = Object.fromEntries(p.stages.map((s) => [s.key, s.count]));
  assert.equal(byKey.IN_LINE, 14); // 8 + 6
  assert.equal(byKey.IN_PROCESS, 5);
  assert.equal(byKey.BOARD_REVIEW, 3); // ACCEPTED
  assert.equal(byKey.COPY_EDITING, 4); // FORMATTING (COPYRIGHT_CHECK absent)
  assert.equal(byKey.GALLEY, 4);
  assert.equal(byKey.PUBLISHED_TODAY, 5);
  assert.equal(byKey.REJECTED, 2);
  assert.equal(p.totalLive, 30); // published/rejected excluded from live total
});

// ---- KPI -----------------------------------------------------------------

test('kpiDirection: _MAX units and lower/min directions are lower-better', () => {
  assert.equal(kpiDirection('PERCENT_MAX'), 'LOWER_BETTER');
  assert.equal(kpiDirection('HOURS_MAX'), 'LOWER_BETTER');
  assert.equal(kpiDirection('MANUSCRIPTS'), 'HIGHER_BETTER');
  assert.equal(kpiDirection('PERCENT', 'LOWER_BETTER'), 'LOWER_BETTER');
  assert.equal(kpiDirection('PERCENT', 'HIGHER_BETTER'), 'HIGHER_BETTER');
});

test('kpiState: higher-better thresholds', () => {
  assert.equal(kpiState(25, 25, 'HIGHER_BETTER'), 'ON_TRACK');
  assert.equal(kpiState(22, 25, 'HIGHER_BETTER'), 'AT_RISK'); // 88%
  assert.equal(kpiState(15, 25, 'HIGHER_BETTER'), 'BEHIND'); // 60%
});

test('kpiState: lower-better (caps) thresholds', () => {
  assert.equal(kpiState(3.8, 5, 'LOWER_BETTER'), 'ON_TRACK');
  assert.equal(kpiState(5.5, 5, 'LOWER_BETTER'), 'AT_RISK'); // within 20%
  assert.equal(kpiState(8, 5, 'LOWER_BETTER'), 'BEHIND');
  assert.equal(kpiState(10, 0, 'LOWER_BETTER'), 'ON_TRACK'); // zero target guard
});

test('periodFromGoalType maps known values and defaults to MONTHLY', () => {
  assert.equal(periodFromGoalType('DAILY'), 'DAILY');
  assert.equal(periodFromGoalType('half_yearly'), 'HALF_YEARLY');
  assert.equal(periodFromGoalType('bogus'), 'MONTHLY');
  assert.equal(periodFromGoalType(null), 'MONTHLY');
});

test('toKpi shapes a goal row with derived direction/state', () => {
  const g: GoalInput = {
    id: 'g1', title: 'Weekly manuscript processing throughput', unit: 'MANUSCRIPTS', type: 'WEEKLY',
    targetValue: 25, currentValue: 22, achievementPercentage: 88, metricId: 'm1', metric: { direction: 'HIGHER_BETTER' },
  };
  const k = toKpi(g);
  assert.equal(k.key, 'weekly_manuscript_processing_throughput');
  assert.equal(k.direction, 'HIGHER_BETTER');
  assert.equal(k.state, 'AT_RISK');
  assert.equal(k.period, 'WEEKLY');
  assert.equal(k.goalId, 'g1');
});

// ---- queue grouping ------------------------------------------------------

function mkAssignment(over: Partial<AssignmentInput> & { jid: string; jname: string; domId: string | null; domName: string | null; due: string | null; id: string }): AssignmentInput {
  return {
    id: over.id,
    stage: over.stage ?? 'FORMATTING',
    status: over.status ?? 'PENDING',
    dueDate: over.due,
    assignedAt: '2026-07-18T00:00:00Z',
    article: {
      id: 'a-' + over.id,
      title: 'Paper ' + over.id,
      manuscriptId: 'MS-' + over.id,
      journalId: over.jid,
      journal: { id: over.jid, name: over.jname, domainId: over.domId, domain: over.domName ? { name: over.domName } : null },
    },
  };
}

test('groupQueue groups by domain then journal, preserving input order', () => {
  const assignments = [
    mkAssignment({ id: '1', jid: 'jC', jname: 'Catalysis', domId: 'chem', domName: 'Chemistry', due: '2026-07-20T00:00:00Z' }),
    mkAssignment({ id: '2', jid: 'jC', jname: 'Catalysis', domId: 'chem', domName: 'Chemistry', due: '2026-07-24T00:00:00Z' }),
    mkAssignment({ id: '3', jid: 'jM', jname: 'Machine Intelligence', domId: 'cs', domName: 'Computer Science', due: '2026-07-19T00:00:00Z' }),
  ];
  const grouped = groupQueue(assignments, NOW);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].domain, 'Chemistry');
  assert.equal(grouped[0].journals[0].items.length, 2);
  assert.equal(grouped[0].journals[0].items[0].dueState, 'OVERDUE');
  assert.equal(grouped[1].domain, 'Computer Science');
  assert.equal(grouped[1].journals[0].items[0].manuscriptId, 'MS-3');
});

test('groupQueue falls back to Unassigned domain', () => {
  const grouped = groupQueue(
    [mkAssignment({ id: '9', jid: 'jX', jname: 'Orphan', domId: null, domName: null, due: null })],
    NOW,
  );
  assert.equal(grouped[0].domain, 'Unassigned');
  assert.equal(grouped[0].domainId, null);
  assert.equal(grouped[0].journals[0].items[0].dueState, 'NONE');
});

test('summarize counts overdue and due-today', () => {
  const assignments = [
    mkAssignment({ id: '1', jid: 'j', jname: 'J', domId: 'd', domName: 'D', due: '2026-07-19T00:00:00Z' }),
    mkAssignment({ id: '2', jid: 'j', jname: 'J', domId: 'd', domName: 'D', due: '2026-07-21T12:00:00Z' }),
    mkAssignment({ id: '3', jid: 'j', jname: 'J', domId: 'd', domName: 'D', due: '2026-07-30T00:00:00Z' }),
  ];
  assert.deepEqual(summarize(assignments, NOW), { openAssignments: 3, overdue: 1, dueToday: 1 });
});

// ---- releases ------------------------------------------------------------

test('issueCompletion and releaseState', () => {
  assert.equal(issueCompletion(3, 6, false), 50);
  assert.equal(issueCompletion(0, 0, true), 100); // isComplete wins
  assert.equal(issueCompletion(10, 6, false), 100); // capped
  assert.equal(releaseState(100, false, 'IN_PROGRESS'), 'ON_TRACK');
  assert.equal(releaseState(60, false, 'PLANNED'), 'AT_RISK');
  assert.equal(releaseState(20, false, 'PLANNED'), 'BEHIND');
  assert.equal(releaseState(0, false, 'PUBLISHED'), 'ON_TRACK'); // published wins
});

test('toRelease counts ready (galley/published) articles', () => {
  const issue: IssueInput = {
    id: 'i1', issueNumber: 4, month: 'July', status: 'IN_PROGRESS', isComplete: false, expectedManuscripts: 4,
    volume: { volumeNumber: 18, journal: { id: 'jC', name: 'Catalysis', domain: { name: 'Chemistry' } } },
    articles: [
      { manuscriptStatus: 'GALLEY_PROOF' },
      { manuscriptStatus: 'PUBLISHED' },
      { manuscriptStatus: 'UNDER_REVIEW' },
      { manuscriptStatus: null },
    ],
  };
  const r = toRelease(issue);
  assert.equal(r.readyArticles, 2);
  assert.equal(r.completion, 50);
  assert.equal(r.label, 'Vol 18 · Issue 4');
  assert.equal(r.releaseState, 'AT_RISK');
  assert.equal(r.domain, 'Chemistry');
});
