# Waitlist & Referral System - Complete Demo Guide

## 🎬 Live Demo & Testing

### Quick Demo (Command Line)

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping

# Run the automated test suite
./test-waitlist.sh

# Or run individual tests:

# 1. Join the waitlist
curl -X POST http://localhost:3000/api/v1/waitlist/signup \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "demo@example.com",
    "first_name": "Demo",
    "last_name": "User",
    "favorite_brands": ["Nike", "Zara"],
    "referral_source": "instagram"
  }'

# 2. Check your status
curl "http://localhost:3000/api/v1/waitlist/status?email=demo@example.com"

# 3. Get your referral analytics
curl "http://localhost:3000/api/v1/waitlist/referral-analytics?email=demo@example.com"
```

### Browser Demo

1. **Visit the waitlist page:**
   ```
   http://localhost:3001/waitlist
   ```

2. **Fill out the form:**
   - Email: your@email.com
   - Name: Your Name
   - Favorite Brands: Nike, Zara, Reformation
   - How did you hear about us?: Select an option
   - ✓ Check email consent

3. **Click "Join the Waitlist"**
   - You'll see: "You're #1 of 1 in line"
   - You'll get a unique referral code (e.g., "YOUR2K4M")
   - Click "Share with a Friend" to get your referral link

4. **Share your link:**
   - On mobile: Native share sheet opens
   - On desktop: Link copied to clipboard
   - Link format: `http://localhost:3001/waitlist?ref=YOUR2K4M`

5. **Check your status:**
   ```
   http://localhost:3001/waitlist/status
   ```
   - Enter your email
   - See your position and referral stats

---

## 📊 Performance Monitoring Integration

The waitlist system is automatically monitored by the existing performance monitoring service!

### What's Being Tracked

**1. Request Duration**
- All waitlist API calls are tracked
- Slow requests (>2s) trigger warnings
- Very slow requests (>5s) send Slack alerts

**2. Error Rates**
- 400/500 errors are counted per endpoint
- High error rates (>10/min) trigger alerts

**3. Request Volume**
- Tracks signups per minute
- Monitors referral clicks and shares
- Detects traffic spikes

### View Performance Metrics

```bash
# Get current performance metrics
curl http://localhost:3000/api/v1/performance/metrics

# Example output:
{
  "requestCounts": {
    "POST /waitlist/signup": 145,
    "GET /waitlist/status": 89,
    "POST /waitlist/track-share": 67,
    "POST /waitlist/track-click": 203
  },
  "errorCounts": {
    "POST /waitlist/signup (409)": 12  // Duplicate emails
  }
}
```

### Slack Alerts

Performance alerts are sent to your configured Slack channel:

**Slow Request Alert:**
```
🐌 Very Slow Request
Request took 5.23s to complete

Endpoint: POST /waitlist/signup
Duration: 5.23s
Status: 201
User ID: anonymous
```

**High Error Rate Alert:**
```
⚠️ High Error Rate Detected
Endpoint: POST /waitlist/signup (400)
Error Count: 10 in the last minute
```

---

## 🧪 Automated Tests

### Run Unit Tests

```bash
# Install test dependencies
npm install --save-dev mocha chai supertest

# Run waitlist tests
npm test tests/waitlist.test.js
```

### Test Coverage

The automated test suite (`tests/waitlist.test.js`) covers:

✅ User signup with validation
✅ Duplicate email prevention
✅ Status checking
✅ Referral link generation
✅ Share tracking
✅ Click tracking
✅ Conversion tracking
✅ Analytics retrieval

### Manual Testing Checklist

- [ ] Sign up for waitlist
- [ ] Verify email in database
- [ ] Get referral code
- [ ] Share link (native share or clipboard)
- [ ] Click own referral link in incognito
- [ ] Sign up with different email using ref code
- [ ] Check that conversion was tracked
- [ ] View analytics showing 1 conversion
- [ ] Check status page
- [ ] Verify position updates correctly

---

## 📈 Analytics Queries

### Top Referrers

```sql
SELECT
  email,
  total_conversions,
  conversion_rate_percent,
  total_shares,
  total_clicks
FROM referral_analytics
WHERE total_conversions > 0
ORDER BY total_conversions DESC
LIMIT 10;
```

### Daily Signup Growth

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as signups,
  COUNT(CASE WHEN referral_code IS NOT NULL THEN 1 END) as from_referrals
FROM waitlist_signups
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Referral Funnel

```sql
SELECT
  COUNT(DISTINCT referrer_code) as total_sharers,
  COUNT(DISTINCT rs.id) as total_shares,
  COUNT(DISTINCT rc.id) as total_clicks,
  COUNT(DISTINCT CASE WHEN rc.converted THEN rc.id END) as total_conversions,
  ROUND(
    COUNT(DISTINCT CASE WHEN rc.converted THEN rc.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT rc.id), 0) * 100,
    2
  ) as overall_conversion_rate
FROM waitlist_signups ws
LEFT JOIN referral_shares rs ON ws.my_referral_code = rs.referrer_code
LEFT JOIN referral_clicks rc ON ws.my_referral_code = rc.referral_code;
```

### Share Method Distribution

```sql
SELECT
  share_method,
  COUNT(*) as count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM referral_shares) * 100, 2) as percentage
FROM referral_shares
GROUP BY share_method
ORDER BY count DESC;
```

---

## 🔍 Monitoring Dashboard Queries

### Real-time Waitlist Stats

