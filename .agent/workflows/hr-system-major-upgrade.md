---
description: HR System Major Upgrade - Employee ID Primary Identity & Advanced Leave Management
---

# 🚀 HR System Major Upgrade Implementation Plan

**Date**: January 21, 2026
**Complexity**: High
**Estimated Time**: 6-8 hours

---

## 📦 Phase 1: Database Schema Updates

### 1.1 Company Model Enhancement

**File**: `prisma/schema.prisma`

Add `employeeIdPrefix` to Company model:

```prisma
model Company {
  // ... existing fields
  employeeIdPrefix  String?  // e.g., "ACME", "TCS", "INFY"
}
```

### 1.2 Employee-Company Designation Mapping

Create new junction table for multi-company designations:

```prisma
model EmployeeCompanyDesignation {
  id            String   @id @default(uuid())
  employeeId    String
  companyId     String
  designation   String
  isActive      Boolean  @default(true)
  assignedAt    DateTime @default(now())
  
  employee      EmployeeProfile @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  company       Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([employeeId, companyId])
  @@index([employeeId])
  @@index([companyId])
}
```

### 1.3 Leave Balance Tracking

Add to EmployeeProfile:

```prisma
model EmployeeProfile {
  // ... existing fields
  initialLeaveBalance  Float   @default(0)
  currentLeaveBalance  Float   @default(0)
  
  companyDesignations  EmployeeCompanyDesignation[]
}
```

### 1.4 Leave Ledger Enhancement

Update LeaveLedger model:

```prisma
model LeaveLedger {
  // ... existing fields
  autoCredit          Float?   // Monthly auto-credit (1.5)
  lateArrivalCount    Int      @default(0)
  shortLeaveCount     Int      @default(0)
  lateDeductions      Float    @default(0)
  shortLeaveDeductions Float   @default(0)
}
```

---

## 📦 Phase 2: Backend API Updates

### 2.1 Employee Creation with Company Prefix

**File**: `src/app/api/hr/employees/route.ts`

Update POST handler:

- Fetch company data to get `employeeIdPrefix`
- Auto-generate Employee ID with prefix: `{PREFIX}-{INITIALS}{RANDOM}`
- Example: Company prefix "ACME" → Employee ID "ACME-JD8231"

### 2.2 Multi-Company Designation API

**New File**: `src/app/api/hr/employees/[id]/designations/route.ts`

Endpoints:

- `GET`: Fetch all company-designation mappings for an employee
- `POST`: Add employee to a company with designation
- `PATCH`: Update designation for a company
- `DELETE`: Remove employee from a company

### 2.3 Salary Data Access Control

**Files**:

- `src/app/api/hr/employees/[id]/route.ts`
- `src/app/api/hr/salary-slips/route.ts`
- `src/app/api/hr/payroll/*/route.ts`

Add role check:

```typescript
const canViewSalary = ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'FINANCE'].includes(user.role);
if (!canViewSalary) {
  // Hide salary fields or return 403
}
```

### 2.4 Leave Auto-Credit System

**New File**: `src/app/api/hr/leave-ledger/auto-credit/route.ts`

Monthly cron job endpoint:

- Runs on 1st of every month
- Credits 1.5 leaves to all active employees
- Creates LeaveLedger entry with `autoCredit: 1.5`

### 2.5 Late Arrival & Short Leave Calculation

**File**: `src/app/api/hr/attendance/route.ts`

Update attendance processing:

```typescript
// Late arrival logic (31-90 min)
if (lateMinutes >= 31 && lateMinutes <= 90) {
  monthlyLateCount++;
  if (monthlyLateCount > 2) {
    deductLeave(0.5); // Half day deduction
  }
}

// Short leave logic (90 min)
if (shortLeaveMinutes === 90) {
  monthlyShortLeaveCount++;
  if (monthlyShortLeaveCount > 2) {
    deductLeave(0.5);
  }
}
```

---

## 📦 Phase 3: Frontend Updates

### 3.1 Employee Form Enhancement

**File**: `src/components/dashboard/hr/EmployeeForm.tsx`

Add fields:

1. **Company Selection** (multi-select with designation input for each)
2. **Employee ID Prefix** (auto-filled from company, editable)
3. **Initial Leave Balance** (number input, default 0)

UI Structure:

```tsx
<div>
  <label>Companies & Designations</label>
  {selectedCompanies.map(company => (
    <div key={company.id}>
      <span>{company.name}</span>
      <input 
        placeholder="Designation in this company"
        value={designations[company.id]}
      />
    </div>
  ))}
</div>

<div>
  <label>Employee ID Prefix</label>
  <input 
    value={employeeIdPrefix}
    placeholder="Auto-filled from company"
  />
</div>

<div>
  <label>Initial Leave Balance</label>
  <input 
    type="number"
    defaultValue={0}
    step={0.5}
  />
</div>
```

### 3.2 Employee Detail Page - Salary Visibility

**File**: `src/app/dashboard/hr-management/employees/[id]/page.tsx`

Conditional rendering:

```tsx
const canViewSalary = ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'FINANCE']
  .includes(user.role);

{canViewSalary && (
  <div className="salary-section">
    {/* Salary details */}
  </div>
)}
```

### 3.3 Leave Ledger UI Enhancement

