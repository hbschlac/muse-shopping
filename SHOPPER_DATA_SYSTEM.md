# Shopper Data Organization System

## Overview

A comprehensive system for organizing shopper information with robust security, privacy compliance (GDPR), and real-time activity tracking. Fully integrated with the experimentation (A/B testing) system and recommendation engine.

## Architecture

### Core Components

1. **Shopper Activity Tracking** - Real-time activity logging for all logged-in users
2. **Engagement Metrics** - Aggregated metrics for segmentation and personalization
3. **Shopper Segmentation** - Dynamic customer segments based on behavior
4. **Privacy & Consent Management** - GDPR-compliant consent tracking
5. **Experiment Integration** - Automatic connection to A/B testing framework
6. **Recommendation Integration** - Enhanced personalization engine

## Database Schema

### Tables Created (Migration 055)

#### 1. `shopper_activity`
Real-time activity tracking for logged-in shoppers.

**Key Fields:**
- `user_id` - User performing the activity
- `session_id` - Session identifier
- `activity_type` - Type of activity (page_view, product_view, search, click, add_to_cart, purchase, etc.)
- `activity_category` - Category (browsing, engagement, conversion, social)
- `experiment_id`, `variant_id` - Linked to A/B test experiments
- `module_id`, `position_in_feed` - Context for feed/module experiments
- `product_id`, `brand_id`, `item_id` - Product context
- `search_query`, `search_filters` - Search context
- `interaction_data` - JSONB for additional context
- `anonymized` - Privacy flag

**Indexes:**
- User + timestamp (for user activity history)
- Session + timestamp (for session analysis)
- Activity type, category (for analytics)
- Product, brand (for product analytics)
- Experiment ID + variant ID (for A/B test analysis)

#### 2. `shopper_engagement_metrics`
Aggregated metrics per shopper.

**Key Metrics:**
- Session metrics (count, duration, avg duration)
- Browsing metrics (page views, product views, brand views)
- Search metrics (searches, filter applications)
- Engagement metrics (clicks, wishlist adds, cart adds)
- Conversion metrics (purchases, revenue, AOV, conversion rate)
- Loyalty metrics (days since first/last activity, engagement score)
- Experiment participation

**Auto-updated:** Via database triggers when activity is logged

#### 3. `shopper_segments`
Customer segment definitions.

**Default Segments:**
- High-Value Frequent Shoppers
- Window Shoppers
- New Shoppers
- Lapsed Shoppers
- Power Users
- Cart Abandoners
- Sale Hunters
- Brand Loyalists

**Custom Segments:** Can be created with JSONB criteria

#### 4. `shopper_segment_membership`
Junction table tracking which shoppers belong to which segments.

**Key Fields:**
- `confidence_score` - How strongly they match the segment (0-1)
- `evaluation_data` - Why they're in this segment

#### 5. `privacy_consent_log`
Audit trail for all privacy consent changes.

**Tracks:**
- Consent type (data_collection, personalization, marketing, etc.)
- Consent given/revoked
- Timestamp, IP address, user agent
- Consent method (signup, settings_update, banner_accept, etc.)

#### 6. `data_anonymization_log`
Log of data anonymization operations.

**Tracks:**
- User ID (original and current)
- Reason (gdpr_request, retention_policy, user_request)
- Tables and fields affected
- Records anonymized
- Timestamp

### Enhanced Tables

#### `users` table additions:
- `privacy_consent` - JSONB with consent settings
- `shopping_metadata` - Shopping-specific metadata
- `data_retention_preference` - User's retention preference
- `gdpr_delete_request` - Deletion request flag

## API Endpoints

### Activity Tracking

```bash
# Track activity
POST /api/shopper/activity
{
  "activityType": "product_view",
  "activityCategory": "browsing",
  "pageUrl": "/product/123",
  "pageType": "product_detail",
  "productId": 123,
  "brandId": 45,
  "durationSeconds": 30,
  "moduleId": 5,
  "positionInFeed": 3
}

# Get activity history
GET /api/shopper/activity?limit=100&offset=0&activityTypes=product_view,click
```

