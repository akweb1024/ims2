# 🌐 Domain Configuration for ims.pnaoptical.org

You must configure the following Environment Variables in your deployment settings (Coolify/Vercel/etc.) to match your public domain.

## 1. Required Variables

| Variable Name | Value | Purpose |
|---------------|-------|---------|
| `NEXTAUTH_URL` | `https://ims.pnaoptical.org` | Used by NextAuth for callbacks and redirects. |
| `NEXT_PUBLIC_APP_URL` | `https://ims.pnaoptical.org` | **Critical** for Email Links & Notification Links to work correctly. |
| `AUTH_TRUST_HOST` | `true` | Required when running behind a proxy (like Nginx/Coolify). |

## 2. Important Notes
- **No Trailing Slash**: Ensure the URL does **NOT** end with a `/`.
  - ✅ Correct: `https://ims.pnaoptical.org`
  - ❌ Incorrect: `https://ims.pnaoptical.org/`
- **HTTPS**: Always use `https://`.

## 3. After Updating
Once you update these variables, **Redeploy** the application for changes to take effect.
