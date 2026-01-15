---
description: IT Domain Upgrade - Advanced Project & Task Management with Revenue Tracking
---

# IT Domain Upgrade - Complete Implementation Plan

## 🎯 **OBJECTIVE**
Upgrade the IT department domain to include comprehensive project and task management with revenue tracking, performance analytics, and department-wide visibility across all organizational levels.

---

## 📋 **CORE REQUIREMENTS**

### 1. **Project & Task Management**
- Manage all IT projects and tasks
- Categorize tasks as:
  - **Revenue-based**: Tasks that generate income
  - **Support-type**: Internal support tasks
- Track potential revenue for each task
- Calculate IT department revenue share percentage

### 2. **Multi-Level Visibility**
- **Employees**: View their own tasks, status, and reports
- **Managers**: View team tasks + their own tasks
- **IT Department**: View all tasks with dedicated IT-specific section
- Real-time status tracking and reporting

### 3. **Revenue Tracking & Analytics**
- Automatic revenue calculation for paid tasks
- IT department percentage cut auto-added to department revenue
- Performance metrics and KPIs
- Revenue forecasting and trends

### 4. **Help & Usability**
- Interactive tooltips for all features
- Contextual help system
- Onboarding guides
- User-friendly interface with clear navigation

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **Database Schema Design**

#### **ITProject Model**
```prisma
model ITProject {
  id                String            @id @default(uuid())
  companyId         String
  projectCode       String            @unique
  name              String
  description       String?
  category          ProjectCategory   @default(DEVELOPMENT)
  type              ProjectType       @default(SUPPORT)
  status            ProjectStatus     @default(PLANNING)
  priority          Priority          @default(MEDIUM)
  
  // Client & Assignment
  clientId          String?           // Customer/Department requesting
  clientType        ClientType?       // INTERNAL, EXTERNAL, CUSTOMER
  projectManagerId  String?
  teamLeadId        String?
  
  // Timeline
  startDate         DateTime?
  endDate           DateTime?
  estimatedHours    Float?
  actualHours       Float             @default(0)
  
  // Financial
  isRevenueBased    Boolean           @default(false)
  estimatedRevenue  Float             @default(0)
  actualRevenue     Float             @default(0)
  currency          String            @default("INR")
  itDepartmentCut   Float             @default(0)  // Percentage
  itRevenueEarned   Float             @default(0)  // Calculated amount
  
  // Billing
  billingType       BillingType?      // FIXED, HOURLY, MILESTONE
  hourlyRate        Float?
  isBilled          Boolean           @default(false)
  invoiceId         String?
  
  // Metadata
  tags              String[]
  attachments       String[]
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  completedAt       DateTime?
  
  // Relations
  company           Company           @relation(fields: [companyId], references: [id])
  projectManager    User?             @relation("ProjectManager", fields: [projectManagerId], references: [id])
  teamLead          User?             @relation("TeamLead", fields: [teamLeadId], references: [id])
  tasks             ITTask[]
  milestones        ITProjectMilestone[]
  timeEntries       ITTimeEntry[]
  comments          ITProjectComment[]
  
  @@index([companyId])
  @@index([status])
  @@index([type])
  @@index([projectManagerId])
}

enum ProjectCategory {
  DEVELOPMENT
  INFRASTRUCTURE
  SECURITY
  SUPPORT
  MAINTENANCE
  UPGRADE
  MIGRATION
  TRAINING
  CONSULTING
  RESEARCH
}

enum ProjectType {
  REVENUE      // Generates revenue
  SUPPORT      // Internal support
  MAINTENANCE  // Regular maintenance
  ENHANCEMENT  // Feature enhancement
}

enum ProjectStatus {
  PLANNING
  IN_PROGRESS
  ON_HOLD
  TESTING
  COMPLETED
  CANCELLED
  ARCHIVED
}

enum ClientType {
  INTERNAL     // Internal department
  EXTERNAL     // External client
  CUSTOMER     // Existing customer
}

enum BillingType {
  FIXED
  HOURLY
  MILESTONE
  RETAINER
}
```

