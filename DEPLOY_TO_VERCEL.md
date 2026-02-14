# Deploy to Vercel - Final Steps 🚀

**Status:** Ready to deploy!
**Projects:** Both backend and frontend already linked to Vercel

---

## 📋 Pre-Flight Checklist

✅ Latency testing complete
✅ Database migrations applied (all 68)
✅ Critical bugs fixed (items endpoint)
✅ Performance optimizations active
✅ Vercel projects linked:
  - Backend: `muse-shopping`
  - Frontend: `frontend`

---

## 🚀 Deployment Commands

### Step 1: Deploy Backend

```bash
# From project root
cd /Users/hannahschlacter/Desktop/muse-shopping

# Deploy to production
vercel --prod
```

**Expected output:**
```
🔍  Inspect: https://vercel.com/...
✅  Production: https://muse-shopping-xxx.vercel.app
```

---

### Step 2: Deploy Frontend

```bash
# Navigate to frontend
cd frontend

# Deploy to production
vercel --prod
```

**Expected output:**
```
🔍  Inspect: https://vercel.com/...
✅  Production: https://frontend-xxx.vercel.app
```

---

## ⚙️ Environment Variables to Set

After deployment, you MUST set these environment variables in the Vercel dashboard.

### Backend Environment Variables

Go to: https://vercel.com/[your-team]/muse-shopping/settings/environment-variables

**Required (CRITICAL):**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# OpenAI
OPENAI_API_KEY=sk-...

# Environment
NODE_ENV=production
```

**Performance & Cache (Recommended):**
```bash
# Database Performance
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_MAX_SERVERLESS=2
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=20000

# Cache Configuration
PERSONALIZATION_CACHE_SIZE=1000
PERSONALIZATION_CACHE_TTL=300000
ITEM_CACHE_SIZE=500
ITEM_CACHE_TTL=180000

# Performance Monitoring
SLOW_REQUEST_THRESHOLD_MS=2000
CRITICAL_SLOW_THRESHOLD_MS=5000
```

**Optional (if using email, OAuth, etc.):**
```bash
# Email (if configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# Google OAuth (if configured)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-backend.vercel.app/api/v1/auth/google/callback

# Meta OAuth (if configured)
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=https://your-backend.vercel.app/api/v1/auth/meta/callback
```

### Frontend Environment Variables

Go to: https://vercel.com/[your-team]/frontend/settings/environment-variables

**Required:**
```bash
NEXT_PUBLIC_API_URL=https://muse-shopping-xxx.vercel.app/api/v1
```

**Important:** Replace `muse-shopping-xxx.vercel.app` with your actual backend URL from Step 1!

---

## 🧪 Post-Deployment Testing

After deploying both backend and frontend:

### Test Backend

```bash
# Replace with your actual backend URL
BACKEND_URL="https://muse-shopping-xxx.vercel.app"

# 1. Test health endpoint
curl "$BACKEND_URL/api/v1/health"
# Expected: {"success":true,"data":{"status":"healthy",...}}

# 2. Test items endpoint (the one we fixed!)
curl "$BACKEND_URL/api/v1/items?limit=5"
# Expected: {"success":true,"data":{"items":[...]}}

# 3. Test detailed health
curl "$BACKEND_URL/api/v1/health/detailed"
# Expected: Pool stats, uptime, etc.
```

### Test Frontend

1. Open your frontend URL in a browser
2. Verify the homepage loads
3. Check that API calls work (products load, etc.)
4. Test authentication flow
5. Test cart functionality

---

## 🔧 Troubleshooting

### If backend returns errors:

**1. Check environment variables are set:**
- Go to Vercel dashboard → Settings → Environment Variables
- Ensure DATABASE_URL, JWT_SECRET, etc. are all set
- Click "Redeploy" after adding variables

**2. Check database connection:**
```bash
curl "$BACKEND_URL/api/v1/health/detailed"
```
Should show database pool stats. If not, DATABASE_URL is wrong.

**3. Check logs:**
- Go to Vercel dashboard → Deployments → Click latest deployment
- Click "View Function Logs"
- Look for errors

### If frontend can't connect to backend:

**1. Check NEXT_PUBLIC_API_URL:**
- Must be set in Vercel frontend environment variables
- Must point to your backend URL (with `/api/v1` at the end)
- Must start with `https://`

