#!/bin/bash

# Test script to verify project update works
# This will test the API endpoint directly

echo "Testing Project Update API..."
echo ""

# Get the first project ID (you'll need to replace this with an actual project ID)
echo "Step 1: Get a project to test with"
echo "Please visit: http://localhost:3000/dashboard/it-management/projects"
echo "And note down a project ID from the URL when you click on a project"
echo ""

read -p "Enter a project ID to test: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "No project ID provided. Exiting."
    exit 1
fi

echo ""
echo "Step 2: Testing update with minimal changes..."
echo ""

# Test update with just a description change
curl -X PATCH "http://localhost:3000/api/it/projects/$PROJECT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "description": "Updated description - Test at '$(date +%T)'"
  }' \
  -v

echo ""
echo ""
echo "If you see a 200 OK response above, the update worked!"
echo "If you see an error, please share the full error message."
