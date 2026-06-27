# KRA & Work-Report Upgrade — Design & Implementation Plan

> Goal: Har employee ke liye department-aware, metric-based KRA banao jisse unke
> monthly/quarterly/yearly targets clearly dikhein, woh apne assigned kaam par focus karein,
> report mein diya data validate ho aur automatically target mein count ho, aur sabka
> apna Performance Index dikhe.

Status: **DESIGN — review pending**. Decisions locked with stakeholder:
- Validation = **Hybrid** (system auto-verify jahan source ho) **+ Manager approval**.
- KRA assignment = **Department/Designation template + per-employee tweak**.
- Performance Index = **Achievement% + Attendance/Discipline + Manager Rating + KRA Focus**.

---

## 1. Problem & current state

### Aaj kya hai (foundation — reuse karenge)
- Org: multi-company, `Department`, `Designation` (`kra` text field), `User`/`EmployeeProfile`, manager hierarchy (`managerId`, `TeamMember`).
- KRA/Goals: `EmployeeGoal` (MONTHLY/QUARTERLY/HALF_YEARLY/YEARLY, `targetValue`, `currentValue`, `achievementPercentage`), `EmployeeKPI`, `GoalEvaluation`.
- Reports: `WorkReport` — numeric fields (`revenueGenerated`, `tasksCompleted`, `ticketsResolved`, `chatsHandled`, `followUpsCompleted`), `kraMatchRatio`, points, manager approval (`PATCH` → APPROVED/REJECTED), `RevenueClaim` ↔ real `RevenueTransaction`.
- Index: `MonthlyPerformanceSnapshot` (`attendanceScore`, `taskCompletionRate`, `averageManagerRating`, `revenueAchievement`, `overallScore`, `performanceGrade`).

### Gaps (yahi upgrade karna hai)
1. **KRA free-text string hai** — department-specific *countable metrics* (articles published, journal issues, subscriptions sold, courses sold, tickets resolved…) structured form mein nahi.
2. **Report ka data target mein auto-rollup nahi hota** — "5 articles publish kiye" likhne se monthly target progress automatically nahi badhta.
3. **Validation incomplete** — generic numbers (`tasksCompleted` etc.) ka system source-of-truth se verification nahi.
4. **Focus enforcement missing** — kuch clearly nahi dikhata "yeh tumhara kaam hai, ispe focus karo"; off-KRA kaam target/index ko same treat karta hai.

---

## 2. Core concept

KRA ko ek **structured metric catalog** banao. Har department/designation ke liye ek **KRA template** (metrics + default targets + weights). Template employee par apply ho ke **per-period EmployeeGoal** banata hai (per-employee tweakable). Report mein employee apne assigned metrics ke against value deta hai → har value ek **MetricContribution** (validation ledger) banti hai → validate hone par **verifiedValue** goal ke `currentValue` mein roll up hoti hai → in sabse **PerformanceIndex** compute hota hai.

```
KraMetric (catalog)
   └─ KraTemplate (per dept/designation) ── KraTemplateItem (metric + default target + weight)
            │ apply (per period, tweak targets)
            ▼
      EmployeeGoal (per-employee per-period KRA target)  ◄── currentValue auto-rolled
            ▲
            │ verifiedValue sum
      MetricContribution (ledger: reported → validated)  ◄── from WorkReport submit
            │
            ▼
      PerformanceIndex (monthly/quarterly/yearly composite score)
```

---

## 3. Data model changes

### 3.1 EXTEND existing `PerformanceMetricDefinition` (metric catalog) — do NOT create new
> ⚠️ Self-review correction: `PerformanceMetricDefinition` (schema.prisma:2977) already exists
> and is used by the performance-observability subsystem. It already has
> `companyId, key, name, unit, direction, sourceModule, warningThreshold, criticalThreshold,
> metadata (json), isActive, scope`. We **reuse this as the unified metric catalog** instead of a
> duplicate `KraMetric`. Add only the KRA-specific columns below (or stash in `metadata` to avoid
> touching observability):

| add field | type | notes |
|---|---|---|
| dataSource | enum | `SYSTEM` \| `MANUAL` \| `HYBRID` (validation mode) |
| sourceType | enum? | auto-verify hook: `REVENUE_TRANSACTION`, `PUBLICATION_ARTICLE`, `JOURNAL_ISSUE`, `SUPPORT_TICKET`, `COURSE_SALE`, `SUBSCRIPTION`, `DISPATCH`, `INVOICE`… (null for pure MANUAL) |
| aggregation | enum | `SUM` \| `COUNT` \| `AVG` (period rollup) |
| department | string? | tag for template suggestions (use existing `scope` if it fits) |

