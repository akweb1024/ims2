---
description: Upgrade Company Page with Advanced Analytics & Visuals
---

# Company Analytics & Visuals Upgrade Plan

## 1. Backend: Analytics APIs
Create dedicated endpoints to aggregate scattered data into consumable metrics.

### A. Company Growth API `GET /api/analytics/company/growth`
**Purpose**: Track financial health and forecasting.
**Metrics**:
- **Revenue**: Aggregated from `Invoice` (paid) and `Subscription` (active value).
- **Expenses**: Aggregated from `SalarySlip` (payroll) and `DepartmentBudget` (operations).
- **Net Profit**: Revenue - Expenses.
- **Trend**: Monthly breakdown for the last 12 months.
- **Forecast**: Simple linear projection for next 3 months.

### B. Employee Performance API `GET /api/analytics/company/employees`
**Purpose**: Track workforce productivity and advice on appraisals.
**Metrics**:
- **Productivity Score**: Derived from `WorkReport` (tasks completed, revenue generated).
- **Retention**: Average tenure.
- **Increment Advisor**: List of employees due for appraisal based on:
  - Last increment date > 1 year.
  - Performance rating > 4/5.
  - KPI achievement > 90%.

## 2. Frontend: Company Dashboard Upgrade (`src/app/dashboard/company/page.tsx`)
Refactor the existing page to a Tab-based layout.

### Tabs Structure:
1.  **Overview (New)**:
    - **Hero Cards**: Total Revenue, Net Profit, Active Employees, Growth Rate.
    - **Main Chart**: Revenue vs Expense vs Profit (Line/Area Chart).
    - **Forecasting**: "Predicted Growth" section.
2.  **Workforce Intelligence (New)**:
    - **Talent Grid**: Scatter plot of Performance vs Potential (Tenure/Engagement).
    - **Increment Advisor Table**: AI-suggested list of employees deserving raises with recommended %.
    - **Department Performance**: Bar chart comparing department efficiency.
3.  **Details (Existing)**:
    - The current view (Company Info, Departments, Staff List) moves here.

## 3. Visualization Components (Recharts)
- `GrowthChart`: Area chart for financial trends.
- `DepartmentPieChart`: Budget distribution.
- `PerformanceRadar`: For individual employee deep-dive (optional).

## 4. Implementation Steps
1.  **Create API Routes**: Implement the aggregation logic in `src/app/api/analytics/...`.
2.  **Create UI Components**: Build `CompanyAnalyticsOverview` and `WorkforceAnalytics`.
3.  **Refactor Page**: Integrate new components into `CompanyPage` with tabs.
4.  **Styling**: Apply "Glassmorphism" and premium UI cards as per guidelines.

## 5. Risk Mitigation
- **Data Privacy**: Ensure managers only see their team's data (using `authorizedRoute`).
- **Performance**: Cache heavy aggregation queries or optimize Prisma queries with `groupBy`.