### Metrics & Segments

```bash
# Get engagement metrics
GET /api/shopper/metrics

# Get shopper segments
GET /api/shopper/segments

# Get shopper context (for personalization)
GET /api/shopper/context
```

### Privacy & Consent

```bash
# Update privacy consent
POST /api/shopper/privacy/consent
{
  "data_collection": true,
  "personalization": true,
  "marketing": false,
  "third_party_sharing": false,
  "analytics": true
}

# Export user data (GDPR)
GET /api/shopper/data/export

# Request data deletion (GDPR)
POST /api/shopper/data/delete
```

## Service Layer

### ShopperDataService

#### Activity Tracking
```javascript
await ShopperDataService.trackActivity({
  userId: 123,
  sessionId: 'session_abc',
  activityType: 'product_view',
  activityCategory: 'browsing',
  productId: 456,
  experimentId: 10,
  variantId: 25
});
```

#### Engagement Metrics
```javascript
const metrics = await ShopperDataService.getEngagementMetrics(userId);
const score = await ShopperDataService.calculateEngagementScore(userId);
```

#### Segmentation
```javascript
// Evaluate and assign segments
const segments = await ShopperDataService.evaluateShopperSegments(userId);

// Get user's segments
const userSegments = await ShopperDataService.getShopperSegments(userId);
```

#### Privacy Management
```javascript
// Check consent
const hasConsent = await ShopperDataService.hasPrivacyConsent(userId, 'data_collection');

// Update consent
await ShopperDataService.updatePrivacyConsent(userId, {
  data_collection: true,
  personalization: true
}, { ipAddress, userAgent });

// Anonymize data (GDPR)
await ShopperDataService.anonymizeUserData(userId, 'user_request');

// Export data (GDPR)
const userData = await ShopperDataService.exportUserData(userId);
```

#### Recommendation Context
```javascript
// Get enriched context for recommendations
const context = await ShopperDataService.getShopperContextForRecommendations(userId);
// Returns: metrics, segments, recent activity, style profile, active experiments
```

## Experiment Integration

### Automatic Experiment Tracking

When `trackActivity()` is called with `experimentId` and `variantId`, the system automatically:

1. Logs the activity to `shopper_activity`
2. Triggers insertion into `experiment_events` (via database trigger)
3. Updates `shopper_engagement_metrics`
4. Can influence segment assignment

### Experiment Service Integration

```javascript
// Get experiment assignment for a module
const assignment = await ExperimentService.getModuleExperimentAssignment(userId, moduleId);

// Track activity with experiment context
await ShopperDataService.trackActivity({
  userId,
  activityType: 'click',
  experimentId: assignment.experiment_id,
  variantId: assignment.variant_id,
  moduleId
});
```

## Recommendation Integration

### EnhancedRecommendationService

The new `EnhancedRecommendationService` provides advanced recommendations by combining:
- Shopper activity history
- Segment membership
- 100D style profile
- Experiment variants
- Engagement metrics

#### Usage

```javascript
const recommendations = await EnhancedRecommendationService.getPersonalizedRecommendations(
  userId,
  {
    context: 'newsfeed',
    limit: 20,
    moduleId: 5
  }
);

// Returns:
{
  recommendations: [...],
  metadata: {
    algorithm: 'hybrid',
    shopperSegments: ['high_value_frequent', 'brand_loyalist'],
    experimentVariant: 'variant_b',
    totalCount: 20,
    personalizationScore: 0.85
  }
}
```

#### Available Algorithms

1. **Collaborative Filtering Plus** - For high-value frequent shoppers
   - Finds similar users based on engagement patterns and 100D profile
   - Recommends items those users have engaged with

2. **Content-Based** - Uses 100D style profile
   - Matches items to user's style dimensions
   - Considers brand affinity and preferences

3. **Popularity-Based** - For new shoppers
   - Shows trending items based on recent activity
   - Good for cold-start problem

4. **Similar Items** - For window shoppers
   - Based on recently viewed items
   - Recommends similar products