Existing `key/name/unit/direction/sourceModule/isActive/metadata` map 1:1 to what `KraMetric` needed.

### 3.2 New: `KraTemplate` + `KraTemplateItem`
Reusable KRA blueprint per department/designation.

`KraTemplate`: id, companyId, name, description?, departmentId?, designationId?, isActive.
`KraTemplateItem`: id, templateId, metricId, defaultTarget (Float), weight (Float, default 1), periodType (`MONTHLY`/`QUARTERLY`/`YEARLY`), minThreshold (Float?).

### 3.3 Extend: `EmployeeGoal` (the per-employee KRA target — "aapka kaam")
Reuse existing model, add columns:

| new field | type | notes |
|---|---|---|
| metricId | string? | links goal to a `KraMetric` (null = free-form legacy goal) |
| templateId | string? | provenance |
| dataSource | string? | snapshot of metric's validation mode |
| weight | Float @default(1) | contribution to index |
| verifiedValue | Float @default(0) | sum of approved contributions (drives `currentValue`) |
| isKra | bool @default(false) | true = counts toward KRA focus & index |

`type` already covers period (MONTHLY/QUARTERLY/HALF_YEARLY/YEARLY); `startDate`/`endDate` define the period window. `currentValue`/`achievementPercentage` already exist — we now populate them from the ledger instead of manual edits.

### 3.4 New: `MetricContribution` (validation ledger)
Har reported number ki ek auditable row. **Yahi validation + auto-calc ka core hai.**

| field | type | notes |
|---|---|---|
| id | uuid | |
| companyId, employeeId | string | |
| metricId | string | |
| workReportId | string? | source report |
| reportedValue | Float | employee ne jo claim kiya |
| verifiedValue | Float? | validation ke baad (counts toward target) |
| status | enum | `PENDING` \| `AUTO_VERIFIED` \| `MANAGER_APPROVED` \| `REJECTED` \| `FLAGGED` |
| source | enum | `MANUAL` \| `SYSTEM` |
| sourceRefId | string? | e.g. RevenueTransaction id / article id (for auto-verify) |
| pointsValue | Float? | normalized weight of this work (for focus score, see §5) |
| verifiedById | string? | manager |
| verifiedAt | datetime? | |
| note | string? | reject reason / flag reason |
| date | datetime | activity date (drives which period-goals this counts toward) |

> ⚠️ Self-review correction (nested periods): contribution **does NOT store a single `goalId`**.
> Ek hi din ka data ek saath monthly + quarterly + yearly goal mein count hota hai. Rollup
> contributions ko period-window ke hisaab se **query** karke nikalta hai, ek FK se nahi.

Rollup rule (per `EmployeeGoal`): `verifiedValue = Σ MetricContribution.verifiedValue` for that
`employeeId + metricId` where status ∈ {AUTO_VERIFIED, MANAGER_APPROVED} **and** `date` ∈
`[goal.startDate, goal.endDate]`. Then `currentValue := verifiedValue`,
`achievementPercentage := min(100, currentValue/targetValue*100)`. Same contribution thus rolls
into the MONTHLY, QUARTERLY and YEARLY goals whose windows contain its `date`.

### 3.5 New: `PerformanceIndex` (composite score, period-flexible)
`MonthlyPerformanceSnapshot` monthly-only hai; index quarterly/yearly bhi chahiye.

| field | type | notes |
|---|---|---|
| id | uuid | |
| companyId, employeeId | string | |
| periodType | enum | MONTHLY/QUARTERLY/YEARLY |
| period | string | "2026-06", "2026-Q2", "2026" |
| achievementScore | Float | 0–100 (weighted KRA goal achievement) |
| attendanceScore | Float | 0–100 |
| managerRatingScore | Float | 0–100 (avg manager rating ×20) |
| focusScore | Float | 0–100 (on-KRA vs off-KRA work) |
| overallIndex | Float | 0–100 weighted sum |
| grade | string? | A/B/C… from index |
| weights | json | weights snapshot used |
| computedAt | datetime | |
| unique | | `[employeeId, periodType, period]` |

---

## 4. Validation engine (hybrid)

On work-report submit, har assigned metric value ke liye ek `MetricContribution` banti hai, phir:

