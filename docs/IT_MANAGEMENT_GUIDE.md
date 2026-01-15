# IT Management System - Quick Reference Guide

## 🎯 Overview
The IT Management System provides comprehensive project and task management with revenue tracking, performance analytics, and multi-level visibility for your web development and support teams.

## 📊 Key Features

### 1. **Project Management**
- Create and manage IT projects
- Track project timeline, budget, and resources
- Categorize projects (Development, Infrastructure, Security, etc.)
- Monitor project revenue and IT department cut

### 2. **Task Management**
- Create tasks linked to projects or standalone
- Assign tasks to team members
- Track task status, progress, and completion
- Categorize tasks by type (Revenue, Support, Maintenance, Urgent)
- Monitor revenue potential for each task

### 3. **Revenue Tracking**
- Automatic calculation of IT department revenue share
- Real-time revenue tracking for projects and tasks
- Monthly revenue analytics and trends
- Payment status monitoring

### 4. **Performance Metrics**
- Individual productivity scores
- Team performance analytics
- Department-wide metrics
- Leaderboards and rankings

### 5. **Multi-Level Visibility**
- **Employees**: View own tasks and performance
- **Managers**: View team tasks and metrics
- **IT Department**: View all tasks with dedicated IT section

## 🗂️ Database Schema

### Core Models

#### **ITProject**
- Manages all IT projects
- Tracks revenue, timeline, and resources
- Links to tasks, milestones, and time entries

#### **ITTask**
- Individual task management
- Revenue tracking per task
- Status history and progress tracking
- Dependencies and blockers

#### **ITTimeEntry**
- Time tracking for projects and tasks
- Billable vs non-billable hours
- Hourly rate and amount calculation

#### **ITDepartmentRevenue**
- Monthly revenue aggregation
- Project and task revenue breakdown
- Department performance metrics

#### **ITPerformanceMetric**
- Individual performance tracking
- Productivity scores
- Completion rates and averages

## 🎨 Task & Project Types

### Project Types
- **REVENUE**: Generates income
- **SUPPORT**: Internal support
- **MAINTENANCE**: Regular maintenance
- **ENHANCEMENT**: Feature enhancements

### Task Types
- **REVENUE**: Billable tasks that generate income
- **SUPPORT**: Internal support tasks
- **MAINTENANCE**: Regular maintenance
- **URGENT**: Critical/urgent fixes

### Task Categories
- BUG_FIX
- FEATURE
- ENHANCEMENT
- SUPPORT
- DOCUMENTATION
- TESTING
- DEPLOYMENT
- RESEARCH
- GENERAL

## 💰 Revenue Calculation

### How IT Department Cut Works

1. **Task/Project Creation**: Set `isRevenueBased = true` and define `itDepartmentCut` percentage
2. **Value Assignment**: Set `estimatedValue` or `actualValue`
3. **Automatic Calculation**: System calculates `itRevenueEarned = actualValue * (itDepartmentCut / 100)`
4. **Payment Tracking**: Mark as paid when payment received
5. **Monthly Aggregation**: Revenue auto-aggregated in `ITDepartmentRevenue`

### Example
```
Task: Website Development
Actual Value: ₹50,000
IT Department Cut: 15%
IT Revenue Earned: ₹7,500 (auto-calculated)
```

## 📈 Performance Metrics

### Individual Metrics
- Tasks completed
- Tasks in progress
- Average completion time
- Revenue generated
- Billable hours
- Productivity score (0-100)

### Team Metrics
- Team productivity average
- Total tasks completed
- Total revenue generated
- Resource utilization

### Department Metrics
- Total projects and tasks
- Department revenue
- Overall productivity
- Capacity planning

## 🔐 Access Control

| Feature | Employee | Manager | IT Admin | Super Admin |
|---------|----------|---------|----------|-------------|
| View own tasks | ✅ | ✅ | ✅ | ✅ |
| Create tasks | ✅ | ✅ | ✅ | ✅ |
| View team tasks | ❌ | ✅ | ✅ | ✅ |
| Assign tasks | ❌ | ✅ | ✅ | ✅ |
| View all tasks | ❌ | ❌ | ✅ | ✅ |
| Manage projects | ❌ | ⚠️ Assigned | ✅ | ✅ |
| View revenue | ⚠️ Own | ⚠️ Team | ✅ | ✅ |
| Edit revenue | ❌ | ❌ | ✅ | ✅ |

## 🚀 Quick Start

