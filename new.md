# Developer Prompt — Goals & KRA Module (Creation → Assignment → Employee Update → Verification)

> Paste this whole brief to the developer. It specifies a Goals + KRA performance
> system. It is stack-agnostic, but where it says "reference behaviour" that is the
> exact behaviour to replicate. Adapt model/field names to your ORM and framework.

---

## 1. What we are building (mental model)

There are **two related but distinct things**. Do not merge them.

1. **KRA (Key Result Area)** — the *annual performance framework* for an employee.
   - 5–7 weighted KRAs per employee, each tagged to one of 6 **dimensions**:
     `OUTPUT | QUALITY | TAT | COLLABORATION | IMPROVEMENT | BEHAVIOR`.
   - Weights are percentages and an employee's active KRAs should sum to ~100.
   - KRAs change rarely. They drive **quarterly performance ratings** (A+…D), not
     daily work.

2. **Goal / Task** — a *concrete, time-boxed target* an employee actually works on.
   - Has a **period**: `DAILY | WEEKLY | MONTHLY | QUARTERLY | HALF_YEARLY | YEARLY`.
   - Has a numeric **target** + **metric** (e.g. 40 "articles"), optional **dailyTarget**.
   - Employee logs **daily progress entries** against it, attaches **proof**, then
     **submits for verification**. A 2-step **TL → Manager** approval follows.

KRAs answer *"how is this person measured this year?"*; Goals answer *"what must they
deliver this month/quarter, and did they?"*.

---

## 2. Roles & permission ranks

Single rank ladder (higher number ⇒ more power):

```
EMPLOYEE(1) < TEAM_LEAD(2) < MANAGER(3) < DIRECTOR(4) < ADMIN(5)
```

Rules used throughout:
- `requireRole(atLeast)` — action allowed only if actor's rank ≥ atLeast.
- **Company scoping:** MANAGER may only act on employees in their **own company**
  (resolved via employee → department → company). DIRECTOR and above are
  **group-wide** (bypass company scope). Implement two guards:
  - `assertCompanyScope(actor, companyId)` — throw unless actor is DIRECTOR+ or
    actor's company == target company.
  - `assertManagerScope(actor, employeeId)` — resolve the employee's company, then
    delegate to `assertCompanyScope`.

Who can do what:

| Action | Min role |
|---|---|
| Create / assign **KRA** to an employee | MANAGER (+ scope) |
| Delete a KRA | MANAGER (+ scope) |
| Save quarterly **rating** from KRAs | MANAGER (+ scope) |
| **HR-moderate** / override a rating | ADMIN |
| Assign a **goal** (manual) | MANAGER (+ scope) |
| **Populate goals** from templates | MANAGER (+ scope) |
| Create a **goal template** | ADMIN |
| **Log progress / submit / delete own log** | EMPLOYEE (own goals only) |
| **TL-verify** a submitted goal | TEAM_LEAD |
| **Manager-verify** a TL-verified goal | MANAGER |

Ownership rule for employee actions: an employee may only touch a goal where
`goal.employeeId == currentUser.id`. Enforce on the server for **every** mutation.

---

## 3. Data model

