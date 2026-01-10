# Changelog & Project History


## [1.2.0] - 2026-01-10

### Summary
Comprehensive UI/UX overhaul of the HR Management module and critical bug fixes for Recruitment and Payroll APIs.

### Changed
- **HR Navigation**: Replaced the previous grid-based navigation with a modern, space-efficient horizontal tab bar featuring hover-activated dropdown menus.
- **Recruitment Dashboard**: Split into dedicated "Job Postings" and "Applicant Pipeline" views for better workflow management.

### Fixed
- **API Relations**:
  - Fixed `prisma.jobApplication` and `prisma.recruitmentInterview` incorrect model referencing.
  - Resolved `companies.map` error by correctly handling paginated API responses.
- **Data Integrity**: Corrected company ID filtering logic across all recruitment APIs.

## [1.1.0] - 2026-01-10

### Summary
Major feature expansion including Advanced Analytics, Departmental Budgeting, and a complete Recruitment (ATS) module. The system now supports the full employee lifecycle and deep financial insights.

### Added
- **Financial Intelligence**:
  - **Automated Arrears**: `SalarySlip` now supports arrear calculations and records (`ArrearRecord`), automatically updating Net Pay and CTC.
  - **Full & Final Settlement**: Dedicated workflow for employee exits, calculating pro-rata salary, leave encashment, and dues.
  - **Departmental Budgeting**: New `DepartmentBudget` model and dashboard for allocating and tracking fiscal budgets vs actual spend.
- **Recruitment & ATS**:
  - **Job Postings**: CRUD management for job openings with departmental links.
  - **Candidate Pipeline**: Interactive Kanban board (`ApplicantPipeline`) for visual tracking of candidates.
  - **Interview Scheduling**: Integrated scheduling system with feedback loops and rating.
- **Advanced Analytics**:
  - **AI Insights**: New API endpoint providing data-driven recommendations and anomaly detection.
  - **Performance Metrics**: Enhanced dashboard for granular performance tracking.

### Changed
- **Payroll Engine**: Refactored `PayrollCalculator` to seamlessly integrate arrears into tax and payload calculations.
- **HR Dashboard**: Added new tabs for "Budgets", "Final Settlement", and "Recruitment" with role-based visibility.

### Security
- **Strict Role-Based Access**: Recruitment APIs restricted to HR/Admins; Budget allocation restricted to Finance/HR.

### Added
- **NextAuth Integration**: Successfully implemented NextAuth v5 (Beta) with Credentials provider for secure, cookie-based sessions.
- **Institution-Centric System**: 
  - Unified activity dashboard for university and library institutions.
  - Bulk employee assignment feature for institutions.
  - Aggregated statistics (revenue, customers, subscriptions) at the institution level.
- **Role-Based Workflows**: Enhanced "Manager" section for HR workflows including Work Reports and Leave Requests.
- **Knowledge Base**: Added comprehensive role-based guides ("My Work" section) for all user roles.
- **Data Hub**: Bulk Import/Export capabilities for Customers, Journals, and Institutions.

### Fixed
- **Employee Update System**: 
  - Resolved "Bad Request" errors by implementing Zod preprocessing for empty strings.
  - Fixed Prisma relation errors when updating `designationId`.
  - Standardized phone and email validation for nullable fields.
- **Impersonation Mode**: Fixed the "Login As" feature to work correctly with NextAuth sessions, including a "Back to Admin" return mechanism.
- **API Reliability**: 
  - Refactored 50+ API routes to use a standardized `authorizedRoute` middleware.
  - Improved type safety across all recruitment and HR endpoints.
  - Fixed "zombie process" issues and port conflicts on development servers.
- **UI/UX**: 
  - Improved layout of Employee Profile with vertically stacked Job Descriptions/KRAs.
  - Added loading states and helpful empty states across the dashboard.
  - Fixed raw HTML display issues in the Staff Portal.

### Security
- Switched from custom JWT to NextAuth with HTTP-only cookies.
- Standardized role-based access control (RBAC) across frontend and backend.
- Implemented robust input validation using Zod schemas.

---

*Note: This changelog summarizes various implementation phases including Phase 2 (Institutions), Phase 3 (Advanced Analytics), and critical bug fix sessions.*
