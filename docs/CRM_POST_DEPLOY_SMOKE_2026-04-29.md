# CRM Post-Deploy Smoke Checklist (2026-04-29)

## Scope
Validate recent CRM changes after deploy:
- Security hardening (tenant scope, lead-only guards, cross-tenant lead conflict, deal ownership checks)
- API consistency and UX/perf list behavior
- SSE stream stability and lint-blocker hotfixes

## Preconditions
- Login as at least 3 roles in same tenant: `SUPER_ADMIN`/`ADMIN`, `MANAGER`/`EXECUTIVE`, `CUSTOMER`.
- Have at least:
  - 2 customers
  - 1 lead
  - 1 deal
  - 1 subscription
- Optional (recommended): a second tenant for cross-tenant negative tests.

## 1. Customer API tenant isolation
1. Open customer details from tenant A.
2. Attempt to fetch/update/delete the same customer ID while authenticated as tenant B admin.
3. Expected:
- No cross-tenant read access (`404`/`403` depending path).
- No cross-tenant update/delete allowed.

## 2. Lead-only guard behavior
1. Pick a normal customer record (`leadStatus = null`).
2. Call lead endpoints from UI/API:
- `PATCH /api/crm/leads/{id}`
- `DELETE /api/crm/leads/{id}`
- `POST /api/crm/leads/{id}/convert`
3. Expected:
- All fail as not-found/forbidden for non-lead records.

## 3. Lead create conflict rules
1. Create a lead in tenant A with email `x@example.com`.
2. Recreate same lead email in tenant A.
3. Expected:
- Conflict response (`409`) for duplicate lead-in-company.
4. If multi-tenant available: create a user with same email in tenant B and create lead in tenant A.
5. Expected:
- Conflict response for cross-tenant user-email collision.

## 4. Deal ownership/reference validation
1. Create deal with valid tenant A customer + owner.
2. Attempt create/update deal using:
- customer from another tenant
- inactive owner
- owner from another tenant
3. Expected:
- Validation failure (`400`) with clear message.

## 5. CRM list UX/perf consistency
### Leads
- Change search/filter rapidly.
- Expected: no stale flicker, latest filter wins, pagination resets to page 1, retry/error UI appears on failure.

### Subscriptions
- Search and switch status tabs.
- Expected: pagination resets to page 1, loading/error states consistent, no duplicated requests from rapid changes.

### Deals
- Load board and create modal prefill via `?leadId=`.
- Expected: data loads once cleanly; on fetch failure, visible banner appears.

## 6. Customer tab count aggregation
1. Open CRM customers page.
2. Switch tabs and search.
3. Expected:
- Counts load from single aggregate call and remain coherent with current result set.

## 7. Notifications SSE sanity
1. Open dashboard in one tab, then close/reload repeatedly.
2. Expected:
- No repeated server log spam: `Invalid state: Controller is already closed`.

## 8. Regression quick checks
- Create customer with existing email using idempotent mode:
  - `POST /api/customers?idempotent=true`
  - Expected: existing customer returned (`200`), no error spam.
- Same request without idempotent mode:
  - Expected: `409` conflict.

## Pass/Fail criteria
- PASS: all security negative cases block correctly and UX list flows remain stable.
- FAIL: any cross-tenant access/modification succeeds, or lead/deal validation bypasses, or list states regress.

## Notes template
- Environment URL:
- Build/commit:
- Tester:
- Timestamp:
- Failures with endpoint + payload + role:
