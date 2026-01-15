# IT Management - CORRECT Fix (2026-01-15 16:57)

## The REAL Issue

Prisma has **TWO different input types** for update operations:

1. **`ITProjectUpdateInput`** - Uses relation fields (`projectManager`, `teamLead`)
2. **`ITProjectUncheckedUpdateInput`** - Uses scalar fields (`projectManagerId`, `teamLeadId`)

By default, when you call `prisma.iTProject.update()`, it expects **`ITProjectUpdateInput`**, which requires relation fields with `connect`/`disconnect` syntax.

## The Confusion

The error messages were confusing because:
- First it said: `Unknown argument projectManagerId. Did you mean projectManager?`
- Then it said: `Unknown argument projectManager. Did you mean projectManagerId?`

This happened because Prisma was switching between the two input types based on what we were sending.

## The Solution

For **UPDATE** operations with the default input type, we MUST use relation syntax:

```typescript
// ✅ CORRECT for ITProjectUpdateInput
updateData.projectManager = { connect: { id: managerId } };
updateData.teamLead = { disconnect: true };

// ❌ WRONG - this is for UncheckedUpdateInput only
updateData.projectManagerId = managerId;
updateData.teamLeadId = null;
```

## What Changed

### Project Updates (`/api/it/projects/[id]/route.ts`):
```typescript
if (field === 'projectManagerId') {
    if (body[field]) {
        updateData.projectManager = { connect: { id: body[field] } };
    } else if (body[field] === null || body[field] === '') {
        updateData.projectManager = { disconnect: true };
    }
}
```

### Task Updates (`/api/it/tasks/[id]/route.ts`):
```typescript
if (field === 'projectId') {
    if (body[field]) {
        updateData.project = { connect: { id: body[field] } };
    } else if (body[field] === null || body[field] === '') {
        updateData.project = { disconnect: true };
    }
}
```

## Summary

- **CREATE** operations → Use relation fields with `connect`
- **UPDATE** operations → ALSO use relation fields with `connect`/`disconnect` (by default)
- Only use scalar fields if you explicitly specify `UncheckedUpdateInput`

The original approach was actually correct! The issue was that I changed it based on a misunderstanding of the error message.

## Status

✅ **NOW FIXED** - Both project and task updates should work correctly.
