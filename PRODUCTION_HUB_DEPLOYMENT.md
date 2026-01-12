# Production Hub - Feature Summary & Deployment Guide

## 🎯 Recent Upgrades Overview

### 1. **Production Hub Dashboard** (`/dashboard/production`)
A comprehensive management system for publication house operations with:
- **Overview Tab**: Real-time statistics and active production cycles
- **Journals Tab**: Complete journal catalog with APC pricing
- **Issues Tab**: Journal issue management and tracking
- **Articles Tab**: Manuscript inventory with APC billing

### 2. **Multi-Currency Fixed Pricing System**
- **Fixed USD & INR Pricing**: Eliminates currency conversion conflicts
- **APC Types**: Open Access, Rapid Publication, WoS, Other
- **Subscription Snapshots**: Stores both currencies at transaction time
- **Journal Pricing**: Separate fields for subscription and APC pricing

### 3. **Production Activity Sync with DPR**
- **Automatic Tracking**: All production actions logged via audit system
- **Daily Work Reports**: Auto-sync publication activities to employee DPRs
- **Activity API**: `/api/production/my-activity` for real-time tracking
- **Visual Feedback**: Synced activity preview in work report submission

### 4. **Enhanced APIs**
- `/api/journals` - Editor filtering and APC management
- `/api/production/issues` - Issue creation and tracking
- `/api/production/issues/[id]` - Issue updates
- `/api/production/articles/[id]/apc` - APC management
- `/api/production/my-activity` - Daily activity summary

## 📊 Database Schema Changes

### Journal Model
```prisma
model Journal {
  // Subscription Pricing
  priceINR Float @default(0)
  priceUSD Float @default(0)
  
  // APC Pricing (Fixed)
  apcOpenAccessINR Float @default(0)
  apcOpenAccessUSD Float @default(0)
  apcRapidINR      Float @default(0)
  apcRapidUSD      Float @default(0)
  apcWoSINR        Float @default(0)
  apcWoSUSD        Float @default(0)
  apcOtherINR      Float @default(0)
  apcOtherUSD      Float @default(0)
  
  // Editor Assignment
  editorId String?
  editor   User?   @relation("JournalEditor", fields: [editorId], references: [id])
}
```

### JournalIssue Model
```prisma
model JournalIssue {
  // Production Management
  expectedManuscripts Int     @default(0)
  isComplete          Boolean @default(false)
  validationStatus    String? // PENDING, VALIDATED, REJECTED
  publishedAt         DateTime?
}
```

### Article Model
```prisma
model Article {
  // APC Details
  apcType          APCType?
  apcAmountINR     Float? @default(0)
  apcAmountUSD     Float? @default(0)
  apcPaymentStatus String @default("UNPAID")
  apcInvoiceId     String?
}
```

### Subscription Model
```prisma
model Subscription {
  // Fixed Currency Snapshots
  subtotalInINR Float?
  subtotalInUSD Float?
  totalInINR    Float?
  totalInUSD    Float?
}
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [x] Database schema validated
- [x] Production build successful
- [x] TypeScript compilation clean
- [x] Lint warnings reviewed (non-blocking)
- [x] All APIs tested
- [x] Audit logging implemented

### Environment Variables Required
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://yourdomain.com"

# Optional: Razorpay (if using payment sync)
RAZORPAY_KEY_ID="your-key"
RAZORPAY_KEY_SECRET="your-secret"
```

### Database Migration
```bash
# Generate Prisma Client
npx prisma generate

# Push schema to production database
npx prisma db push

# Or use migrations (recommended for production)
npx prisma migrate deploy
```

### Build & Deploy
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

## 🔐 Security Considerations

1. **Role-Based Access Control**
   - Production Hub: SUPER_ADMIN, ADMIN, MANAGER, EDITOR
   - APC Management: SUPER_ADMIN, ADMIN, EDITOR
   - Audit Logs: All production actions tracked

2. **Data Validation**
   - Editor verification for journal operations
   - Required fields enforced
   - Type safety with TypeScript

3. **Audit Trail**
   - All journal, issue, and APC changes logged
   - User ID and timestamp recorded
   - Change details stored as JSON

## 📈 Performance Optimizations

1. **Database Indexes**
   - Journal: isActive, name
   - Article: journalId, issueId, status
   - AuditLog: userId, createdAt, entity

2. **Query Optimization**
   - Selective field inclusion
   - Pagination implemented
   - Efficient filtering

3. **Caching Strategy**
   - Static page generation where possible
   - API response caching recommended
   - Client-side state management

## 🧪 Testing Recommendations

### Manual Testing
1. **Production Hub**
   - Navigate to `/dashboard/production`
   - Verify all tabs load correctly
   - Test journal creation with APC pricing
   - Create and update issues
   - Manage article APCs

2. **Work Report Sync**
   - Perform production actions (create issue, update APC)
   - Navigate to `/dashboard/staff-portal/submit-report`
   - Verify synced activity appears
   - Submit report and check content

3. **Multi-Currency**
   - Create subscription with mixed currency items
   - Verify both INR and USD totals stored
   - Check invoice generation

### API Testing
```bash
# Test production activity endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/production/my-activity

# Test journal listing
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/journals

# Test issue creation
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"volumeId":"...", "issueNumber":1, "month":"January"}' \
  http://localhost:3000/api/production/issues
```

## 🐛 Known Issues & Limitations

1. **Lint Warnings** (Non-blocking)
   - React Hook dependency warnings in various components
   - Image optimization suggestions (using <img> instead of <Image>)
   - These are cosmetic and don't affect functionality

2. **Browser Subagent** (Development Only)
   - Rate limiting may occur during intensive testing
   - Not a production concern

## 📝 Post-Deployment Verification

1. **Check Application Health**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Verify Database Connection**
   - Check logs for Prisma connection
   - Verify queries executing successfully

3. **Monitor Audit Logs**
   - Ensure production actions being logged
   - Check audit log table growth

4. **Test User Workflows**
   - Editor creates journal issue
   - Staff submits work report
   - Admin reviews production metrics

## 🎓 User Training Points

### For Editors
1. Access Production Hub from sidebar
2. View assigned journals only
3. Create and manage issues
4. Track manuscript progress
5. Monitor APC collections

### For Publication Staff
1. Daily work automatically tracked
2. Review synced activities before submitting DPR
3. Activities auto-appended to work reports
4. Tasks completed auto-incremented

### For Administrators
1. Full production oversight
2. Assign journals to editors
3. Set APC pricing (fixed INR/USD)
4. Monitor all production activities
5. Review audit trails

## 📞 Support & Maintenance

### Regular Maintenance
- Weekly audit log cleanup (optional)
- Monthly performance review
- Quarterly schema optimization

### Monitoring Metrics
- Production actions per day
- APC collection trends
- Issue publication timeline
- Editor productivity

---

**Last Updated**: 2026-01-12  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
