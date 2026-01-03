# Scaling Plan: Enterprise Modules Expansion

## Objective
Scale the STM Customer application by adding four new major modules: Dispatch/Logistics, Publication Management, Conference Management, and Courses (LMS).

## 1. Database Schema Expansion (Prisma)
We need to add data models for each new domain.

### A. Dispatch & Logistics
- **DispatchOrder**: Tracks shipments of physical journals/products.
- **Courier**: Master list of courier partners.
- **Relations**: Linked to `Subscription` and `Invoice`.

### B. Publication Management (JMS)
- **Article**: Core unit of content.
- **Issue/Volume**: Grouping of articles.
- **submission**: Workflow tracking (Draft -> Review -> Published).
- **Author/Reviewer**: Extended roles.

### C. Conference Management
- **Event**: Details of the conference.
- **Paper**: Abstract/Paper submissions for conferences.
- **Registration**: Attendee management.

### D. Courses (LMS)
- **Course**: Educational content container.
- **Module/Lesson**: Content hierarchy.
- **Enrollment**: Student progress and access.

## 2. Frontend & API Implementation Strategy

### Phase 1: Database & Core Types
- Update `schema.prisma`.
- Run migrations/generate client.

### Phase 2: Dispatch & Logistics (Priority: High - Operations)
- Dashboard: `/dashboard/logistics`.
- Features: Generate labels, track numbers, bulk update status.

### Phase 3: Publication Management
- Dashboard: `/dashboard/editorial`.
- Features: Article submission portal, reviewer dashboard, issue builder.

### Phase 4: Conferences
- Dashboard: `/dashboard/events`.
- Features: Ticket sales, abstract submission, schedule builder.

### Phase 5: Courses
- Dashboard: `/dashboard/courses`.
- Features: Course player, progress tracking, certification.

## 3. Immediate Next Steps
1. Update `prisma/schema.prisma` with all new models.
2. Create the expansion migration.
3. Update the `DashboardLayout` to include these new sections in the sidebar.