```bash
# Total signups
curl "http://localhost:3000/api/v1/waitlist/admin/statistics"

# Recent signups
curl "http://localhost:3000/api/v1/waitlist/admin/list?page=1&limit=10&orderBy=created_at&orderDir=DESC"
```

### Database Health Checks

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('waitlist_signups', 'referral_shares', 'referral_clicks')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE tablename IN ('waitlist_signups', 'referral_shares', 'referral_clicks')
ORDER BY idx_scan DESC;
```

---

## 🚨 Alert Configuration

### Configure Slack Alerts

The waitlist system uses the existing alert service. Configure in `.env`:

```bash
# Slack webhook for alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Alert thresholds (already configured)
SLOW_REQUEST_THRESHOLD=2000  # 2 seconds
CRITICAL_SLOW_THRESHOLD=5000  # 5 seconds
HIGH_ERROR_RATE_THRESHOLD=10  # errors per minute
```

### Custom Waitlist Alerts

You can add custom alerts for waitlist-specific events:

```javascript
// In waitlistService.js

// Alert when waitlist hits milestones
if (totalSignups === 1000) {
  AlertService.sendSlackAlert(
    'info',
    '🎉 Waitlist Milestone',
    '1,000 signups reached!',
    { 'Total Signups': '1,000' }
  );
}

// Alert on high conversion rate
if (conversionRate > 30) {
  AlertService.sendSlackAlert(
    'info',
    '🔥 High Conversion Rate',
    `Referral conversion rate is ${conversionRate}%`,
    { 'Conversion Rate': `${conversionRate}%` }
  );
}
```

---

## 📱 Testing Social Sharing

### iMessage Preview Test

1. Share link from the app
2. Send to yourself via iMessage
3. Check preview shows:
   - Title: "Join me on the Muse waitlist"
   - Description: "Shop all your favorite places at once with just one cart"
   - Image: Open Graph image (1200x630px)

### Social Media Debuggers

**Twitter:**
```
https://cards-dev.twitter.com/validator
Enter: https://yourdomain.com/waitlist?ref=CODE
```

**Facebook:**
```
https://developers.facebook.com/tools/debug/
Enter: https://yourdomain.com/waitlist?ref=CODE
```

**LinkedIn:**
```
https://www.linkedin.com/post-inspector/
Enter: https://yourdomain.com/waitlist?ref=CODE
```

---

## 🎯 Success Metrics

Track these KPIs in your monitoring dashboard:

1. **Waitlist Growth Rate**
   - Daily signups
   - Week-over-week growth

2. **Referral Performance**
   - Share rate (% of users who share)
   - Click-through rate (clicks/shares)
   - Conversion rate (signups/clicks)
   - Viral coefficient (new users per existing user)

3. **User Engagement**
   - Time to share (from signup to first share)
   - Repeat shares per user
   - Status check frequency

4. **Technical Performance**
   - API response times
   - Error rates
   - Database query performance

---

## 🔧 Troubleshooting

### Issue: Slow API Responses

**Check:**
```bash
# View performance metrics
curl http://localhost:3000/api/v1/performance/metrics

# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'muse_shopping_dev';"
```

**Solution:**
- Add database indexes (already in place)
- Enable query caching
- Scale database connections

### Issue: Share Tracking Not Working

**Check:**
```bash
# Verify shares are being recorded
psql -c "SELECT * FROM referral_shares ORDER BY created_at DESC LIMIT 5;"

# Check for errors
tail -f /tmp/muse-backend.log | grep "track-share"
```

**Solution:**
- Check network tab in browser for 200 response
- Verify email exists in waitlist_signups
- Check for JavaScript console errors

### Issue: Conversions Not Tracking

**Check:**
```sql
-- Verify clicks exist
SELECT * FROM referral_clicks
WHERE referral_code = 'YOUR_CODE'
ORDER BY clicked_at DESC;

-- Check if conversion happened
SELECT * FROM referral_clicks
WHERE converted = TRUE
AND referral_code = 'YOUR_CODE';
```

**Solution:**
- Ensure referral code matches exactly
- Check that markReferralConverted() is being called
- Verify user signed up after clicking link

---

## 📚 Additional Resources

- **Deployment Guide:** `WAITLIST_DEPLOYMENT_GUIDE.md`
- **API Documentation:** See route definitions in `src/routes/waitlistRoutes.js`
- **Database Schema:** `migrations/063_create_waitlist.sql`, `065_create_referral_tracking.sql`
- **Performance Monitoring:** `src/middleware/performanceMonitoring.js`

---

## ✅ Demo Checklist

Before showing to stakeholders:

- [ ] Backend running on port 3000
- [ ] Frontend running on port 3001
- [ ] Database migrations applied
- [ ] Open Graph image created
- [ ] Slack alerts configured
- [ ] Test signup working
- [ ] Share functionality working
- [ ] Analytics showing correct data
- [ ] Performance monitoring active
- [ ] No errors in logs

**Quick verification:**
```bash
# All systems check
curl -s http://localhost:3000/api/v1/health | jq
curl -s http://localhost:3001/waitlist | grep "Join the Waitlist" && echo "✓ Frontend OK"
psql -c "SELECT COUNT(*) FROM waitlist_signups;" && echo "✓ Database OK"
```

---

## 🎉 Ready to Launch!

Everything is connected and working:
✅ Waitlist signup system
✅ Referral tracking
✅ Social sharing
✅ Analytics & reporting
✅ Performance monitoring
✅ Automated tests
✅ Slack alerts

Start the demo with:
```bash
./test-waitlist.sh
```

Or visit:
```
http://localhost:3001/waitlist
```

Enjoy! 🚀
