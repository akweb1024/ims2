import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeAttendance, previousMonthBase, PRESENT_STATUSES } from '../../src/lib/dashboard/attendance-summary';
import { getISTDateRangeForPeriod } from '../../src/lib/date-utils';

const r = (status: string, isLate = false) => ({ status, isLate });

test('summarizeAttendance: present statuses count as present days', () => {
  const s = summarizeAttendance([
    r('PRESENT'), r('LATE', true), r('HALF_DAY'), r('WORK_FROM_HOME'), r('WFH'),
  ]);
  assert.equal(s.presentDays, 5);
  assert.equal(s.lateDays, 1);
  assert.equal(s.absentDays, 0);
});

test('summarizeAttendance: ABSENT records count as absent, never present or late', () => {
  const s = summarizeAttendance([r('ABSENT'), r('ABSENT', true), r('PRESENT')]);
  assert.equal(s.presentDays, 1);
  assert.equal(s.absentDays, 2);
  assert.equal(s.lateDays, 0); // isLate on an absent row is noise, not a late day
});

test('summarizeAttendance: LEAVE / HOLIDAY / WEEKOFF are neither present nor absent', () => {
  const s = summarizeAttendance([r('LEAVE'), r('HOLIDAY'), r('WEEKOFF')]);
  assert.deepEqual(s, { presentDays: 0, lateDays: 0, absentDays: 0 });
});

test('summarizeAttendance: case-insensitive and empty-safe', () => {
  assert.equal(summarizeAttendance([r('present')]).presentDays, 1);
  assert.deepEqual(summarizeAttendance([]), { presentDays: 0, lateDays: 0, absentDays: 0 });
});

test('PRESENT_STATUSES matches the performance-index family', () => {
  for (const s of ['PRESENT', 'LATE', 'WORK_FROM_HOME', 'HALF_DAY', 'WFH']) {
    assert.ok(PRESENT_STATUSES.has(s), s);
  }
});

// --- the previous-month regression (UTC server, IST boundaries) ---

test('previousMonthBase: July IST start resolves to JUNE, not May (UTC off-by-one regression)', () => {
  // 2026-07-01T00:00 IST == 2026-06-30T18:30Z — the exact instant that broke Date.setMonth()
  const julyStart = new Date('2026-06-30T18:30:00.000Z');
  const prev = getISTDateRangeForPeriod('MONTHLY', previousMonthBase(julyStart));
  assert.equal(prev.start.toISOString(), '2026-05-31T18:30:00.000Z'); // June 1 IST
  assert.equal(prev.end.toISOString(), '2026-06-30T18:29:59.999Z');   // June 30 23:59:59.999 IST
});

test('previousMonthBase: January rolls back to December of the prior year', () => {
  const janStart = new Date('2025-12-31T18:30:00.000Z'); // 2026-01-01 IST
  const prev = getISTDateRangeForPeriod('MONTHLY', previousMonthBase(janStart));
  assert.equal(prev.start.toISOString(), '2025-11-30T18:30:00.000Z'); // Dec 1 IST
});
