import assert from 'node:assert/strict';
import test from 'node:test';

import { CRON_JOBS, dueOccurrence, istParts, parseHHMM, type CronJob } from '../../src/lib/cron/schedule';

// 03:00 IST == 21:30 UTC previous day
const at = (utc: string) => new Date(utc);

test('istParts converts UTC to IST wall clock (+05:30)', () => {
  const p = istParts(at('2026-07-21T21:30:00Z')); // 03:00 IST on the 22nd
  assert.equal(p.minutesOfDay, 3 * 60);
  assert.equal(p.dayOfMonth, 22);
  assert.equal(p.dateKey, '2026-07-22');
});

test('parseHHMM', () => {
  assert.equal(parseHHMM('00:15'), 15);
  assert.equal(parseHHMM('18:30'), 18 * 60 + 30);
});

test('dailyAt fires exactly at the IST minute, once per day-key', () => {
  const job: CronJob = { name: 'snap', path: '/x', dailyAt: '03:00' };
  assert.equal(dueOccurrence(job, at('2026-07-21T21:30:00Z')), 'snap@2026-07-22');
  assert.equal(dueOccurrence(job, at('2026-07-21T21:31:00Z')), null); // 03:01 IST
  assert.equal(dueOccurrence(job, at('2026-07-21T03:00:00Z')), null); // 08:30 IST
});

test('dayOfMonth restricts dailyAt to that IST date', () => {
  const job: CronJob = { name: 'roll', path: '/x', dailyAt: '02:30', dayOfMonth: 1 };
  assert.equal(dueOccurrence(job, at('2026-07-31T21:00:00Z')), 'roll@2026-08-01'); // 02:30 IST Aug 1
  assert.equal(dueOccurrence(job, at('2026-07-21T21:00:00Z')), null); // 22nd — wrong day
});

test('everyMinutes fires on aligned minutes with distinct occurrence keys', () => {
  const job: CronJob = { name: 'obs', path: '/x', everyMinutes: 15 };
  const k1 = dueOccurrence(job, at('2026-07-21T10:00:00Z'));
  const k2 = dueOccurrence(job, at('2026-07-21T10:15:00Z'));
  assert.ok(k1 && k2 && k1 !== k2, 'aligned minutes fire with unique keys');
  assert.equal(dueOccurrence(job, at('2026-07-21T10:07:00Z')), null);
});

test('same minute yields the same key (at-most-once guard works)', () => {
  const job: CronJob = { name: 'obs', path: '/x', everyMinutes: 15 };
  const a = dueOccurrence(job, at('2026-07-21T10:15:10Z'));
  const b = dueOccurrence(job, at('2026-07-21T10:15:50Z'));
  assert.equal(a, b);
});

test('schedule table: every job has exactly one trigger and unique name', () => {
  const names = new Set<string>();
  for (const j of CRON_JOBS) {
    assert.ok(!names.has(j.name), `duplicate name ${j.name}`);
    names.add(j.name);
    assert.ok(Boolean(j.everyMinutes) !== Boolean(j.dailyAt), `${j.name} must have exactly one trigger`);
    if (j.dailyAt) assert.match(j.dailyAt, /^\d{2}:\d{2}$/);
    assert.ok(j.path.startsWith('/api/cron/'), `${j.name} path`);
  }
  // The four digest slots the route accepts are all covered at their IST times.
  for (const slot of ['0930', '1100', '1730', '1830']) {
    const job = CRON_JOBS.find((j) => j.path.includes(`slot=${slot}`));
    assert.ok(job, `digest slot ${slot} scheduled`);
    assert.equal(job!.dailyAt, `${slot.slice(0, 2)}:${slot.slice(2)}`);
  }
});
