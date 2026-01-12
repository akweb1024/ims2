# Journal Reviewer Management System - Implementation Plan

## Overview
Implement a comprehensive reviewer management system for journals that includes:
1. Reviewer CRUD operations
2. Manuscript assignment to reviewers/editors
3. Review workflow and status tracking
4. Reviewer dashboard with assigned tasks
5. Review report submission
6. Review certificate generation after validation

## Database Schema Enhancements

### New Models to Add

#### 1. JournalReviewer
```prisma
model JournalReviewer {
  id                String   @id @default(uuid())
  journalId         String
  userId            String
  specialization    String[]  // Areas of expertise
  isActive          Boolean  @default(true)
  joinedDate        DateTime @default(now())
  totalReviews      Int      @default(0)
  averageRating     Float?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  journal           Journal  @relation(fields: [journalId], references: [id], onDelete: Cascade)
  user              User     @relation(fields: [userId], references: [id])
  assignments       ReviewAssignment[]
  certificates      ReviewCertificate[]
  
  @@unique([journalId, userId])
  @@index([journalId])
  @@index([userId])
}
```

#### 2. ReviewAssignment
```prisma
model ReviewAssignment {
  id                String   @id @default(uuid())
  articleId         String
  reviewerId        String
  assignedBy        String
  assignedDate      DateTime @default(now())
  dueDate           DateTime
  status            ReviewStatus @default(PENDING)
  priority          Priority @default(NORMAL)
  round             Int      @default(1)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  article           Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  reviewer          JournalReviewer @relation(fields: [reviewerId], references: [id])
  assignedByUser    User     @relation("AssignedBy", fields: [assignedBy], references: [id])
  report            ReviewReport?
  
  @@index([articleId])
  @@index([reviewerId])
  @@index([status])
}
```

#### 3. ReviewReport
```prisma
model ReviewReport {
  id                    String   @id @default(uuid())
  assignmentId          String   @unique
  overallRating         Int      // 1-5
  originality           Int      // 1-5
  methodology           Int      // 1-5
  clarity               Int      // 1-5
  significance          Int      // 1-5
  commentsToEditor      String
  commentsToAuthor      String?
  recommendation        Recommendation
  confidentialComments  String?
  submittedDate         DateTime @default(now())
  validatedBy           String?
  validatedDate         DateTime?
  isValidated           Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  assignment            ReviewAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  validator             User?    @relation("ReportValidator", fields: [validatedBy], references: [id])
  
  @@index([assignmentId])
}
```

#### 4. ReviewCertificate
```prisma
model ReviewCertificate {
  id                String   @id @default(uuid())
  reviewerId        String
  articleId         String
  journalId         String
  certificateNumber String   @unique
  issueDate         DateTime @default(now())
  reviewDate        DateTime
  articleTitle      String
  reviewerName      String
  journalName       String
  pdfUrl            String?
  issuedBy          String
  createdAt         DateTime @default(now())
  
  reviewer          JournalReviewer @relation(fields: [reviewerId], references: [id])
  article           Article  @relation(fields: [articleId], references: [id])
  journal           Journal  @relation(fields: [journalId], references: [id])
  issuer            User     @relation("CertificateIssuer", fields: [issuedBy], references: [id])
  
  @@index([reviewerId])
  @@index([certificateNumber])
}
```

### Enums to Add

```prisma
enum ReviewStatus {
  PENDING
  IN_PROGRESS
  SUBMITTED
  VALIDATED
  REJECTED
  EXPIRED
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum Recommendation {
  ACCEPT
  MINOR_REVISION
  MAJOR_REVISION
  REJECT
  REJECT_RESUBMIT
}
```

### Updates to Existing Models

#### Article Model
```prisma
// Add to Article model
reviewAssignments  ReviewAssignment[]
certificates       ReviewCertificate[]
```

#### Journal Model
```prisma
// Add to Journal model
reviewers          JournalReviewer[]
certificates       ReviewCertificate[]
```

#### User Model
```prisma
// Add to User model
reviewerProfiles     JournalReviewer[]
assignedReviews      ReviewAssignment[] @relation("AssignedBy")
validatedReports     ReviewReport[] @relation("ReportValidator")
issuedCertificates   ReviewCertificate[] @relation("CertificateIssuer")
```

## API Endpoints

