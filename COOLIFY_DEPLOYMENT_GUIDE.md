# Coolify Deployment Guide — IMS (`akweb1024/ims2`)

End-to-end steps to deploy this app on Coolify, including the **manual migration**
flow and the known **build-host OOM** workaround.

- **Repo:** `https://github.com/akweb1024/ims2` (branch `main`)
- **Domain:** `https://ims.panoptical.org`
- **App port:** `3000`
- **Build pack:** Nixpacks (Node 22) — see [`nixpacks.json`](nixpacks.json)
- **Start command:** `bash scripts/start-production.sh` → `bash scripts/start-server.sh`

---

## 0. How this app builds & starts (read first)

Deployment has **two distinct phases**. Knowing which phase you're in is the key
to debugging.

| Phase | Runs | What happens | Migrations? |
|-------|------|--------------|-------------|
| **Build** | On the Coolify build host, while creating the image | `npx prisma generate` → `npx next build` ([`scripts/build-with-heartbeat.sh`](scripts/build-with-heartbeat.sh)) | ❌ No |
| **Start** | When the container boots | env checks → wait for DB → *(migrations, now opt-in)* → `prisma generate` → start server ([`scripts/start-production.sh`](scripts/start-production.sh)) | ⚙️ Opt-in (see §7) |

> ⚠️ **Known issue:** the **build phase** can be OOM-killed on a small host
> (this app has 800+ routes). If your deploy dies silently during
> *"Creating an optimized production build"* with exit code 255/137 and no
> error text, that's the OOM — see **§9**.

---

## 1. Prerequisites

- A running **Coolify** instance with a server connected (Docker + BuildKit).
- This GitHub repo reachable by Coolify (public, or a GitHub App / deploy key).
- A **PostgreSQL** database (Coolify-managed or external) reachable from the app.
- *(Optional)* **Redis**, if you use rate-limiting / queues.
- DNS for `ims.panoptical.org` pointing at the Coolify server.
- All secrets ready (see **§5**). Generate any missing ones:
  ```bash
  # 32-byte secrets for AUTH_SECRET / JWT_SECRET / *_ENCRYPTION_KEY / *_SECRET
  openssl rand -base64 32

  # VAPID keypair for web push
  npx web-push generate-vapid-keys
  ```

---

## 2. Create the application in Coolify

1. **Project → + New → Application.**
2. **Source:** *Public Repository* (or your GitHub App) → URL
   `https://github.com/akweb1024/ims2`.
3. **Branch:** `main`.
4. **Build Pack:** **Nixpacks**. (The repo's [`nixpacks.json`](nixpacks.json) is
   picked up automatically — it pins Node 22 and sets the build/start commands.)
5. Save. Don't deploy yet — set env vars and domain first (§3–§6).

---

## 3. Set the domain & port

