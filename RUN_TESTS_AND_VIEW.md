# 🧪 Run Tests & View Your App

## Your App is Live! 🚀

### Frontend (User Interface)
**URL:** http://localhost:3001

**What to test:**
1. **Privacy Consent Banner**
   - Open in incognito window
   - Should see privacy banner after 1 second
   - Try "Accept All", "Reject All", and "Customize"

2. **Product Page with Module Swiping**
   - Navigate to any product page
   - Scroll to "Similar Items" section
   - Swipe through items (position tracking)
   - Click on items to test tracking

3. **Privacy Settings**
   - Go to: http://localhost:3001/profile/privacy
   - View and update consent preferences
   - Test data export
   - Test data deletion request

### Backend (API)
**URL:** http://localhost:3000

**Health Check:** http://localhost:3000/api/v1/health

## Run Automated Tests

### Option 1: Quick Test
```bash
# Run the automated test suite
./test-shopper-system.sh
```

This will test:
- ✅ Database tables exist
- ✅ Default segments created
- ✅ API endpoints responding
- ✅ User authentication
- ✅ Privacy consent management
- ✅ Activity tracking
- ✅ Engagement metrics
- ✅ Shopper segmentation
- ✅ Enhanced recommendations
- ✅ Data export (GDPR)
- ✅ Database triggers
- ✅ Privacy compliance

### Option 2: Manual API Testing

**1. Register/Login to get auth token:**
```bash
# Register new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "username": "testuser"
  }'

# Save the token from response
TOKEN="your_token_here"
```

**2. Test Privacy Consent:**
```bash
curl -X POST http://localhost:3000/api/v1/shopper/privacy/consent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data_collection": true,
    "personalization": true,
    "marketing": false,
    "analytics": true
  }'
```

**3. Test Activity Tracking:**
```bash
# Track page view
curl -X POST http://localhost:3000/api/v1/shopper/activity \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "activityType": "page_view",
    "activityCategory": "browsing",
    "pageType": "newsfeed"
  }'

# Track product view
curl -X POST http://localhost:3000/api/v1/shopper/activity \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "activityType": "product_view",
    "activityCategory": "browsing",
    "productId": 1,
    "brandId": 1
  }'

# Track click with position (module swiping)
curl -X POST http://localhost:3000/api/v1/shopper/activity \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "activityType": "click",
    "activityCategory": "engagement",
    "itemId": 2,
    "moduleId": 1,
    "positionInFeed": 3
  }'
```

**4. Test Engagement Metrics:**
```bash
curl http://localhost:3000/api/v1/shopper/metrics \
  -H "Authorization: Bearer $TOKEN"
```

**5. Test Shopper Segments:**
```bash
curl http://localhost:3000/api/v1/shopper/segments \
  -H "Authorization: Bearer $TOKEN"
```

**6. Test Enhanced Recommendations:**
```bash
curl "http://localhost:3000/api/v1/recommendations/personalized?limit=10&context=newsfeed" \
  -H "Authorization: Bearer $TOKEN"
```

**7. Test Data Export (GDPR):**
```bash
curl http://localhost:3000/api/v1/shopper/data/export \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

## Frontend Testing Scenarios

### Test 1: Privacy Consent Flow
1. Open http://localhost:3001 in incognito
2. Wait 1 second for privacy banner
3. Click "Customize"
4. Toggle individual preferences
5. Click "Save Preferences"
6. Refresh page - banner should not appear
7. Check localStorage: `privacy_consent_given` should be "true"

### Test 2: Product Page Activity Tracking
1. Navigate to a product page (e.g., http://localhost:3001/product/1)
2. Open Browser DevTools → Network tab
3. Filter by "activity"
4. Should see POST to `/api/shopper/activity` with:
   - `activityType: "product_view"`
   - `productId` and `brandId`

### Test 3: Similar Items Module Swiping
1. On product page, scroll to "Similar Items"
2. Swipe/scroll through items
3. Click on the 3rd item
4. Check Network tab for POST to `/api/shopper/activity` with:
   - `activityType: "click"`
   - `itemId`
   - `positionInFeed: 3`
   - `moduleId` (if set)

### Test 4: Add to Cart Tracking
1. On product page, click "Add to Cart"
2. Check Network tab for POST to `/api/shopper/activity` with:
   - `activityType: "add_to_cart"`
   - `productId` and `brandId`
   - `interactionData.value_cents`

### Test 5: Privacy Settings Page
1. Go to http://localhost:3001/profile/privacy
2. Toggle consent preferences
3. Click "Save Preferences"
4. Should see success message
5. Click "Download Data" to test GDPR export
6. JSON file should download with all your data

## Database Verification

### Check Activity Logs
```bash
psql $DATABASE_URL -c "
  SELECT
    activity_type,
    activity_category,
    position_in_feed,
    occurred_at
  FROM shopper_activity
  ORDER BY occurred_at DESC
  LIMIT 10;
