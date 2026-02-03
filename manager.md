Role: Act as a Senior Backend Architect and Node.js/TypeScript Developer.

Context: I have an existing multi-functional backend application built with Node.js and TypeScript. The system currently manages HR, Staff, Companies, and Accounts.

Current Architecture: Multi-tenant (supports multiple companies).

Current User Model: Users are associated with specific companies.

The Objective: I need to design and implement a new "Unified Team Management Module". This module is specifically for Managers. The critical requirement is that a Manager must be able to view and manage their team members' data (Attendance, Leaves, KPI, Salary, etc.) across multiple companies from a single dashboard, without switching the company context/session.

Specific Features to Implement: Please provide the code structure, database schema updates, and API endpoints for the following:

Unified Manager Dashboard:

Ability to query data for all assigned team members, regardless of which company_id the team member belongs to.

Constraint: A team member may belong to Company A and Company B. The Manager should see a consolidated view or clearly labeled separated view of both without logging out/in.

Management Functions (CRUD):

Attendance: View logs and approve/reject regularization requests.

Work Reports: View daily/weekly reports submitted by the team.

Payroll & Increments: View salary structure and propose increments.

Performance (KRA/KPI): Set goals and conduct reviews.

Leave Management: View leave balances and approve/reject leave requests.

Technical Constraints & Requirements:

Non-Destructive Integration: You must not alter or break existing functional modules (HR, Staff, Accounts). This must be an additive module.

Data Integrity: Ensure that when a Manager updates a record (e.g., approves leave), the change is correctly reflected in the specific Company database/record where that user belongs.

Authentication/Authorization: Explain how middleware will verify that this Manager has rights to view User X's data in Company Y, even if the Manager is currently "logged in" to Company Z.

Type Safety: Ensure strict TypeScript typing for all new interfaces.

Deliverables:

Database Schema Changes: (e.g., How to link Managers to Users across companies—is it a specialized Team table or a ReportingManager relationship?).

API Strategy: RESTful endpoints for the unified view.

Sample Code: A controller and service example for the "Unified Attendance View."

Key Technical Considerations for You
Since you mentioned you are handling server configuration and backend logic, here are two areas to watch out for when the AI generates the code:

1. The "Many-to-Many" Complexity Standard systems usually filter everything by WHERE company_id = active_company. Your requirement breaks this rule.

The Solution: The logic will likely require a "Global Manager Table" or a recursive relationship where permissions are checked against a list of IDs rather than a single ID.

Example: Instead of checking if (user.company == manager.company), the system must check if (manager.managed_user_ids.includes(user.id)).

2. API Response Structure Because one employee might be in two companies, the frontend needs to know which "version" of the employee the manager is looking at.

Tip: Ensure the API response includes the company_name or company_id alongside the employee name so the manager knows, "Ah, this is John's attendance for the Logistics company, not the Marketing company."