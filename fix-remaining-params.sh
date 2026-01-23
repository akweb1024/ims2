#!/bin/bash

# Fix remaining incorrect usage of "await params" where "context.params" should be used

echo "Scanning for incorrect params usage..."

# Find files that use "await params" but have "context: { params:" in their content
# This means they should be using "await context.params"
grep -l "context: { params:" src/app/api/**/*.ts | xargs grep -l "await params" | while read file; do
    # Verify it doesn't also have "{ params }" in the signature (destructured)
    if ! grep -q "async.*{ params }" "$file" && ! grep -q "authorizedRoute.*{ params }" "$file"; then
        echo "Fixing $file..."
        sed -i 's/await params/await context.params/g' "$file"
    fi
done

echo "Fix complete."
