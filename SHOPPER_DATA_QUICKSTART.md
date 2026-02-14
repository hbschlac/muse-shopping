# Shopper Data System - Quick Start Guide

## Setup (5 minutes)

### 1. Run the Migration

```bash
# Connect to your database and run migration
psql -U $DB_USER -d $DB_NAME -f migrations/055_create_shopper_activity_system.sql
```

This creates:
- ✅ 6 new tables for shopper data
- ✅ 3 analytics views
- ✅ 2 privacy compliance functions
- ✅ 8 default customer segments
- ✅ Automatic triggers for metrics updates
- ✅ Integration with experiment system

### 2. Add Routes to Your App

The routes are already added to `src/routes/index.js`:

```javascript
const shopperDataRoutes = require('./shopperDataRoutes');
router.use('/shopper', shopperDataRoutes);
```

### 3. Test the System

```bash
# Start your server
npm start

# Test activity tracking (requires authentication)
curl -X POST http://localhost:3000/api/shopper/activity \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityType": "page_view",
    "activityCategory": "browsing",
    "pageUrl": "/newsfeed",
    "pageType": "newsfeed"
  }'

# Get engagement metrics
curl http://localhost:3000/api/shopper/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get shopper segments
curl http://localhost:3000/api/shopper/segments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Integration

### Track Page Views

```javascript
// In your Next.js app or React components
const trackPageView = async (pageType, pageUrl) => {
  try {
    await fetch('/api/shopper/activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        activityType: 'page_view',
        activityCategory: 'browsing',
        pageType,
        pageUrl,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      })
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

// Use in components
useEffect(() => {
  trackPageView('newsfeed', window.location.pathname);
}, []);
```

### Track Product Views

```javascript
// In product detail pages
const trackProductView = async (productId, brandId) => {
  await fetch('/api/shopper/activity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      activityType: 'product_view',
      activityCategory: 'browsing',
      pageType: 'product_detail',
      pageUrl: window.location.pathname,
      productId,
      brandId,
      durationSeconds: 0 // Update on page exit
    })
  });
};
```

### Track Cart Actions

```javascript
// When adding to cart
const trackCartAdd = async (productId, brandId) => {
  await fetch('/api/shopper/activity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      activityType: 'add_to_cart',
      activityCategory: 'conversion',
      pageType: 'product_detail',
      productId,
      brandId,
      interactionData: {
        value_cents: priceInCents
      }
    })
  });
};
```

### Track Clicks (with A/B Testing)

```javascript
// Track clicks on feed modules
const trackModuleClick = async (itemId, moduleId, position) => {
  await fetch('/api/shopper/activity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      activityType: 'click',
      activityCategory: 'engagement',
      pageType: 'newsfeed',
      itemId,
      moduleId,
      positionInFeed: position
    })
  });
};
```

### Get Personalized Recommendations

```javascript
// Use EnhancedRecommendationService in your backend
// In your recommendation controller
const EnhancedRecommendationService = require('../services/enhancedRecommendationService');

router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { context = 'newsfeed', limit = 20, moduleId } = req.query;

    const result = await EnhancedRecommendationService.getPersonalizedRecommendations(
      userId,
      {
        context,
        limit: parseInt(limit),
        moduleId: moduleId ? parseInt(moduleId) : null,
        sessionId: req.sessionID
      }
    );

    res.json({
      success: true,
      data: result.recommendations,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});