```
User
  id, name, email, role, departmentId
  baseSalary / pay fields, revenueTarget   (optional, for revenue goals)

Department
  id, name, companyId
  revenuePerUnit, revenueSource             (dept-level fallback rate, see §7)

KRA
  id
  employeeId  -> User (cascade delete)
  title       string
  dimension   "OUTPUT" | "QUALITY" | "TAT" | "COLLABORATION" | "IMPROVEMENT" | "BEHAVIOR"  (default OUTPUT)
  weight      int (percent; active KRAs ~sum to 100)
  active      bool (default true)
  createdAt

GoalTemplate                  (reusable blueprint, per department + period)
  id, title, description, period, metric, target, dailyTarget
  departmentId?               (which dept this applies to)
  appliesToRole?              (optional jobTitle/role filter)
  brandId?, productId?        (optional product-line tagging — drop if not needed)
  createdAt

Goal
  id, title, description
  period, metric, target, dailyTarget
  progressValue   float (kept as SUM of its logs — see §6)
  progressPercent float (0..100, derived)
  status          "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "TL_VERIFIED" | "MANAGER_VERIFIED" | "REJECTED"  (default PENDING)
  periodStart, periodEnd, dueDate   (datetime; derived from period — see §8)
  employeeId    -> User (assignee)
  assignedById  -> User (who assigned)
  templateId?   (if created from a template)
  brandId?, productId?              (optional)
  revenuePerUnit float (default 0; >0 = auto-revenue — see §7)
  revenueSource  string
  createdAt, updatedAt

ProgressLog                   (one dated work entry, e.g. "+2 today")
  id
  goalId   -> Goal (cascade delete)
  value    float
  note     string
  date     datetime (defaults now; employee may backdate)
  createdAt
  index on (goalId, date)

Proof                         (evidence attached on submit)
  id, goalId -> Goal (cascade)
  type  "FILE" | "LINK" | "NOTE"
  url, note
  createdAt

Verification                  (one row per approval/rejection step)
  id, goalId -> Goal (cascade)
  level     "TL" | "MANAGER"
  verifierId -> User
  status    "APPROVED" | "REJECTED"
  comment
  createdAt

PerfRating                    (quarterly, derived from KRAs)
  id, employeeId -> User, raterId -> User
  year int, quarter int       (Indian FY — see §8)
  kraAchievement  string/json  { kraId: achievementPercent }
  weightedScore   float (0..100)
  rating          "A+" | "A" | "B+" | "B" | "C" | "D"
  managerComments, hrModeration
  status   "SUBMITTED" | "HR_MODERATED" | "FINAL"
  unique (employeeId, year, quarter)

Notification
  id, userId -> User, type, message, link, read(bool), createdAt
```

---

## 4. KRA creation & assignment

KRAs are created **directly per employee** (no template layer required, though
new-hire auto-provisioning seeds a default set — see §9).

**`addKra(employeeId, title, dimension, weight)`** — role MANAGER + `assertManagerScope`:
- Validate `dimension` is one of the 6 allowed values; reject otherwise.
- Validate non-empty title.
- Create the KRA (`active: true`).

**`deleteKra(kraId)`** — role MANAGER: load KRA, `assertManagerScope(actor, kra.employeeId)`,
then delete.

UI: on a per-employee Performance screen, list the employee's KRAs (title, dimension,
weight) with a delete button each, plus an "add KRA" form (title + dimension dropdown +
weight). Show a running **sum of weights** and warn if it isn't ~100%.

---

## 5. Goal creation & assignment (three paths)

### 5a. Manual single assignment — `assignGoal(...)`  (MANAGER + scope)
Inputs: `employeeId, title, period, target, dailyTarget, metric, revenuePerUnit?,
revenueSource?, brandId?, productId?`.
Steps:
1. Validate: employeeId present, title non-empty, period is one of the 6.
2. `assertManagerScope(manager, employeeId)`.
3. If a `productId` is given, look up its brand and set `brandId` from it (product
   implies brand).
4. Derive `{ start, end }` from `period` (see §8). Set `periodStart=start`,
   `periodEnd=end`, `dueDate=end`.
5. Create the goal with `status: "PENDING"`, `assignedById = manager.id`.
6. **Notify** the employee: `New {period} goal assigned: "{title}"` linking to /goals.

### 5b. Bulk from templates — `populateFromTemplates(departmentId, period)`  (MANAGER + scope)
1. Validate department + period; `assertCompanyScope(manager, dept.companyId)`.
2. Load all `GoalTemplate` for that `(departmentId, period)` **and** all `EMPLOYEE`-role
   users in that department.
