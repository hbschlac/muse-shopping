# Curated Marketing Campaigns - Implementation Guide

## Overview

The Curated Campaigns system allows you to fill blank tiles in your newsfeed with curated marketing content for organic (non-sponsored) promotional campaigns. This is perfect for seasonal collections, trend spotlights, new arrivals, sale promotions, and editorial content.

## Key Features

✅ **Flexible Campaign Management** - Create, schedule, and manage marketing campaigns
✅ **Multiple Placement Slots** - Homepage hero, newsfeed positions, category pages
✅ **Item Curation** - Hand-pick items or use reusable collections
✅ **Smart Fallbacks** - Curated content fills empty slots when no sponsored content is available
✅ **Full Analytics** - Track impressions, clicks, conversions, and ROI
✅ **Frequency Capping** - Control how often users see campaigns
✅ **Targeting Options** - Geographic and audience targeting

---

## Database Schema

The system includes these main tables:

### Core Tables
- **`curated_campaigns`** - Main campaign definitions
- **`curated_campaign_items`** - Items featured in campaigns
- **`curated_collections`** - Reusable item groups
- **`curated_collection_items`** - Items in collections

### Analytics Tables
- **`curated_campaign_impressions`** - View tracking
- **`curated_campaign_clicks`** - Click tracking
- **`curated_campaign_conversions`** - Conversion tracking
- **`user_curated_campaign_frequency`** - Frequency cap tracking

### Database Functions
- `get_eligible_curated_campaigns(userId, placementSlot, limit)` - Get campaigns user should see
- `get_curated_campaign_items(campaignId, limit)` - Get items for a campaign

---

## Campaign Types

Choose from these campaign types:

| Type | Use Case | Example |
|------|----------|---------|
| `seasonal_collection` | Seasonal fashion trends | "Spring 2026 Collection" |
| `trend_spotlight` | Highlight trending styles | "Y2K Revival" |
| `style_edit` | Curated style guides | "Minimalist Essentials" |
| `new_arrivals` | Latest product drops | "Just In: Designer Denim" |
| `sale_promotion` | Sales and discounts | "End of Season Sale" |
| `brand_story` | Brand storytelling | "Meet the Designer" |
| `gift_guide` | Gift recommendations | "Holiday Gift Guide" |
| `occasion_based` | Event-based content | "Wedding Season Edit" |
| `editorial` | Editorial content | "How to Style Oversized Blazers" |

---

## Placement Slots

Campaigns can be placed in these locations:

- **`homepage_hero`** - Large hero banner at top of homepage
- **`newsfeed_top`** - First position in newsfeed
- **`newsfeed_position_3`** - 3rd position in feed
- **`newsfeed_position_5`** - 5th position in feed
- **`newsfeed_position_8`** - 8th position in feed
- **`stories_carousel`** - Instagram-style stories
- **`category_hero`** - Category page hero
- **`search_hero`** - Search results hero

### Content Priority

The newsfeed service prioritizes content as follows:
1. **Sponsored campaigns** (paid)
2. **Curated campaigns** (organic marketing)
3. **Regular feed modules** (brand content)

If a sponsored campaign exists for a placement slot, it takes precedence. If not, a curated campaign fills the slot.

---

## API Endpoints

### Public Endpoints

#### Get Eligible Campaigns
```http
GET /api/v1/curated-campaigns/eligible?placementSlot=homepage_hero&limit=5
```

#### Get Campaign Details
```http
GET /api/v1/curated-campaigns/:campaignId
```

#### Track Impression
```http
POST /api/v1/curated-campaigns/:campaignId/impressions
Content-Type: application/json

{
  "placementShown": "homepage_hero",
  "deviceType": "mobile",
  "viewDurationSeconds": 5,
  "sessionId": "uuid"
}
```

#### Track Click
```http
POST /api/v1/curated-campaigns/:campaignId/clicks
Content-Type: application/json

{
  "impressionId": "uuid",
  "clickedItemId": "uuid",
  "clickType": "item_card",
  "sessionId": "uuid"
}
```

#### Track Conversion
```http
POST /api/v1/curated-campaigns/:campaignId/conversions
Content-Type: application/json

{
  "clickId": "uuid",
  "conversionType": "purchase",
  "itemId": "uuid",
  "conversionValue": 89.99,
  "timeToConversionSeconds": 3600
}
```

### Admin Endpoints

#### List All Campaigns
```http
GET /api/v1/admin/curated-campaigns?status=active&limit=50&offset=0
```

