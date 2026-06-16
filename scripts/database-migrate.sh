#!/bin/bash
# scripts/database-migrate.sh

set -euo pipefail

echo "Attempting to run prisma migrate deploy..."

if OUTPUT=$(npx prisma migrate deploy 2>&1); then
  echo "Migrations applied successfully."
  echo "$OUTPUT"
  exit 0
fi

EXIT_CODE=$?
FAILED_MIGRATION="$(printf '%s\n' "$OUTPUT" | sed -n 's/.*The `\([^`]*\)` migration started.*/\1/p' | sed -n '1p')"

# Check if the error is P3005 (database not empty without migration history)
if echo "$OUTPUT" | grep -q "P3005"; then
  echo "Detected P3005: Database not empty without migration history."
  echo "Baselining the designated initial migration..."

  BASELINE_MIGRATION="20260301000000_baseline_init"
  if [ -f "prisma/migrations/${BASELINE_MIGRATION}/migration.sql" ]; then
    npx prisma migrate resolve --applied "$BASELINE_MIGRATION"

    echo "Initial baseline complete. Applying later migrations..."
    npx prisma migrate deploy
    exit 0
  fi

  echo "Baseline migration ${BASELINE_MIGRATION} was not found."
  exit 1
fi

if echo "$OUTPUT" | grep -q "P3009"; then
  echo "Detected P3009: a prior migration failed in the target database."
  if [ -n "$FAILED_MIGRATION" ]; then
    echo "Failed migration: ${FAILED_MIGRATION}"
    echo "Resolve it manually with either:"
    echo "  npx prisma migrate resolve --rolled-back \"${FAILED_MIGRATION}\""
    echo "  npx prisma migrate resolve --applied \"${FAILED_MIGRATION}\""
  else
    echo "Prisma did not include the failed migration name in the error output."
    echo "Inspect _prisma_migrations in the production database and resolve the failed migration before retrying deploy."
  fi
  echo "Full Prisma output:"
  echo "$OUTPUT"
  exit "$EXIT_CODE"
fi

echo "Migration failed with an error:"
echo "$OUTPUT"
exit "$EXIT_CODE"
