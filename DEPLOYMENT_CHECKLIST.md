# 🚀 Production Deployment Checklist

Your live deployment likely failed due to **missing configuration** or **environment variables**. Please verify the following settings in your deployment platform (e.g., Coolify, Vercel, Docker).

## 1. Environment Variables (Required)
These variables MUST be set in your production environment settings.

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DATABASE_URL` | Postgres Connection String | `postgresql://user:password@host:5432/dbname` |
| `AUTH_SECRET` | NextAuth Secret Key | `openssl rand -base64 32` (Generate a random string) |
| `NEXTAUTH_SECRET` | Alias for above (good to set both) | `(same as AUTH_SECRET)` |
| `NEXTAUTH_URL` | **Public Domain** of your app | `https://your-app.com` (Do NOT use localhost) |
| `JWT_SECRET` | Legacy Token Secret | `(same as AUTH_SECRET)` |

> **⚠️ Important:** If using Docker/Coolify, ensure `DATABASE_URL` points to the *container name* (e.g., `postgresql://postgres:pass@stm-postgres:5432/db`) instead of `localhost`.

## 2. Build Configuration
- **Build Command**: `npm run build`
  - This runs `prisma generate && next build`.
- **Start Command**: `npm start`
- **Node Version**: Ensure **Node 18.17+** or **Node 20/22** is selected.
- **Output Directory**: `.next` (Next.js default).

## 3. Common Fixes applied recently
- **Prisma Schema**: I just updated `prisma/schema.prisma` to explicitly use `url = env("DATABASE_URL")`. This fixes common connection issues. **Please redeploy**.
- **Port**: The application listens on port **3000** by default. Ensure your container maps port 3000.

## 4. Debugging
If deployment still fails, check the **Build Logs**:
- If "Prisma Client not initialized": Check DATABASE_URL.
- If "Type Error": We fixed these, ensure you pulled the latest code (`git pull`).
- If "500 Error" on boot: Check `AUTH_SECRET` is set.