**File**: `src/components/dashboard/hr/LeaveLedgerManager.tsx`

Add columns:

- Auto Credit (1.5)
- Late Arrivals Count
- Short Leaves Count
- Late Deductions
- Short Leave Deductions
- Net Balance

Add "Auto-Credit Leaves" button (for manual trigger)

### 3.4 Multi-Company Designation Manager

**New Component**: `src/components/dashboard/hr/EmployeeCompanyDesignations.tsx`

Display table:

| Company | Designation | Assigned Date | Actions |
|---------|-------------|---------------|---------|
| ACME Corp | Senior Dev | 2024-01-15 | Edit/Remove |

---

## 📦 Phase 4: Leave Calculation Logic

### 4.1 Working Days Calculator

**New Utility**: `src/lib/utils/leave-calculator.ts`

```typescript
export function isWorkingDay(date: Date, holidays: Holiday[]): boolean {
  // Sunday = 0
  if (date.getDay() === 0) return false;
  
  // Check public holidays
  const isHoliday = holidays.some(h => 
    isSameDay(new Date(h.date), date)
  );
  
  return !isHoliday;
}

export function calculateLateDeduction(
  lateMinutes: number,
  monthlyLateCount: number
): number {
  if (lateMinutes < 31) return 0;
  if (lateMinutes > 90) return 1; // Full day for >90 min
  
  // 31-90 min
  if (monthlyLateCount <= 2) return 0; // First 2 are free
  return 0.5; // Half day after 2nd
}

export function calculateShortLeaveDeduction(
  shortLeaveMinutes: number,
  monthlyShortLeaveCount: number
): number {
  if (shortLeaveMinutes !== 90) return 0;
  
  if (monthlyShortLeaveCount <= 2) return 0; // First 2 are free
  return 0.5; // Half day after 2nd
}
```

### 4.2 Monthly Leave Reset

Reset counters on 1st of every month:

- `lateArrivalCount = 0`
- `shortLeaveCount = 0`

---

## 📦 Phase 5: Migration Strategy

### 5.1 Database Migration

```bash
npx prisma migrate dev --name hr_system_major_upgrade
```

### 5.2 Data Migration Script

**New File**: `prisma/migrations/data-migration-employee-id.ts`

Tasks:

1. Add company prefix to existing employee IDs
2. Create EmployeeCompanyDesignation records for existing employees
3. Set initial leave balances to 0 for all employees
4. Create initial LeaveLedger entries

---

## 📦 Phase 6: Testing Checklist

### 6.1 Employee ID Generation

- [ ] Create employee with company → Verify prefix auto-applies
- [ ] Edit employee ID prefix → Verify it updates
- [ ] Create employee without company → Verify fallback ID generation

### 6.2 Multi-Company Designations

- [ ] Assign employee to multiple companies with different designations
- [ ] Update designation for one company
- [ ] Remove employee from one company
- [ ] Verify designation shows correctly in employee profile

### 6.3 Salary Visibility

- [ ] Login as SUPER_ADMIN → Verify salary visible
- [ ] Login as HR → Verify salary visible
- [ ] Login as EXECUTIVE → Verify salary hidden
- [ ] Login as CUSTOMER → Verify salary hidden

### 6.4 Leave Management

- [ ] Set initial leave balance → Verify it saves
- [ ] Trigger monthly auto-credit → Verify 1.5 leaves added
- [ ] Mark 2 late arrivals (31-90 min) → Verify no deduction
- [ ] Mark 3rd late arrival → Verify 0.5 day deducted
- [ ] Mark 2 short leaves (90 min) → Verify no deduction
- [ ] Mark 3rd short leave → Verify 0.5 day deducted
- [ ] Verify Sundays excluded from working days
- [ ] Verify public holidays excluded from working days

---

## 📦 Phase 7: Deployment

### 7.1 Pre-Deployment

1. Backup production database
2. Test migration on staging environment
3. Verify all existing employee data migrates correctly

### 7.2 Deployment Steps

1. Run database migration
2. Run data migration script
3. Deploy updated application
4. Verify critical workflows

### 7.3 Post-Deployment

1. Monitor error logs
2. Verify leave auto-credit cron job
3. Test employee creation flow
4. Verify salary visibility controls

---

## 🎯 Success Criteria

✅ Employee ID is primary identifier across the system
✅ Company prefix auto-applies and is editable
✅ Employees can have different designations in multiple companies
✅ Salary data visible only to authorized roles
✅ Initial leave balance is configurable
✅ Monthly auto-credit of 1.5 leaves works
✅ Late arrival rules enforced correctly
✅ Short leave rules enforced correctly
✅ Sundays and public holidays excluded from calculations

---

## ⚠️ Important Notes

1. **Breaking Change**: This is a major system upgrade. Thorough testing required.
2. **Data Migration**: Existing employee data must be migrated carefully.
3. **Cron Job**: Set up monthly auto-credit job (use Vercel Cron or similar).
4. **Performance**: Multi-company queries may need optimization for large datasets.
5. **Audit Trail**: Consider logging all leave balance changes for compliance.

---

## 📞 Next Steps

1. Review this plan with stakeholders
2. Approve schema changes
3. Begin Phase 1 (Database Schema)
4. Implement phases sequentially
5. Test thoroughly before production deployment