### Creating a Project
1. Navigate to IT Management > Projects
2. Click "New Project"
3. Fill in project details
4. Set revenue parameters if applicable
5. Assign project manager and team lead
6. Save project

### Creating a Task
1. Navigate to IT Management > Tasks
2. Click "New Task"
3. Select project (optional)
4. Fill in task details
5. Set task type (Revenue/Support/Maintenance/Urgent)
6. If revenue-based:
   - Enable "Revenue Based"
   - Set estimated value
   - Set IT department cut percentage
7. Assign to team member
8. Save task

### Tracking Time
1. Open task or project
2. Click "Log Time"
3. Enter hours worked
4. Add description
5. Mark as billable if applicable
6. Save time entry

### Viewing Performance
1. Navigate to IT Management > Performance
2. Select view level:
   - Individual: Your metrics
   - Team: Your team's metrics (managers)
   - Department: All metrics (IT admins)
3. View charts and analytics
4. Export reports if needed

## 📱 Navigation Structure

```
/dashboard/it-management/
├── overview/              # Dashboard overview
├── projects/              # Project management
│   ├── [id]/             # Project details
│   └── new/              # Create project
├── tasks/                 # Task management
│   ├── my-tasks/         # Personal tasks
│   ├── team/             # Team tasks (managers)
│   └── all/              # All tasks (IT dept)
├── revenue/               # Revenue analytics
├── performance/           # Performance metrics
└── time-tracking/        # Time entry

```

## 🎯 Color Coding

- 🟢 **Green**: Revenue-based tasks/projects
- 🔵 **Blue**: Support tasks
- 🟡 **Yellow**: Maintenance tasks
- 🔴 **Red**: Urgent/Critical tasks

## 💡 Best Practices

### For Employees
1. Update task status regularly
2. Log time entries daily
3. Add comments for clarity
4. Mark blockers immediately

### For Managers
1. Review team tasks weekly
2. Balance workload distribution
3. Monitor team performance
4. Provide timely feedback

### For IT Admins
1. Track department revenue monthly
2. Analyze performance trends
3. Optimize resource allocation
4. Generate regular reports

## 🆘 Help & Support

### Interactive Help
- Hover over any ℹ️ icon for contextual help
- Click "?" button for feature tutorials
- Access Help Center from main menu

### Common Questions

**Q: How do I mark a task as revenue-based?**
A: When creating/editing a task, enable the "Revenue Based" toggle and set the estimated value and IT department cut percentage.

**Q: Who can see my tasks?**
A: You can see your tasks, your manager can see your tasks, and IT admins can see all tasks.

**Q: How is the productivity score calculated?**
A: Based on tasks completed, average completion time, revenue generated, and billable hours ratio.

**Q: Can I link tasks to projects?**
A: Yes, when creating a task, select the project from the dropdown.

**Q: How do I track time?**
A: Open any task or project and click "Log Time" to add time entries.

## 📊 Reports Available

1. **Project Status Report**: Overview of all projects
2. **Task Completion Report**: Task completion rates
3. **Revenue Report**: Revenue breakdown by project/task
4. **Performance Report**: Individual and team performance
5. **Time Tracking Report**: Billable vs non-billable hours
6. **Department Analytics**: Overall department metrics

## 🔄 Workflow Example

### Website Development Project

1. **Project Creation**
   - Name: "Client Website Redesign"
   - Type: REVENUE
   - Estimated Revenue: ₹100,000
   - IT Department Cut: 15%
   - Project Manager: John Doe

2. **Task Breakdown**
   - Task 1: UI Design (Revenue, ₹20,000)
   - Task 2: Frontend Development (Revenue, ₹30,000)
   - Task 3: Backend API (Revenue, ₹25,000)
   - Task 4: Testing (Support)
   - Task 5: Deployment (Support)

3. **Execution**
   - Assign tasks to team members
   - Team logs time daily
   - Update task status as progress is made
   - Mark tasks complete when done

4. **Completion**
   - Mark project as completed
   - Update actual revenue
   - IT department revenue auto-calculated: ₹15,000
   - Performance metrics updated

## 🎉 Benefits

✅ **Complete Visibility**: Track all IT work in one place
✅ **Revenue Transparency**: Know exactly how much IT generates
✅ **Performance Insights**: Data-driven performance reviews
✅ **Better Planning**: Capacity and resource planning
✅ **Accountability**: Clear ownership and responsibility
✅ **Efficiency**: Streamlined workflows and processes

---

**For detailed implementation guide, see `/it-domain-upgrade.md`**
