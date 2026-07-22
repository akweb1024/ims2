import assert from 'node:assert/strict';
import test from 'node:test';

import {
  summarizeAttendance, previousMonthBase, PRESENT_STATUSES,
  isSundayKey, enumerateDateKeys, classifyEmployeeDays, countClasses, aggregateDerived,
} from '../../src/lib/dashboard/attendance-summary';
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

// --- derived (calendar-based) absence ---
// 2026-07-04 Sat, 07-05 Sun, 07-06 Mon, 07-11 Sat, 07-12 Sun, 07-13 Mon.

const P = (late = false) => late; // present map value helper
const clsFor = (keys: string[], present: Record<string, boolean>, leave: string[] = [], hol: string[] = []) =>
  classifyEmployeeDays(keys, new Map(Object.entries(present)), new Set(leave), new Set(hol));

test('isSundayKey / enumerateDateKeys', () => {
  assert.equal(isSundayKey('2026-07-05'), true);
  assert.equal(isSundayKey('2026-07-06'), false);
  assert.deepEqual(enumerateDateKeys('2026-07-03', '2026-07-06'), ['2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06']);
  assert.deepEqual(enumerateDateKeys('2026-07-06', '2026-07-03'), []); // start after end
});

test('a plain Sunday is week-off, never absent', () => {
  const keys = enumerateDateKeys('2026-07-04', '2026-07-06');
  const cls = clsFor(keys, { '2026-07-04': P(), '2026-07-06': P() }); // Sat & Mon present, Sun no record
  assert.deepEqual(cls, ['PRESENT', 'WEEKOFF', 'PRESENT']);
  assert.equal(countClasses(cls).absentDays, 0);
});

test('Sunday sandwiched between two absents becomes absent', () => {
  const keys = enumerateDateKeys('2026-07-04', '2026-07-06'); // Sat, Sun, Mon
  const cls = clsFor(keys, {}); // nobody present → Sat & Mon absent, Sun sandwiched
  assert.deepEqual(cls, ['ABSENT', 'ABSENT', 'ABSENT']);
  assert.equal(countClasses(cls).absentDays, 3);
});

test('Sunday NOT sandwiched (one side present) stays week-off', () => {
  const keys = enumerateDateKeys('2026-07-04', '2026-07-06');
  const cls = clsFor(keys, { '2026-07-04': P() }); // Sat present, Mon absent
  assert.deepEqual(cls, ['PRESENT', 'WEEKOFF', 'ABSENT']);
  assert.equal(countClasses(cls).absentDays, 1);
});

test('approved leave counts as leave, not absent', () => {
  const keys = enumerateDateKeys('2026-07-06', '2026-07-07'); // Mon, Tue
  const cls = clsFor(keys, {}, ['2026-07-06']); // Mon on leave, Tue absent
  assert.deepEqual(cls, ['LEAVE', 'ABSENT']);
  const c = countClasses(cls);
  assert.equal(c.leaveDays, 1);
  assert.equal(c.absentDays, 1);
});

test('a holiday is never absent — not even sandwiched between absents', () => {
  const keys = enumerateDateKeys('2026-07-06', '2026-07-08'); // Mon, Tue, Wed
  const cls = clsFor(keys, {}, [], ['2026-07-07']); // Tue holiday, Mon & Wed absent
  assert.deepEqual(cls, ['ABSENT', 'HOLIDAY', 'ABSENT']);
  assert.equal(countClasses(cls).absentDays, 2); // holiday not absorbed
});

test('present with late flag counts as present + late; leave excluded from absent', () => {
  const keys = enumerateDateKeys('2026-07-06', '2026-07-08');
  const cls = clsFor(keys, { '2026-07-06': P(true), '2026-07-07': P(false) }); // Mon late, Tue present, Wed absent
  const c = countClasses(cls);
  assert.deepEqual(c, { presentDays: 2, lateDays: 1, absentDays: 1, leaveDays: 0 });
});

test('aggregateDerived sums across employees over the same window', () => {
  const keys = enumerateDateKeys('2026-07-06', '2026-07-07'); // Mon, Tue
  const total = aggregateDerived(keys, new Set(), [
    { present: new Map([['2026-07-06', false]]), leaveDates: new Set() },       // Mon present, Tue absent
    { present: new Map(), leaveDates: new Set(['2026-07-06', '2026-07-07']) },  // both on leave
  ]);
  assert.deepEqual(total, { presentDays: 1, lateDays: 0, absentDays: 1, leaveDays: 2 });
});
