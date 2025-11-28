# Railway Deployment Guide - Quick Start

## 🚀 Deploy Your Invoice Processing System to Railway

### Why Railway?
- ✅ Fastest deployment (5-10 minutes)
- ✅ MySQL database included
- ✅ Automatic HTTPS/SSL
- ✅ Free trial, then $5-20/month
- ✅ Can add custom domain: invoices.printo.in

---

## 📋 Step-by-Step Deployment

### Step 1: Sign Up & Connect GitHub (2 minutes)

1. Go to **[railway.app](https://railway.app)**
2. Click **"Login with GitHub"**
3. Authorize Railway
4. You're in!

---

### Step 2: Create New Project (1 minute)

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose: **`nehaprinto/invoice-processing-system`**
4. Railway starts deploying automatically

**What happens:**
- Railway detects Node.js
- Runs `npm install`
- Starts your app with `npm start`

---

### Step 3: Add MySQL Database (1 minute)

1. In project dashboard, click **"+ New"**
2. Select **"Database"** → **"MySQL"**
3. Railway creates database and adds these variables automatically:
   - `MYSQL_URL`
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_DATABASE`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`

**Note:** Your app needs these variable names instead:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

We'll map them in the next step.

---

### Step 4: Configure Environment Variables (3 minutes)

1. Click on your **app service** (invoice-processing-system)
2. Go to **"Variables"** tab
3. Click **"RAW Editor"**
4. Paste this configuration:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-vision-preview

# Server
PORT=3000
NODE_ENV=production

# Database (Reference Railway's MySQL variables)
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_PORT=${{MySQL.MYSQL_PORT}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=paste_generated_secret_here

# JWT Expiration
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,png,jpg,jpeg,tiff

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important:**
- Replace `your_openai_api_key_here` with your actual OpenAI API key
- Generate JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- The `${{MySQL.VARIABLE}}` syntax references Railway's auto-generated MySQL variables

---

### Step 5: Generate Public Domain (1 minute)

1. Go to **"Settings"** tab of your app service
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. Railway gives you a URL like: `https://invoice-processing-production.up.railway.app`

**✅ Your app is now LIVE!**

---

### Step 6: Test Your Deployment

1. Visit your Railway URL
2. You should see the login page
3. Click **"Register"** and create an account
4. Upload a test invoice
5. Verify extraction works

---

## 🌐 Add Custom Domain (Optional)

To use `invoices.printo.in` instead of Railway's default domain:

### Step 1: In Railway Dashboard

1. Go to your app service → **"Settings"** → **"Networking"**
2. Click **"Custom Domain"**
3. Enter: `invoices.printo.in`
4. Railway will show you DNS records to add

### Step 2: Configure DNS at Your Domain Registrar

Add these DNS records for `printo.in`:

```
Type: CNAME
Name: invoices
Value: <provided by Railway>
TTL: 3600
```

### Step 3: Wait for DNS Propagation

- Usually takes 5-15 minutes
- Railway will automatically provision SSL certificate
- Your app will be available at: `https://invoices.printo.in`

---

## 📊 Setting Up Staging Environment

To have both staging and production:

### Option 1: Two Railway Projects (Recommended)

**Staging:**
1. Create new Railway project
2. Deploy same GitHub repo
3. Add MySQL database
4. Use different environment variables (staging database, etc.)
5. Custom domain: `staging.invoices.printo.in`

**Production:**
1. Your current Railway project
2. Custom domain: `invoices.printo.in`

### Option 2: Railway Environments (Single Project)

1. In Railway project, click **"Settings"**
2. Create multiple environments
3. Each environment has separate variables and databases

---

## 💰 Pricing

### Free Trial
- $5 free credit
- Good for initial testing

### Paid Plans
- **Hobby**: $5/month minimum
- **Usage-based**: ~$15-20/month for your app
- **MySQL Database**: Included in usage

### Estimated Monthly Cost
- App + MySQL: **$15-20/month**
- Two environments (staging + prod): **$30-40/month**

---

## 🔧 Troubleshooting

### App crashes on startup

**Check logs:**
1. Go to your service in Railway
2. Click **"Deployments"**
3. View logs for errors

**Common issues:**
- Missing environment variables
- Database connection failed
- OpenAI API key invalid

### Database connection error

**Verify variables:**
1. Check that MySQL service is running
2. Verify `DB_*` variables are correctly referencing `${{MySQL.*}}`
3. Restart the deployment

### OpenAI extraction not working

**Check API key:**
1. Verify `OPENAI_API_KEY` is set correctly
2. Check OpenAI account has credits
3. App will fall back to mock data if API fails

---

## 📈 Monitoring

### View Logs
1. Go to your service
2. Click **"Deployments"**
3. Click on latest deployment
4. View real-time logs

### View Metrics
1. Go to **"Metrics"** tab
2. See CPU, Memory, Network usage

### Set Up Alerts
1. Go to **"Settings"**
2. Configure webhooks for deployment notifications

---

## 🔄 Updating Your App

When you make code changes:

1. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Update feature"
   git push
   ```

2. **Railway auto-deploys:**
   - Detects GitHub push
   - Automatically builds and deploys
   - Zero downtime deployment

---

## ✅ Post-Deployment Checklist

- [ ] App is accessible via Railway URL
- [ ] Custom domain configured (if needed)
- [ ] Register test user account
- [ ] Upload test invoice
- [ ] Verify data extraction works
- [ ] Test export functionality (CSV, JSON, XML)
- [ ] Check dashboard statistics
- [ ] Test on mobile device
- [ ] Share URL with team

---

## 🚀 Your Live URLs

After deployment, save these:

- **Railway URL**: `https://invoice-processing-production.up.railway.app`
- **Custom Domain**: `https://invoices.printo.in` (after DNS setup)
- **GitHub Repo**: `https://github.com/nehaprinto/invoice-processing-system`
- **Railway Dashboard**: `https://railway.app/dashboard`

---

## 📞 Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: Join for community support
- **GitHub Issues**: Report bugs in your repo

---

## 🎉 Success!

Your Invoice Processing System is now:
- ✅ Live on the internet
- ✅ Accessible from anywhere
- ✅ Automatic HTTPS/SSL
- ✅ Auto-scaling
- ✅ Continuous deployment from GitHub

Share your URL with your team and start processing invoices! 🚀
