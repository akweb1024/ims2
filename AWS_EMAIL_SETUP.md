# AWS SES Email Configuration

I have upgraded your email system to use **AWS SES** (Simple Email Service) via the official AWS SDK v3.

## How it works
The system now checks for `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your environment variables.
- **If found**: It uses AWS SES (via SDK) to send emails.
- **If missing**: It falls back to the standard SMTP configuration (e.g., Ethereal/Gmail).

## Configuration
Ensure your `.env` file typically contains:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1  # or your specific region
EMAIL_FROM=no-reply@yourdomain.com
```

## Profile Images
I also fixed the profile image upload issue:
1.  **Directory Creation**: The upload API now automatically creates the `public/uploads` folder if it's missing.
2.  **Allowed Domains**: `next.config.js` now permits images from `*.amazonaws.com` (useful if you switch to S3 storage later).

## Next Steps
Since I installed new dependencies (`@aws-sdk/client-ses`), please restart your development server:

```bash
npm run dev
```
