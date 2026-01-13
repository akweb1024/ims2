# Application Configuration Management System

## 🎯 Overview

A comprehensive, secure system for managing all application credentials, API keys, and integration settings from the frontend. This system provides encrypted storage and role-based access control for sensitive configuration data.

## ✨ Features

### 🔐 Security
- **AES-256-CBC Encryption**: All sensitive values are encrypted before storage
- **Role-Based Access**: Only SUPER_ADMIN and ADMIN can manage configurations
- **Masked Display**: Values are masked by default, can be revealed with "Show Values" button
- **Company Scoping**: Admins can only see/manage their company's configurations

### 📦 Supported Categories

1. **AWS Services** ☁️
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION
   - AWS_S3_BUCKET

2. **WhatsApp Business** 💬
   - WHATSAPP_BUSINESS_ID
   - WHATSAPP_PHONE_NUMBER_ID
   - WHATSAPP_ACCESS_TOKEN
   - WHATSAPP_VERIFY_TOKEN

3. **AI Models** 🤖
   - OPENAI_API_KEY
   - ANTHROPIC_API_KEY
   - GOOGLE_AI_API_KEY
   - HUGGINGFACE_API_KEY

4. **Payment Gateway** 💳
   - RAZORPAY_KEY_ID
   - RAZORPAY_KEY_SECRET
   - STRIPE_PUBLIC_KEY
   - STRIPE_SECRET_KEY

5. **Email Service** 📧
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_USER
   - SMTP_PASSWORD
   - SENDGRID_API_KEY

6. **SMS Service** 📱
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_PHONE_NUMBER

7. **Cloud Storage** ☁️
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET

8. **Analytics** 📊
   - GOOGLE_ANALYTICS_ID
   - MIXPANEL_TOKEN
   - SEGMENT_WRITE_KEY

9. **Social Media** 📱
   - FACEBOOK_APP_ID
   - FACEBOOK_APP_SECRET
   - TWITTER_API_KEY
   - TWITTER_API_SECRET

10. **Other** ⚙️
    - Custom configurations

## 🗄️ Database Schema

```prisma
model AppConfiguration {
  id          String   @id @default(uuid())
  companyId   String?
  category    String   // Category of the configuration
  key         String   // Configuration key name
  value       String   // Encrypted value
  isActive    Boolean  @default(true)
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?
  
  company     Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, category, key])
  @@index([companyId])
  @@index([category])
}

enum ConfigCategory {
  AWS
  WHATSAPP
  AI_MODELS
  PAYMENT_GATEWAY
  EMAIL_SERVICE
  SMS_SERVICE
  CLOUD_STORAGE
  ANALYTICS
  SOCIAL_MEDIA
  OTHER
}
```

## 🔌 API Endpoints

### GET `/api/settings/configurations`

Fetch configurations with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category
- `showValues` (optional): `true` to decrypt and show actual values
- `companyId` (optional, SUPER_ADMIN only): Filter by company

**Response:**
```json
[
  {
    "id": "uuid",
    "category": "AWS",
    "key": "AWS_ACCESS_KEY_ID",
    "value": "••••••••",
    "maskedValue": "AKIAIOSFODNN7EXAMPLE••••",
    "description": "AWS Access Key for S3",
    "isActive": true,
    "createdAt": "2026-01-13T12:00:00Z"
  }
]
```

### POST `/api/settings/configurations`

Create or update a configuration.

**Request Body:**
```json
{
  "category": "AWS",
  "key": "AWS_ACCESS_KEY_ID",
  "value": "AKIAIOSFODNN7EXAMPLE",
  "description": "AWS Access Key for S3",
  "isActive": true,
  "companyId": "company-uuid" // Optional, SUPER_ADMIN only
}
```

**Response:**
```json
{
  "id": "uuid",
  "category": "AWS",
  "key": "AWS_ACCESS_KEY_ID",
  "value": "••••••••",
  "description": "AWS Access Key for S3",
  "isActive": true
}
```

### DELETE `/api/settings/configurations`

Delete a configuration.

**Query Parameters:**
- `id`: Configuration ID to delete

**Response:**
```json
{
  "success": true
}
```

## 🎨 Frontend Interface

### Access
Navigate to: `/dashboard/settings/configurations`

### Features

1. **Category Tabs**: Visual category selection with icons
2. **Configuration List**: Display all configurations for selected category
3. **Show/Hide Values**: Toggle between masked and actual values
4. **Add Configuration**: Modal dialog for adding new configurations
5. **Delete Configuration**: Remove configurations with confirmation
6. **Predefined Keys**: Dropdown with common keys for each category

### UI Components

- **Category Cards**: Visual selection with icons and colors
- **Configuration Cards**: Display key, value (masked/revealed), description, and status
- **Add Modal**: Form for creating new configurations
- **Show/Hide Toggle**: Button to reveal/mask sensitive values

## 🔒 Security Implementation

### Encryption

```typescript
// Encryption (AES-256-CBC)
function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// Decryption
function decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
```

### Access Control

- **SUPER_ADMIN**: Can manage all configurations across all companies
- **ADMIN**: Can manage only their company's configurations
- **Other Roles**: No access to configuration management

## 📝 Usage Examples

### Adding AWS Credentials

1. Navigate to `/dashboard/settings/configurations`
2. Click "AWS Services" category
3. Click "Add Configuration"
4. Select category: "AWS Services"
5. Select key: "AWS_ACCESS_KEY_ID"
6. Enter value: Your AWS access key
7. Add description (optional)
8. Click "Save Configuration"

### Retrieving Configuration in Code

```typescript
import { getConfigValue } from '@/app/api/settings/configurations/route';

// Get AWS access key
const awsKey = await getConfigValue('AWS', 'AWS_ACCESS_KEY_ID', companyId);

// Get OpenAI API key
const openaiKey = await getConfigValue('AI_MODELS', 'OPENAI_API_KEY');
```

## 🚀 Deployment

### Environment Variables

Set the encryption key in your environment:

```bash
CONFIG_ENCRYPTION_KEY=your-32-character-secret-key-here
```

**Important**: Use a strong, random 32-character key in production!

### Database Migration

The schema has been added and pushed to the database:

```bash
npx prisma db push
```

## 🎯 Benefits

1. **Centralized Management**: All credentials in one place
2. **No Code Changes**: Update keys without redeploying
3. **Security**: Encrypted storage with role-based access
4. **Audit Trail**: Track who created/updated configurations
5. **Multi-Company**: Support for multiple companies with isolated configs
6. **Easy Integration**: Simple API to retrieve values in code

## 📊 Future Enhancements

- [ ] Configuration versioning and rollback
- [ ] Audit logs for all changes
- [ ] Configuration templates
- [ ] Bulk import/export
- [ ] Integration testing tools
- [ ] Configuration validation
- [ ] Expiry dates for credentials
- [ ] Rotation reminders

## 🔧 Troubleshooting

### Values Not Decrypting

Ensure `CONFIG_ENCRYPTION_KEY` environment variable is set and matches the key used for encryption.

### Permission Denied

Only SUPER_ADMIN and ADMIN roles can access configuration management.

### Configuration Not Found

Check that the configuration is active (`isActive: true`) and belongs to the correct company.

## 📚 Related Documentation

- [Prisma Schema](../prisma/schema.prisma)
- [API Routes](../src/app/api/settings/configurations/route.ts)
- [Frontend Page](../src/app/dashboard/settings/configurations/page.tsx)

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** 2026-01-13
