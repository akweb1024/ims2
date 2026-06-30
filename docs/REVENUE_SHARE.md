# Department Revenue Share (Phase 1)

Cross-company department revenue-sharing. Support/production departments (IT, HR, …) earn a
fixed share of revenue departments' revenue across the group companies, surfaced as an
internal P&L report with period locking.

**Phase 1 is attribution only — no real money moves.** It feeds reporting, KRA, and bonus
decisions. Actual settlement (especially cross-company) is Phase 2 and is deliberately held
back pending transfer-pricing / GST sign-off (see [Phase 2](#phase-2--real-money)).

## Concepts

- **Department type** (`Department.departmentType`): `REVENUE` (bills directly), `PRODUCTION`
  (builds the product), `SUPPORT` (enables everyone, no direct revenue).
- **Share rule** (`RevenueShareRule`): a beneficiary department earns a fixed `%` of a source
  company's revenue, optionally narrowed to one source department. Cross-company and
  effective-dated (`effectiveFrom`/`effectiveTo`).
- **Share row** (`DepartmentRevenueShare`): an immutable computed allocation, written when a
  transaction is verified. Snapshots the IST period (`periodMonth`/`periodYear`) and can be
  locked (`isLocked`).

## Configure

Settings → **Revenue Share** (`/dashboard/settings/revenue-share`), roles
`SUPER_ADMIN` / `ADMIN` / `FINANCE_ADMIN`.

1. **Department types** — classify each department. Beneficiaries are typically `SUPPORT` /
   `PRODUCTION`; sources are typically `REVENUE`.
2. **Share rules** — pick a beneficiary department, a source company (and optionally a source
   department), and a percentage. The page warns if a source's rules exceed 100%.

## How allocation works

When a `RevenueTransaction` becomes `VERIFIED`, the engine
([`src/lib/revenue-share.ts`](../src/lib/revenue-share.ts)) runs at three sites: the
transactions verify endpoint, claim approval, and finance-synced (born-verified) transactions.
It is **idempotent** and never blocks the verification if it fails.

Rules matched: active, effective on the transaction's `paymentDate`, for the transaction's
source company, and either whole-company (`sourceDepartmentId = null`) or targeting the
transaction's department. A transaction with no department matches only whole-company rules.

- **Stacking** — overlapping whole-company and department-specific rules add up.
- **Residual** — when the transaction has a source department, a residual row records the
  remainder the source department keeps (100% if no rules match).
- **Over-allocation guard** — if matched rules sum to >100%, nothing is written for that
  transaction (logged); the transaction still verifies.

The pure allocation math is in [`revenue-share-core.ts`](../src/lib/revenue-share-core.ts)
(`buildShareRows`) and unit-tested in
[`tests/unit/revenue-share.test.ts`](../tests/unit/revenue-share.test.ts).

## Report

Settings → Revenue Share → **Report** tab, or `GET /api/revenue/department-shares?month&year`.
Per department, for the month:

| Column | Meaning |
| --- | --- |
| Gross | Revenue billed directly (VERIFIED transactions, IST month) |
| Shared out | Given to support/production departments (non-residual shares it sourced) |
| Kept | Residual remainder it kept |
| Earned (support) | Revenue earned by supporting others (non-residual shares it received) |
| Net | Kept + Earned — the department's attributed bottom line |

**Conservation:** total Net equals total attributed Gross. Aggregation is pure
([`revenue-share-report-core.ts`](../src/lib/revenue-share-report-core.ts),
`aggregateDepartmentShares`) and unit-tested
([`tests/unit/revenue-share-report.test.ts`](../tests/unit/revenue-share-report.test.ts)).

**Lock period** (`POST {action:'lock', month, year}`) sets `isLocked` on every share row in the
period so downstream bonus/P&L numbers can never shift even if rules change later. Idempotent.

## Migration

`prisma/migrations/20260630120000_add_dept_revenue_share` — additive: the `DepartmentType`
enum, `Department.departmentType`, and the two new tables with indexes/FKs. Deploys via
`prisma migrate deploy`. (Locally the schema was applied with `prisma db execute` per the
team's no-`migrate dev` rule, so the local `_prisma_migrations` history diverges — expected.)

## Pre-existing fixes bundled here

The verify hooks surfaced two latent bugs, fixed in this work:

- `approvedByManagerId` was set to `User.id` but FK-references `EmployeeProfile.id`, so verify
  always 500'd — now resolves the verifier's `EmployeeProfile` (null if none).
- The transactions verify endpoint ran allocations *before* persisting the status update —
  now it runs claim-approval + allocations only *after* a successful update.

## Phase 2 — real money

Not built. Within-company settlement is a budget transfer; cross-company settlement between the
separate legal entities is a related-party transaction that needs generated inter-company
invoices for GST compliance and transfer-pricing documentation. **Requires CA sign-off before
implementation.**
