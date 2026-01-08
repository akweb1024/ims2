# 🛑 Troubleshooting Login Error (500)

If you are redirected to `/api/auth/error` after login, it means the server crashed during the login process. Here are the 3 most common reasons and fixes.

## 1. ⚠️ Port 3000 Configuration
> **User Question:** "What about port 3000?"

**Answer:** You do **NOT** need to include `:3000` in your URLs.
- Your app runs on Port 3000 *internally*.
- The domain `https://ims.pnaoptical.org` automatically routes traffic to it.
- **Action:** Ensure `NEXTAUTH_URL` is set to `https://ims.pnaoptical.org` (No port, no trailing slash).

## 2. 🔐 Trust Host (Required for Proxies)
Since your app is behind a domain (Coolify/Nginx), NextAuth needs to know it's safe to trust the forwarded headers.
- **Action:** Add this Environment Variable:
  ```env
  AUTH_TRUST_HOST=true
  ```

## 3. 🔌 Database Connection Failure
The "Server Error" often happens if the app cannot connect to the database.
- **Check**: Did you add `DATABASE_URL` to your Coolify/Env settings?
- **Verify**: The URL you provided `postgres://...@c0wssw...:5432/...` allows connections from the application container.
  - Since you are using Coolify, ensure both containers are on the **same network** (usually automated).

## 📝 Final Checklist for Variables
Set these 4 variables in your deployment and **Redeploy**:

1.  `DATABASE_URL` = `postgres://postgres:pczuMDfpoQe0KVKrbd6FW0IsuD3TaOHgKf42uaWOGxiEOLCN6cEte5Fl1tf2CuE4@c0wssw0w8wgk4gkc0kgc48os:5432/stm_customer?schema=public`
2.  `NEXTAUTH_URL` = `https://ims.pnaoptical.org`
3.  `NEXT_PUBLIC_APP_URL` = `https://ims.pnaoptical.org`
4.  `AUTH_TRUST_HOST` = `true`

Once these are set, the error should disappear.
