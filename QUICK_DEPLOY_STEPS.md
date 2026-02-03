# Quick Deploy Steps for muse.shopping

## Status
✅ GitHub repository created: https://github.com/hbschlac/muse-shopping
✅ Personal access token created: "Muse Shopping Deploy"
✅ All code committed locally (299 files)
⏳ Need to: Push code & Deploy to Vercel

---

## Option 1: Use GitHub Desktop (EASIEST - 5 minutes)

### Step 1: Install GitHub Desktop
1. Download from: https://desktop.github.com
2. Install and open
3. Sign in with your GitHub account

### Step 2: Add Your Repository
1. Click "File" → "Add Local Repository"
2. Click "Choose..." and navigate to: `/Users/hannahschlacter/Desktop/muse-shopping`
3. Click "Add Repository"

### Step 3: Push to GitHub
1. You should see "Publish repository" button
2. Click it
3. Select "Keep code private" or "public" (your choice)
4. Click "Publish repository"
5. Wait ~30 seconds for upload to complete

### Step 4: Verify
Visit: https://github.com/hbschlac/muse-shopping
You should see all 299 files!

---

## Option 2: Command Line (If you prefer terminal)

### Get Your Personal Access Token
1. The token was already created: "Muse Shopping Deploy"
2. If you didn't save it, create a new one:
   - Go to: https://github.com/settings/tokens/new
   - Note: "Muse Deploy 2"
   - Expiration: 90 days
   - Check: ✅ repo (all boxes)
   - Click "Generate token"
   - **COPY IT** - you won't see it again!

### Push Code
```bash
cd /Users/hannahschlacter/Desktop/muse-shopping

# Set remote (change to HTTPS)
git remote remove origin
git remote add origin https://github.com/hbschlac/muse-shopping.git

# Push (will ask for username and password)
git push -u origin main

# When prompted:
# Username: hbschlac
# Password: [paste your personal access token here]
```

---

## After Code is Pushed: Deploy to Vercel

### Step 1: Go to Vercel
1. Visit: https://vercel.com
2. Sign in (use GitHub to sign in if possible)

### Step 2: Import Project
1. Click "Add New..." → "Project"
2. You should see your `muse-shopping` repository
3. Click "Import"

### Step 3: Configure Project
Leave everything as default:
- Framework Preset: Other
- Root Directory: ./
- Build Command: (leave empty)
- Output Directory: (leave empty)

### Step 4: Add Environment Variables (IMPORTANT!)

Click "Environment Variables" and add these:

**Required:**
```
DATABASE_URL=your_postgresql_url_here
JWT_SECRET=your_secret_here
ENCRYPTION_KEY=run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PORT=3000
NODE_ENV=production
```

To generate ENCRYPTION_KEY, run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Gmail (if using):**
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://muse.shopping/api/auth/google/callback
```

**Instagram (if using):**
```
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://muse.shopping/api/social/instagram/callback
```

### Step 5: Deploy!
1. Click "Deploy"
2. Wait 2-3 minutes
3. You'll get a URL like: `muse-shopping-xyz.vercel.app`

### Step 6: Add Your Custom Domain
1. Go to project Settings → Domains
2. Add: `muse.shopping`
3. Since you bought it from Vercel, it should auto-configure!
4. Also add: `www.muse.shopping` (will redirect to main)

---

## Database Setup

You'll need a PostgreSQL database. Easiest option:

### Supabase (Free Tier)
1. Go to: https://supabase.com
2. Create account
3. New Project → "muse-shopping"
4. Create strong password (SAVE IT!)
5. Wait 2 mins for creation
6. Go to Settings → Database → Connection String
7. Copy the URI (looks like: `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`)
8. Use this as your `DATABASE_URL` in Vercel

### Run Migrations
```bash
# Set database URL
export DATABASE_URL="your_supabase_url_here"

# Run migrations
cd /Users/hannahschlacter/Desktop/muse-shopping
npm run migrate
```

---

## Quick Checklist

- [ ] Push code to GitHub (use GitHub Desktop or command line)
- [ ] Set up Supabase database
- [ ] Run database migrations
- [ ] Deploy to Vercel
- [ ] Add environment variables in Vercel
- [ ] Connect muse.shopping domain
- [ ] Test at https://muse.shopping

---

## Need Help?

If you get stuck:
1. Check that code is on GitHub: https://github.com/hbschlac/muse-shopping
2. Make sure database URL is correct
3. Verify all environment variables are set in Vercel
4. Check Vercel deployment logs for errors

**Your domain:** muse.shopping
**Your repo:** https://github.com/hbschlac/muse-shopping

You're almost there! 🚀
