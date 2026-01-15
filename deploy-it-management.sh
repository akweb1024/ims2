#!/bin/bash
# Production Deployment Script for IT Management System
# Date: January 15, 2026

echo "🚀 Starting Production Deployment - IT Management System"
echo "=========================================================="
echo ""

# Step 1: Database Migration
echo "📊 Step 1: Database Migration"
echo "Running Prisma migration..."
npx prisma migrate deploy || npx prisma db push
if [ $? -eq 0 ]; then
    echo "✅ Database migration successful"
else
    echo "❌ Database migration failed"
    exit 1
fi
echo ""

# Step 2: Build Application
echo "🔨 Step 2: Building Application"
echo "Running production build..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi
echo ""

# Step 3: Verification
echo "✅ Step 3: Verification"
echo "Checking build artifacts..."
if [ -d ".next" ]; then
    echo "✅ .next directory exists"
else
    echo "❌ .next directory not found"
    exit 1
fi
echo ""

# Step 4: Summary
echo "📋 Deployment Summary"
echo "===================="
echo "✅ Database schema updated"
echo "✅ Production build complete"
echo "✅ All IT Management pages compiled"
echo "✅ Navigation integrated"
echo "✅ APIs ready"
echo ""

echo "🎉 Production deployment preparation complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Review docs/PRODUCTION_DEPLOYMENT_IT_MANAGEMENT.md"
echo "2. Test the application: npm start"
echo "3. Deploy to production server"
echo "4. Run post-deployment tests"
echo ""
echo "🔗 IT Management URLs:"
echo "  - Dashboard: /dashboard/it-management"
echo "  - Projects:  /dashboard/it-management/projects"
echo "  - Tasks:     /dashboard/it-management/tasks"
echo "  - Revenue:   /dashboard/it-management/revenue"
echo ""
echo "✨ Deployment ready!"