#### **ITTask Model**
```prisma
model ITTask {
  id                String            @id @default(uuid())
  companyId         String
  projectId         String?
  taskCode          String            @unique
  
  // Basic Info
  title             String
  description       String?
  category          TaskCategory      @default(GENERAL)
  type              TaskType          @default(SUPPORT)
  priority          Priority          @default(MEDIUM)
  status            TaskStatus        @default(TODO)
  
  // Assignment
  assignedToId      String?
  createdById       String
  reporterId        String?           // Who reported the issue
  
  // Timeline
  startDate         DateTime?
  dueDate           DateTime?
  completedAt       DateTime?
  estimatedHours    Float?
  actualHours       Float             @default(0)
  
  // Financial
  isRevenueBased    Boolean           @default(false)
  estimatedValue    Float             @default(0)
  actualValue       Float             @default(0)
  currency          String            @default("INR")
  itDepartmentCut   Float             @default(0)  // Percentage
  itRevenueEarned   Float             @default(0)
  isPaid            Boolean           @default(false)
  paymentDate       DateTime?
  
  // Progress Tracking
  progressPercent   Int               @default(0)
  blockers          String?
  dependencies      String[]          // Task IDs this depends on
  
  // Metadata
  tags              String[]
  attachments       String[]
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  // Relations
  company           Company           @relation(fields: [companyId], references: [id])
  project           ITProject?        @relation(fields: [projectId], references: [id])
  assignedTo        User?             @relation("ITTaskAssignee", fields: [assignedToId], references: [id])
  createdBy         User              @relation("ITTaskCreator", fields: [createdById], references: [id])
  reporter          User?             @relation("ITTaskReporter", fields: [reporterId], references: [id])
  timeEntries       ITTimeEntry[]
  comments          ITTaskComment[]
  statusHistory     ITTaskStatusHistory[]
  
  @@index([companyId])
  @@index([projectId])
  @@index([assignedToId])
  @@index([status])
  @@index([type])
}

enum TaskCategory {
  BUG_FIX
  FEATURE
  ENHANCEMENT
  SUPPORT
  DOCUMENTATION
  TESTING
  DEPLOYMENT
  RESEARCH
  GENERAL
}

enum TaskType {
  REVENUE      // Generates revenue
  SUPPORT      // Internal support
  MAINTENANCE  // Regular maintenance
  URGENT       // Urgent fix
}
```

#### **Supporting Models**

