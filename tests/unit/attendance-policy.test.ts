import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMinutesDifference,
  resolveEffectiveAttendancePolicyFromSnapshot,
  resolveThresholdDate,
  toISTDateTime,
} from '../../src/lib/attendance-policy';

test('resolveEffectiveAttendancePolicyFromSnapshot prefers employee over company over global', () => {
  const resolved = resolveEffectiveAttendancePolicyFromSnapshot({
    globalPolicy: {
      isActive: true,
      timezone: 'Asia/Kolkata',
      lateCheckInTime: '09:30',
      shortLeaveTime: '10:30',
      graceMinutes: 5,
    },
    companyPolicy: {
      isActive: true,
      timezone: 'Asia/Kolkata',
      lateCheckInTime: '09:20',
      shortLeaveTime: '10:15',
      graceMinutes: 10,
    },
    employeePolicy: {
      isActive: true,
      timezone: 'Asia/Kolkata',
      lateCheckInTime: '09:10',
      shortLeaveTime: '10:00',
      graceMinutes: 15,
    },
  });

  assert.deepEqual(resolved, {
    timezone: 'Asia/Kolkata',
    lateCheckInTime: '09:10',
    shortLeaveTime: '10:00',
    graceMinutes: 15,
    source: 'EMPLOYEE',
  });
});

test('resolveEffectiveAttendancePolicyFromSnapshot falls back to company and global values', () => {
  const resolved = resolveEffectiveAttendancePolicyFromSnapshot({
    globalPolicy: {
      isActive: true,
      timezone: 'Asia/Kolkata',
      lateCheckInTime: '09:30',
      shortLeaveTime: '10:30',
      graceMinutes: 0,
    },
    companyPolicy: {
      isActive: true,
      lateCheckInTime: '09:25',
      shortLeaveTime: '10:20',
      graceMinutes: 8,
    },
  });

  assert.deepEqual(resolved, {
    timezone: 'Asia/Kolkata',
    lateCheckInTime: '09:25',
    shortLeaveTime: '10:20',
    graceMinutes: 8,
    source: 'COMPANY',
  });
});

test('toISTDateTime and threshold helpers preserve Indian Standard Time boundaries', () => {
  const baseDate = new Date('2026-06-16T00:00:00.000Z');
  const threshold = toISTDateTime(baseDate, '09:30');

  assert.equal(threshold.toISOString(), '2026-06-16T04:00:00.000Z');
  assert.equal(resolveThresholdDate(baseDate, '10:30').toISOString(), '2026-06-16T05:00:00.000Z');
  assert.equal(
    getMinutesDifference(
      new Date('2026-06-16T05:15:00.000Z'),
      new Date('2026-06-16T04:00:00.000Z')
    ),
    75
  );
});