"
```

### Check Engagement Metrics
```bash
psql $DATABASE_URL -c "
  SELECT
    u.email,
    sem.total_page_views,
    sem.total_product_views,
    sem.total_clicks,
    sem.engagement_score
  FROM shopper_engagement_metrics sem
  JOIN users u ON sem.user_id = u.id
  ORDER BY sem.last_activity_at DESC
  LIMIT 5;
"
```

### Check Shopper Segments
```bash
psql $DATABASE_URL -c "
  SELECT
    segment_name,
    COUNT(*) as member_count
  FROM shopper_segments s
  JOIN shopper_segment_membership ssm ON s.id = ssm.segment_id
  GROUP BY segment_name
  ORDER BY member_count DESC;
"
```

### Check Privacy Consent
```bash
psql $DATABASE_URL -c "
  SELECT
    u.email,
    u.privacy_consent->>'data_collection' as data_collection,
    u.privacy_consent->>'personalization' as personalization,
    u.privacy_consent->>'consented_at' as consented_at
  FROM users u
  WHERE u.privacy_consent IS NOT NULL
  ORDER BY u.created_at DESC
  LIMIT 5;
"
```

## Monitor Real-Time Activity

### Watch Activity Stream
```bash
# In one terminal, watch activity logs
watch -n 1 "psql $DATABASE_URL -c \"
  SELECT
    activity_type,
    CASE
      WHEN product_id IS NOT NULL THEN 'product:' || product_id
      WHEN item_id IS NOT NULL THEN 'item:' || item_id
      ELSE 'page'
    END as target,
    position_in_feed,
    occurred_at
  FROM shopper_activity
  ORDER BY occurred_at DESC
  LIMIT 5;
\""
```

### Watch Experiment Events
```bash
# Watch experiment tracking
watch -n 1 "psql $DATABASE_URL -c \"
  SELECT
    event_type,
    item_id,
    position,
    created_at
  FROM experiment_events
  ORDER BY created_at DESC
  LIMIT 5;
\""
```

## Performance Testing

### Load Test Activity Tracking
```bash
# Install hey if not already installed
# brew install hey

# Load test activity endpoint (requires auth token)
hey -n 100 -c 10 -m POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"activityType":"page_view","activityCategory":"browsing","pageType":"test"}' \
  http://localhost:3000/api/v1/shopper/activity
```

## Troubleshooting

### Issue: No tracking requests
**Solution:**
1. Check privacy consent is accepted
2. Clear localStorage and accept consent
3. Verify auth token is valid

### Issue: API returns 401
**Solution:**
1. Get new auth token via login
2. Check token is included in Authorization header

### Issue: Database connection errors
**Solution:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# If fails, check .env file has correct DATABASE_URL
```

### Issue: Privacy banner not showing
**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Refresh page in incognito mode
3. Check browser console for errors

## Next Steps

1. **Run the automated tests:**
   ```bash
   ./test-shopper-system.sh
   ```

2. **Test the frontend manually:**
   - Open http://localhost:3001
   - Test privacy consent flow
   - Navigate to product pages
   - Test similar items swiping

3. **Review the data:**
   - Check database tables
   - View activity logs
   - Analyze engagement metrics

4. **Monitor in real-time:**
   - Use the watch commands above
   - Open Network tab in DevTools
   - Track user behavior

---

## 📊 View Your Data

**Frontend App:** http://localhost:3001
**API Health:** http://localhost:3000/api/v1/health
**Privacy Settings:** http://localhost:3001/profile/privacy

**Test Account:**
- Email: test@example.com
- Password: Password123!

(Create this account via the register endpoint first)

---

🎉 **Everything is set up and ready to test!**
