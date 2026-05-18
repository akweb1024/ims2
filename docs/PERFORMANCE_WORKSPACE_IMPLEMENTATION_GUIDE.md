# Performance Workspace Implementation Guide

## Purpose

This guide defines the standard way to run employee performance management in `ims` using the unified Performance Workspace.

It replaces fragmented usage across older pages for goals, KPIs, and tasks.

## Standard Workflow

Always follow this sequence:

1. Goal
2. KPI
3. Task Template
4. Monthly Review

### Definitions

- **Goal**: Outcome expected from the employee in a time period.
- **KPI**: Numeric metric used to track the goal.
- **Task Template**: Repeatable execution block that supports KPI achievement.
- **Monthly Review**: Consolidated result with score/grade and completion trends.

## Where To Use

- Main page: `/dashboard/performance/workspace`
- Help page: `/dashboard/performance/workspace/help`

## Role-wise Usage

### Managers / HR

1. Create or update goals in the Goals tab.
2. Configure KPIs in the KPI tab with period, unit, target, and current value.
3. Create reusable task templates in Task Templates tab.
4. Assign employee-specific templates only when needed.
5. Use Monthly Review to evaluate cycle performance and adjust next cycle targets.

### Employees

1. Understand assigned goals and KPI targets.
2. Execute work aligned with active task templates.
3. Track KPI progress regularly.
4. Review monthly score/grade and discuss course corrections.

## Quick Filters (Implemented)

Each tab includes top filters for fast operations:

- Employee
- Period
- Status

Additional behavior:

- **Clear Filters** button per tab resets all filters to default.
- Filter + tab state persists in URL query params and survives refresh/navigation.

## Governance Rules

- Do not duplicate the same objective across multiple records.
- Prefer reusable templates to reduce maintenance overhead.
- Update KPI targets at cycle boundaries unless exception is approved.
- Use Monthly Review outputs as decision inputs for next-cycle planning.

## Troubleshooting

- If records are missing, verify filters before troubleshooting APIs.
- If save fails, check required fields and non-negative numeric values.
- If access differs by user, review role permissions and company scope.

## Implementation Notes

### Workspace UI

- `src/app/dashboard/performance/workspace/page.tsx`

### Canonical APIs Used

- Goals: `/api/hr/performance/goals`
- KPIs: `/api/hr/performance/kpis`
- Task Templates: `/api/hr/tasks`
- Monthly Review: `/api/hr/performance/monthly`
- Employees list: `/api/hr/employees`

### Help Section Integration

- `src/components/dashboard/hr/HelpSidebar.tsx`
  - Added contextual help entries for:
    - `goals`
    - `tasks`
    - `analytics`
  - Added direct link to module documentation page.

- `src/app/dashboard/performance/workspace/help/page.tsx`
  - Added in-app full guide for team onboarding and standard process adoption.