```prisma
model ITProjectMilestone {
  id              String          @id @default(uuid())
  projectId       String
  name            String
  description     String?
  dueDate         DateTime
  completedAt     DateTime?
  status          String          @default("PENDING")
  paymentAmount   Float?
  isPaid          Boolean         @default(false)
  
  project         ITProject       @relation(fields: [projectId], references: [id])
  
  @@index([projectId])
}

model ITTimeEntry {
  id              String          @id @default(uuid())
  companyId       String
  projectId       String?
  taskId          String?
  userId          String
  
  date            DateTime        @default(now())
  hours           Float
  description     String?
  isBillable      Boolean         @default(false)
  hourlyRate      Float?
  amount          Float?
  
  createdAt       DateTime        @default(now())
  
  company         Company         @relation(fields: [companyId], references: [id])
  project         ITProject?      @relation(fields: [projectId], references: [id])
  task            ITTask?         @relation(fields: [taskId], references: [id])
  user            User            @relation("ITTimeEntries", fields: [userId], references: [id])
  
  @@index([companyId])
  @@index([projectId])
  @@index([taskId])
  @@index([userId])
  @@index([date])
}

model ITTaskStatusHistory {
  id              String          @id @default(uuid())
  taskId          String
  changedById     String
  
  previousStatus  TaskStatus
  newStatus       TaskStatus
  comment         String?
  changedAt       DateTime        @default(now())
  
  task            ITTask          @relation(fields: [taskId], references: [id])
  changedBy       User            @relation("ITStatusChanger", fields: [changedById], references: [id])
  
  @@index([taskId])
}

model ITProjectComment {
  id              String          @id @default(uuid())
  projectId       String
  userId          String
  content         String
  createdAt       DateTime        @default(now())
  
  project         ITProject       @relation(fields: [projectId], references: [id])
  user            User            @relation("ITProjectComments", fields: [userId], references: [id])
  
  @@index([projectId])
}

model ITTaskComment {
  id              String          @id @default(uuid())
  taskId          String
  userId          String
  content         String
  createdAt       DateTime        @default(now())
  
  task            ITTask          @relation(fields: [taskId], references: [id])
  user            User            @relation("ITTaskComments", fields: [userId], references: [id])
  
  @@index([taskId])
}

model ITDepartmentRevenue {
  id              String          @id @default(uuid())
  companyId       String
  
  month           Int
  year            Int
  
  totalRevenue    Float           @default(0)
  projectRevenue  Float           @default(0)
  taskRevenue     Float           @default(0)
  
  totalProjects   Int             @default(0)
  totalTasks      Int             @default(0)
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  company         Company         @relation(fields: [companyId], references: [id])
  
  @@unique([companyId, month, year])
  @@index([companyId])
}

model ITPerformanceMetric {
  id                    String          @id @default(uuid())
  companyId             String
  userId                String
  
  month                 Int
  year                  Int
  
  tasksCompleted        Int             @default(0)
  tasksInProgress       Int             @default(0)
  averageCompletionTime Float           @default(0)  // in hours
  revenueGenerated      Float           @default(0)
  billableHours         Float           @default(0)
  productivityScore     Float           @default(0)  // 0-100
  
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  
  company               Company         @relation(fields: [companyId], references: [id])
  user                  User            @relation("ITPerformance", fields: [userId], references: [id])
  
  @@unique([companyId, userId, month, year])
  @@index([companyId])
  @@index([userId])
}
```

---

## 🎨 **FRONTEND ARCHITECTURE**

### **Page Structure**

```
/dashboard/it-management/
├── overview/                    # Dashboard overview
├── projects/                    # Project management
│   ├── page.tsx                # Projects list
│   ├── [id]/                   # Project details
│   │   ├── page.tsx
│   │   ├── tasks/              # Project tasks
│   │   ├── timeline/           # Gantt chart
│   │   └── financials/         # Revenue tracking
│   └── new/                    # Create project
├── tasks/                       # Task management
│   ├── page.tsx                # Tasks list (my tasks)
│   ├── [id]/                   # Task details
│   ├── team/                   # Team tasks (managers)
│   └── all/                    # All tasks (IT dept)
├── revenue/                     # Revenue analytics
│   ├── overview/               # Revenue dashboard
│   ├── projects/               # Project revenue
│   └── reports/                # Financial reports
├── performance/                 # Performance metrics
│   ├── individual/             # Personal metrics
│   ├── team/                   # Team metrics
│   └── department/             # Department metrics
├── time-tracking/              # Time entry
└── help/                       # Help & tutorials
```

### **Component Architecture**

```typescript
// Core Components
components/it-management/
├── projects/
│   ├── ProjectCard.tsx
│   ├── ProjectList.tsx
│   ├── ProjectForm.tsx
│   ├── ProjectTimeline.tsx
│   ├── ProjectFinancials.tsx
│   └── ProjectTeam.tsx
├── tasks/
│   ├── TaskCard.tsx
│   ├── TaskList.tsx
│   ├── TaskBoard.tsx          // Kanban board
│   ├── TaskForm.tsx
│   ├── TaskDetails.tsx
│   └── TaskStatusBadge.tsx
├── revenue/
│   ├── RevenueChart.tsx
│   ├── RevenueBreakdown.tsx
│   ├── RevenueProjection.tsx
│   └── ITRevenueCard.tsx
├── performance/
│   ├── PerformanceCard.tsx
│   ├── MetricsChart.tsx
│   ├── ProductivityScore.tsx
│   └── TeamLeaderboard.tsx
├── time-tracking/
│   ├── TimeEntryForm.tsx
│   ├── TimeSheet.tsx
│   └── BillableHoursChart.tsx
└── shared/
    ├── HelpTooltip.tsx        // Interactive help
    ├── QuickGuide.tsx         // Contextual guides
    ├── StatusIndicator.tsx
    └── RevenueIndicator.tsx
```