3. For **every (template × employee)** pair, build a goal (copy title, description,
   metric, target, dailyTarget, brand/product; set period range; `status: PENDING`,
   `templateId = template.id`, `assignedById = manager.id`).
4. Bulk-create. (Reference does a single `createMany`.)

### 5c. Template management — `createGoalTemplate(...)`  (ADMIN)
Create a `GoalTemplate` (title, period, departmentId?, target, dailyTarget, metric,
description, brand/product?). Templates are the blueprint that 5b and §9 expand.

---

## 6. Employee update flow (the core daily loop)

All actions below require the goal to be **owned by the current user**.

**`logProgress(goalId, value, note?, date?)`**
- Reject if not owner or `value` is falsy.
- Create a `ProgressLog { goalId, value, note, date: date || now }`. (Employee may
  backdate.)
- **Recompute goal progress** (see helper below).
- If revenue is configured, also create a revenue entry (see §7).

**`deleteLog(logId)`** — owner-only: delete the log (its linked revenue cascades away),
then recompute progress.

**`recomputeGoalProgress(goalId)`** — the single source of truth for progress:
```
done = SUM(value) of all ProgressLog for this goal
pct  = target > 0 ? min(100, done/target * 100) : 0
update goal: progressValue = done,
             progressPercent = pct,
             status = (status == "PENDING") ? "IN_PROGRESS" : status
```
> Important: `progressValue` is **always** the sum of logs — never increment it
> directly. Deleting a log must lower the total. Logging moves PENDING → IN_PROGRESS
> automatically, but never overrides SUBMITTED/VERIFIED/REJECTED.

**`submitGoal(goalId, proofUrl?, proofNote?)`** — owner-only:
- In one transaction: set goal `status = "SUBMITTED"` **and** create a `Proof`
  (`type = "LINK"` if a url was given else `"NOTE"`).
- This hands the goal to the verification queue.

UI for the employee ("My Goals"): for each goal show title, period badge, status badge,
progress bar (`progressValue/target metric` + %), a **pace rollup** (remaining, needed
per remaining day, your pace/day, on-track vs behind), today/week/month/quarter output
sums, the daily-log chips (with delete ×), and — **only when status ∈
{PENDING, IN_PROGRESS, REJECTED}** — the "log work" and "submit for verification" forms.
Once SUBMITTED or verified, editing is locked.

---

## 7. Optional: auto-revenue from progress (drop if not relevant)

If a goal has `revenuePerUnit > 0` (or falls back to its department's `revenuePerUnit`),
then on each `logProgress` also create a `RevenueEntry`:
- `amount = value * rate`, `source = goal.revenueSource || dept.revenueSource || goal.title`,
  `broughtById = employee`, carry `brandId/productId`, and link `progressLogId` so the
  revenue **cascades away** if the log is deleted.
This lets output goals (e.g. "publish N articles at ₹X APC each") auto-feed revenue.

---

## 8. Periods & Indian Financial Year

Implement `getRange(period, ref = now)` returning `{ start, end, label }`:
- **DAILY** → start/end of `ref`'s day.
- **WEEKLY** → Monday 00:00 to Sunday 23:59 of `ref`'s week.
- **MONTHLY** → 1st to last day of `ref`'s month.
- **QUARTERLY / HALF_YEARLY / YEARLY** → use the **Indian FY (April–March)**:
  - FY start year = `month >= April ? year : year-1`.
  - Quarters: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar.
  - Halves: H1 Apr–Sep, H2 Oct–Mar.
  - Yearly: 1 Apr (FY start) → 31 Mar (next year).
- Labels like `"Q3 FY 2026-27"`, `"H1 FY 2026-27"`, `"FY 2026-27"`.

`periodStart/periodEnd/dueDate` on a goal are computed from this at assignment time. The
quarterly rating (§10) keys on `(FY-start-year, quarter)`.

---

## 9. New-hire auto-provisioning (idempotent)

When an employee is hired/created, call `provisionEmployee(userId, assignerId)`:
- **KRAs:** if the employee has **zero** KRAs, create the default 6-KRA set:
  ```
  OUTPUT 30%  (title is department-specific, e.g. "Publish target articles")
  QUALITY 20% | TAT 15% | COLLABORATION 15% | IMPROVEMENT 10% | BEHAVIOR 10%
  ```
  (Weights sum to 100.) Pick the OUTPUT title from a department→title map; fall back to
  a generic "Achieve role deliverables target".
- **Goals:** if the employee has **zero** assigned goals and has a department, expand
  that department's `GoalTemplate`s into goals (fall back to same-named department's
  templates in another company if none). Skip a template if an identical goal already
  exists for this period (dedupe on `employeeId + templateId + periodStart`).
