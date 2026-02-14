# Production Deployment Guide - Curated Marketing Campaigns

## 🚀 Pre-Deployment Checklist

- [x] Database migration script created (050_curated_marketing_campaigns.sql)
- [x] Backend service implemented (curatedCampaignService.js)
- [x] API routes configured (public + admin endpoints)
- [x] Newsfeed integration complete
- [x] All dependencies installed
- [x] Database schema verified
- [x] Server starts successfully
- [x] API endpoints accessible

---

## 📋 Deployment Steps

### 1. Backup Database

**CRITICAL: Always backup before running migrations!**

```bash
# Create timestamped backup
pg_dump -U your_db_user -d your_db_name > backup_$(date +%Y%m%d_%H%M%S).sql

# For production with compressed backup
pg_dump -U your_db_user -d your_db_name | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2. Run Database Migration

```bash
# Connect to your production database
psql -h your_host -p 5432 -U your_user -d your_database -f src/db/migrations/050_curated_marketing_campaigns.sql
```

### 3. Verify Migration

```bash
# Check tables created
psql -h your_host -U your_user -d your_database -c "\dt curated_*"

# Expected output: 8 tables
# - curated_campaigns
# - curated_campaign_items
# - curated_collections
# - curated_collection_items
# - curated_campaign_collections
# - curated_campaign_impressions
# - curated_campaign_clicks
# - curated_campaign_conversions

# Check views created
psql -h your_host -U your_user -d your_database -c "\dv *curated*"

# Expected output: 2 views
# - active_curated_campaigns
# - curated_campaign_performance

# Test function
psql -h your_host -U your_user -d your_database -c "SELECT * FROM get_eligible_curated_campaigns(1, 'homepage_hero', 5);"
```

### 4. Install Dependencies

```bash
# Ensure all dependencies are installed
npm install

# Key dependency added: express-validator
```

### 5. Environment Variables

No new environment variables are required for curated campaigns. The system uses your existing database connection.

### 6. Deploy Code

```bash
# Pull latest code
git pull origin main

# If using PM2
pm2 restart muse-shopping

# If using systemd
sudo systemctl restart muse-shopping

# If using Docker
docker-compose up -d --build
```

### 7. Verify Deployment

```bash
# Health check
curl https://your-domain.com/api/v1/health

# Test curated campaigns endpoint
curl https://your-domain.com/api/v1/curated-campaigns/eligible?placementSlot=homepage_hero

# Test admin endpoint (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/v1/admin/curated-campaigns
```

---

## 🔧 Post-Deployment Configuration

### Create Your First Campaign

```bash
# Example: Create a test campaign via API
curl -X POST https://your-domain.com/api/v1/admin/curated-campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Spring 2026 Collection",
    "description": "Curated spring fashion trends",
    "campaignType": "seasonal_collection",
    "placementSlot": "homepage_hero",
    "priority": 100,
    "startsAt": "2026-03-01T00:00:00Z",
    "endsAt": "2026-05-31T23:59:59Z",
    "headline": "Shop Spring",
    "subheadline": "Discover the season'\''s must-haves",
    "callToAction": "Explore Now",
    "status": "draft"
  }'
```

### Activate Campaign

```bash
# Update campaign status to active
curl -X PATCH https://your-domain.com/api/v1/admin/curated-campaigns/CAMPAIGN_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"status": "active"}'
```

---

## 📊 Monitoring

### Key Metrics to Track

1. **Campaign Performance**
   ```sql
   SELECT * FROM curated_campaign_performance
   WHERE campaign_id = 'your-campaign-id';
   ```

2. **Active Campaigns**
   ```sql
   SELECT count(*) FROM active_curated_campaigns;
   ```

3. **Overall Metrics**
   ```sql
   SELECT
     COUNT(DISTINCT c.id) as total_campaigns,
     COUNT(DISTINCT i.id) as total_impressions,
     COUNT(DISTINCT cl.id) as total_clicks,
     COUNT(DISTINCT cv.id) as total_conversions
   FROM curated_campaigns c
   LEFT JOIN curated_campaign_impressions i ON c.id = i.campaign_id
   LEFT JOIN curated_campaign_clicks cl ON c.id = cl.campaign_id
   LEFT JOIN curated_campaign_conversions cv ON c.id = cv.campaign_id
   WHERE c.status = 'active';
   ```

### Set Up Alerts

Monitor these conditions:
- No active campaigns for important placement slots
- CTR drops below 2%
- Conversion rate drops below 3%
- Campaign impressions = 0 after 24 hours

---

## 🐛 Troubleshooting

### Campaign Not Showing

**Problem:** Campaign is active but not appearing in newsfeed

**Solutions:**
1. Check campaign dates:
   ```sql
   SELECT id, name, starts_at, ends_at, status
   FROM curated_campaigns
   WHERE id = 'your-campaign-id';
   ```

2. Check frequency cap:
   ```sql
   SELECT user_id, impression_count, last_shown_at
   FROM user_curated_campaign_frequency
   WHERE campaign_id = 'your-campaign-id'
   LIMIT 10;
   ```

3. Check if sponsored content is taking precedence:
   - Sponsored campaigns always show first
   - Curated campaigns fill empty slots

4. Verify placement slot matches:
   ```sql
   SELECT placement_slot FROM curated_campaigns
   WHERE id = 'your-campaign-id';
   ```

### Database Performance Issues

**Problem:** Slow queries on large datasets

**Solutions:**
1. Verify indexes are created:
   ```sql
   SELECT indexname, tablename
   FROM pg_indexes
   WHERE tablename LIKE 'curated_%';
   ```

2. Analyze query performance:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM get_eligible_curated_campaigns(1, 'homepage_hero', 5);
   ```