### Reviewer Management
- `GET /api/journals/[id]/reviewers` - List all reviewers for a journal
- `POST /api/journals/[id]/reviewers` - Add a new reviewer
- `GET /api/journals/[id]/reviewers/[reviewerId]` - Get reviewer details
- `PATCH /api/journals/[id]/reviewers/[reviewerId]` - Update reviewer
- `DELETE /api/journals/[id]/reviewers/[reviewerId]` - Remove reviewer

### Review Assignments
- `GET /api/articles/[id]/assignments` - List assignments for an article
- `POST /api/articles/[id]/assignments` - Assign reviewer to article
- `GET /api/assignments/[id]` - Get assignment details
- `PATCH /api/assignments/[id]` - Update assignment status
- `DELETE /api/assignments/[id]` - Remove assignment

### Review Reports
- `GET /api/assignments/[id]/report` - Get review report
- `POST /api/assignments/[id]/report` - Submit review report
- `PATCH /api/assignments/[id]/report` - Update review report
- `POST /api/assignments/[id]/report/validate` - Validate report (admin)

### Reviewer Dashboard
- `GET /api/reviewer/dashboard` - Get reviewer dashboard data
- `GET /api/reviewer/assignments` - Get my assignments
- `GET /api/reviewer/statistics` - Get reviewer statistics

### Certificates
- `GET /api/reviewer/certificates` - Get my certificates
- `POST /api/certificates/generate` - Generate certificate (admin)
- `GET /api/certificates/[id]` - Get certificate details
- `GET /api/certificates/[id]/download` - Download certificate PDF

## Frontend Components

### Admin/Editor Views
1. **Reviewer Management Page** (`/dashboard/journals/[id]/reviewers`)
   - List of reviewers with search/filter
   - Add/Edit reviewer modal
   - Reviewer statistics
   - Specialization tags

2. **Manuscript Assignment Page** (`/dashboard/articles/[id]/assign`)
   - Available reviewers list
   - Assignment form with due date
   - Priority selection
   - Round tracking

3. **Review Validation Page** (`/dashboard/reviews/validate`)
   - Pending review reports
   - Validation interface
   - Certificate generation trigger

### Reviewer Views
1. **Reviewer Dashboard** (`/dashboard/reviewer`)
   - Assigned manuscripts count
   - Pending reviews
   - Completed reviews
   - Certificates earned

2. **Review Submission Page** (`/dashboard/reviewer/assignments/[id]`)
   - Manuscript details
   - Review form with rating scales
   - Comments sections
   - Submit review

3. **My Certificates** (`/dashboard/reviewer/certificates`)
   - List of earned certificates
   - Download options
   - Certificate preview

## Implementation Phases

### Phase 1: Database & Backend (Priority)
1. Update Prisma schema
2. Run migrations
3. Create API routes for reviewers
4. Create API routes for assignments
5. Create API routes for reports

### Phase 2: Admin Interface
1. Reviewer management UI
2. Assignment interface
3. Review validation interface
4. Certificate generation

### Phase 3: Reviewer Interface
1. Reviewer dashboard
2. Review submission form
3. Certificate viewing

### Phase 4: Notifications & Automation
1. Email notifications for assignments
2. Reminder system for due dates
3. Auto-certificate generation
4. Statistics tracking

## Features

### For Admins/Editors
- ✅ Add/remove reviewers to journals
- ✅ Assign manuscripts to reviewers
- ✅ Track review progress
- ✅ Validate review reports
- ✅ Generate certificates
- ✅ View reviewer statistics

### For Reviewers
- ✅ View assigned manuscripts
- ✅ Submit review reports
- ✅ Track review history
- ✅ Download certificates
- ✅ Update profile/specializations

### Workflow
1. Admin adds reviewer to journal
2. Admin assigns manuscript to reviewer
3. Reviewer receives notification
4. Reviewer submits review report
5. Admin validates review report
6. System generates certificate
7. Reviewer can download certificate

## Security & Permissions

### Role-Based Access
- **SUPER_ADMIN, ADMIN**: Full access to all features
- **MANAGER**: Can manage reviewers and assignments
- **REVIEWER**: Can only view/submit own assignments
- **USER**: No access to reviewer features

### Data Protection
- Reviewers can only see assigned manuscripts
- Confidential comments hidden from authors
- Certificate validation required before issuance
- Audit trail for all actions

---

**Status**: Ready for implementation
**Estimated Time**: 6-8 hours
**Priority**: High
