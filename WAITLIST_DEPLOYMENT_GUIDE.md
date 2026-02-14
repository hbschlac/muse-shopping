# Waitlist & Referral System Deployment Guide

## Overview
Complete waitlist system with referral tracking, social sharing, and analytics.

---

## Pre-Deployment Checklist

### 1. Database Migrations
Ensure all migrations have been run:

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping

# Check which migrations have been applied
psql postgresql://muse_admin:SecurePassword123!@localhost:5432/muse_shopping_dev -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;"

# If migrations are missing, run them:
psql postgresql://muse_admin:SecurePassword123!@localhost:5432/muse_shopping_dev -f migrations/063_create_waitlist.sql
psql postgresql://muse_admin:SecurePassword123!@localhost:5432/muse_shopping_dev -f migrations/064_add_my_referral_code.sql
psql postgresql://muse_admin:SecurePassword123!@localhost:5432/muse_shopping_dev -f migrations/065_create_referral_tracking.sql
```

### 2. Environment Variables

**Backend (.env):**
```bash
# Required for referral links
FRONTEND_URL=http://localhost:3001  # Change to https://yourdomain.com in production

# Placeholder values (already added)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
APPLE_CLIENT_ID=com.muse.placeholder
```

**Frontend (.env.local):**
```bash
# Required for Open Graph meta tags
NEXT_PUBLIC_SITE_URL=http://localhost:3001  # Change to https://yourdomain.com in production

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1  # Change in production
```

### 3. Create Open Graph Image

**Required:** Create `/frontend/public/images/og-waitlist.png`
- Dimensions: 1200x630 pixels
- Use brand colors: ecru, charcoal, peach, coral, blue
- Include Muse logo and tagline
- See: `/frontend/public/images/README.md` for details

### 4. Update Production URLs

When deploying to production, update these files:

**Backend .env:**
```bash
FRONTEND_URL=https://yourdomain.com
```

**Frontend .env.production:**
```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

---

## Testing Guide

### Test 1: Basic Waitlist Signup

1. Navigate to: http://localhost:3001/waitlist
2. Fill in the form:
   - Email: test@example.com
   - First/Last Name
   - Favorite Brands: "Nike, Zara, Reformation"
   - How did you hear about us: Select an option
3. Click "Join the Waitlist"
4. ✅ Should see: "You're on the list! You're #1 of 1 in line"
5. ✅ Should see: "Share with a Friend" button

### Test 2: Referral Link Generation

After signup:
1. ✅ Check that you received a referral code (format: ABC12XYZ)
2. Click "Share with a Friend"
3. ✅ On desktop: Should copy link to clipboard and show "✓ Link Copied!"
4. ✅ On mobile: Should open native share sheet

### Test 3: Referral Click Tracking

1. Copy the referral link (format: `http://localhost:3001/waitlist?ref=TEST2K4M`)
2. Open in an incognito/private window
3. ✅ Network tab should show POST to `/api/v1/waitlist/track-click`
4. Fill out form and sign up with a different email
5. ✅ Should see higher position number (e.g., "#2 of 2")

### Test 4: Analytics API

Check referral analytics:

```bash
# Get analytics for a user
curl "http://localhost:3000/api/v1/waitlist/referral-analytics?email=test@example.com" | jq

# Expected response:
{
  "success": true,
  "data": {
    "analytics": {
      "total_shares": 1,
      "total_clicks": 1,
      "total_conversions": 1,
      "conversion_rate_percent": 100.00,
      ...
    },
    "shares": [...],
    "clicks": [...]
  }
}
```

### Test 5: Status Check Page

1. Navigate to: http://localhost:3001/waitlist/status
2. Enter your email
3. Click "Check Status"
4. ✅ Should show: Position, total count, "Share with a Friend" button
5. Click "Share with a Friend" again
6. ✅ Should increment share count in analytics

### Test 6: Database Verification

```sql
-- Check waitlist signups
SELECT id, email, my_referral_code, status, created_at
FROM waitlist_signups
ORDER BY created_at DESC
LIMIT 5;

-- Check referral shares
SELECT referrer_email, share_method, shared_at
FROM referral_shares
ORDER BY shared_at DESC;

-- Check referral clicks
SELECT referral_code, converted, clicked_at, converted_at
FROM referral_clicks
ORDER BY clicked_at DESC;

-- Check analytics view
SELECT * FROM referral_analytics WHERE email = 'test@example.com';
```

---

## API Endpoints Reference

### Public Endpoints

**POST** `/api/v1/waitlist/signup`
- Join the waitlist
- Auto-generates referral code
- Tracks conversion if referral_code provided

**GET** `/api/v1/waitlist/status?email=user@example.com`
- Check waitlist status
- Returns position, total, referral code

