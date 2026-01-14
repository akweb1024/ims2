# How to Create Users with Journal Manager Roles

## 🎯 **Quick Guide**

Since the new roles (`JOURNAL_MANAGER`, `EDITOR_IN_CHIEF`, etc.) were just added, you need to either:
1. Create new users with these roles, OR
2. Update existing users to have these roles

---

## ✅ **Method 1: Update Existing User (Fastest)**

### **Using Database (Recommended for now):**

```sql
-- Update an existing user to JOURNAL_MANAGER
UPDATE "User" 
SET role = 'JOURNAL_MANAGER' 
WHERE email = 'user@example.com';

-- Or update to EDITOR_IN_CHIEF
UPDATE "User" 
SET role = 'EDITOR_IN_CHIEF' 
WHERE email = 'user@example.com';

-- View all users and their roles
SELECT id, email, name, role FROM "User" ORDER BY role;
```

### **Using Prisma Studio:**
```bash
npx prisma studio
```
1. Open the `User` table
2. Find the user you want to update
3. Change their `role` field to one of:
   - `JOURNAL_MANAGER`
   - `EDITOR_IN_CHIEF`
   - `PLAGIARISM_CHECKER`
   - `QUALITY_CHECKER`
   - `SECTION_EDITOR`
   - `REVIEWER`
4. Save

---

## ✅ **Method 2: Create New User via API**

The existing `/api/users` endpoint should work, but you need to update the frontend to include the new roles.

### **Temporary Fix - Use API directly:**

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "journal.manager@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe",
    "role": "JOURNAL_MANAGER",
    "companyId": "your-company-id"
  }'
```

---

## ✅ **Method 3: Update User Creation Form**

You need to update the user creation form to include the new roles in the dropdown.

**File to update:** `src/app/dashboard/hr-management/page.tsx` (or wherever your user creation form is)

**Add these roles to the role dropdown:**
```typescript
const roles = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'TEAM_LEADER',
  'EXECUTIVE',
  'FINANCE_ADMIN',
  'CUSTOMER',
  'AGENCY',
  'EDITOR',
  'JOURNAL_MANAGER',      // ← NEW
  'EDITOR_IN_CHIEF',      // ← NEW
  'PLAGIARISM_CHECKER',   // ← NEW
  'QUALITY_CHECKER',      // ← NEW
  'SECTION_EDITOR',       // ← NEW
  'REVIEWER'              // ← NEW
];
```

---

## 🚀 **Quick Start - For Testing**

### **Step 1: Update your SUPER_ADMIN to see the dropdown**

Your current SUPER_ADMIN user should already appear in the dropdown. If not, verify:

```sql
-- Check your current user
SELECT id, email, role FROM "User" WHERE role = 'SUPER_ADMIN';
```

### **Step 2: Create a test Journal Manager**

```sql
-- Quick way: Update an existing ADMIN to JOURNAL_MANAGER
UPDATE "User" 
SET role = 'JOURNAL_MANAGER' 
WHERE role = 'ADMIN' 
LIMIT 1;
```

### **Step 3: Verify in the dropdown**

1. Go to `/dashboard/journals/manage`
2. Click "Assign Manager" on any journal
3. You should now see users with these roles:
   - SUPER_ADMIN
   - ADMIN
   - JOURNAL_MANAGER
   - EDITOR_IN_CHIEF

---

## 📊 **Current Eligible Roles for Journal Managers**

Only users with these roles can be assigned as Journal Managers:
- ✅ `SUPER_ADMIN`
- ✅ `ADMIN`
- ✅ `JOURNAL_MANAGER`
- ✅ `EDITOR_IN_CHIEF`

---

## 🔍 **Troubleshooting**

### **Problem: No users in dropdown**

**Solution 1:** Check if you have any users with eligible roles:
```sql
SELECT id, email, name, role 
FROM "User" 
WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF');
```

**Solution 2:** Update at least one user:
```sql
UPDATE "User" 
SET role = 'JOURNAL_MANAGER' 
WHERE email = 'your-email@example.com';
```

### **Problem: SUPER_ADMIN not showing**

**Check:**
```sql
SELECT id, email, name, role, "isActive" 
FROM "User" 
WHERE role = 'SUPER_ADMIN';
```

Make sure `isActive = true`.

---

## 📝 **Example: Complete Setup**

```sql
-- 1. Create/Update a Journal Manager
UPDATE "User" 
SET role = 'JOURNAL_MANAGER', "isActive" = true 
WHERE email = 'manager1@example.com';

-- 2. Create/Update an Editor-in-Chief
UPDATE "User" 
SET role = 'EDITOR_IN_CHIEF', "isActive" = true 
WHERE email = 'editor@example.com';

-- 3. Create/Update a Plagiarism Checker
UPDATE "User" 
SET role = 'PLAGIARISM_CHECKER', "isActive" = true 
WHERE email = 'plagiarism@example.com';

-- 4. Create/Update a Quality Checker
UPDATE "User" 
SET role = 'QUALITY_CHECKER', "isActive" = true 
WHERE email = 'quality@example.com';

-- 5. Verify all
SELECT email, role FROM "User" 
WHERE role IN ('JOURNAL_MANAGER', 'EDITOR_IN_CHIEF', 'PLAGIARISM_CHECKER', 'QUALITY_CHECKER')
ORDER BY role;
```

---

## ✅ **After Setup**

Once you have users with the appropriate roles:
1. Go to `/dashboard/journals/manage`
2. Click "Assign Manager"
3. Select from the dropdown
4. Assign!

---

**Last Updated:** 2026-01-14
