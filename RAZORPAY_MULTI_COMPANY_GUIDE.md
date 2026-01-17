# Multi-Company Razorpay Configuration Guide

## 📋 Overview
The system now supports **company-specific Razorpay accounts** stored in the database, allowing each company to use their own payment gateway credentials.

## 🎯 How It Works

### 1. **Database Storage**
Company-specific credentials are stored in the `AppConfiguration` table:
- **companyId**: Links credentials to a specific company
- **category**: `PAYMENT_GATEWAY`
- **key**: `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET`
- **value**: The actual credential (encrypted in production)
- **isActive**: Enable/disable credentials

### 2. **Priority System**
```
1. Company-specific credentials (from database)
   ↓ (if not found)
2. Environment variables (.env file)
   ↓ (if not found)
3. Error thrown
```

## 🔧 Setup Instructions

### Step 1: Add Razorpay Credentials via UI

1. Navigate to **Dashboard → Settings → Configurations**
2. Select **Payment Gateway** category
3. Click **Add Configuration**
4. Add two configurations:
   - **Key**: `RAZORPAY_KEY_ID`
   - **Value**: Your Razorpay Key ID (e.g., `rzp_live_xxxxx`)
   
   - **Key**: `RAZORPAY_KEY_SECRET`
   - **Value**: Your Razorpay Key Secret (e.g., `xxxxx`)

5. Click **Save Configuration**

### Step 2: Use in Your Code

#### **Old Way (Deprecated):**
```typescript
import { razorpay } from '@/lib/razorpay';

// This uses .env variables only
const order = await razorpay.orders.create({...});
```

#### **New Way (Recommended):**
```typescript
import { getRazorpayInstance } from '@/lib/razorpay';

// Dynamically gets company-specific credentials
const razorpayInstance = await getRazorpayInstance(companyId);
const order = await razorpayInstance.orders.create({...});
```

## 📝 Example API Implementation

### Before (Single Account):
```typescript
import { razorpay } from '@/lib/razorpay';

export async function POST(req: Request) {
    const order = await razorpay.orders.create({
        amount: 50000,
        currency: 'INR'
    });
    return Response.json(order);
}
```

### After (Multi-Company):
```typescript
import { getRazorpayInstance } from '@/lib/razorpay';

export async function POST(req: Request, user: any) {
    // Get company-specific Razorpay instance
    const razorpay = await getRazorpayInstance(user.companyId);
    
    const order = await razorpay.orders.create({
        amount: 50000,
        currency: 'INR'
    });
    
    return Response.json(order);
}
```

## 🔐 Security Best Practices

1. **Never commit credentials to Git**
   - Use the database configuration system
   - Keep `.env` as fallback only

2. **Encrypt sensitive values**
   - The system stores values as plain text currently
   - Consider adding encryption layer for production

3. **Use environment-specific credentials**
   - Test mode for development: `rzp_test_xxxxx`
   - Live mode for production: `rzp_live_xxxxx`

## 🎨 Managing Multiple Companies

### Scenario: You have 2 companies with different Razorpay accounts

**Company A (ID: abc-123):**
- Razorpay Key ID: `rzp_live_CompanyA123`
- Razorpay Secret: `secret_CompanyA456`

**Company B (ID: xyz-789):**
- Razorpay Key ID: `rzp_live_CompanyB123`
- Razorpay Secret: `secret_CompanyB456`

**Setup:**
1. Login as Company A admin
2. Go to Settings → Configurations → Payment Gateway
3. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for Company A
4. Logout and login as Company B admin
5. Repeat step 3 for Company B credentials

**Result:**
- When Company A creates an order, it uses their Razorpay account
- When Company B creates an order, it uses their Razorpay account
- Completely isolated payment processing ✅

## 🛠️ Helper Functions

### Get Single Config Value
```typescript
import { getCompanyConfig } from '@/lib/razorpay';

const apiKey = await getCompanyConfig(companyId, 'AI_MODELS', 'OPENAI_API_KEY');
```

### Get Multiple Config Values
```typescript
import { getCompanyConfigs } from '@/lib/razorpay';

const awsConfigs = await getCompanyConfigs(companyId, 'AWS', [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION'
]);

console.log(awsConfigs.AWS_ACCESS_KEY_ID);
console.log(awsConfigs.AWS_REGION);
```

## 🚀 Migration Guide

### For Existing Code Using Environment Variables

1. **Identify all Razorpay usage:**
   ```bash
   grep -r "razorpay" src/
   ```

2. **Update imports:**
   ```typescript
   // Old
   import { razorpay } from '@/lib/razorpay';
   
   // New
   import { getRazorpayInstance } from '@/lib/razorpay';
   ```

3. **Update function calls:**
   ```typescript
   // Old
   const order = await razorpay.orders.create({...});
   
   // New
   const razorpay = await getRazorpayInstance(user.companyId);
   const order = await razorpay.orders.create({...});
   ```

4. **Add credentials via UI** for each company

5. **Test thoroughly** before removing `.env` variables

## 📊 Configuration Categories

The system supports multiple configuration categories:

- **AWS** - AWS services (S3, SES, etc.)
- **WHATSAPP** - WhatsApp Business API
- **AI_MODELS** - OpenAI, Anthropic, Google AI
- **PAYMENT_GATEWAY** - Razorpay, Stripe
- **EMAIL_SERVICE** - SMTP, SendGrid
- **SMS_SERVICE** - Twilio
- **CLOUD_STORAGE** - Cloudinary
- **ANALYTICS** - Google Analytics, Mixpanel
- **SOCIAL_MEDIA** - Facebook, Twitter APIs
- **OTHER** - Custom configurations

## ❓ FAQ

**Q: Can I still use .env variables?**
A: Yes! The system falls back to .env if database credentials aren't found.

**Q: What if I delete a company's credentials?**
A: The system will fall back to .env variables. If those don't exist, it will throw an error.

**Q: Can I have different credentials for test/production?**
A: Yes! Use different Razorpay accounts (test vs live keys) for different companies or environments.

**Q: Is this secure?**
A: Values are stored in the database. For production, consider adding encryption at rest.

**Q: Can I use this for other services?**
A: Yes! Use `getCompanyConfig()` or `getCompanyConfigs()` for any service (AWS, OpenAI, etc.)

## 🎯 Next Steps

1. ✅ Add your Razorpay credentials via the UI
2. ✅ Test payment creation with company-specific credentials
3. ✅ Migrate existing code to use `getRazorpayInstance()`
4. ✅ Remove hardcoded credentials from `.env` (optional)
5. ✅ Add encryption layer for sensitive values (recommended for production)

---

**Need Help?** Check the configuration UI at `/dashboard/settings/configurations`