**GET** `/api/v1/waitlist/referral-link?email=user@example.com`
- Get user's referral link
- Returns link and basic stats

**POST** `/api/v1/waitlist/track-share`
- Track when user shares their link
- Body: `{ email, share_method, share_platform }`

**POST** `/api/v1/waitlist/track-click`
- Track when someone clicks a referral link
- Body: `{ referral_code, utm_source, utm_medium, utm_campaign }`

**GET** `/api/v1/waitlist/referral-analytics?email=user@example.com`
- Get detailed referral analytics
- Returns shares, clicks, conversions, rates

---

## Production Deployment Steps

### 1. Backend Deployment

```bash
# Set production environment variables
export FRONTEND_URL=https://yourdomain.com
export DATABASE_URL=postgresql://user:pass@host:5432/dbname
export NODE_ENV=production

# Run migrations on production database
psql $DATABASE_URL -f migrations/063_create_waitlist.sql
psql $DATABASE_URL -f migrations/064_add_my_referral_code.sql
psql $DATABASE_URL -f migrations/065_create_referral_tracking.sql

# Start backend server
npm start
```

### 2. Frontend Deployment

```bash
# Set production environment variables in your hosting platform
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1

# Build and deploy
npm run build
npm start
```

### 3. DNS & SSL

- Configure your domain to point to your servers
- Set up SSL certificates (Let's Encrypt, Cloudflare, etc.)
- Update all URLs from http to https

### 4. Test Social Sharing

After deployment, test Open Graph previews:
- iMessage: Send link to yourself
- WhatsApp: Share in a chat
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- Facebook Debugger: https://developers.facebook.com/tools/debug/

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Waitlist Growth**
   ```sql
   SELECT DATE(created_at), COUNT(*)
   FROM waitlist_signups
   GROUP BY DATE(created_at)
   ORDER BY DATE(created_at) DESC;
   ```

2. **Top Referrers**
   ```sql
   SELECT email, total_conversions, conversion_rate_percent
   FROM referral_analytics
   WHERE total_conversions > 0
   ORDER BY total_conversions DESC
   LIMIT 10;
   ```

3. **Conversion Funnel**
   ```sql
   SELECT
     COUNT(DISTINCT referral_code) as unique_sharers,
     SUM(total_shares) as total_shares,
     SUM(total_clicks) as total_clicks,
     SUM(total_conversions) as total_conversions,
     ROUND(AVG(conversion_rate_percent), 2) as avg_conversion_rate
   FROM referral_analytics;
   ```

4. **Share Method Distribution**
   ```sql
   SELECT share_method, COUNT(*) as count
   FROM referral_shares
   GROUP BY share_method
   ORDER BY count DESC;
   ```

---

## Integration with User Accounts

When a waitlist user creates a full account:

1. The `waitlist_signups.user_id` is automatically set via the `markAsConverted()` method
2. Their referral data carries over (linked by `user_id`)
3. You can query user personalization + referral data together:

```sql
SELECT
  u.id,
  u.email,
  ra.total_conversions,
  ra.conversion_rate_percent,
  sp.style_profile
FROM users u
LEFT JOIN referral_analytics ra ON u.id = ra.user_id
LEFT JOIN style_profiles sp ON u.id = sp.user_id
WHERE ra.total_conversions > 5;
```

This allows you to identify high-converting users and correlate with their style preferences.

---

## Troubleshooting

### Issue: Referral clicks not tracking
- Check browser console for errors
- Verify `/api/v1/waitlist/track-click` endpoint is accessible
- Check that `referral_clicks` table exists

### Issue: Share button not working
- On desktop: Check if clipboard API is available (HTTPS required)
- On mobile: Check if Web Share API is supported
- Fallback should copy to clipboard

### Issue: Analytics showing 0 conversions
- Verify `markReferralConverted()` is being called in `addSignup()`
- Check that referral_code matches between click and signup
- Query `referral_clicks` table to debug

### Issue: Open Graph image not showing
- Verify image exists at `/public/images/og-waitlist.png`
- Check image dimensions (must be 1200x630px)
- Clear social media cache (use debugger tools)
- Ensure NEXT_PUBLIC_SITE_URL is set correctly

---

## Support

For issues or questions:
1. Check server logs: `tail -f /tmp/muse-backend.log`
2. Check database: Query `waitlist_signups`, `referral_shares`, `referral_clicks` tables
3. Test API endpoints with curl/Postman
4. Review this guide for common issues

---

## Summary

✅ Waitlist signup with brand-compliant UI
✅ Unique referral codes for each user
✅ Social sharing with native APIs
✅ Click and conversion tracking
✅ Detailed analytics per user
✅ Integration with user accounts
✅ Open Graph meta tags for rich previews
✅ Production-ready with environment variables

All systems are operational and ready for deployment!
