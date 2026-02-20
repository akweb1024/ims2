1. Updated Role-Based Access Control (RBAC)

First, define a strict Salary Visibility Matrix. This is a system-level restriction that overrides standard page layouts.

    Restricted Data: Current Salary, Annual CTC, Bonus/Variable Pay, Increment History.

    Authorized Roles: * Admin / Super Admin: Full visibility and configuration.

        HR: Visibility for payroll processing and records.

        Account: Visibility for salary disbursement and tax calculations.

        Managing Director (MD): Oversight and final approval visibility.

    Restricted Roles (Managers & Others):

        Managers can see Increment % during the proposal phase but cannot see the base salary or the calculated final amount unless they fall into the categories above.

        General employees have no access to others' salary data.

2. The Increment Proposal & Approval Workflow

The new logic shifts the responsibility of initiation to the Reporting Manager while maintaining control at the upper levels.
Phase 1: Proposal (Manager)

    Action: Manager opens the "Performance/Increment" tab for their direct reports.

    Interface: The Manager sees a field to enter a Proposed Increment (%).

    Logic: The system should NOT display the Current Salary. It only allows the manager to input a percentage based on performance metrics (KPIs) as per ITBREAK policy.

    Validation: Ensure the % falls within the "ITBREAK Final" guidelines (e.g., standard range 5%–15%, anything higher triggers a "Special Justification" requirement).

Phase 2: Review (HR Module)

    Action: HR receives the proposal.

    Interface: HR sees the Current Salary, Proposed %, and the Calculated New Salary.

    Task: HR validates the proposal against the company budget and policy alignment. HR can add comments or flag inconsistencies.

Phase 3: Approval (Upper Designation / MD)

    Action: The proposal moves to the next level (VP, Director, or MD).

    Interface: Full visibility of salary impact.

    Status Transitions: Pending → Under Review → Approved or Rejected/Returned.

    Auto-Update: Once the MD/Upper Role clicks "Approve," the system should automatically update the Employee’s Master Record with the new salary and set the "Effective Date."

3. Policy Integration (ITBREAK Final)

Ensure the module enforces these specific rules from your policy document:

    Probation Check: Prevent increment proposals for employees currently on probation or who have not completed the minimum tenure (usually 6 or 12 months) as specified in the ITBREAK manual.

    Performance Rating Linkage: The "Proposed %" field should ideally be locked or guided by the employee's Performance Rating (e.g., Rating 'A' = 10-12%, Rating 'B' = 7-9%).

    Notice Period Restriction: If an employee is serving their notice period, the "Propose Increment" button should be disabled.

4. Technical Implementation Notes

    Database Level: Use "Views" or specific API endpoints for Salary data that check for the user's role before returning data. Never send salary fields to the frontend for a "Manager" role.

    Audit Trail: Every increment proposal, change in percentage, and approval action must be logged with a timestamp and UserID for audit purposes.

    Notifications: Send automated emails/system alerts to HR when a manager submits a proposal, and to the Manager once the final approval is granted (without disclosing the final figure if they are not authorized).