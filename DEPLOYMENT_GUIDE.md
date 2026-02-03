# Deployment Guide: muse.shopping

## Overview
This guide will walk you through deploying the Muse platform to your `muse.shopping` domain using Vercel.

---

## Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository:
   - **Repository name:** `muse-shopping`
   - **Description:** "Multi-store fashion shopping platform with OAuth checkout"
   - **Visibility:** Private (recommended)
   - **DO NOT** check any initialization options (we already have the code)
3. Click "Create repository"

## Step 2: Push Code to GitHub

GitHub will show you commands. Run these in your terminal:

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping

# Add GitHub as remote (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/muse-shopping.git

# Push code to GitHub
git push -u origin main
```

**Verify:** Refresh your GitHub repository page - you should see all 299 files.

---

## Step 3: Set Up Database (Before Vercel)

Your app needs a PostgreSQL database accessible from the internet. **Recommended: Supabase (free tier)**

### Option A: Supabase (Recommended - Free Tier)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Fill in:
   - Name: `muse-shopping`
   - Database Password: (create a strong password - save it!)
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)
5. Go to Settings → Database → Connection String
6. Copy the "URI" connection string (looks like: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`)
7. Replace `[PASSWORD]` with your actual password

### Run Migrations

Once you have your database URL:

```bash
# From your project directory
cd /Users/hannahschlacter/Desktop/muse-shopping

# Set the database URL (use your actual Supabase URL)
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres"

# Run migrations
npm run migrate
```

This will create all 36 database tables.

---

## Step 4: Deploy to Vercel

### Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub login)
2. Click "Add New..." → "Project"
3. Find your `muse-shopping` repository and click "Import"
4. Configure project:
   - **Framework Preset:** Other
   - **Root Directory:** ./
   - **Build Command:** Leave empty (or `npm install`)
   - **Output Directory:** Leave empty
   - **Install Command:** `npm install`
5. **DO NOT DEPLOY YET** - Click "Environment Variables" first

### Add Environment Variables

Click the "Environment Variables" tab and add these one by one:

#### Required (Core System)
```
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
ENCRYPTION_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
PORT=3000
NODE_ENV=production
```

**To generate ENCRYPTION_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Gmail Integration (if using)
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://muse.shopping/api/auth/google/callback
```

#### Instagram Integration (if using)
```
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_REDIRECT_URI=https://muse.shopping/api/social/instagram/callback
DATA_DELETION_CALLBACK_URL=https://muse.shopping/api/data-deletion
```

#### Stripe (if using)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Retailer OAuth (add when you get partnerships)
```
TARGET_CLIENT_ID=
TARGET_CLIENT_SECRET=
TARGET_API_BASE_URL=https://api.target.com/partners/v1

WALMART_CLIENT_ID=
WALMART_CLIENT_SECRET=
WALMART_API_BASE_URL=https://marketplace.walmartapis.com/v3

NORDSTROM_CLIENT_ID=
NORDSTROM_CLIENT_SECRET=
NORDSTROM_API_BASE_URL=https://api.nordstrom.com/v1
NORDSTROM_PARTNER_ID=muse
```

**Important:** For all environment variables, select "Production, Preview, and Development" unless you need different values per environment.

### Deploy

1. After adding all environment variables, click "Deploy"
2. Vercel will build and deploy your app (~2-3 minutes)
3. You'll get a temporary URL like `muse-shopping-xyz.vercel.app`
4. Test this URL to make sure everything works

---

## Step 5: Connect Your Custom Domain

### In Vercel Dashboard

1. Go to your project in Vercel
2. Click "Settings" → "Domains"
3. Add your domain: `muse.shopping`
4. Also add: `www.muse.shopping` (will redirect to main domain)

### Configure DNS

Vercel will show you DNS records to add. Since you bought the domain from Vercel, it might already be configured! But verify:

**If DNS is NOT automatic:**

Go to your domain registrar (wherever you manage `muse.shopping`) and add these DNS records:

**For `muse.shopping`:**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21`

**For `www.muse.shopping`:**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

**Wait for DNS propagation** (can take 5 minutes to 48 hours, usually ~10 minutes)

### Verify

1. Visit `https://muse.shopping` in your browser
2. You should see your app!
3. Check that it has a valid SSL certificate (🔒 lock icon)

---

## Step 6: Update OAuth Redirect URIs

Now that you have `muse.shopping` live, update your OAuth apps:

### Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project → APIs & Services → Credentials
3. Click your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   - `https://muse.shopping/api/auth/google/callback`
5. Save

### Meta Developer Console (Instagram)
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Select your app
3. Instagram Basic Display → Settings
4. Update OAuth Redirect URIs:
   - `https://muse.shopping/api/social/instagram/callback`
5. Update Data Deletion Request URL:
   - `https://muse.shopping/api/data-deletion`
6. Save

---

## Step 7: Test Everything

### Test Core Functionality
```bash
# Health check
curl https://muse.shopping/api/health

# Should return:
# {"success":true,"data":{"status":"healthy","timestamp":"...","uptime":...}}
```

### Test Key Endpoints
- ✅ `GET https://muse.shopping/api/health` - Health check
- ✅ `POST https://muse.shopping/api/auth/register` - User registration
- ✅ `GET https://muse.shopping/api/brands` - Brand search
- ✅ `GET https://muse.shopping/api/products` - Product search
- ✅ Gmail OAuth flow (if configured)
- ✅ Instagram OAuth flow (if configured)

---

## Step 8: Monitor Deployment

### Vercel Dashboard
- **Deployments:** See all deployments and their status
- **Logs:** Real-time application logs
- **Analytics:** Traffic and performance metrics

### Set Up Monitoring (Recommended)

1. **Error Tracking:** Set up [Sentry](https://sentry.io) (free tier available)
2. **Uptime Monitoring:** Set up [UptimeRobot](https://uptimerobot.com) (free)
3. **Database Monitoring:** Use Supabase dashboard

---

## Continuous Deployment

Now that everything is connected, automatic deployments are set up:

1. Make changes to your code locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
3. Vercel automatically detects the push and deploys
4. Check Vercel dashboard for deployment status
5. Changes go live at `https://muse.shopping` in ~2-3 minutes

---

## Environment-Specific URLs

After deployment, you'll have:

- **Production:** `https://muse.shopping` (your custom domain)
- **Preview:** `https://muse-shopping-git-branch-name.vercel.app` (for feature branches)
- **Development:** `http://localhost:3000` (local development)

---

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Database Connection Fails
- Verify `DATABASE_URL` is correct
- Check Supabase project is running
- Ensure database allows external connections

### OAuth Not Working
- Verify redirect URIs match exactly (https vs http, trailing slash)
- Check environment variables are set correctly
- Ensure OAuth apps are in production mode (not dev/test)

### SSL Certificate Issues
- Wait a few minutes - Vercel auto-provisions SSL
- Verify domain DNS is pointing to Vercel
- Check Vercel dashboard for SSL status

---

## Security Checklist

Before going live to users:

- [ ] All environment variables set in Vercel (not hardcoded)
- [ ] `NODE_ENV=production` in Vercel
- [ ] Database has strong password
- [ ] JWT_SECRET is random and secure (32+ characters)
- [ ] ENCRYPTION_KEY generated with crypto.randomBytes
- [ ] OAuth apps use HTTPS redirect URIs
- [ ] Rate limiting enabled (already in code)
- [ ] CORS configured for your domain only
- [ ] SSL certificate active (🔒)
- [ ] Test all OAuth flows on production domain
- [ ] No sensitive data in logs

---

## Quick Reference: Common Commands

```bash
# Check deployment status
vercel --prod

# View logs
vercel logs

# Pull environment variables from Vercel (for local dev)
vercel env pull

# Deploy specific branch
vercel --prod --force

# Rollback to previous deployment
# (Do this in Vercel dashboard → Deployments → click previous → "Promote to Production")
```

---

## What's Next?

After deployment:

1. **Set up analytics** - Add Google Analytics or similar
2. **Configure error tracking** - Set up Sentry
3. **Create staging environment** - Use Vercel preview deployments for testing
4. **Set up monitoring** - UptimeRobot for uptime alerts
5. **Plan retailer partnerships** - Target, Walmart, Nordstrom OAuth
6. **Build frontend** - React/Next.js app to consume your API
7. **Mobile apps** - iOS/Android apps (React Native or native)

---

## Support Resources

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Node.js on Vercel:** [vercel.com/docs/runtimes/node-js](https://vercel.com/docs/runtimes/node-js)

---

## Your Deployment URLs

After following this guide, your app will be live at:

🌐 **Production:** https://muse.shopping
🌐 **WWW Redirect:** https://www.muse.shopping → https://muse.shopping

🎉 **You're ready to deploy!**
