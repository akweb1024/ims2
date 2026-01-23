#!/bin/bash

# Fix all remaining params issues in Next.js 15 routes
# This script handles the different patterns used across the codebase

echo "Fixing params issues in API routes..."

# Pattern 1: Files with "context: { params:" pattern should use "context.params"
# These are already mostly fixed, but let's ensure consistency
find src/app/api -name "*.ts" -type f -exec grep -l "context: { params:" {} \; | while read file; do
    # Only replace if not already using context.params
    if grep -q "await params" "$file" && ! grep -q "authorizedRoute" "$file" && ! grep -q "{ params }" "$file" | head -1 | grep -q "async ("; then
        sed -i 's/await params/await context.params/g' "$file"
        echo "Fixed context pattern in: $file"
    fi
done

# Pattern 2: Files with "{ params }" in function signature (destructured) should use "params"
# These include authorizedRoute wrappers and some standard routes
find src/app/api -name "*.ts" -type f -exec grep -l "{ params }" {} \; | while read file; do
    # Check if it's using context.params incorrectly
    if grep -q "await context.params" "$file"; then
        # Check if params is destructured in the function signature
        if grep -q "async.*{ params }" "$file" || grep -q "authorizedRoute" "$file"; then
            sed -i 's/await context\.params/await params/g' "$file"
            echo "Fixed destructured pattern in: $file"
        fi
    fi
done

echo "Params fix complete!"
echo "Running build to verify..."