**2. Check CORS:**
The backend `api/index.js` has CORS enabled for:
- `https://muse.shopping`
- `https://www.muse.shopping`

If your frontend is at a different URL, you may need to add it to the CORS whitelist.

### If items endpoint fails (SQL error):

This should be fixed, but if it happens:

```bash
# Verify the fix was deployed
curl "$BACKEND_URL/api/v1/items?limit=1"

# If it fails, the fix wasn't deployed
# Re-deploy the backend:
cd /Users/hannahschlacter/Desktop/muse-shopping
vercel --prod --force
```

---

## 📊 Performance Expectations

Based on our testing, you should see:

| Endpoint | Expected Latency |
|----------|-----------------|
| Health | <50ms |
| Items (cached) | <100ms |
| Items (uncached) | <300ms |
| Chat | <2000ms |

**Note:** Vercel cold starts may add 500-2000ms on first request after inactivity.

---

## 🎯 Quick Deploy Script

Want to deploy both at once? Run this:

```bash
#!/bin/bash

echo "🚀 Deploying Muse Shopping to Production..."
echo ""

# Deploy backend
echo "1️⃣ Deploying backend..."
cd /Users/hannahschlacter/Desktop/muse-shopping
vercel --prod
BACKEND_EXIT=$?

# Deploy frontend
echo ""
echo "2️⃣ Deploying frontend..."
cd frontend
vercel --prod
FRONTEND_EXIT=$?

echo ""
if [ $BACKEND_EXIT -eq 0 ] && [ $FRONTEND_EXIT -eq 0 ]; then
  echo "✅ Both deployments successful!"
  echo ""
  echo "Next steps:"
  echo "1. Set environment variables in Vercel dashboard"
  echo "2. Test your backend URL"
  echo "3. Update NEXT_PUBLIC_API_URL in frontend"
  echo "4. Redeploy frontend if needed"
else
  echo "❌ Deployment failed. Check errors above."
  exit 1
fi
```

Save this as `deploy.sh`, make it executable with `chmod +x deploy.sh`, then run `./deploy.sh`.

---

## ✅ Final Checklist

Before going live, verify:

- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] DATABASE_URL set in backend
- [ ] JWT_SECRET set in backend
- [ ] OPENAI_API_KEY set in backend
- [ ] NEXT_PUBLIC_API_URL set in frontend (pointing to backend)
- [ ] Backend health endpoint responds
- [ ] Backend items endpoint returns data
- [ ] Frontend loads in browser
- [ ] Frontend can make API calls to backend
- [ ] Performance indexes exist in database (migration 067)
- [ ] Optional: Custom domain configured (muse.shopping)

---

## 🌐 Custom Domain (Optional)

If you want to use `muse.shopping` and `www.muse.shopping`:

### Backend Domain
1. Go to Vercel → muse-shopping project → Settings → Domains
2. Add domain: `api.muse.shopping`
3. Configure DNS with your provider

### Frontend Domain
1. Go to Vercel → frontend project → Settings → Domains
2. Add domains: `muse.shopping` and `www.muse.shopping`
3. Configure DNS with your provider

**After adding custom domains:**
- Update `NEXT_PUBLIC_API_URL` to `https://api.muse.shopping/api/v1`
- Update CORS origins in `api/index.js` if needed
- Redeploy both projects

---

## 📞 Need Help?

**Common Issues:**
1. **500 errors:** Check environment variables are set
2. **Database errors:** Verify DATABASE_URL is correct
3. **CORS errors:** Check allowed origins in `api/index.js`
4. **Cold starts:** Normal on Vercel, first request may be slow
5. **Items endpoint fails:** Verify latest code is deployed

**Vercel Resources:**
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

---

**Created:** 2026-02-11
**Ready to deploy:** YES ✅
**Estimated time:** 15 minutes
**Risk level:** LOW 🟢

---

## 🎉 You're Ready!

Run the deployment commands above and your app will be live! 🚀
