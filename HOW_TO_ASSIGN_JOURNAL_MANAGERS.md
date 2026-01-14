# How to Assign Journal Managers - Complete Guide

## 📋 **Overview**

This guide explains how to assign Journal Managers to journals in your Publication Management System.

---

## 🎯 **Key Concepts**

### **Journal Manager Rules:**
1. ✅ Each journal can have **ONLY ONE** manager
2. ✅ A manager can manage **MULTIPLE** journals
3. ✅ Only certain roles can be journal managers:
   - `SUPER_ADMIN`
   - `ADMIN`
   - `JOURNAL_MANAGER`
   - `EDITOR_IN_CHIEF`

---

## 🖥️ **Method 1: Using the Web Interface (Recommended)**

### **Step 1: Navigate to Journal Management**
```
Dashboard → Journals → Manage
URL: /dashboard/journals/manage
```

### **Step 2: View All Journals**
You'll see a list of all journals with their current manager status:
- ✅ **Green badge**: Manager assigned
- ⚠️ **Amber badge**: No manager assigned

### **Step 3: Assign a Manager**
1. Find the journal without a manager
2. Click **"Assign Manager"** button
3. Select a user from the dropdown
4. Click **"Assign Manager"** to confirm

### **Step 4: Remove a Manager (if needed)**
1. Find the journal with a manager
2. Click **"Remove"** button
3. Confirm the action

---

## 🔌 **Method 2: Using the API**

### **Assign Manager:**

```bash
POST /api/journals/{journalId}/manager

Headers:
  Authorization: Bearer {your-token}
  Content-Type: application/json

Body:
{
  "managerId": "user-id-here"
}
```

**Example using curl:**
```bash
curl -X POST https://your-domain.com/api/journals/journal-123/manager \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"managerId": "user-456"}'
```

**Example using JavaScript:**
```javascript
const response = await fetch('/api/journals/journal-123/manager', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    managerId: 'user-456'
  })
});

const result = await response.json();
console.log(result);
```

---

### **Remove Manager:**

```bash
DELETE /api/journals/{journalId}/manager

Headers:
  Authorization: Bearer {your-token}
```

**Example using curl:**
```bash
curl -X DELETE https://your-domain.com/api/journals/journal-123/manager \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **Get Manager Details:**

```bash
GET /api/journals/{journalId}/manager

Headers:
  Authorization: Bearer {your-token}
```

**Response:**
```json
{
  "id": "journal-123",
  "name": "International Journal of AI",
  "journalManagerId": "user-456",
  "journalManager": {
    "id": "user-456",
    "email": "manager@example.com",
    "name": "John Doe",
    "role": "JOURNAL_MANAGER"
  }
}
```

---

## 👥 **Method 3: Assigning the JOURNAL_MANAGER Role to Users**

### **Option A: During User Creation**

When creating a new user, assign the `JOURNAL_MANAGER` role:

```javascript
const newUser = await prisma.user.create({
  data: {
    email: 'manager@example.com',
    password: hashedPassword,
    name: 'John Doe',
    role: 'JOURNAL_MANAGER',  // ← Assign role here
    companyId: 'company-123'
  }
});
```

### **Option B: Update Existing User**

Change an existing user's role to `JOURNAL_MANAGER`:

```javascript
const updatedUser = await prisma.user.update({
  where: { id: 'user-456' },
  data: {
    role: 'JOURNAL_MANAGER'  // ← Update role
  }
});
```

### **Option C: Using the API**

```bash
PATCH /api/users/{userId}

Headers:
  Authorization: Bearer {your-token}
  Content-Type: application/json

Body:
{
  "role": "JOURNAL_MANAGER"
}
```

---

## 🔄 **Complete Workflow Example**

### **Scenario: Assigning "John Doe" to manage "International Journal of AI"**

**Step 1: Ensure John has the right role**
```sql
-- Check current role
SELECT id, email, name, role FROM "User" WHERE email = 'john@example.com';

