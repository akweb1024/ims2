import assert from 'node:assert/strict';
import test from 'node:test';

import { createEmployeeSchema } from '../../src/lib/validators/hr';

// The onboarding form sends empty optional fields as `null`. Regression guard:
// the create schema must accept those nulls (previously `.optional()` fields
// rejected null and 400'd every onboard, e.g. "employeeId: received null").

const base = {
  email: 'a@b.com',
  name: 'A B',
  password: 'secret123',
  designation: 'Web Developer',
  role: 'EXECUTIVE',
  employeeType: 'FULL_TIME',
  dateOfJoining: '2026-12-07',
};

test('createEmployeeSchema accepts null for every optional field the form nulls out', () => {
  const r = createEmployeeSchema.safeParse({
    ...base,
    baseSalary: null,
    bankName: null,
    accountNumber: null,
    ifscCode: null,
    panNumber: null,
    employeeId: null,
    designationJustification: null,
    taskTemplateLink: null,
    department: null,
    departmentId: null,
    dateOfBirth: null,
    companyId: null,
    phoneNumber: null,
    officePhone: null,
    personalEmail: null,
    officialEmail: null,
  });
  assert.equal(r.success, true, r.success ? '' : JSON.stringify(r.error?.issues));
});

test('createEmployeeSchema still enforces the genuinely required fields', () => {
  const r = createEmployeeSchema.safeParse({ email: 'not-an-email', name: '', password: '123' });
  assert.equal(r.success, false);
});

test('null dateOfBirth stays null (not coerced to the epoch)', () => {
  const r = createEmployeeSchema.safeParse({ ...base, dateOfBirth: null });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.dateOfBirth ?? null, null);
});
