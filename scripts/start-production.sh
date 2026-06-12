#!/bin/bash

# Production Deployment Script
# This script handles database migrations and starts the application

set -e  # Exit on error

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
REQUIRED_VARS=("DATABASE_URL" "AUTH_SECRET" "NEXTAUTH_URL")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done
print_status "All required environment variables are set"

# Wait for database to be ready
echo "🔍 Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    print_warning "Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Database connection timeout"
    exit 1
fi

print_status "Database is ready"

# Run database migrations
echo "🔄 Running database migrations..."
if npx prisma migrate deploy; then
    print_status "Database migrations completed successfully"
else
    print_error "Database migration failed"
    exit 1
fi

# Generate Prisma Client (in case it's not already generated)
echo "🔧 Generating Prisma Client..."
if npx prisma generate; then
    print_status "Prisma Client generated"
else
    print_warning "Prisma Client generation had warnings (continuing anyway)"
fi

# Optional: Run database seed for first-time setup
if [ "$RUN_SEED" = "true" ]; then
    if [ "$ALLOW_DESTRUCTIVE_SEED" != "true" ]; then
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