5. **Hybrid** (default) - Combines all algorithms
   - 40% collaborative filtering
   - 40% content-based
   - 20% similar items

## Privacy & Security Features

### Privacy Consent System

Users must consent to:
- `data_collection` - Basic activity tracking
- `personalization` - Use data for recommendations
- `marketing` - Marketing communications
- `third_party_sharing` - Share with partners
- `analytics` - Aggregate analytics

**Before any tracking**: System checks `has_privacy_consent()` function

### GDPR Compliance

#### Right to Access
```bash
GET /api/shopper/data/export
```
Returns complete user data in portable format.

#### Right to be Forgotten
```bash
POST /api/shopper/data/delete
```
Anonymizes user data:
- Removes PII from `shopper_activity`
- Anonymizes email, username
- Logs anonymization action

#### Data Retention
- Activity data: Configurable retention period
- Anonymized data: Can be retained for analytics
- Audit logs: Retained per compliance requirements

### Security Features

1. **Authentication Required** - All endpoints require valid JWT
2. **Rate Limiting** - Prevents abuse (implemented in middleware)
3. **Audit Logging** - All privacy actions logged to `privacy_consent_log`
4. **Data Access Logs** - Tracks who accesses whose data
5. **Anonymization** - Automatic PII removal for compliance

## Analytics Views

### Pre-computed Views

```sql
-- Active shoppers by segment
SELECT * FROM active_shoppers_by_segment;

-- Activity summary (last 7 days)
SELECT * FROM shopper_activity_summary_7d;

-- Top engaged shoppers
SELECT * FROM top_engaged_shoppers;
```

### Custom Queries

```sql
-- Engagement score distribution
SELECT
  CASE
    WHEN engagement_score >= 0.8 THEN 'High'
    WHEN engagement_score >= 0.5 THEN 'Medium'
    ELSE 'Low'
  END as engagement_level,
  COUNT(*) as shopper_count
FROM shopper_engagement_metrics
GROUP BY engagement_level;

-- Conversion funnel by segment
SELECT
  ss.segment_name,
  COUNT(DISTINCT CASE WHEN sa.activity_type = 'product_view' THEN sa.user_id END) as viewers,
  COUNT(DISTINCT CASE WHEN sa.activity_type = 'add_to_cart' THEN sa.user_id END) as cart_adds,
  COUNT(DISTINCT CASE WHEN sa.activity_type = 'purchase' THEN sa.user_id END) as purchases
FROM shopper_segments ss
JOIN shopper_segment_membership ssm ON ss.id = ssm.segment_id
JOIN shopper_activity sa ON ssm.user_id = sa.user_id
WHERE sa.occurred_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ss.segment_name;
```

## Engagement Score Calculation

The engagement score (0-1) is calculated from:

1. **Recency (25%)** - Days since last activity
   - ≤1 day: 1.0
   - ≤7 days: 0.8
   - ≤30 days: 0.5
   - ≤90 days: 0.2
   - >90 days: 0.1

2. **Frequency (20%)** - Total sessions
   - ≥50 sessions: 1.0
   - ≥20 sessions: 0.8
   - ≥10 sessions: 0.6
   - ≥5 sessions: 0.4
   - <5 sessions: 0.2

3. **Conversion (25%)** - Conversion rate
   - Direct value (0-1)

4. **Revenue (20%)** - Total revenue
   - ≥$1000: 1.0
   - ≥$500: 0.8
   - ≥$200: 0.6
   - ≥$50: 0.4
   - <$50: 0.2

5. **Engagement (10%)** - Click-through rate
   - ≥50% CTR: 1.0
   - ≥30% CTR: 0.8
   - ≥20% CTR: 0.6
   - ≥10% CTR: 0.4
   - <10% CTR: 0.2

## Migration & Setup

### Run Migration

```bash
# Apply the migration
psql -U your_user -d muse_shopping -f migrations/055_create_shopper_activity_system.sql
```

### Verification

```sql
-- Check tables created
\dt shopper_*
\dt privacy_*
\dt data_anonymization_log

-- Check default segments
SELECT * FROM shopper_segments;

-- Check functions
\df has_privacy_consent
\df anonymize_user_data
```