#### Create Campaign
```http
POST /api/v1/admin/curated-campaigns
Content-Type: application/json

{
  "name": "Spring 2026 Collection",
  "description": "Fresh styles for the new season",
  "campaignType": "seasonal_collection",
  "placementSlot": "homepage_hero",
  "priority": 100,
  "startsAt": "2026-03-01T00:00:00Z",
  "endsAt": "2026-05-31T23:59:59Z",
  "heroImageUrl": "https://cdn.example.com/spring-hero.jpg",
  "headline": "Welcome Spring",
  "subheadline": "Discover the season's must-haves",
  "callToAction": "Shop Now",
  "ctaUrl": "/collections/spring-2026",
  "items": [
    {
      "itemId": "uuid-1",
      "position": 1,
      "customTitle": "Featured: Linen Shirt"
    },
    {
      "itemId": "uuid-2",
      "position": 2
    }
  ]
}
```

#### Update Campaign Status
```http
PATCH /api/v1/admin/curated-campaigns/:campaignId/status
Content-Type: application/json

{
  "status": "active"
}
```

#### Add Items to Campaign
```http
POST /api/v1/admin/curated-campaigns/:campaignId/items
Content-Type: application/json

{
  "items": [
    {
      "itemId": "uuid-3",
      "position": 3,
      "customTitle": "Limited Edition Sneakers",
      "customImageUrl": "https://cdn.example.com/custom-sneaker.jpg"
    }
  ]
}
```

#### Get Campaign Performance
```http
GET /api/v1/admin/curated-campaigns/:campaignId/performance?startDate=2026-03-01&endDate=2026-03-31
```

Response:
```json
{
  "success": true,
  "data": {
    "campaignId": "uuid",
    "campaignName": "Spring 2026 Collection",
    "totalImpressions": 50000,
    "uniqueUsersReached": 12500,
    "totalClicks": 2500,
    "totalConversions": 250,
    "totalConversionValue": 12500.00,
    "ctrPercentage": 5.0,
    "conversionRatePercentage": 10.0,
    "dailyBreakdown": [...]
  }
}
```

#### Get Overview Analytics
```http
GET /api/v1/admin/curated-campaigns/analytics/overview?startDate=2026-01-01&endDate=2026-12-31
```

---

## Usage Examples

### Example 1: Create a "Shop Latest Season" Campaign

```javascript
const campaign = {
  name: "Shop Latest Season Finds",
  description: "Curated selection of this season's hottest trends",
  campaignType: "seasonal_collection",
  placementSlot: "homepage_hero",
  priority: 100,

  // Timing
  startsAt: "2026-03-01T00:00:00Z",
  endsAt: "2026-05-31T23:59:59Z",

  // Creative assets
  heroImageUrl: "https://cdn.example.com/season-hero.jpg",
  backgroundColor: "#F5F5DC",
  textColor: "#333333",

  // Copy
  headline: "Shop the Season",
  subheadline: "Discover handpicked styles perfect for spring",
  callToAction: "Explore Collection",
  ctaUrl: "/collections/spring-trends",

  // Targeting
  targetAudience: {
    genders: ["women", "unisex"],
    styles: ["minimalist", "contemporary"]
  },
  geographicTargeting: {
    countries: ["US", "CA"]
  },

  // Frequency cap: Show max 5 times per user
  maxImpressionsPerUser: 5,

  // Items to feature
  items: [
    { itemId: "linen-blazer-id", position: 1 },
    { itemId: "wide-leg-pants-id", position: 2 },
    { itemId: "loafers-id", position: 3 },
    { itemId: "tote-bag-id", position: 4 }
  ]
};

// Create via API
fetch('/api/v1/admin/curated-campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(campaign)
});
```

### Example 2: Create a Reusable Collection

```javascript
const collection = {
  name: "Best Sellers - Spring 2026",
  description: "Top performing items this season",
  collectionType: "manual",
  maxItems: 20,
  items: [
    { itemId: "item-1-id", position: 1 },
    { itemId: "item-2-id", position: 2 },
    // ... more items
  ]
};

// Create collection
fetch('/api/v1/admin/curated-campaigns/collections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(collection)
});

// Use collection in multiple campaigns
const campaign = {
  name: "Best Sellers Campaign",
  // ... other fields
  collectionIds: ["collection-uuid"]
};
```

### Example 3: Frontend Integration

```typescript
// Fetch newsfeed with curated content
const response = await fetch('/api/v1/newsfeed');
const feed = await response.json();

// The response includes hero_content which could be curated
if (feed.hero_content?.type === 'curated') {
  const campaign = feed.hero_content.campaign;

  // Render hero banner
  renderHeroBanner({
    image: campaign.heroImageUrl,
    headline: campaign.headline,
    subheadline: campaign.subheadline,
    cta: campaign.callToAction,
    items: campaign.items
  });

  // Track impression
  await fetch(`/api/v1/curated-campaigns/${campaign.id}/impressions`, {
    method: 'POST',
    body: JSON.stringify({
      placementShown: 'homepage_hero',
      deviceType: 'mobile',
      sessionId: sessionId
    })
  });
}

// Handle click on campaign
const handleCampaignClick = async (campaignId, itemId) => {
  await fetch(`/api/v1/curated-campaigns/${campaignId}/clicks`, {
    method: 'POST',
    body: JSON.stringify({
      clickedItemId: itemId,
      clickType: 'item_card',
      sessionId: sessionId
    })
  });
};
```

