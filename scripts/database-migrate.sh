#!/bin/bash
# scripts/database-migrate.sh

echo "Attempting to run prisma migrate deploy..."

# Capture both stdout and stderr
OUTPUT=$(npx prisma migrate deploy 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  # Check if the error is P3005 (database not empty without migration history)
  if echo "$OUTPUT" | grep -q "P3005"; then
    echo "Detected P3005: Database not empty without migration history."
    echo "Baselining the designated initial migration..."

    BASELINE_MIGRATION="20260301000000_baseline_init"
    if [ -f "prisma/migrations/${BASELINE_MIGRATION}/migration.sql" ]; then
      npx prisma migrate resolve --applied "$BASELINE_MIGRATION"

      echo "Initial baseline complete. Applying later migrations..."
      npx prisma migrate deploy
    else
      echo "Baseline migration ${BASELINE_MIGRATION} was not found."
      exit 1
    fi
  elif echo "$OUTPUT" | grep -q "P3009" && echo "$OUTPUT" | grep -q "20260301000000_baseline_init"; then
    echo "Detected P3009 on baseline migration 20260301000000_baseline_init."
    echo "Marking baseline as rolled back, then applied, and retrying deploy..."

    npx prisma migrate resolve --rolled-back "20260301000000_baseline_init" || true
    npx prisma migrate resolve --applied "20260301000000_baseline_init"

    echo "Baseline resolved. Retrying prisma migrate deploy..."
    npx prisma migrate deploy
  else
    echo "Migration failed with an error:"
    echo "$OUTPUT"
    exit $EXIT_CODE
  fi
else
  echo "Migrations applied successfully."
  echo "$OUTPUT"
fi
