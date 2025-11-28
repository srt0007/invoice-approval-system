# Invoice Processing System - Deployment Guide

## Overview

This guide covers deploying the Invoice Processing System to:
- **Staging**: `staging.invoices.printo.in`
- **Production**: `invoices.printo.in`

## Prerequisites

- Ubuntu 20.04 or 22.04 server (DigitalOcean/AWS/Azure)
- Domain access to configure DNS for `printo.in`
- SSH access to the server
- MySQL 8.0 database
- Node.js 18+ and npm

---

## Step 1: Server Setup

### 1.1 Create Two Droplets/Servers (Recommended)

**Option A: Separate Servers (Recommended for Production)**
- **Staging Server**: 2GB RAM, 1 CPU (DigitalOcean $12/month)
- **Production Server**: 4GB RAM, 2 CPUs (DigitalOcean $24/month)

**Option B: Single Server (Cost-effective)**
- Single Server: 4GB RAM, 2 CPUs running both environments on different ports

### 1.2 Initial Server Configuration

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install MySQL
apt install -y mysql-server

# Install Nginx
apt install -y nginx

# Install PM2 globally
npm install -g pm2

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Install Git
apt install -y git
```

---

## Step 2: MySQL Database Setup

### 2.1 Create Databases

```bash
# Login to MySQL
mysql -u root -p

# In MySQL shell:
CREATE DATABASE invoice_processing_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE invoice_processing_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create database user
CREATE USER 'invoice_user'@'localhost' IDENTIFIED BY 'your-strong-password';

# Grant privileges
GRANT ALL PRIVILEGES ON invoice_processing_staging.* TO 'invoice_user'@'localhost';
GRANT ALL PRIVILEGES ON invoice_processing_production.* TO 'invoice_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

---

## Step 3: Deploy Application Code

### 3.1 Clone Repository

```bash
# Create application directory
mkdir -p /var/www
cd /var/www

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/your-username/invoice-processing-system.git
cd invoice-processing-system

# Install dependencies
npm ci --production
```

### 3.2 Configure Environment Files

```bash
# Copy environment files
cp .env.staging.example .env.staging
cp .env.production.example .env.production

# Edit staging environment
nano .env.staging

# Edit production environment
nano .env.production
```

**Update these critical values:**
- `OPENAI_API_KEY`: Your OpenAI API key
- `DB_HOST`: `localhost`
- `DB_USER`: `invoice_user`
- `DB_PASSWORD`: The password you set above
- `JWT_SECRET`: Generate using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3.3 Run Database Migrations

```bash
# For staging
NODE_ENV=staging npm run migrate

# For production
NODE_ENV=production npm run migrate
```

### 3.4 Create Upload Directory

```bash
mkdir -p uploads
chmod 755 uploads
```

---

## Step 4: Configure DNS Records

Go to your domain registrar (where you manage `printo.in`) and add these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | staging.invoices | Your staging server IP | 3600 |
| A | invoices | Your production server IP | 3600 |

**Note**: If using a single server, both A records point to the same IP.

Wait 5-15 minutes for DNS propagation.

---

## Step 5: Configure SSL Certificates

```bash
# For staging
certbot --nginx -d staging.invoices.printo.in

# For production
certbot --nginx -d invoices.printo.in

# Test auto-renewal
certbot renew --dry-run
```

---

## Step 6: Configure Nginx

### 6.1 Copy Nginx Configuration Files

```bash
# Copy staging config
cp nginx-staging.conf /etc/nginx/sites-available/staging.invoices.printo.in

# Copy production config
cp nginx-production.conf /etc/nginx/sites-available/invoices.printo.in

# Enable sites
ln -s /etc/nginx/sites-available/staging.invoices.printo.in /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/invoices.printo.in /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

## Step 7: Start Applications with PM2

```bash
# Start both environments
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Check status
pm2 status
```

---

## Step 8: Configure Firewall

```bash
# Allow SSH
ufw allow OpenSSH

# Allow HTTP and HTTPS
ufw allow 'Nginx Full'

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## Step 9: Verify Deployment

### 9.1 Check Staging

```bash
# Visit in browser
https://staging.invoices.printo.in

# Check logs
pm2 logs invoice-processing-staging --lines 50
```

### 9.2 Check Production

```bash
# Visit in browser
https://invoices.printo.in

# Check logs
pm2 logs invoice-processing-production --lines 50
```

---

## Step 10: Deployment Workflow

### Deploy to Staging

```bash
cd /var/www/invoice-processing-system
./deploy.sh staging
```

### Test on Staging

1. Visit `https://staging.invoices.printo.in`
2. Register a test account
3. Upload test invoices
4. Verify all features work

### Deploy to Production (after staging tests pass)

```bash
cd /var/www/invoice-processing-system
./deploy.sh production
```

---

## Monitoring & Maintenance

### View Logs

```bash
# Staging logs
pm2 logs invoice-processing-staging

# Production logs
pm2 logs invoice-processing-production

# Nginx logs
tail -f /var/log/nginx/invoices.printo.in.access.log
tail -f /var/log/nginx/invoices.printo.in.error.log
```

### Check Application Status

```bash
pm2 status
pm2 monit
```

### Database Backup

```bash
# Backup production database
mysqldump -u invoice_user -p invoice_processing_production > backup-$(date +%Y%m%d).sql

# Restore database
mysql -u invoice_user -p invoice_processing_production < backup-20250126.sql
```

---

## Estimated Costs

### DigitalOcean (Recommended)

| Environment | Specs | Cost/Month |
|-------------|-------|------------|
| Staging | 2GB RAM, 1 CPU | $12 |
| Production | 4GB RAM, 2 CPUs | $24 |
| **Total** | | **$36/month** |

### AWS EC2

| Environment | Instance Type | Cost/Month |
|-------------|--------------|------------|
| Staging | t3.small | ~$15 |
| Production | t3.medium | ~$30 |
| **Total** | | **$45/month** |

### Single Server (Cost-effective)

| Environment | Specs | Cost/Month |
|-------------|-------|------------|
| Both | 4GB RAM, 2 CPUs | $24 |

---

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs --err

# Check if port is already in use
netstat -tulpn | grep :3000

# Restart PM2
pm2 restart all
```

### SSL Certificate Issues

```bash
# Re-run certbot
certbot --nginx -d invoices.printo.in

# Check certificate expiry
certbot certificates
```

### Database Connection Errors

```bash
# Test MySQL connection
mysql -u invoice_user -p -h localhost

# Check if MySQL is running
systemctl status mysql

# Restart MySQL
systemctl restart mysql
```

---

## Security Checklist

- [ ] Firewall (UFW) enabled
- [ ] SSH key-based authentication only (disable password login)
- [ ] SSL certificates installed and auto-renewing
- [ ] Strong database passwords
- [ ] JWT secret is random and secure
- [ ] Environment files (.env) are not committed to git
- [ ] File upload directory has correct permissions
- [ ] Nginx security headers configured
- [ ] Regular database backups scheduled
- [ ] PM2 monitoring enabled

---

## Next Steps

1. Set up automated backups (database + uploads)
2. Configure monitoring (Uptime Robot, New Relic, or PM2 Plus)
3. Set up error tracking (Sentry)
4. Configure email notifications for critical errors
5. Set up CI/CD pipeline (GitHub Actions)

---

## Support

For issues or questions:
- Check logs: `pm2 logs`
- Check Nginx logs: `/var/log/nginx/`
- Review this guide's troubleshooting section
