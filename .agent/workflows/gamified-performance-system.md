---
description: Implement Gamified Employee Performance System with Task Points
---

# Gamified Performance System Implementation

1. **Schema Updates**
   - Create `EmployeeTaskTemplate` model to store predefined tasks with point values.
   - Create `EmployeePointLog` model to track history of all points earned (Work, Attendance, etc.).
   - Update `WorkReport` to store `pointsEarned` and `tasksSnapshot`.

2. **Backend API Development**
   - `PUT /api/hr/tasks`: API to Create/Update/Delete task templates.
   - `GET /api/hr/tasks`: Fetch tasks (filterable by department/designation).
   - Update `POST /api/staff/work-reports`:
     - Accept list of completed task IDs.
     - Calculate total points based on current template values.
     - Save `WorkReport` with points.
     - Create `EmployeePointLog` entry for the work report.
   - `POST /api/hr/points/award`: Endpoint for HR to manually award/deduct points (Discipline, Extra Achievement).

3. **Frontend Implementation - HR Dashboard**
   - Add "Task Master" tab in HR Management.
   - Interface to Add/Edit Task Templates to assigning points to specific jobs.
   - Add "Points & Rewards" tab to view Employee Point Logs and manually award points.

4. **Frontend Implementation - Staff Portal**
   - Redesign `SubmitWorkReport` form.
   - Fetch relevant task templates for the logged-in employee's role.
   - Render as a checklist with point values.
   - Auto-calculate "Today's Score" as they check items.

5. **Automation (Optional/Later)**
   - Trigger points on Attendance Check-out (e.g., On-time = +5).