```

## Privacy Implementation

### Request Consent on Signup

```javascript
// During user registration or first login
const requestConsent = async (userId) => {
  await fetch('/api/shopper/privacy/consent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      data_collection: true,
      personalization: true,
      marketing: false,
      third_party_sharing: false,
      analytics: true
    })
  });
};
```

### Privacy Settings Page

```javascript
// Component for privacy settings
const PrivacySettings = () => {
  const [consents, setConsents] = useState({
    data_collection: false,
    personalization: false,
    marketing: false,
    analytics: false
  });

  const updateConsent = async (consentType, value) => {
    const newConsents = { ...consents, [consentType]: value };
    setConsents(newConsents);

    await fetch('/api/shopper/privacy/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(newConsents)
    });
  };

  return (
    <div>
      <h2>Privacy Settings</h2>
      <label>
        <input
          type="checkbox"
          checked={consents.data_collection}
          onChange={(e) => updateConsent('data_collection', e.target.checked)}
        />
        Allow data collection for personalization
      </label>
      {/* Add more consent toggles */}
    </div>
  );
};
```

### Export User Data (GDPR)

```javascript
// Add to user settings
const exportMyData = async () => {
  try {
    const response = await fetch('/api/shopper/data/export', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    const data = await response.json();

    // Download as JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_data_${Date.now()}.json`;
    a.click();
  } catch (error) {
    console.error('Failed to export data:', error);
  }
};
```

## Backend Usage Examples

### Track Activity in Your Services

```javascript
const ShopperDataService = require('../services/shopperDataService');

// In your checkout service
class CheckoutService {
  static async completePurchase(userId, orderId, totalCents) {
    // ... complete purchase logic ...

    // Track purchase activity
    await ShopperDataService.trackActivity({
      userId,
      sessionId: sessionId,
      activityType: 'purchase',
      activityCategory: 'conversion',
      pageType: 'checkout',
      interactionData: {
        order_id: orderId,
        value_cents: totalCents
      }
    });

    // Re-evaluate segments after purchase
    await ShopperDataService.evaluateShopperSegments(userId);
  }
}
```

### Get Shopper Context for Personalization

```javascript
const ShopperDataService = require('../services/shopperDataService');

// In your newsfeed service
class NewsfeedService {
  static async getPersonalizedFeed(userId) {
    // Get shopper context
    const context = await ShopperDataService.getShopperContextForRecommendations(userId);

    // Use context to personalize feed
    const segments = context.segments;
    const recentActivity = context.recentActivity;

    // Adjust feed based on segments
    if (segments.includes('high_value_frequent')) {
      // Show premium items
    } else if (segments.includes('sale_hunter')) {
      // Show sale items
    }

    // ... rest of feed logic ...
  }
}
```

### Use Enhanced Recommendations

```javascript
const EnhancedRecommendationService = require('../services/enhancedRecommendationService');

// In your API controller
router.get('/newsfeed', authenticate, async (req, res) => {
  const userId = req.user.id;

  // Get personalized recommendations
  const result = await EnhancedRecommendationService.getPersonalizedRecommendations(
    userId,
    {
      context: 'newsfeed',
      limit: 20,
      moduleId: 1 // Newsfeed module
    }
  );

  res.json({
    success: true,
    items: result.recommendations,
    algorithm: result.metadata.algorithm,
    personalizationScore: result.metadata.personalizationScore
  });
});
```

## Monitor & Analyze

### Check System Health

```sql
-- Activity volume (last 24 hours)
SELECT
  DATE_TRUNC('hour', occurred_at) as hour,
  COUNT(*) as activity_count,
  COUNT(DISTINCT user_id) as unique_users
FROM shopper_activity
WHERE occurred_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Top activity types
SELECT
  activity_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM shopper_activity
WHERE occurred_at >= CURRENT_DATE
GROUP BY activity_type
ORDER BY count DESC;

-- Segment distribution
SELECT
  segment_name,
  COUNT(*) as member_count
FROM shopper_segments s
JOIN shopper_segment_membership ssm ON s.id = ssm.segment_id
GROUP BY segment_name
ORDER BY member_count DESC;
```

### Check Experiment Integration

```sql
-- Activity by experiment variant
SELECT
  e.name as experiment,
  ev.name as variant,
  COUNT(*) as activity_count,
  COUNT(DISTINCT sa.user_id) as unique_users
FROM shopper_activity sa
JOIN experiments e ON sa.experiment_id = e.id
JOIN experiment_variants ev ON sa.variant_id = ev.id
WHERE sa.occurred_at >= CURRENT_DATE
GROUP BY e.name, ev.name
ORDER BY activity_count DESC;
```

### Check Privacy Compliance

```sql
-- Consent rates
SELECT
  consent_type,
  COUNT(*) FILTER (WHERE consent_given = true) as consented,
  COUNT(*) FILTER (WHERE consent_given = false) as declined,
  ROUND(COUNT(*) FILTER (WHERE consent_given = true)::DECIMAL / COUNT(*) * 100, 2) as consent_rate
FROM privacy_consent_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY consent_type;

-- Deletion requests
SELECT
  DATE(anonymized_at) as date,
  COUNT(*) as deletion_count
FROM data_anonymization_log
WHERE anonymized_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;
```

## Common Patterns

### Pattern 1: Track User Journey

```javascript
// Track complete user journey through a session
const trackUserJourney = async (userId, sessionId) => {
  const journey = [
    { type: 'page_view', category: 'browsing', page: 'home' },
    { type: 'search', category: 'browsing', query: 'dresses' },
    { type: 'product_view', category: 'browsing', productId: 123 },
    { type: 'add_to_cart', category: 'conversion', productId: 123 },
    { type: 'page_view', category: 'browsing', page: 'cart' },
    { type: 'page_view', category: 'conversion', page: 'checkout' },
    { type: 'purchase', category: 'conversion', orderId: 456 }
  ];

  for (const step of journey) {
    await ShopperDataService.trackActivity({
      userId,
      sessionId,
      activityType: step.type,
      activityCategory: step.category,
      ...step
    });
  }
};
```

### Pattern 2: Segment-Based Personalization

```javascript
const getSegmentBasedContent = async (userId) => {
  const segments = await ShopperDataService.getShopperSegments(userId);
  const segmentKeys = segments.map(s => s.segment_key);

  if (segmentKeys.includes('high_value_frequent')) {
    return {
      hero: 'exclusive-collection',
      discount: 0.15,
      shipping: 'free'
    };
  } else if (segmentKeys.includes('sale_hunter')) {
    return {
      hero: 'sale-items',
      discount: 0.30,
      shipping: 'standard'
    };
  } else if (segmentKeys.includes('new_shopper')) {
    return {
      hero: 'welcome-offer',
      discount: 0.10,
      shipping: 'free-first-order'
    };
  }

  return {
    hero: 'trending',
    discount: 0,
    shipping: 'standard'
  };
};
```

### Pattern 3: A/B Testing with Activity Tracking

```javascript
const trackModuleExperiment = async (userId, moduleId) => {
  // Get experiment assignment
  const assignment = await ExperimentService.getModuleExperimentAssignment(userId, moduleId);

  // Track impression
  await ShopperDataService.trackActivity({
    userId,
    sessionId: getSessionId(),
    activityType: 'module_view',
    activityCategory: 'engagement',
    moduleId,
    experimentId: assignment?.experiment_id,
    variantId: assignment?.variant_id
  });

  // When user clicks
  const handleClick = async (itemId, position) => {
    await ShopperDataService.trackActivity({
      userId,
      sessionId: getSessionId(),
      activityType: 'click',
      activityCategory: 'engagement',
      itemId,
      moduleId,
      positionInFeed: position,
      experimentId: assignment?.experiment_id,
      variantId: assignment?.variant_id
    });
  };

  return { assignment, handleClick };
};
```

## Next Steps

1. **Add Privacy Banner** - Implement consent collection on first visit
2. **Instrument Frontend** - Add tracking to all key user interactions
3. **Create Custom Segments** - Define segments specific to your business
4. **Monitor Metrics** - Set up dashboards for engagement metrics
5. **Test Recommendations** - A/B test different recommendation algorithms
6. **Optimize Performance** - Review and optimize query performance
7. **Set Up Alerts** - Configure monitoring and alerting

## Troubleshooting

**Issue**: Activities not being tracked
- **Fix**: Check that user has consented to `data_collection`
- **Check**: `SELECT privacy_consent->>'data_collection' FROM users WHERE id = ?`

**Issue**: Segments not updating
- **Fix**: Manually trigger `evaluateShopperSegments(userId)`
- **Check**: Verify engagement metrics are current

**Issue**: Recommendations not personalized
- **Fix**: Check personalization score in response metadata
- **Check**: Verify user has sufficient activity history

**Issue**: Performance slow
- **Fix**: Review query plans, ensure indexes are being used
- **Check**: `EXPLAIN ANALYZE` on slow queries

## Support

For questions or issues:
1. Review `SHOPPER_DATA_SYSTEM.md` for detailed documentation
2. Check database schema: `\d shopper_activity` in psql
3. Review service code: `src/services/shopperDataService.js`
4. Check API routes: `src/routes/shopperDataRoutes.js`

---

🎉 **You're all set!** Your shopper data system is ready to track, analyze, and personalize the shopping experience while maintaining privacy and security best practices.
