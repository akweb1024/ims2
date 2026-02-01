#!/bin/bash

# Production Build Verification Script
# Ensures the application is ready for production deployment

set -e  # Exit on error

echo "🔍 Starting Production Build Verification..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    FAILURES=$((FAILURES + 1))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo ""
echo "1️⃣  Checking Environment Variables..."
echo "-----------------------------------"

# Check required environment variables
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "NEXT_PUBLIC_APP_URL")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        error "Missing required environment variable: $var"
    else
        success "$var is set"
    fi
done

# Check production-specific variables
if [ "$NODE_ENV" = "production" ]; then
    PROD_VARS=("AUTH_SECRET" "NEXTAUTH_URL")
    for var in "${PROD_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            error "Missing production environment variable: $var"
        else
            success "$var is set"
        fi
    done
fi

echo ""
echo "2️⃣  Running TypeScript Type Check..."
echo "-----------------------------------"

if npm run type-check; then
    success "TypeScript type check passed"
else
    error "TypeScript type check failed"
fi

echo ""
echo "3️⃣  Running ESLint..."
echo "-----------------------------------"

if npm run lint; then
    success "ESLint check passed"
else
    warning "ESLint found issues (non-blocking)"
fi

echo ""
echo "4️⃣  Checking Prisma Schema..."
echo "-----------------------------------"

if npx prisma validate; then
    success "Prisma schema is valid"
else
    error "Prisma schema validation failed"
fi

echo ""
echo "5️⃣  Generating Prisma Client..."
echo "-----------------------------------"

if npm run prisma:generate; then
    success "Prisma client generated successfully"
else
    error "Prisma client generation failed"
fi

echo ""
echo "6️⃣  Building Application..."
echo "-----------------------------------"

if npm run build; then
    success "Application build successful"
else
    error "Application build failed"
fi

echo ""
echo "7️⃣  Checking Build Output..."
echo "-----------------------------------"

if [ -d ".next" ]; then
    success ".next directory exists"
    
    # Check for standalone output
    if [ -d ".next/standalone" ]; then
        success "Standalone build created"
    else
        warning "Standalone build not found (check next.config.js)"
    fi
    
    # Check build size
    BUILD_SIZE=$(du -sh .next | cut -f1)
    success "Build size: $BUILD_SIZE"
else
    error ".next directory not found"
fi

echo ""
echo "8️⃣  Security Audit..."
echo "-----------------------------------"

# Run npm audit
AUDIT_OUTPUT=$(npm audit --audit-level=moderate 2>&1 || true)

if echo "$AUDIT_OUTPUT" | grep -q "found 0 vulnerabilities"; then
    success "No security vulnerabilities found"
else
    warning "Security vulnerabilities detected. Run 'npm audit' for details"
fi

echo ""
echo "9️⃣  Checking Database Connection..."
echo "-----------------------------------"

# Try to connect to database
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    success "Database connection successful"
else
    error "Database connection failed"
fi

echo ""
echo "🔟 Checking Required Files..."
echo "-----------------------------------"

REQUIRED_FILES=(
    "package.json"
    "next.config.js"
    "prisma/schema.prisma"
    ".env"
    "Dockerfile"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        success "$file exists"
    else
        error "$file not found"
    fi
done

echo ""
echo "================================================"

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Application is ready for production.${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILURES check(s) failed. Please fix the issues above before deploying.${NC}"
    exit 1
fi