3. Add additional indexes if needed for specific queries

### Authentication Issues

**Problem:** 401 Unauthorized on admin endpoints

**Solutions:**
1. Verify JWT token is valid
2. Check user has required permissions
3. Review authMiddleware configuration

---

## 🔄 Rollback Plan

If issues occur after deployment:

### 1. Emergency Rollback

```bash
# Restore database from backup
psql -U your_user -d your_database < backup_TIMESTAMP.sql

# Revert code
git revert HEAD
pm2 restart muse-shopping
```

### 2. Partial Rollback (Database Only)

```bash
# Drop only the new tables (keeps existing data intact)
psql -U your_user -d your_database <<EOF
DROP TABLE IF EXISTS user_curated_campaign_frequency CASCADE;
DROP TABLE IF EXISTS curated_campaign_conversions CASCADE;
DROP TABLE IF EXISTS curated_campaign_clicks CASCADE;
DROP TABLE IF EXISTS curated_campaign_impressions CASCADE;
DROP TABLE IF EXISTS curated_campaign_collections CASCADE;
DROP TABLE IF EXISTS curated_collection_items CASCADE;
DROP TABLE IF EXISTS curated_collections CASCADE;
DROP TABLE IF EXISTS curated_campaign_items CASCADE;
DROP TABLE IF EXISTS curated_campaigns CASCADE;
DROP VIEW IF EXISTS active_curated_campaigns CASCADE;
DROP VIEW IF EXISTS curated_campaign_performance CASCADE;
DROP FUNCTION IF EXISTS get_eligible_curated_campaigns CASCADE;
DROP FUNCTION IF EXISTS get_curated_campaign_items CASCADE;
EOF
```

### 3. Disable Feature (Code Only)

Comment out the route registration in `/src/routes/index.js`:

```javascript
// Temporarily disable curated campaigns
// router.use('/curated-campaigns', curatedCampaignRoutes);
// router.use('/admin/curated-campaigns', adminCuratedCampaignsRoutes);
```

---

## 📈 Performance Optimization

### Database Indexes

The migration creates these indexes automatically:
- `idx_curated_campaigns_status`
- `idx_curated_campaigns_placement`
- `idx_curated_campaigns_dates`
- `idx_curated_campaigns_active`
- Plus indexes on all foreign keys

### Query Optimization Tips

1. **Use pagination** for large result sets
2. **Cache eligible campaigns** for 5 minutes if traffic is high
3. **Batch impression tracking** if receiving thousands per second
4. **Archive old campaigns** (status='archived') after 90 days

### Caching Strategy (Optional)

```javascript
// Example: Cache eligible campaigns for 5 minutes
const NodeCache = require('node-cache');
const campaignCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getEligibleCampaignsWithCache(userId, placementSlot) {
  const cacheKey = `campaigns:${placementSlot}`;
  let campaigns = campaignCache.get(cacheKey);

  if (!campaigns) {
    campaigns = await curatedCampaignService.getEligibleCampaigns(
      userId,
      placementSlot,
      5
    );
    campaignCache.set(cacheKey, campaigns);
  }

  return campaigns;
}
```

---

## 🔐 Security Considerations

### Admin Endpoints

All admin endpoints require authentication:
- POST /api/v1/admin/curated-campaigns
- PUT /api/v1/admin/curated-campaigns/:id
- DELETE /api/v1/admin/curated-campaigns/:id

Ensure only authorized users have access.

### Rate Limiting

Consider adding rate limits to tracking endpoints:

```javascript
// Example rate limit for impression tracking
const rateLimit = require('express-rate-limit');

const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many tracking requests'
});

router.post('/:campaignId/impressions', trackingLimiter, ...);
```

### Data Privacy

- User tracking data is tied to user_id
- Comply with GDPR/CCPA requirements
- Implement data deletion hooks if needed

---

## 📝 Maintenance Tasks

### Weekly

- Review campaign performance metrics
- Check for campaigns that should be paused or archived
- Monitor database size growth

### Monthly

- Archive completed campaigns older than 30 days
- Analyze top-performing campaigns
- Review and optimize slow queries

### Quarterly

- Clean up archived campaigns older than 90 days
- Review and update campaign templates
- Analyze overall ROI of curated campaigns

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ All 8 tables created in database
- ✅ Server starts without errors
- ✅ Health endpoint returns 200
- ✅ Curated campaigns API endpoints respond
- ✅ Newsfeed integrates curated content seamlessly
- ✅ First test campaign can be created and activated
- ✅ Campaign shows in newsfeed when no sponsored content exists
- ✅ Analytics tracking works (impressions, clicks, conversions)

---

## 📞 Support

If you encounter issues:

1. Check server logs: `tail -f /path/to/logs/muse-shopping.log`
2. Review database logs for migration errors
3. Test individual API endpoints with curl
4. Check documentation: `CURATED_CAMPAIGNS_GUIDE.md`

---

## ✅ Post-Deployment Checklist

- [ ] Database backup created
- [ ] Migration ran successfully
- [ ] All tables and views created
- [ ] Server restarted
- [ ] Health check passed
- [ ] API endpoints accessible
- [ ] First test campaign created
- [ ] Test campaign visible in newsfeed
- [ ] Analytics tracking verified
- [ ] Monitoring alerts configured
- [ ] Team trained on new feature
- [ ] Documentation shared with team

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Production URL:** _______________
**Database:** _______________

**Notes:**
_______________________________________________________________________
_______________________________________________________________________
