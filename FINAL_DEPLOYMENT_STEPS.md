# Final Deployment Steps - muse.shopping

## ✅ What I've Completed For You

1. ✅ Created `.gitignore` file
2. ✅ Committed all 299 files to Git locally
3. ✅ Created GitHub repository: https://github.com/hbschlac/muse-shopping
4. ✅ Created personal access token: "Muse Shopping Deploy"
5. ✅ Installed GitHub CLI (`gh`)
6. ✅ Installed Vercel CLI (`vercel`)
7. ✅ Created comprehensive deployment guides

## 🔄 What You Need to Complete (5-10 minutes)

### Option 1: GitHub Desktop (EASIEST - Recommended)

**This is the simplest way to push your code:**

1. **Download GitHub Desktop**
   - Go to: https://desktop.github.com
   - Install the app

2. **Add Your Repository**
   - Open GitHub Desktop
   - Click "File" → "Add Local Repository"
   - Navigate to: `/Users/hannahschlacter/Desktop/muse-shopping`
   - Click "Add Repository"

3. **Publish to GitHub**
   - Click the "Publish repository" button
   - Uncheck "Keep this code private" (or keep it checked - your choice)
   - Click "Publish repository"
   - Wait ~30 seconds for upload

4. **Verify**
   - Visit: https://github.com/hbschlac/muse-shopping
   - You should see all 299 files!

---

### Option 2: Command Line with Token

If you prefer terminal:

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping

# You need to get your personal access token
# Go to: https://github.com/settings/tokens
# Click on "Muse Shopping Deploy" token
# If you didn't save it, create a new one:
#   - Click "Generate new token (classic)"
#   - Note: "Muse Deploy Final"
#   - Check: ✅ repo
#   - Click "Generate token"
#   - COPY IT IMMEDIATELY

# Then push:
git remote set-url origin https://github.com/hbschlac/muse-shopping.git
git push -u origin main

# When prompted:
# Username: hbschlac
# Password: [paste your token here]
```

---

## After Code is on GitHub: Deploy to Vercel

### Step 1: Sign in to Vercel
1. Go to: https://vercel.com
2. Click "Sign Up" or "Log In"
3. **Use "Continue with GitHub"** (easiest - auto-connects)

### Step 2: Import Your Repository
1. Click "Add New..." → "Project"
2. You'll see your repositories
3. Find `muse-shopping`
4. Click "Import"

### Step 3: Configure (Leave Defaults)
- Framework Preset: **Other**
- Root Directory: **./  (leave as is)**
- Build Command: **(leave empty)**
- Output Directory: **(leave empty)**
- Install Command: **npm install**

### Step 4: Add Environment Variables

Click "Environment Variables" tab and add these one by one:

#### Required Core Variables:
```
DATABASE_URL = (your database URL - see below for how to get one)
JWT_SECRET = (any long random string, min 32 characters)
ENCRYPTION_KEY = (run command below to generate)
PORT = 3000
NODE_ENV = production
```

**To generate ENCRYPTION_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste as ENCRYPTION_KEY value.

**To generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Optional (if using Gmail):
```
GOOGLE_CLIENT_ID = (from Google Cloud Console)
GOOGLE_CLIENT_SECRET = (from Google Cloud Console)
GOOGLE_REDIRECT_URI = https://muse.shopping/api/auth/google/callback
```

#### Optional (if using Instagram):
```
META_APP_ID = (from Meta Developer Portal)
META_APP_SECRET = (from Meta Developer Portal)
META_REDIRECT_URI = https://muse.shopping/api/social/instagram/callback
```

### Step 5: Get a Database (Supabase - Free)

1. Go to: https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - Name: `muse-shopping`
   - Database Password: **(create a strong password - SAVE IT!)**
   - Region: Choose closest to you
5. Click "Create Project" (takes ~2 minutes)
6. Go to: Settings → Database → Connection String
7. Click "URI" and copy the connection string
8. Replace `[YOUR-PASSWORD]` with your actual password
9. Use this as your `DATABASE_URL` in Vercel

### Step 6: Run Database Migrations

After you have your database URL from Supabase:

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping

# Set your database URL (use the one from Supabase)
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres"

# Run migrations
npm run migrate
```

This will create all 36 tables in your database.

### Step 7: Deploy!

1. Back in Vercel, after adding all environment variables
2. Click "Deploy"
3. Wait 2-3 minutes
4. You'll get a URL like: `muse-shopping-xyz.vercel.app`
5. Click on it to test!

### Step 8: Connect Your Custom Domain

1. In Vercel, go to your project
2. Click "Settings" → "Domains"
3. Add: `muse.shopping`
4. Since you bought it from Vercel, DNS should auto-configure!
5. Also add: `www.muse.shopping` (will redirect to main domain)
6. Wait 5-10 minutes for DNS propagation
7. Visit: https://muse.shopping 🎉

---

## Quick Checklist

- [ ] Push code to GitHub (use GitHub Desktop recommended)
- [ ] Create Supabase database
- [ ] Run database migrations (`npm run migrate`)
- [ ] Sign up for Vercel (use GitHub login)
- [ ] Import repository to Vercel
- [ ] Add environment variables in Vercel
- [ ] Generate ENCRYPTION_KEY and JWT_SECRET
- [ ] Click Deploy
- [ ] Add custom domain: muse.shopping
- [ ] Test at https://muse.shopping

---

## Troubleshooting

### "Can't push to GitHub"
- Use GitHub Desktop (easiest)
- OR create a new personal access token if yours expired

### "Database connection failed"
- Verify DATABASE_URL is correct
- Check Supabase project is running
- Make sure you replaced [YOUR-PASSWORD] with actual password

### "Vercel build fails"
- Check the build logs in Vercel dashboard
- Verify all environment variables are set
- Make sure DATABASE_URL is added

### "Domain not working"
- Wait 10 minutes for DNS propagation
- Check Vercel dashboard → Domains for status
- Verify SSL certificate is provisioned

---

## Your URLs

- **GitHub Repo:** https://github.com/hbschlac/muse-shopping
- **Production Domain:** https://muse.shopping (after deployment)
- **Vercel Dashboard:** https://vercel.com/dashboard

---

## Next Steps After Deployment

Once live, you can:
1. Set up monitoring (UptimeRobot, Sentry)
2. Configure OAuth apps to use production URLs
3. Add more environment variables as needed
4. Set up CI/CD for automatic deployments
5. Build frontend to consume your API
6. Start retailer partnership conversations

You're so close! Just a few more steps to get live! 🚀
