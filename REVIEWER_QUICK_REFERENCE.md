# 📚 Journal Reviewer Management System - Quick Reference Guide

## 🎯 Overview
Complete CRUD system for managing journal reviewers, manuscript assignments, review reports, and certificates.

---

## 🔑 Key Concepts

### Reviewer Lifecycle
1. **Add Reviewer** → Admin adds user as reviewer to a journal
2. **Assign Manuscript** → Admin assigns manuscript to reviewer
3. **Submit Review** → Reviewer submits detailed report
4. **Validate Review** → Admin validates the report
5. **Generate Certificate** → System auto-generates certificate

### Roles & Permissions
- **SUPER_ADMIN, ADMIN, MANAGER**: Full management access
- **Reviewers**: Can view/submit their own assignments
- **Other Users**: No reviewer access

---

## 📡 API Endpoints Quick Reference

### Reviewer Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/journals/[id]/reviewers` | List reviewers | Admin |
| POST | `/api/journals/[id]/reviewers` | Add reviewer | Admin |
| GET | `/api/journals/[id]/reviewers/[reviewerId]` | Get reviewer details | Admin |
| PATCH | `/api/journals/[id]/reviewers/[reviewerId]` | Update reviewer | Admin |
| DELETE | `/api/journals/[id]/reviewers/[reviewerId]` | Remove reviewer | Admin |

### Assignments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/articles/[id]/assignments` | List assignments | Admin |
| POST | `/api/articles/[id]/assignments` | Assign reviewer | Admin |
| GET | `/api/assignments/[id]` | Get assignment | Reviewer/Admin |
| PATCH | `/api/assignments/[id]` | Update assignment | Admin |
| DELETE | `/api/assignments/[id]` | Remove assignment | Admin |

### Review Reports
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/assignments/[id]/report` | Get report | Reviewer/Admin |
| POST | `/api/assignments/[id]/report` | Submit report | Reviewer |
| PATCH | `/api/assignments/[id]/report` | Update report | Reviewer/Admin |
| POST | `/api/assignments/[id]/report/validate` | Validate report | Admin |

### Dashboard & Certificates
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/reviewer/dashboard` | Get dashboard data | Reviewer |
| GET | `/api/reviewer/certificates` | Get my certificates | Reviewer |
| GET | `/api/certificates/[id]` | Get certificate details | Reviewer/Admin |

---

## 💡 Common Use Cases

### 1. Add a New Reviewer
```javascript
const response = await fetch('/api/journals/journal-id/reviewers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user-uuid',
    specialization: ['Machine Learning', 'NLP', 'Computer Vision'],
    bio: 'PhD in AI with 10+ years of research experience'
  })
});
```

### 2. Assign Manuscript to Reviewer
```javascript
const response = await fetch('/api/articles/article-id/assignments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reviewerId: 'reviewer-uuid',
    dueDate: '2026-02-15',
    priority: 'HIGH',
    round: 1,
    notes: 'Please focus on the methodology section'
  })
});
```

### 3. Submit Review Report
```javascript
const response = await fetch('/api/assignments/assignment-id/report', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    overallRating: 4,
    originality: 5,
    methodology: 4,
    clarity: 3,
    significance: 4,
    commentsToEditor: 'The paper presents novel ideas but needs minor revisions...',
    commentsToAuthor: 'Please clarify the experimental setup in section 3...',
    recommendation: 'MINOR_REVISION',
    confidentialComments: 'The author appears to be a junior researcher...'
  })
});
```

### 4. Validate Review Report
```javascript
const response = await fetch('/api/assignments/assignment-id/report/validate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    isValidated: true
  })
});

// Or reject with reason
const response = await fetch('/api/assignments/assignment-id/report/validate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    isValidated: false,
    rejectionReason: 'Report lacks sufficient detail in methodology evaluation'
  })
});
```

### 5. Get Reviewer Dashboard
```javascript
const response = await fetch('/api/reviewer/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Returns:
{
  isReviewer: true,
  reviewerProfiles: [...],
  statistics: {
    pending: 3,
    inProgress: 2,
    submitted: 1,
    validated: 10,
    total: 16,
    certificates: 10,
    overdue: 1
  },
  recentAssignments: [...],
  upcomingDeadlines: [...]
}
```

---

## 📊 Data Models