-- Update role if needed
UPDATE "User" SET role = 'JOURNAL_MANAGER' WHERE email = 'john@example.com';
```

**Step 2: Get John's user ID**
```javascript
const user = await prisma.user.findUnique({
  where: { email: 'john@example.com' },
  select: { id: true }
});
// user.id = 'user-456'
```

**Step 3: Get the journal ID**
```javascript
const journal = await prisma.journal.findFirst({
  where: { name: 'International Journal of AI' },
  select: { id: true }
});
// journal.id = 'journal-123'
```

**Step 4: Assign manager**
```javascript
const updated = await prisma.journal.update({
  where: { id: 'journal-123' },
  data: { journalManagerId: 'user-456' }
});
```

**Or using the API:**
```bash
curl -X POST /api/journals/journal-123/manager \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"managerId": "user-456"}'
```

---

## ✅ **Verification**

### **Check if assignment was successful:**

**Method 1: Web Interface**
- Go to `/dashboard/journals/manage`
- Find the journal
- Should show green badge with manager's name

**Method 2: API**
```bash
GET /api/journals/journal-123/manager
```

**Method 3: Database**
```sql
SELECT 
  j.id,
  j.name,
  j."journalManagerId",
  u.email as manager_email,
  u.name as manager_name
FROM "Journal" j
LEFT JOIN "User" u ON j."journalManagerId" = u.id
WHERE j.id = 'journal-123';
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: "User does not have appropriate role"**
**Solution:** Update the user's role to one of:
- `SUPER_ADMIN`
- `ADMIN`
- `JOURNAL_MANAGER`
- `EDITOR_IN_CHIEF`

```sql
UPDATE "User" SET role = 'JOURNAL_MANAGER' WHERE id = 'user-id';
```

---

### **Issue 2: "Journal already has a manager"**
**Solution:** Remove the current manager first:
```bash
DELETE /api/journals/{journalId}/manager
```
Then assign the new manager.

---

### **Issue 3: "Manager not found"**
**Solution:** Verify the user ID exists:
```sql
SELECT id, email, name FROM "User" WHERE id = 'user-id';
```

---

## 📊 **Manager Permissions**

Once assigned, a Journal Manager can:

✅ **Manuscript Management:**
- View all manuscripts for their journal(s)
- Change manuscript status
- Assign reviewers
- View plagiarism reports
- View quality reports

✅ **Team Management:**
- View team performance
- Access dashboard metrics
- Monitor workflow

✅ **Analytics:**
- View journal analytics
- Track acceptance rates
- Monitor processing times

❌ **Cannot Do:**
- Assign/remove other managers (only ADMIN/SUPER_ADMIN)
- Delete journals
- Modify journal categorization (domains, indexings)

---

## 🔐 **Security Notes**

1. **Only ADMIN and SUPER_ADMIN** can assign/remove managers
2. **Journal Managers** can only view/manage their assigned journals
3. All actions are logged in the audit trail
4. Manager changes are tracked in the database

---

## 📱 **Quick Reference**

### **Web Interface:**
```
/dashboard/journals/manage
```

### **API Endpoints:**
```
POST   /api/journals/{id}/manager    - Assign manager
DELETE /api/journals/{id}/manager    - Remove manager
GET    /api/journals/{id}/manager    - Get manager details
```

### **Required Roles:**
```
Assign/Remove: SUPER_ADMIN, ADMIN
Be a Manager:  SUPER_ADMIN, ADMIN, JOURNAL_MANAGER, EDITOR_IN_CHIEF
```

---

## 🎯 **Best Practices**

1. ✅ Assign managers based on expertise and domain knowledge
2. ✅ One manager can handle 3-5 journals comfortably
3. ✅ Review manager assignments quarterly
4. ✅ Ensure managers have proper training
5. ✅ Monitor manager performance through analytics

---

## 📞 **Need Help?**

If you encounter issues:
1. Check user roles in the database
2. Verify journal exists
3. Check API response for error messages
4. Review audit logs
5. Contact system administrator

---

**Last Updated:** 2026-01-14  
**Version:** 1.0.0
