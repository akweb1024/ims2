# 📊 Dashboard: Who Sees What?

You asked: *"Why the dashboard is not for everyone?"*

Actually, the dashboard **IS** designed for everyone, but recent bugs (now fixed) might have blocked access. Here is exactly what each role sees after the fix:

## 1. 👥 Customers & Agencies
- **Stats:** Active Subscriptions only for *their* account.
- **Widgets:** "My Subscriptions", "Open Tickets", "Enrolled Courses".
- **Actions:** Request New Subscription.

## 2. 👔 Sales Executives
- **Stats:** Subscriptions & Revenue linked to *their* sales.
- **Data:** Only Customers assigned to them.
- **Widgets:** Sales Targets, Commission (if enabled).

## 3. 🏢 Managers & Team Leaders
- **Stats:** Aggregated data for their **entire team/company**.
- **Data:** All Sales Executives under them.
- **Widgets:** Global Revenue, Logistics, Team Performance.

## 4. 👷 Employees (Staff)
- **Stats:** **HR Portal** focuses on Attendance, Leaves, and Work Reports.
- **Widgets:** "Checked In/Out", "Pending Leaves", "Daily Report".

## 🛠️ Why it might have failed?
Before my latest fix (`cef93e8`), the API was rejecting the "Session Cookie". This meant that although users could log in, the **Dashboard Data** API would fail, showing an error or empty screen.
**Solution:** Redeploy the app. The fix ensures the Dashboard loads correctly for ALL roles.