---

## 🔧 **API ENDPOINTS**

### **Projects API**

```typescript
// /api/it/projects
GET     /api/it/projects                    // List all projects (filtered by role)
POST    /api/it/projects                    // Create new project
GET     /api/it/projects/[id]               // Get project details
PATCH   /api/it/projects/[id]               // Update project
DELETE  /api/it/projects/[id]               // Delete project
GET     /api/it/projects/[id]/tasks         // Get project tasks
GET     /api/it/projects/[id]/revenue       // Get project revenue
POST    /api/it/projects/[id]/milestones    // Add milestone
```

### **Tasks API**

```typescript
// /api/it/tasks
GET     /api/it/tasks                       // List tasks (my tasks)
GET     /api/it/tasks/team                  // Team tasks (managers)
GET     /api/it/tasks/all                   // All tasks (IT dept)
POST    /api/it/tasks                       // Create task
GET     /api/it/tasks/[id]                  // Get task details
PATCH   /api/it/tasks/[id]                  // Update task
DELETE  /api/it/tasks/[id]                  // Delete task
POST    /api/it/tasks/[id]/comments         // Add comment
POST    /api/it/tasks/[id]/time             // Log time
PATCH   /api/it/tasks/[id]/status           // Update status
```

### **Revenue API**

```typescript
// /api/it/revenue
GET     /api/it/revenue/overview            // Department revenue overview
GET     /api/it/revenue/projects            // Project-wise revenue
GET     /api/it/revenue/tasks               // Task-wise revenue
GET     /api/it/revenue/monthly             // Monthly breakdown
GET     /api/it/revenue/forecast            // Revenue forecast
POST    /api/it/revenue/calculate           // Recalculate revenue
```

### **Performance API**

```typescript
// /api/it/performance
GET     /api/it/performance/individual      // Personal metrics
GET     /api/it/performance/team            // Team metrics
GET     /api/it/performance/department      // Department metrics
GET     /api/it/performance/leaderboard     // Top performers
POST    /api/it/performance/calculate       // Recalculate metrics
```

### **Analytics API**

```typescript
// /api/it/analytics
GET     /api/it/analytics/dashboard         // Dashboard stats
GET     /api/it/analytics/trends            // Trend analysis
GET     /api/it/analytics/reports           // Generate reports
```

---

## 🎯 **KEY FEATURES**

### **1. Smart Task Categorization**
- Automatic categorization based on keywords
- Revenue potential estimation using AI
- Priority scoring algorithm
- Dependency tracking

### **2. Revenue Intelligence**
- Automatic IT department cut calculation
- Real-time revenue tracking
- Payment status monitoring
- Revenue forecasting using historical data

### **3. Multi-Level Dashboards**

#### **Employee Dashboard**
- My tasks (active, pending, completed)
- Personal performance metrics
- Time tracking
- Revenue contribution

#### **Manager Dashboard**
- Team tasks overview
- Team performance metrics
- Resource allocation
- Bottleneck identification

#### **IT Department Dashboard**
- All projects and tasks
- Department revenue analytics
- Performance leaderboard
- Capacity planning
- Dedicated IT-specific tasks section

### **4. Advanced Analytics**
- Task completion trends
- Revenue trends and forecasting
- Team productivity analysis
- Resource utilization
- Burndown charts
- Velocity tracking

### **5. Help & Onboarding System**
- Interactive tooltips on every feature
- Contextual help based on user role
- Video tutorials
- Quick start guides
- FAQ section
- Search functionality

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Database & Core Setup** (Week 1)
1. Update Prisma schema with all new models
2. Run migrations
3. Create seed data for testing
4. Set up API route structure

### **Phase 2: Backend APIs** (Week 2)
1. Implement Projects API
2. Implement Tasks API
3. Implement Revenue calculation logic
4. Implement Performance metrics API
5. Add authentication & authorization

### **Phase 3: Frontend - Basic Views** (Week 3)
1. Create project list and detail pages
2. Create task list and detail pages
3. Implement task creation forms
4. Add basic filtering and search

