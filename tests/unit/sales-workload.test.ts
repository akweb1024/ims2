import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDealPipeline,
  buildLeadFunnel,
  dealTotals,
  renewalState,
  summarizeFollowUps,
  toFollowUp,
  toRenewal,
  DEAL_STAGE_ORDER,
  LEAD_STATUS_ORDER,
  type FollowUpInput,
  type RenewalInput,
} from '../../src/lib/sales/workload';

const NOW = new Date('2026-07-21T09:00:00Z');

// ---- deal pipeline -------------------------------------------------------

test('buildDealPipeline orders all stages and fills gaps with zero', () => {
  const p = buildDealPipeline([
    { stage: 'DISCOVERY', count: 4, value: 400000 },
    { stage: 'NEGOTIATION', count: 2, value: 900000 },
    { stage: 'CLOSED_WON', count: 3, value: 1500000 },
  ]);
  assert.deepEqual(p.map((s) => s.stage), DEAL_STAGE_ORDER);
  const proposal = p.find((s) => s.stage === 'PROPOSAL')!;
  assert.equal(proposal.count, 0);
  assert.equal(p.find((s) => s.stage === 'DISCOVERY')!.open, true);
  assert.equal(p.find((s) => s.stage === 'CLOSED_WON')!.open, false);
});

test('dealTotals sums only open stages plus won value', () => {
  const p = buildDealPipeline([
    { stage: 'DISCOVERY', count: 4, value: 400000 },
    { stage: 'PROPOSAL', count: 1, value: 250000 },
    { stage: 'NEGOTIATION', count: 2, value: 900000 },
    { stage: 'CLOSED_WON', count: 3, value: 1500000 },
    { stage: 'CLOSED_LOST', count: 5, value: 700000 },
  ]);
  const t = dealTotals(p);
  assert.equal(t.openCount, 7);          // 4 + 1 + 2
  assert.equal(t.openValue, 1550000);    // 400k + 250k + 900k
  assert.equal(t.wonValue, 1500000);
});

// ---- lead funnel ---------------------------------------------------------

test('buildLeadFunnel orders statuses and ignores nulls', () => {
  const f = buildLeadFunnel([
    { leadStatus: 'NEW', count: 10 },
    { leadStatus: 'QUALIFIED', count: 3 },
    { leadStatus: null, count: 99 },
  ]);
  assert.deepEqual(f.map((s) => s.status), LEAD_STATUS_ORDER);
  assert.equal(f.find((s) => s.status === 'NEW')!.count, 10);
  assert.equal(f.find((s) => s.status === 'CONTACTED')!.count, 0);
});

// ---- follow-ups ----------------------------------------------------------

function mkFollowUp(id: string, due: string | null, name = 'Acme Corp'): FollowUpInput {
  return { id, type: 'CALL', channel: 'PHONE', subject: 'Quarterly check-in', nextFollowUpDate: due, customer: { id: 'c-' + id, name, leadStatus: 'QUALIFIED' } };
}

test('toFollowUp derives due state and carries customer', () => {
  const overdue = toFollowUp(mkFollowUp('1', '2026-07-19T00:00:00Z'), NOW);
  assert.equal(overdue.dueState, 'OVERDUE');
  assert.equal(overdue.daysToDue, -2);
  assert.equal(overdue.customerName, 'Acme Corp');
  assert.equal(overdue.leadStatus, 'QUALIFIED');
  assert.equal(toFollowUp(mkFollowUp('2', '2026-07-21T15:00:00Z'), NOW).dueState, 'DUE_TODAY');
  assert.equal(toFollowUp(mkFollowUp('3', '2026-07-25T00:00:00Z'), NOW).dueState, 'UPCOMING');
  assert.equal(toFollowUp({ ...mkFollowUp('4', null), customer: null }, NOW).customerName, 'Unknown');
});

test('summarizeFollowUps counts overdue and due-today', () => {
  const items = ['2026-07-18T00:00:00Z', '2026-07-21T10:00:00Z', '2026-07-28T00:00:00Z'].map((d, i) => toFollowUp(mkFollowUp(String(i), d), NOW));
  assert.deepEqual(summarizeFollowUps(items), { openFollowUps: 3, overdue: 1, dueToday: 1 });
});

// ---- renewals ------------------------------------------------------------

test('renewalState is date-driven and respects auto-renew', () => {
  assert.equal(renewalState('2026-07-18T00:00:00Z', false, NOW).renewalState, 'OVERDUE'); // past
  assert.equal(renewalState('2026-07-28T00:00:00Z', false, NOW).renewalState, 'AT_RISK'); // 7d, manual
  assert.equal(renewalState('2026-07-28T00:00:00Z', true, NOW).renewalState, 'ON_TRACK'); // 7d but auto-renew
  assert.equal(renewalState('2026-09-01T00:00:00Z', false, NOW).renewalState, 'ON_TRACK'); // far out
});

test('toRenewal shapes a renewal row', () => {
  const s: RenewalInput = { id: 's1', endDate: '2026-07-28T00:00:00Z', autoRenew: false, total: 120000, currency: 'INR', customer: { id: 'c1', name: 'Globex' } };
  const r = toRenewal(s, NOW);
  assert.equal(r.customerName, 'Globex');
  assert.equal(r.daysToRenew, 7);
  assert.equal(r.renewalState, 'AT_RISK');
  assert.equal(r.total, 120000);
});