1. **dataSource = SYSTEM / HYBRID with source available** → engine `sourceType` ke hisaab se actual records query karta hai for that employee+date:
   - `REVENUE_TRANSACTION` → sum of that employee's transactions where `claimedByEmployeeId = employee` and `verificationStatus = VERIFIED` (fields confirmed present on `RevenueTransaction`).
   - `PUBLICATION_ARTICLE` / `JOURNAL_ISSUE` → ⚠️ **attribution gap**: `Article` sirf `ArticleAuthor.userId` (external authors) se link hai, processing **employee** se nahi. Auto-verify ke liye `Article.handledByEmployeeId` (ya `ManuscriptStatusHistory` se "kisne PUBLISHED kiya") chahiye. Jab tak woh attribution add nahi hota, yeh metric **MANUAL** (manager approval) se chalega.
   - `SUPPORT_TICKET`, `COURSE_SALE`, `SUBSCRIPTION`, `DISPATCH`, `INVOICE` → respective modules.
   - If `reportedValue ≈ systemValue` → **AUTO_VERIFIED** (`verifiedValue = systemValue`).
   - If mismatch → **FLAGGED** (manager dekhe), `note` = "reported X, system Y".
2. **dataSource = MANUAL** (ya HYBRID with no source row) → **PENDING** → manager review queue.
3. **Anomaly guard** (sab par): agar `reportedValue` > (employee's trailing avg × factor) ya template `minThreshold`/max se bahar → **FLAGGED** chahe source kuch bhi ho.
4. Manager review (existing `PATCH /api/hr/work-reports` extend) → per-contribution **MANAGER_APPROVED**/**REJECTED**, optional adjusted `verifiedValue`.

Sirf AUTO_VERIFIED + MANAGER_APPROVED contributions hi goal/index mein count hoti hain. Yeh "data validate bhi ho aur target mein calculate ho" dono requirements cover karta hai.

---

## 5. Performance Index formula

```
overallIndex = wA·achievementScore + wT·attendanceScore + wM·managerRatingScore + wF·focusScore
```
Default weights (tweakable per company, stored in `weights`):
`wA = 0.45, wT = 0.20, wM = 0.20, wF = 0.15`.

- **achievementScore** = Σ(goal.achievement% × goal.weight) / Σ(weight) over KRA goals in period.
- **attendanceScore** = from attendance + report-submission consistency (reuse snapshot logic).
- **managerRatingScore** = avg `managerRating` (1–5) × 20.
- **focusScore** = `on-KRA points ÷ total points` (on-KRA + off-KRA), plus narrative `kraMatchRatio` as a minor factor. **Yeh employee ko apne KRA par focused rakhta hai** — non-KRA kaam index nahi badhata.
  > ⚠️ Self-review correction (unit mismatch): focus ko **raw metric value se compute NAHI karna** —
  > ₹50,000 revenue aur 5 articles ko jod nahi sakte (alag units). Normalize karne ke liye existing
  > **gamification points** (`MetricContribution.pointsValue` / `EmployeePointLog`) use karte hain,
  > jo har tarah ke kaam ko ek common scale par laate hain.

Grade bands: A ≥ 85, B 70–84, C 55–69, D < 55 (configurable).

---

## 6. Department metric seed catalog (initial)

| Department | Metrics (key) | Default source |
|---|---|---|
| **Publication** | articles_published, journal_issues_completed, articles_processed, apc_revenue | SYSTEM/HYBRID |
| **Formatting/Quality** | articles_qc_done, qc_pass_rate, articles_formatted | HYBRID/MANUAL |
| **Marketing** | subscriptions_sold, products_sold, marketing_revenue, leads_converted | SYSTEM/HYBRID |
| **Training** | courses_created, workshops_conducted, course_enrollments, training_revenue | HYBRID |
| **IT** | tickets_resolved, projects_delivered, support_requests_closed, uptime_pct | HYBRID/MANUAL |
| **Accounts** | invoices_processed, reconciliations_done, collections_amount | SYSTEM/HYBRID |
| **Dispatch/Logistics** | shipments_dispatched, on_time_delivery_rate | HYBRID/MANUAL |

(Exact source wiring Phase 2 mein finalize; jahan module ready nahi wahan MANUAL se shuru, baad mein SYSTEM upgrade.)

---

## 7. UX — "yeh tumhara kaam hai, focus karo"

- **Employee "My KRA" widget/page**: assigned metrics, target vs verified-current, %, status badge, aur ek **Focus meter** (on-KRA %). Sabse prominent, dashboard top par.
- **Report form** reorganized: pehle aapke *assigned KRA metrics* ke inputs (yahi primary kaam). Off-KRA / "other work" alag collapsible section mein — submit to hota hai (manager visibility ke liye) par index ko boost nahi karta. Yeh drift discourage karta hai.
- **My Performance page**: PerformanceIndex with 4-component breakdown + monthly/quarterly trend chart (recharts already available).
- **Manager/HR**: template manager, assignment + per-employee tweak screen, contribution approval queue, team index leaderboard.

---

## 8. API surface (new/changed)

- `…/api/kra/metrics` — CRUD metric catalog (admin/HR).
- `…/api/kra/templates` (+ `/[id]`) — CRUD templates & items.
- `…/api/kra/assign` — apply template → generate `EmployeeGoal`s for dept/designation/employee for a period; supports per-employee target tweak.
- `…/api/kra/my` — employee ke current-period assigned metrics + progress + focus.
- `…/api/hr/work-reports` (POST) — **extend**: assigned-metric values → create `MetricContribution` + run validation engine.
- `…/api/hr/work-reports` (PATCH) — **extend**: per-contribution approve/reject + adjusted value, trigger rollup.
- `…/api/performance/index` — compute/read PerformanceIndex (self + team).
- Cron: month/quarter close → snapshot PerformanceIndex.

---

## 9. Implementation phases

| Phase | Scope | Deliverable | Status |
|---|---|---|---|
| **0. Schema + seed** | New models + EmployeeGoal extension; migration; seed metric catalog + starter templates per department | DB ready, no UX change | ✅ Done — migration applied to local DB, 24 metrics + 7 templates seeded |
| **1. KRA admin + assignment** | Metric/template CRUD APIs + HR UI; apply-template → EmployeeGoal with per-employee tweak | HR can define & assign KRA | ✅ Done — `/api/kra/{metrics,templates,assign,my}` + admin UI (Metrics/Templates/Assign tabs), nav entry; live UI verified |
| **2. Report → ledger + validation** | Report submit creates `MetricContribution`; hybrid validation engine; manager approval queue; rollup into goals | Data validates + auto-counts to target | ✅ Done (backend + review UI) — validation engine (revenue auto-verify, manual→manager, anomaly flags), `/api/kra/contributions`, Review tab; e2e test PASS. ⏳ Pending: wire into the live work-report form (Phase 4) |
| **3. Performance Index** | Compute service + weights config + cron snapshots; employee "My Performance" + team view | Sabka index dikhe | ✅ Done — `performance-index.ts` (4-component weighted), `/api/kra/performance` (self + team leaderboard, persists snapshots), KRA "Performance" leaderboard tab + employee "My Performance" page; live UI verified. ⏳ Pending: cron auto-snapshot at period close; focus uses `kraMatchRatio` proxy until Phase 4 wires off-KRA points |
| **5. DPR KRA + rate/revenue** | KRA section inside the daily report (DPR) with daily-incremental update, remaining countdown + overflow; per-unit INR rate on templates (per-employee override) → earned revenue | DPR-driven KRA + work value | ✅ Done — `ratePerUnit` on KraTemplateItem + EmployeeGoal; Templates UI rate input; assign carries rate; `/api/kra/my` returns remaining/overflow/earned; My Performance shows countdown + ₹ earned; `DprKraSection` embedded in submit-report page (self-contained save). Verified: 45/40 → remaining 0, +5 overflow, ₹2250 earned |
| **4. Focus UX + report integration** | "My KRA" widget, report form reorg around assigned metrics, off-KRA separation | Clear focus enforcement | ✅ Done (core) — work-report POST hook records `kraEntries` as contributions (defensive, never blocks submit); "My Performance" page now has inline per-target **Log** (full loop: log → verify → rollup → index); `/api/cron/kra-snapshot` persists indices per period. ⏳ Pending refinements: add `kraEntries` inputs to the 105KB submit-report UI; off-KRA points separation (focus still uses `kraMatchRatio` proxy); register cron schedule |

Har phase independently shippable. Phase 0→1 se immediate value (structured KRA), 2 se validation, 3 se index, 4 se polish.

---

## 10. Risks / decisions still open
- **Reuse `PerformanceMetricDefinition`** (not new `KraMetric`) — confirm KRA columns add karein vs `metadata` json mein rakhein, taaki observability subsystem na toote.
- **Publication attribution**: `Article.handledByEmployeeId` (ya status-history se credit) add karna hoga warna publication metrics MANUAL rahenge. Same question formatting/QC ke liye.
- **System source wiring**: IT (`ITPerformanceMetric` already exists — overlap check), dispatch, training ke source modules confirm karein; jahan nahi, MANUAL se shuru.
- **Manager approval load**: daily × per-metric approval heavy — max auto-verify + report-level batch approve; only FLAGGED/anomaly items individual review mein jayein.
- **Legacy goals**: purane free-form `EmployeeGoal` (metricId=null) as-is; index sirf `isKra=true` goals count karega.
- **Backfill**: existing employees ko templates assign karne ka bulk run (Phase 1).
- **Weights tuning**: default weights per-company configurable.