### **Phase 4: Frontend - Advanced Features** (Week 4)
1. Implement Kanban board
2. Add Gantt chart for timeline
3. Create revenue dashboards
4. Build performance analytics

### **Phase 5: Revenue & Analytics** (Week 5)
1. Implement revenue tracking
2. Build analytics dashboards
3. Create reporting system
4. Add export functionality

### **Phase 6: Help System & Polish** (Week 6)
1. Implement help tooltips
2. Create onboarding guides
3. Add video tutorials
4. UI/UX refinements
5. Performance optimization

### **Phase 7: Testing & Deployment** (Week 7)
1. Unit testing
2. Integration testing
3. User acceptance testing
4. Bug fixes
5. Production deployment

---

## 💡 **ADVANCED FEATURES & IDEAS**

### **1. AI-Powered Features**
- **Smart Task Assignment**: AI suggests best team member based on skills and workload
- **Revenue Prediction**: ML model predicts task revenue based on historical data
- **Bottleneck Detection**: Automatically identifies project bottlenecks
- **Effort Estimation**: AI estimates task completion time

### **2. Automation**
- **Auto Status Updates**: Tasks auto-update based on time entries
- **Revenue Auto-Calculation**: Automatic IT cut calculation on payment
- **Performance Auto-Tracking**: Metrics auto-update daily
- **Reminder System**: Automated reminders for due tasks

### **3. Integration Features**
- **Calendar Integration**: Sync tasks with calendar
- **Email Notifications**: Task updates via email
- **Slack/Teams Integration**: Real-time notifications
- **Git Integration**: Link commits to tasks

### **4. Reporting & Exports**
- **Custom Reports**: Build custom reports with filters
- **PDF Export**: Export reports as PDF
- **Excel Export**: Export data to Excel
- **Scheduled Reports**: Auto-generate weekly/monthly reports

### **5. Gamification**
- **Achievement Badges**: Earn badges for milestones
- **Leaderboards**: Compete with team members
- **Productivity Streaks**: Track consecutive productive days
- **Rewards System**: Points for completed tasks

### **6. Mobile Features**
- **Mobile App**: Native mobile app for task management
- **Push Notifications**: Real-time task updates
- **Offline Mode**: Work offline, sync later
- **Quick Actions**: Swipe gestures for common actions

### **7. Collaboration Tools**
- **Real-time Chat**: Task-specific chat rooms
- **File Sharing**: Attach files to tasks/projects
- **Screen Sharing**: Built-in screen sharing for support
- **Code Review**: Integrated code review for dev tasks

### **8. Advanced Analytics**
- **Predictive Analytics**: Forecast project completion
- **Risk Assessment**: Identify at-risk projects
- **Resource Optimization**: Suggest optimal resource allocation
- **Cost Analysis**: Track actual vs estimated costs

---

## 🎨 **UI/UX DESIGN PRINCIPLES**

### **Design System**
- **Color Coding**:
  - 🟢 Green: Revenue-based tasks
  - 🔵 Blue: Support tasks
  - 🟡 Yellow: Maintenance
  - 🔴 Red: Urgent/Critical

- **Status Indicators**:
  - Visual progress bars
  - Color-coded status badges
  - Icon-based quick status

- **Revenue Indicators**:
  - 💰 Revenue amount display
  - 📊 IT cut percentage
  - ✅ Payment status

### **Responsive Design**
- Mobile-first approach
- Tablet-optimized layouts
- Desktop power features
- Touch-friendly interactions

### **Accessibility**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

---

## 📊 **METRICS & KPIs**

### **Project Metrics**
- Total projects (active, completed, cancelled)
- Average project duration
- On-time delivery rate
- Budget variance
- Client satisfaction score

### **Task Metrics**
- Total tasks (by status, type, priority)
- Average completion time
- Task velocity (tasks/week)
- Backlog size
- Bug fix rate

### **Revenue Metrics**
- Total revenue generated
- IT department revenue
- Revenue per project
- Revenue per task
- Monthly recurring revenue
- Revenue growth rate

