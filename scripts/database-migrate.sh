#!/bin/bash
# scripts/database-migrate.sh

echo "Attempting to run prisma migrate deploy..."

# Capture both stdout and stderr
OUTPUT=$(npx prisma migrate deploy 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  # Check if the error is P3005 (database not empty) or P3014 (migration failed to apply)
  if echo "$OUTPUT" | grep -q "P3005"; then
    echo "Detected P3005: Database not empty without migration history."
    echo "Attempting to baseline existing migrations..."
    
    # Check if prisma/migrations directory exists
    if [ -d "prisma/migrations" ]; then
      for dir in prisma/migrations/*/; do
        # Remove trailing slash
        dir=${dir%/}
        migration_name=$(basename "$dir")
        
        # Only process actual migration directories (skip files like migration_lock.toml)
        if [ "$migration_name" != "migration_lock.toml" ] && [ "$migration_name" != "*" ]; then
          echo "Baselining $migration_name..."
          npx prisma migrate resolve --applied "$migration_name"
        fi
      done
      
      echo "Baselining complete. Retrying prisma migrate deploy..."
      npx prisma migrate deploy
    else
      echo "No migrations found to baseline."
      exit 1
    fi
  else
    echo "Migration failed with an error:"
    echo "$OUTPUT"
    exit $EXIT_CODE
  fi
else
  echo "Migrations applied successfully."
  echo "$OUTPUT"
fi