## Integration with Existing Systems

### 100D Style Profile Integration
- Activity automatically updates style profile dimensions
- Profile used for content-based recommendations
- Dimensions inform segment assignment

### Experiment System Integration
- Activity tracking includes experiment context
- Automatic logging to `experiment_events`
- Supports module-level experiments

### Cart System Integration
- Track cart adds/removals as activities
- Update engagement metrics
- Influence cart abandonment segment

### Checkout System Integration
- Track purchases as activities
- Update revenue metrics
- Trigger segment re-evaluation

## Performance Considerations

### Indexes
- All major query patterns indexed
- GIN indexes for JSONB fields
- Partial indexes for filtered queries

### Triggers
- Minimal overhead (update engagement metrics)
- Asynchronous experiment logging

### Caching
- Engagement metrics cached (recalculated periodically)
- Segment membership cached (re-evaluated on activity)

### Archiving
- Old activity data can be archived to separate table
- Anonymized data retained for analytics

## Best Practices

### Activity Tracking
1. Always check privacy consent before tracking
2. Include experiment context when available
3. Set appropriate activity types and categories
4. Include product/brand context when relevant

### Privacy Management
1. Request consent during onboarding
2. Provide easy access to privacy settings
3. Honor deletion requests promptly
4. Log all privacy-related actions

### Segmentation
1. Re-evaluate segments after significant events
2. Use segments for targeted experiences
3. Monitor segment drift over time
4. Create custom segments for campaigns

### Recommendations
1. Use appropriate algorithm for segment
2. Track recommendation performance
3. A/B test different algorithms
4. Monitor personalization score

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Activity Volume**
   - Activities per hour/day
   - Activity type distribution
   - Error rates

2. **Engagement Health**
   - Average engagement score
   - Engagement score distribution
   - Segment sizes

3. **Privacy Compliance**
   - Consent rates by type
   - Deletion request volume
   - Anonymization lag time

4. **Recommendation Performance**
   - Click-through rate by algorithm
   - Conversion rate by algorithm
   - Personalization score distribution

### Alert Conditions

- Activity volume drops >50% hour-over-hour
- Engagement score drops >20% week-over-week
- Privacy deletion requests spike
- Recommendation CTR drops below threshold

## Future Enhancements

1. **Real-time Segmentation** - Stream processing for instant segment updates
2. **Advanced Algorithms** - Deep learning for recommendations
3. **Cross-device Tracking** - Link activities across devices
4. **Predictive Analytics** - Churn prediction, LTV modeling
5. **Privacy Automation** - Auto-anonymization based on retention policies

## Support & Troubleshooting

### Common Issues

**Activity not tracking:**
- Check user has consented to data_collection
- Verify authentication token is valid
- Check database connectivity

**Segments not updating:**
- Manually trigger `evaluateShopperSegments(userId)`
- Check segment criteria are valid
- Verify engagement metrics are current

**Recommendations not personalized:**
- Check personalization_score in metadata
- Verify user has sufficient activity history
- Ensure style profile exists

### Debug Queries

```sql
-- Check user's consent status
SELECT privacy_consent FROM users WHERE id = 123;

-- Check user's recent activity
SELECT * FROM shopper_activity
WHERE user_id = 123
ORDER BY occurred_at DESC
LIMIT 50;

-- Check user's engagement metrics
SELECT * FROM shopper_engagement_metrics
WHERE user_id = 123;

-- Check user's segments
SELECT s.* FROM shopper_segments s
JOIN shopper_segment_membership ssm ON s.id = ssm.segment_id
WHERE ssm.user_id = 123;
```

## Summary

This shopper data system provides:

✅ Real-time activity tracking
✅ Privacy-compliant data collection
✅ GDPR right to access & be forgotten
✅ Dynamic customer segmentation
✅ Integrated A/B testing
✅ Enhanced personalized recommendations
✅ 100D style profile integration
✅ Comprehensive analytics
✅ Audit trails for compliance

The system is production-ready and scales to millions of users while maintaining privacy and security best practices.
