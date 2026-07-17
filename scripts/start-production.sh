#!/bin/bash

# Production Deployment Script
# This script handles database migrations and starts the application

set -euo pipefail  # Exit on error

echo "🚀 Starting STM Customer Management System..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check required environment variables
echo "📋 Checking environment variables..."
REQUIRED_VARS=("DATABASE_URL" "AUTH_SECRET" "NEXTAUTH_URL" "JWT_SECRET")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done
print_status "All required environment variables are set"

# Wait for database to be ready. Probe with the pg driver rather than the
# prisma CLI: the slim production image ships only the generated client + pg,
# not the CLI (and npx would try to download it on every boot).
echo "🔍 Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

db_probe() {
    node -e 'const{Client}=require("pg");const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.query("SELECT 1")).then(()=>process.exit(0)).catch(()=>process.exit(1));' > /dev/null 2>&1
}

until db_probe || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    print_warning "Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Database connection timeout"
    exit 1
fi

print_status "Database is ready"

# Run database migrations (opt-in).
# Default is to SKIP automatic migrations so they can be run manually from the
# app terminal (e.g. `bash scripts/database-migrate.sh`). To restore automatic
# migrations on startup, set RUN_MIGRATIONS_ON_START=true in the environment.
if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
    echo "🔄 Running database migrations..."
    if bash scripts/database-migrate.sh; then
        print_status "Database migrations completed successfully"
    else
        print_error "Database migration failed"
        exit 1
    fi
else
    print_warning "Skipping automatic migrations (RUN_MIGRATIONS_ON_START is not 'true'). Run them manually: bash scripts/database-migrate.sh"
fi

# Ensure the Prisma Client exists. Both the Nixpacks build and the slim Docker
# image generate it at build time; only regenerate as a fallback (the slim
# image has no prisma CLI, so npx would download it).
echo "🔧 Checking Prisma Client..."
if [ -d node_modules/.prisma/client ]; then
    print_status "Prisma Client already generated at build time"
elif npx prisma generate; then
    print_status "Prisma Client generated"
else
    print_warning "Prisma Client generation had warnings (continuing anyway)"
fi

# Optional: Run database seed for first-time setup
if [ "${RUN_SEED:-}" = "true" ]; then
    if [ "${ALLOW_DESTRUCTIVE_SEED:-}" != "true" ]; then
        print_warning "RUN_SEED=true was requested, but seed was skipped because it deletes existing business data. Set ALLOW_DESTRUCTIVE_SEED=true only for a disposable database."
    else
        echo "🌱 Seeding database..."
        if npm run seed; then
            print_status "Database seeded successfully"
        else
            print_warning "Database seeding failed (continuing anyway)"
        fi
    fi
fi

# Start the application
echo "🎯 Starting application..."
print_status "Application is running on port ${PORT:-3000}"

exec bash scripts/start-server.sh
