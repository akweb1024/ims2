# Employee List - Quick Reference Guide

## 📍 Location

**Path:** `/dashboard/hr-management` → **Employees Tab**

---

## 🎯 New Features Overview

### 1. **Enhanced Employee Information Display**

The employee list now shows **7 key data points** for each employee:

| Column | Description | Example |
|--------|-------------|---------|
| **Employee** | Name, email, and status | John Doe<br/><john@company.com><br/>🟢 Active |
| **Designation** | Job title and role | Senior Developer<br/>`EXECUTIVE` |
| **Company** | Company name | Tech Solutions Inc. |
| **Department** | Department name | Engineering |
| **Joining Date** | Date of joining | 15-Jan-2024 |
| **Salary** | Annual salary | ₹12,00,000<br/>Annual |
| **Score** | Monthly performance | **85** (Jan/2026) |

---

## 🎨 Performance Score Color Guide

The monthly score is color-coded for quick assessment:

- 🟢 **80-100** = Excellent Performance (Green)
- 🔵 **60-79** = Good Performance (Blue)
- 🟡 **40-59** = Average Performance (Yellow)
- 🔴 **0-39** = Needs Improvement (Red)

---

## 🔍 Filtering & Search

### Search Bar

- Search by **name**, **email**, or **designation**
- Real-time filtering as you type
- Case-insensitive search

### Filter Options

1. **Role Filter** - Filter by user role (Executive, Manager, Admin, etc.)
2. **Designation Filter** - Filter by job designation
3. **Status Filter** - Filter by Active/Inactive status

### View Modes

- **List View** 📋 - Detailed table with all columns
- **Grid View** 🎴 - Card-based layout for better mobile experience

---

## 🎯 Actions Available

For each employee, you can:

1. **✏️ Edit** - Modify employee profile
2. **⭐ Review** - Submit performance review
3. **🗑️ Delete** - Deactivate employee account
4. **👁️ View Profile** - See complete employee details

---

## 📊 Understanding the Score

The **Score** column shows:

- **Number** (0-100): Overall monthly performance score
- **Month/Year**: The period for which the score was calculated

### Score Components

The overall score is calculated from:

- Attendance (punctuality, presence)
- Task completion rate
- Work report submission
- Manager ratings
- Revenue generation
- Quality of work

### No Score Available?

If you see **0** or **N/A**, it means:

- Employee is new (no performance data yet)
- Performance snapshot hasn't been generated for current month
- Employee hasn't completed any trackable work

---

## 💡 Tips & Best Practices

### For HR Managers

1. **Regular Monitoring** - Check scores weekly to identify trends
2. **Early Intervention** - Reach out to employees with yellow/red scores
3. **Recognition** - Acknowledge employees with consistent green scores
4. **Fair Comparison** - Compare scores within same department/role

### For Department Heads

1. **Team Overview** - Use department filter to see your team
2. **Performance Trends** - Track score changes month-over-month
3. **Resource Planning** - Use joining dates for tenure analysis
4. **Salary Reviews** - Reference scores during increment discussions

### For Admins

1. **Company-wide View** - Monitor all employees across departments
2. **Data Export** - Use for reports and presentations
3. **Onboarding Tracking** - Filter by recent joining dates
4. **Budget Planning** - Analyze salary distribution

---

## 🚀 Quick Actions Guide

### To Find High Performers

1. Sort by Score (highest first)
2. Look for consistent green scores (80+)
3. Check their department and role
4. Consider for promotions/rewards

### To Identify Training Needs

1. Filter by yellow/red scores (below 60)
2. Group by department
3. Identify common patterns
4. Plan targeted training programs

### To Review New Hires

1. Sort by Joining Date (newest first)
2. Check their initial scores
3. Monitor onboarding progress
4. Provide early support if needed

### To Analyze Salary Distribution

1. Sort by Salary
2. Compare with designation levels
3. Identify outliers
4. Plan salary normalization

---

## 🔒 Access Levels

Different roles see different data:

| Role | Can See | Can Do |
|------|---------|--------|
| **SUPER_ADMIN** | All employees, all companies | Full access to all actions |
| **ADMIN** | Company employees only | Edit, review, manage within company |
| **HR_MANAGER** | Company employees only | Edit profiles, manage HR data |
| **MANAGER** | Direct reports only | Review, view performance |
| **TEAM_LEADER** | Team members only | View, limited actions |

---

## 📱 Mobile Usage

### List View on Mobile

- Horizontal scroll enabled
- All columns accessible
- Tap to view full details

### Grid View on Mobile

- Optimized card layout
- No scrolling needed
- Tap cards for actions

**Recommendation:** Use Grid View on mobile devices for better experience.

---

## ❓ Troubleshooting

### "N/A" in Company/Department?

- Employee might not be assigned to a company/department
- Contact admin to update employee profile

### Score shows "0"?

- No performance data available yet
- Wait for monthly snapshot generation
- Check if employee has submitted work reports

### Can't see all employees?

- Check your role permissions
- You might only have access to specific employees
- Contact admin for access expansion

### Filters not working?

- Clear browser cache
- Refresh the page
- Try different filter combinations

---

## 🎓 Training Resources

### For New Users

1. Watch the employee management tutorial
2. Review the HR dashboard guide
3. Practice with test data
4. Ask questions in the help channel

### For Managers

1. Performance review best practices
2. Score interpretation guide
3. Team management workflows
4. Monthly reporting procedures

---

## 📞 Support

Need help? Contact:

- **HR Team:** <hr@company.com>
- **IT Support:** <support@company.com>
- **Admin:** <admin@company.com>

---

**Last Updated:** 2026-01-17  
**Version:** 2.0  
**Feature:** Enhanced Employee List with Performance Scores