### **Performance Metrics**
- Individual productivity score
- Team efficiency
- Billable hours percentage
- Resource utilization
- Customer satisfaction

---

## 🔒 **SECURITY & PERMISSIONS**

### **Role-Based Access Control**

| Feature | Employee | Manager | IT Admin | Super Admin |
|---------|----------|---------|----------|-------------|
| View own tasks | ✅ | ✅ | ✅ | ✅ |
| View team tasks | ❌ | ✅ | ✅ | ✅ |
| View all tasks | ❌ | ❌ | ✅ | ✅ |
| Create tasks | ✅ | ✅ | ✅ | ✅ |
| Assign tasks | ❌ | ✅ | ✅ | ✅ |
| Delete tasks | ❌ | ⚠️ Own | ✅ | ✅ |
| View revenue | ⚠️ Own | ⚠️ Team | ✅ | ✅ |
| Edit revenue | ❌ | ❌ | ✅ | ✅ |
| View analytics | ⚠️ Own | ⚠️ Team | ✅ | ✅ |
| Manage projects | ❌ | ⚠️ Assigned | ✅ | ✅ |

---

## 📱 **HELP SYSTEM IMPLEMENTATION**

### **Interactive Tooltips**
```typescript
// Example tooltip component
<HelpTooltip
  title="Revenue-Based Task"
  content="This task will generate revenue when completed. The IT department will receive a percentage cut automatically."
  position="right"
  videoUrl="/help/revenue-tasks.mp4"
/>
```

### **Contextual Help**
- Role-based help content
- Feature-specific guides
- Step-by-step tutorials
- Video demonstrations

### **Help Center Structure**
```
/help/
├── getting-started/
│   ├── overview
│   ├── creating-tasks
│   ├── tracking-time
│   └── understanding-revenue
├── for-employees/
│   ├── my-tasks
│   ├── submitting-reports
│   └── tracking-performance
├── for-managers/
│   ├── team-management
│   ├── assigning-tasks
│   └── performance-reviews
├── for-it-admins/
│   ├── project-management
│   ├── revenue-tracking
│   └── analytics
└── faq/
```

---

## 🎯 **SUCCESS METRICS**

### **Adoption Metrics**
- User adoption rate (target: 90% in 1 month)
- Daily active users
- Feature usage statistics
- Help center visits

### **Efficiency Metrics**
- Task completion rate improvement (target: +30%)
- Average task resolution time reduction (target: -25%)
- Revenue tracking accuracy (target: 100%)
- Report generation time (target: <5 seconds)

### **Business Metrics**
- IT department revenue visibility (target: 100%)
- Revenue growth tracking
- Cost savings from efficiency
- ROI on IT projects

---

## 🛠️ **TECHNICAL STACK**

### **Backend**
- Next.js 14 App Router
- Prisma ORM
- PostgreSQL
- TypeScript

### **Frontend**
- React 18
- TypeScript
- Tailwind CSS
- Shadcn/UI components
- Recharts for analytics
- React Query for data fetching

### **Additional Libraries**
- date-fns for date handling
- zod for validation
- react-hook-form for forms
- framer-motion for animations
- react-beautiful-dnd for drag-drop

---

## 📝 **NEXT STEPS**

1. **Review & Approve** this plan
2. **Prioritize features** based on business needs
3. **Set timeline** for each phase
4. **Assign resources** (developers, designers)
5. **Begin Phase 1** implementation

---

## 🎉 **EXPECTED OUTCOMES**

✅ **Complete visibility** of all IT projects and tasks
✅ **Accurate revenue tracking** with automatic IT cut calculation
✅ **Performance insights** at individual, team, and department levels
✅ **Improved productivity** through better task management
✅ **Data-driven decisions** with comprehensive analytics
✅ **Easy onboarding** with interactive help system
✅ **Scalable solution** that grows with the organization

---

**This plan provides a comprehensive, production-ready solution for IT department management with advanced features for revenue tracking, performance analytics, and multi-level visibility. The system is designed to be user-friendly, scalable, and highly efficient.**
