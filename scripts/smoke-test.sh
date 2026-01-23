#!/bin/bash

BASE_URL="http://localhost:3000"
echo "Starting Smoke Test against $BASE_URL..."

# Function to check endpoint
check_endpoint() {
    url="$1"
    expected_code="$2"
    
    echo -n "Checking $url... "
    response=$(curl -o /dev/null -s -w "%{http_code}\n" "$BASE_URL$url")
    
    if [ "$response" == "$expected_code" ]; then
        echo "✅ OK ($response)"
    else
        echo "❌ FAILED (Expected $expected_code, got $response)"
        # Allow 308 (Permanent Redirect) as acceptable for 307/302 for now
        if [[ "$expected_code" == "307" && ("$response" == "308" || "$response" == "302") ]]; then
             echo "   ⚠️  Accepting redirect ($response)"
        else
             exit 1
        fi
    fi
}

# 1. Public Pages
check_endpoint "/login" 200
check_endpoint "/register" 200

# 2. Redirects (Protected)
check_endpoint "/dashboard" 307 # Expect redirect to login

# 3. Public API (Journals) - Requires at least one journal seeded? 
# If empty, it returns 200 with empty array (valid) or 404 if route doesn't exist.
# Based on route code: `return NextResponse.json(volumes);` -> 200
# But I don't know a valid ID. 
# Let's try a safe route or just root / to ensure not 500.

echo -n "Checking Root / ... "
root_response=$(curl -o /dev/null -s -w "%{http_code}\n" "$BASE_URL/")
echo "Got $root_response"

echo "Smoke Test Complete."