1. **Configuration → General.**
2. **Domains:** `https://ims.panoptical.org`
   (Coolify provisions Let's Encrypt TLS automatically once DNS resolves.)
3. **Port (Ports Exposes):** `3000`.
4. Make sure these env vars match the domain (§5):
   `NEXTAUTH_URL=https://ims.panoptical.org`,
   `NEXT_PUBLIC_APP_URL=https://ims.panoptical.org`,
   `AUTH_TRUST_HOST=true`.

---

## 4. Add persistent storage (uploads)

Uploaded files are served via `/uploads/*` → `STORAGE_ROOT_PATH`. Without a
volume, uploads are lost on every redeploy.

1. **Configuration → Storages → + Add.**
2. **Volume mount**, e.g. host `…/ims-storage` → container `/app/storage`.
3. Set env `STORAGE_ROOT_PATH=/app/storage`.

---

## 5. Environment variables

**Configuration → Environment Variables.** Add the following. Mark secrets as
**Build Variable = on** only where the value is needed at *build* time (these are
the ones wired as Docker build-args in this project); everything else is runtime.

> In Coolify, "Build Variable?" toggles whether the var is also passed to the
> build. The vars below marked **(build)** are referenced during `next build`
> (e.g. `NEXT_PUBLIC_*` get inlined into the client bundle).

### Required — core
| Variable | Example / Notes | Build? |
|----------|-----------------|:------:|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/ims?schema=public` | ✅ |
| `AUTH_SECRET` | `openssl rand -base64 32` | ✅ |
| `JWT_SECRET` | `openssl rand -base64 32` | ✅ |
| `NEXTAUTH_URL` | `https://ims.panoptical.org` | ✅ |
| `AUTH_TRUST_HOST` | `true` | ✅ |
| `NEXT_PUBLIC_APP_URL` | `https://ims.panoptical.org` | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `APP_PORT` | `3000` | ✅ |
| `PRISMA_CLIENT_ENGINE_TYPE` | `library` (or as used today) | ✅ |

### Required — encryption / signing
| Variable | Notes | Build? |
|----------|-------|:------:|
| `CONFIG_ENCRYPTION_KEY` | `openssl rand -base64 32` | ✅ |
| `THINK_TANK_ENCRYPTION_KEY` | `openssl rand -base64 32` | ✅ |
| `CRON_SECRET` | protects cron endpoints | ✅ |

### Web push (VAPID)
| Variable | Notes | Build? |
|----------|-------|:------:|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public key from `web-push generate-vapid-keys` | ✅ |
| `VAPID_PRIVATE_KEY` | private key (secret) | ✅ |

### Integrations (set the ones you use)
| Variable | Used for | Build? |
|----------|----------|:------:|
| `GEMINI_API_KEY` | AI features | ✅ |
| `REDIS_URL`, `REDIS_PORT` | Redis | ✅ |
| `WHATSAPP_META_VERIFY_TOKEN`, `WHATSAPP_META_APP_SECRET` | WhatsApp webhook | ✅ |
| `LEAD_WEBHOOK_SECRET`, `NANOSCHOOL_WEBHOOK_SECRET`, `CONFERENCE_SYNC_WEBHOOK_SECRET` | inbound webhooks | ✅ |
| `LMS_INVOICE_COMPANY_ID`, `LMS_INVOICE_BRAND_ID` | invoicing | ✅ |
| `STORAGE_ROOT_PATH` | uploads volume (§4) | ✅ |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | payments | runtime |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_SES_FROM_EMAIL` | S3 / email | runtime |
| `SENTRY_DSN`, `LOG_LEVEL`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | ops | runtime |

### Deployment control (this project)
| Variable | Default | Notes |
|----------|---------|-------|
| `RUN_MIGRATIONS_ON_START` | *(unset → skip)* | Set to `true` to auto-migrate on container start. Leave unset to migrate **manually** (§7). |

> Full reference: [`.env.production.example`](.env.production.example).

---

## 6. First deploy

1. Click **Deploy**.
2. Watch **Logs → Show Debug Logs**. Successful order:
   - `git clone …` → Nixpacks plan → `npm ci` → `npm run build`
   - `✔ Generated Prisma Client` → `Creating an optimized production build …` →
     `Next.js production build completed.`
   - Container starts → `start-production.sh` logs appear.
3. If the build dies during *"Creating an optimized production build"* → **§9**.

---

## 7. Run migrations manually (current setup)

Startup **skips migrations by default** (we made them opt-in). On boot you'll see:

```
⚠ Skipping automatic migrations (RUN_MIGRATIONS_ON_START is not 'true').
  Run them manually: bash scripts/database-migrate.sh
```

Once the container is **running**:

1. Coolify → your app → **Terminal** tab (this `docker exec`s into the container at `/app`).
2. Run:
   ```bash
   bash scripts/database-migrate.sh
   ```
   This wraps `prisma migrate deploy` and also handles:
   - **P3005** (DB has tables, no migration history) → auto-baselines
     `20260301000000_baseline_init`, then applies the rest.
   - **P3009** (a prior migration failed) → prints the exact
     `prisma migrate resolve` command to fix it.
3. Plain alternative if you prefer: `npx prisma migrate deploy`.

**To switch back to automatic migrations later:** set
`RUN_MIGRATIONS_ON_START=true` in env (§5) and redeploy.

---

## 8. Verify the deployment

- **Health check:** `curl -f https://ims.panoptical.org/api/health` → `200`.
  (Optionally set this as the Coolify Health Check path.)
- Log in and click through a couple of core flows.
- Confirm uploads persist across a redeploy (volume from §4).
- Web push: registers only in browsers with a push service (Firefox / full
  Chrome). On unsupported browsers it now degrades quietly — not an error.

---

## 9. ⚠️ Build-host OOM — the known blocker & fixes

**Symptom:** build dies during *"Creating an optimized production build"*,
exit code 255/137, **no** "JavaScript heap out of memory" text. That silent kill
is the **kernel OOM-killer** — the host lacks RAM to compile 800+ routes.

Already in the repo (partial mitigations):
- [`next.config.js`](next.config.js): `cpus:1`, `workerThreads:false`,
  `memoryBasedWorkersCount:true` — bounds the *page-data* phase.
- [`nixpacks.json`](nixpacks.json): `NODE_OPTIONS=--max-old-space-size=2048`.

Pick one durable fix:

### Option A — Build on GitHub runners, deploy the image (recommended)
Don't build on the small host at all. A workflow
([`.github/workflows/deploy-image.yml`](.github/workflows/deploy-image.yml),
introduced in commit `c7f328b6`) builds the image on a 16 GB GitHub runner and
pushes to `ghcr.io/akweb1024/ims2`. Then:
1. In Coolify, change the app's **Build Pack** from *Nixpacks* to
   **Docker Image**, image `ghcr.io/akweb1024/ims2:main` (pull from GHCR).
2. Add repo secrets for auto-trigger (optional): `COOLIFY_WEBHOOK_URL`,
   `COOLIFY_TOKEN`.
> Note: this workflow may need to be restored if it was reverted — check
> `git log -- .github/workflows/deploy-image.yml`.

### Option B — Add swap on the Coolify host (quick)
Lets the compile spill to disk instead of being killed. On the **build server**:
```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # confirm swap is active
```
Then redeploy. Slower builds, but they complete.

### Option C — Shrink the build (uncertain)
Tune memory in-repo (already mostly done). If you instead see an *explicit*
"JavaScript heap out of memory", raise `--max-old-space-size` in
[`nixpacks.json`](nixpacks.json) (e.g. `3072`). Won't help a true host-RAM
shortage.

---

## 10. Redeploys & rollback

- **Redeploy:** push to `main` (Coolify auto-deploys if the webhook is on) or
  click **Deploy**. Re-run migrations manually (§7) if the release adds any.
- **Rollback:** Coolify keeps previous images — **Deployments → pick a previous
  successful deploy → Rollback**. Note: DB migrations are **not** auto-rolled
  back; reverse them deliberately if needed.

---

## 11. Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Silent build death, exit 255/137, no heap error | Build-host OOM | §9 (A/B/C) |
| `JavaScript heap out of memory` during build | V8 heap cap too low | raise `max-old-space-size` in [`nixpacks.json`](nixpacks.json) |
| App boots but `⚠ Skipping automatic migrations` | By design (opt-in) | run §7, or set `RUN_MIGRATIONS_ON_START=true` |
| Migration error `P3005` | DB has tables, no history | `database-migrate.sh` auto-baselines; just re-run §7 |
| Migration error `P3009` | prior migration failed | follow the `prisma migrate resolve` hint the script prints |
| Startup exits: "Required environment variable X is not set" | missing env | add it in §5, redeploy |
| Startup: "Database connection timeout" | DB unreachable | check `DATABASE_URL`, DB up, same network |
| Push "Registration failed - push service not available" | browser has no push backend | expected; degrades quietly (test in Firefox) |
| No TLS / 502 | DNS or domain mismatch | confirm DNS → server, domain + port (§3) |