### JournalReviewer
```typescript
{
  id: string
  journalId: string
  userId: string
  specialization: string[]  // e.g., ["ML", "NLP"]
  bio: string | null
  isActive: boolean
  joinedDate: Date
  totalReviews: number
  completedReviews: number
  averageRating: number | null
}
```

### ReviewAssignment
```typescript
{
  id: string
  articleId: string
  reviewerId: string
  assignedBy: string
  assignedDate: Date
  dueDate: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED' | 'EXPIRED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  round: number
  notes: string | null
}
```

### ReviewReport
```typescript
{
  id: string
  assignmentId: string
  overallRating: number      // 1-5
  originality: number        // 1-5
  methodology: number        // 1-5
  clarity: number            // 1-5
  significance: number       // 1-5
  commentsToEditor: string
  commentsToAuthor: string | null
  recommendation: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT' | 'REJECT_RESUBMIT'
  confidentialComments: string | null
  submittedDate: Date
  validatedBy: string | null
  validatedDate: Date | null
  isValidated: boolean
  rejectionReason: string | null
}
```

### ReviewCertificate
```typescript
{
  id: string
  reviewerId: string
  articleId: string
  journalId: string
  certificateNumber: string  // e.g., "REV-1736684400000-A1B2C3D4"
  issueDate: Date
  reviewDate: Date
  articleTitle: string
  reviewerName: string
  journalName: string
  pdfUrl: string | null
  issuedBy: string
}
```

---

## ⚠️ Important Notes

### Validation Rules
- **Ratings**: Must be between 1 and 5
- **Specialization**: Must be an array of strings
- **Due Date**: Must be a valid future date
- **Duplicate Prevention**: Cannot add same reviewer twice to a journal
- **Assignment Validation**: Cannot assign same reviewer to same article in same round

### Business Logic
- **Auto-increment**: Total reviews count increments on assignment
- **Auto-decrement**: Total reviews count decrements on assignment deletion
- **Auto-certificate**: Certificate generated automatically on report validation
- **Status Updates**: Assignment status updates automatically based on actions
- **Completed Count**: Increments only on successful validation

### Restrictions
- Cannot delete reviewer with pending assignments
- Cannot delete assignment with submitted report
- Cannot edit validated report (reviewers only, admins can)
- Cannot submit duplicate report (use PATCH to update)

---

## 🔍 Query Parameters

### List Reviewers
```
GET /api/journals/[id]/reviewers?isActive=true&specialization=Machine%20Learning
```

### List Assignments
```
GET /api/articles/[id]/assignments?status=PENDING&round=1
```

---

## 🎨 Status Flow

### Assignment Status Flow
```
PENDING → IN_PROGRESS → SUBMITTED → VALIDATED
                                  ↘ REJECTED
```

### Review Lifecycle
```
1. Created (PENDING)
2. Reviewer starts work (IN_PROGRESS)
3. Reviewer submits report (SUBMITTED)
4. Admin validates (VALIDATED) → Certificate generated
   OR Admin rejects (REJECTED) → Reviewer can resubmit
```

---

## 🚨 Error Handling

### Common Errors
- **404**: Resource not found
- **400**: Validation error or business logic violation
- **403**: Forbidden (insufficient permissions)
- **409**: Conflict (duplicate entry)
- **500**: Server error

### Example Error Response
```json
{
  "error": "This user is already a reviewer for this journal"
}
```

---

## 📈 Statistics & Analytics

### Dashboard Metrics
- **Pending**: Assignments not yet started
- **In Progress**: Assignments being worked on
- **Submitted**: Reports submitted, awaiting validation
- **Validated**: Completed and validated reviews
- **Overdue**: Assignments past due date
- **Certificates**: Total certificates earned

---

## 🎯 Best Practices

1. **Always validate input** before making API calls
2. **Check permissions** before allowing actions
3. **Handle errors gracefully** with user-friendly messages
4. **Show loading states** during API calls
5. **Refresh data** after successful operations
6. **Use optimistic updates** for better UX
7. **Implement retry logic** for failed requests
8. **Cache dashboard data** to reduce API calls

---

## 📞 Support

For issues or questions:
1. Check API response errors
2. Verify authentication token
3. Confirm user permissions
4. Review validation rules
5. Check server logs

---

**Version**: 1.0  
**Last Updated**: January 12, 2026  
**Status**: Production Ready
