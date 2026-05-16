# Live Read-Only to Staging Sync

This project should not use unrestricted production database writes for development data refreshes. Use a read-only live source and a staging/local target.

## Environment

```env
LIVE_READONLY_DATABASE_URL="postgresql://readonly_user:password@live-host:5432/live_db?sslmode=require"
STAGING_DATABASE_URL="postgresql://staging_user:password@staging-host:5432/staging_db"
DATABASE_URL="postgresql://staging_user:password@staging-host:5432/staging_db"
SYNC_APPLY_CONFIRM=""
ALLOW_WRITABLE_LIVE_SOURCE="false"
```

`LIVE_READONLY_DATABASE_URL` must be a database user without `INSERT`, `UPDATE`, `DELETE`, or `TRUNCATE` grants on the tables being copied. The sync script refuses writable source grants unless `ALLOW_WRITABLE_LIVE_SOURCE=true`.

## Dry Run

```bash
npm run db:sync:live:dry-run
```

Useful scoped dry-runs:

```bash
npm run db:sync:live:dry-run -- --group=hr --limit=100
npm run db:sync:live:dry-run -- --tables=Company,User,EmployeeProfile,Attendance,WorkReport
npm run db:sync:live:dry-run -- --group=crm --since=2026-01-01T00:00:00.000Z
```

## Apply

Only after a dry-run looks correct:

```bash
SYNC_APPLY_CONFIRM=SYNC_LIVE_READONLY_TO_STAGING npm run db:sync:live:apply -- --group=core --group=hr
```

## Safety Guarantees

- The script never deletes or truncates target data.
- Dry-run is the default behavior.
- `--apply` requires `SYNC_APPLY_CONFIRM=SYNC_LIVE_READONLY_TO_STAGING`.
- The script refuses to run if source and target normalize to the same database.
- Each table copy uses primary-key upsert into the target.
- Missing tables are skipped and reported.

## Default Groups

Default dry-run/apply groups are `core`, `hr`, and `crm`.

Available groups:

- `core`: company, department, designation, users, employee profiles, employee company designations
- `hr`: attendance, work reports, leave, salary, documents, performance reviews
- `crm`: customers, institutions, subscriptions, invoices, payments, dispatches
- `finance`: accounts, journal entries, financial records, revenue transactions, commission payouts
- `all`: all of the above

For sensitive production data, prefer narrow groups or explicit `--tables=` first.