- Idempotent: only fills what's missing, safe to call repeatedly.

---

## 10. Verification flow (2-step) & quarterly rating

### Verification — sequential, status-guarded
A shared `record(goalId, level, verifierId, approve, comment, newStatusOnApprove)`
helper does, in one transaction: create a `Verification` row + set goal status to
`newStatusOnApprove` (on approve) or `"REJECTED"` (on reject); then notify the employee.

- **`tlVerify(goalId, decision, comment?)`** — TEAM_LEAD. Guard: goal must currently be
  `SUBMITTED`, else throw `INVALID_STATE`. Approve → `TL_VERIFIED`; reject → `REJECTED`.
- **`managerVerify(goalId, decision, comment?)`** — MANAGER. Guard: goal must currently
  be `TL_VERIFIED`. Approve → `MANAGER_VERIFIED` (final); reject → `REJECTED`.

A REJECTED goal becomes editable again (see §6 lock rule) so the employee can fix and
resubmit. The /verify screen lists goals at the appropriate stage for the viewer's role.

### Quarterly rating from KRAs — `saveRating(...)`  (MANAGER + scope)
1. Load the employee's **active** KRAs.
2. For each KRA read its **achievement %** (clamp 0..150).
3. `weighted = Σ (weight/100 × achievement)`, `totalWeight = Σ weight`.
4. Normalise: `weightedScore = totalWeight > 0 ? weighted*100/totalWeight : 0` (so the
   score is a fair 0..100 even if weights don't sum to exactly 100).
5. Map score → letter via `ratingFromScore` (A+ / A / B+ / B / C / D bands).
6. **Upsert** `PerfRating` on `(employeeId, year, quarter)` with the achievement JSON,
   score, rating, comments, `status: "SUBMITTED"`. Notify the employee.

**`moderateRating(ratingId, hrModeration, ratingOverride?)`** — ADMIN: set
`status: "HR_MODERATED"`, optionally override the letter rating.

---

## 11. Notifications
Every assignment/verification/rating event creates an in-app `Notification` for the
affected employee with a `message`, a `link` (e.g. `/goals`, `/performance`), and a
`type` tag. Mark-as-read on view.

---

## 12. Acceptance criteria (definition of done)

1. Manager can add/delete weighted KRAs for an in-scope employee; out-of-scope is
   rejected server-side.
2. Manager can assign a goal manually **and** bulk-populate a department from templates;
   admin can manage templates.
3. New hire automatically receives the default 6 KRAs and their department's template
   goals, idempotently.
4. Employee can log dated progress; `progressValue` always equals the **sum of logs**;
   deleting a log lowers it; first log flips PENDING → IN_PROGRESS.
5. Employee can submit with proof; goal locks for editing until rejected.
6. TL → Manager verification is strictly sequential and status-guarded; rejection
   reopens the goal; each step notifies the employee.
7. Quarterly rating computes a normalised 0–100 weighted score → letter grade, upserts
   per (employee, FY-quarter), and supports HR moderation/override.
8. All period math uses the Indian FY (Apr–Mar) for quarter/half/year.
9. Every mutation re-checks role + ownership/scope on the server (never trust the client).
```
```
