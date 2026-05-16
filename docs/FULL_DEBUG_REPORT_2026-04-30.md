# Full Debug Report (2026-04-30)

## Scope
- Repository: `ims 12 feb`
- Date: 2026-04-30
- Goal: run end-to-end debug sweep and list concrete errors/risks

## Executed Checks
1. `npm run lint` -> PASS
2. `npm run type-check` -> PASS
3. `npm run build` -> PASS
4. `npm test` -> FAIL (test harness bootstrap)

## Confirmed Errors

### 1) Playwright E2E suite cannot start web server in current run environment
- Command: `npm test`
- Error: `Process from config.webServer exited early.`
- Deep trace (`DEBUG=pw:webserver`): repeated `connect EPERM 127.0.0.1:3000`
- Impact: no E2E test cases execute; integration regressions are not currently validated in this environment.
- Classification: environment/runtime test harness blocker (not compile failure).

## High-Risk Code Findings

### 2) Hardcoded fallback encryption secrets in production code paths
- `src/lib/think-tank.ts:23-24`
- `src/app/api/settings/configurations/route.ts:8`
- Problem: default literal secrets (`think-tank-encryption-key-32ch`, `your-32-character-secret-key!!`) are used if env vars are missing.
- Impact: predictable key material can allow decryption/data compromise if misconfigured environments reach production.

### 3) Cron sync endpoint authorization can be effectively optional when `CRON_SECRET` is unset
- `src/app/api/cron/razorpay-sync/route.ts:10-19`
- Problem: authorization checks are guarded by `if (process.env.CRON_SECRET && ...)`; if `CRON_SECRET` is absent, route can run without bearer secret validation.
- Impact: accidental public or weakly protected execution path for payment sync logic.

### 4) Legacy Razorpay instance silently falls back to placeholder credentials
- `src/lib/razorpay.ts:66-69`
- Problem: module-level client initializes with `'placeholder'` values.
- Impact: misconfiguration may surface late as runtime payment failures instead of hard-failing at startup; harder incident detection.

## Medium-Risk Observations

### 5) Dual auth model increases inconsistency risk
- Mixed usage of NextAuth and manual JWT (`src/lib/auth.ts`, `src/lib/auth-core.ts`, route-level auth variants).
- Risk: endpoint behavior drift (session-authenticated vs token-authenticated) and uneven authorization rules.

### 6) Type-safety debt can mask runtime issues
- Large count of `any` casts in business-critical code paths (`src/lib/*`, `src/hooks/*`).
- Risk: successful type-check does not guarantee data-shape correctness at runtime.

## What Is Healthy Right Now
- Lint is clean.
- TypeScript compile is clean.
- Production build succeeds and all routes compile.

## Recommended Next Actions
1. Make encryption keys mandatory everywhere; remove literal fallback secrets.
2. Enforce strict auth on cron routes regardless of env (or explicitly disable route when secret missing).
3. Replace placeholder Razorpay client behavior with startup validation failure.
4. Fix Playwright execution mode in this environment (or run tests in a host where localhost socket access is permitted).
5. Prioritize auth and payment modules for `any` reduction and stricter runtime validation schemas.
