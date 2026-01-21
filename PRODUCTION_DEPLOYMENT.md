# Production Deployment Guide

This comprehensive guide will help you deploy the STM Customer Management System to production.

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Options](#deployment-options)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Docker Deployment](#docker-deployment)
6. [Security Hardening](#security-hardening)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Pre-Deployment Checklist

### Required Items

- [ ] Production PostgreSQL database (v14+)
- [ ] Domain name with SSL certificate
- [ ] Environment variables configured
- [ ] Auth secrets generated
- [ ] Payment gateway credentials (if using Razorpay)
- [ ] Email service configured (AWS SES or SMTP)
- [ ] Backup strategy in place

### Security Requirements

- [ ] Strong passwords for all services
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates installed
- [ ] Security headers enabled (automatic)
- [ ] Rate limiting configured (automatic)
- [ ] Database access restricted to application only

---

## 🚀 Deployment Options

### Option 1: Docker Compose (Recommended)

**Best for:** VPS, dedicated servers, self-hosted environments

```bash
# 1. Clone repository
git clone <your-repo-url>
cd stmCustomer

# 2. Copy and configure environment
cp .env.production.example .env.production
nano .env.production  # Edit with your values

# 3. Generate secrets
openssl rand -base64 32  # For AUTH_SECRET
openssl rand -base64 32  # For JWT_SECRET

# 4. Start services
docker-compose up -d

# 5. Run migrations
docker-compose exec app npx prisma migrate deploy

# 6. (Optional) Seed database
docker-compose exec app npm run seed
```

### Option 2: Platform as a Service

**Best for:** Vercel, Railway, Render, Fly.io

#### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

#### Railway Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway up
```

### Option 3: Manual Deployment

**Best for:** Custom server setups

```bash
# 1. Install dependencies
npm ci --production=false

# 2. Generate Prisma Client
npx prisma generate

# 3. Build application
npm run build

# 4. Run migrations
npx prisma migrate deploy

# 5. Start with PM2 (process manager)
npm install -g pm2
pm2 start npm --name "stm-app" -- start
pm2 save
pm2 startup
```

---

## ⚙️ Environment Configuration

### Critical Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Authentication (generate with: openssl rand -base64 32)
AUTH_SECRET="your-32-char-secret"
NEXTAUTH_URL="https://your-domain.com"
AUTH_TRUST_HOST=true
JWT_SECRET="your-jwt-secret"

# Application
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NODE_ENV=production
```

### Optional Variables

```bash
# Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"

# Payment Gateway
RAZORPAY_KEY_ID="rzp_live_xxxxx"
RAZORPAY_KEY_SECRET="your-secret"

# AWS SES Email
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_LEVEL=info
```

---

## 🗄️ Database Setup

### PostgreSQL Requirements

- **Version:** PostgreSQL 14 or higher
- **Extensions:** None required (Prisma handles everything)
- **Recommended Settings:**
  - `max_connections`: 100
  - `shared_buffers`: 256MB
  - `effective_cache_size`: 1GB

### Initial Setup

```bash
# 1. Create database
createdb stmcustomer

# 2. Run migrations
npx prisma migrate deploy

# 3. Verify connection
npx prisma db execute --stdin <<< "SELECT 1"

# 4. (Optional) Seed initial data
npm run seed
```

### Connection Pooling

For production, consider using connection pooling:

```bash
# Using PgBouncer
DATABASE_URL="postgresql://user:password@pgbouncer:6432/database?pgbouncer=true"
```

---

## 🐳 Docker Deployment

### Using Docker Compose

The included `docker-compose.yml` provides a complete stack:

- **PostgreSQL**: Database server
- **Application**: Next.js app
- **Redis**: (Optional) Caching layer

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Update application
git pull
docker-compose build app
docker-compose up -d app
```

### Production Docker Build

```bash
# Build image
docker build -t stm-customer:latest .

# Run container
docker run -d \
  --name stm-app \
  -p 3000:3000 \
  --env-file .env.production \
  stm-customer:latest
```

### Health Checks

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T11:24:00.000Z",
  "database": "connected",
  "responseTime": "45ms"
}
```

---

## 🔒 Security Hardening

### Automatic Security Features

✅ **Security Headers** (automatic)

- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)

✅ **Rate Limiting** (automatic)

- API endpoints: 60 requests/minute
- Auth endpoints: 5 requests/minute
- Configurable via environment variables

### Additional Recommendations

1. **Firewall Configuration**

   ```bash
   # Allow only necessary ports
   ufw allow 22/tcp   # SSH
   ufw allow 80/tcp   # HTTP
   ufw allow 443/tcp  # HTTPS
   ufw enable
   ```

2. **Database Security**
   - Use strong passwords
   - Restrict access to localhost or VPN
   - Enable SSL connections
   - Regular backups

3. **Reverse Proxy (Nginx)**

   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 📊 Monitoring & Logging

### Application Logs

The application uses structured logging:

```bash
# View logs (Docker)
docker-compose logs -f app

# View logs (PM2)
pm2 logs stm-app

# Set log level
LOG_LEVEL=debug  # error, warn, info, debug
```

### Health Monitoring

Set up automated health checks:

```bash
# Cron job for health monitoring
*/5 * * * * curl -f http://localhost:3000/api/health || echo "Health check failed" | mail -s "STM App Down" admin@example.com
```

### Recommended Monitoring Tools

- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Error Tracking**: Sentry (add SENTRY_DSN to env)
- **Performance**: New Relic, DataDog
- **Logs**: Papertrail, Logtail

---

## 💾 Backup & Recovery

### Automated Database Backups

Use the included backup script:

```bash
# Make script executable
chmod +x scripts/backup-database.sh

# Run manual backup
./scripts/backup-database.sh

# Setup automated backups (cron)
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh
```

### Backup Configuration

```bash
# Environment variables for backup script
BACKUP_DIR=/var/backups/stm
RETENTION_DAYS=7
BACKUP_S3_BUCKET=my-backup-bucket  # Optional: S3 upload
```

### Restore from Backup

```bash
# Restore database
gunzip -c /var/backups/stm/stm_backup_YYYYMMDD_HHMMSS.sql.gz | \
  psql -h localhost -U stmuser -d stmcustomer
```

---

## ⚡ Performance Optimization

### Next.js Optimizations

Already configured in `next.config.js`:

- ✅ Standalone output for smaller Docker images
- ✅ Image optimization
- ✅ Compression enabled
- ✅ Production source maps disabled

### Database Optimizations

```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_customer_email ON "CustomerProfile"(email);
CREATE INDEX idx_subscription_status ON "Subscription"(status);
CREATE INDEX idx_invoice_status ON "Invoice"(status);

-- Analyze tables for query optimization
ANALYZE;
```

### Caching Strategy

Consider adding Redis for:

- Session storage
- API response caching
- Rate limiting (distributed)

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms:** 500 errors, "Can't reach database server"

**Solutions:**

```bash
# Check database is running
docker-compose ps postgres

# Verify DATABASE_URL format
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin <<< "SELECT 1"
```

#### 2. Authentication Errors

**Symptoms:** Login redirects, session errors

**Solutions:**

```bash
# Verify AUTH_SECRET is set and long enough (32+ chars)
echo $AUTH_SECRET | wc -c

# Check NEXTAUTH_URL matches your domain
echo $NEXTAUTH_URL

# Set AUTH_TRUST_HOST if behind proxy
export AUTH_TRUST_HOST=true
```

#### 3. Build Failures

**Symptoms:** Build errors, missing dependencies

**Solutions:**

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### 4. High Memory Usage

**Solutions:**

```bash
# Limit Node.js memory
NODE_OPTIONS="--max-old-space-size=2048" npm start

# Use PM2 with memory limits
pm2 start npm --name stm-app --max-memory-restart 1G -- start
```

### Getting Help

- Check application logs
- Review health check endpoint
- Verify all environment variables
- Check database connectivity
- Review firewall/security group rules

---

## 📞 Support

For production support:

- Review logs: `docker-compose logs -f`
- Check health: `curl http://localhost:3000/api/health`
- Database status: `npx prisma db execute --stdin <<< "SELECT 1"`

---

**Last Updated:** January 2025
**Version:** 1.0.0