---

## Campaign Lifecycle

### States
1. **Draft** - Campaign is being created
2. **Scheduled** - Campaign is ready, waiting for start date
3. **Active** - Currently running
4. **Paused** - Temporarily disabled
5. **Completed** - Ended successfully
6. **Archived** - Archived for historical reference

### Workflow
```
Draft → Scheduled → Active → Completed → Archived
                      ↓
                   Paused → Active
```

---

## Best Practices

### Campaign Creation
- **Use high-quality hero images** (minimum 1920x1080px)
- **Keep headlines under 50 characters** for better readability
- **Test different placements** to find what works best
- **Set frequency caps** to avoid ad fatigue (3-5 impressions)
- **Use priority wisely** (100 = default, higher = more important)

### Item Selection
- **Feature 4-8 items** per campaign for optimal engagement
- **Mix price points** to appeal to different budgets
- **Include variety** in categories and styles
- **Update regularly** to keep content fresh

### Analytics
- **Track CTR** - Aim for 3-5% click-through rate
- **Monitor conversion rate** - Target 5-10% from clicks
- **Watch frequency** - Users seeing campaign 3+ times
- **Analyze daily trends** - Identify peak engagement times

### Targeting
- **Geographic targeting** for region-specific campaigns
- **Style preferences** to match user tastes
- **New user campaigns** for onboarding experiences
- **A/B test** different audiences

---

## Migration & Setup

### 1. Run Database Migration
```bash
psql -U your_user -d your_database -f src/db/migrations/050_curated_marketing_campaigns.sql
```

### 2. Verify Tables Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'curated_%';
```

### 3. Test Basic Functionality
```bash
# Start your server
npm start

# Test campaign creation
curl -X POST http://localhost:3000/api/v1/admin/curated-campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Campaign","campaignType":"new_arrivals","placementSlot":"homepage_hero"}'
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Impression Metrics**
   - Total impressions
   - Unique users reached
   - Average impressions per user

2. **Engagement Metrics**
   - Click-through rate (CTR)
   - Items clicked per campaign
   - Time spent viewing

3. **Conversion Metrics**
   - Conversion rate
   - Average order value from campaigns
   - Total revenue attributed

4. **Campaign Health**
   - Active campaigns count
   - Campaigns by placement slot
   - Fill rate (curated vs sponsored)

### Dashboard Queries

```sql
-- Top performing campaigns
SELECT
  campaign_id,
  name,
  total_impressions,
  total_clicks,
  ctr_percentage,
  total_conversions,
  total_conversion_value
FROM curated_campaign_performance
ORDER BY total_conversion_value DESC
LIMIT 10;

-- Campaign fill rate by placement
SELECT
  placement_slot,
  COUNT(*) as active_campaigns,
  AVG(priority) as avg_priority
FROM curated_campaigns
WHERE status = 'active'
GROUP BY placement_slot;
```

---

## Troubleshooting

### Campaign Not Showing
1. Check campaign status is `active`
2. Verify `starts_at` is in the past and `ends_at` is in the future
3. Check if user has exceeded frequency cap
4. Ensure placement slot matches where you're looking
5. Verify a sponsored campaign isn't taking precedence

### Low Performance
1. Review hero image quality and relevance
2. Test different headlines and CTAs
3. Check item selection - ensure items are in-stock
4. Analyze timing - when are users most active?
5. Consider adjusting target audience

### Analytics Not Recording
1. Verify tracking calls are being made from frontend
2. Check user authentication (required for tracking)
3. Review network logs for API errors
4. Ensure session IDs are being passed correctly

---

## Future Enhancements

Potential features to add:

- **A/B Testing** - Test multiple variations of campaigns
- **Algorithmic Collections** - Auto-populate based on rules
- **Dynamic Personalization** - Customize content per user
- **Video Support** - Add video assets to campaigns
- **Schedule Optimizer** - Suggest best times to run campaigns
- **ROI Calculator** - Estimate expected returns
- **Template Library** - Pre-built campaign templates

---

## Support

For questions or issues:
- Check the codebase documentation in `/src/services/curatedCampaignService.js`
- Review API routes in `/src/routes/curatedCampaignRoutes.js`
- See database schema in `/src/db/migrations/050_curated_marketing_campaigns.sql`

Happy curating! 🎨
