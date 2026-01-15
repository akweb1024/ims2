# IT Management - ACTUAL Fix (2026-01-15 16:53)

## The Real Problem

Prisma has **different syntax for CREATE vs UPDATE** operations:

### ✅ CREATE Operations (works with relations):
```typescript
await prisma.iTProject.create({
  data: {
    company: { connect: { id: companyId } },
    projectManager: { connect: { id: managerId } },
    teamLead: { connect: { id: leadId } }
  }
});
```

### ✅ UPDATE Operations (requires scalar fields):
```typescript
await prisma.iTProject.update({
  data: {
    projectManagerId: managerId,  // Use scalar field directly
    teamLeadId: leadId             // NOT the relation field
  }
});
```

## What Was Wrong

I was using the CREATE syntax (with `connect`/`disconnect`) for UPDATE operations, which Prisma doesn't allow.

**Error Message:**
```
Unknown argument `projectManager`. Did you mean `projectManagerId`?
```

## The Fix

### Before (WRONG for updates):
```typescript
if (body[field]) {
    updateData.projectManager = { connect: { id: body[field] } };
} else if (body[field] === null || body[field] === '') {
    updateData.projectManager = { disconnect: true };
}
```

### After (CORRECT for updates):
```typescript
if (field === 'projectManagerId' || field === 'teamLeadId') {
    // Use scalar fields directly for UPDATE operations
    updateData[field] = body[field] === '' ? null : body[field];
}
```

## Files Fixed

1. ✅ `/src/app/api/it/projects/[id]/route.ts` - Project updates
2. ✅ `/src/app/api/it/tasks/[id]/route.ts` - Task updates  
3. ✅ `/src/app/api/it/projects/route.ts` - Project creation (already correct)
4. ✅ `/src/app/api/it/tasks/route.ts` - Task creation (already correct)

## Testing

Now you should be able to:
- ✅ Create projects (with project manager assignment)
- ✅ Update projects (change project manager, team lead, etc.)
- ✅ Create tasks (with assignments)
- ✅ Update tasks (change assignee, project, etc.)

## Key Takeaway

**Prisma Rule:**
- **CREATE** = Use relation fields with `connect`/`disconnect`
- **UPDATE** = Use scalar ID fields directly (`projectManagerId`, not `projectManager`)
