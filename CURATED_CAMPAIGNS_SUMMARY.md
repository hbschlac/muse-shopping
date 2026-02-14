# Curated Marketing Campaigns - Implementation Summary

## What We Built

A complete **content curation system** that allows you to fill blank tiles in your newsfeed with organic marketing campaigns. This enables non-sponsored promotional content like "Shop Latest Season Finds" without relying on paid advertising.

---

## Key Components Created

### 1. Database Schema (`/src/db/migrations/050_curated_marketing_campaigns.sql`)

**Main Tables:**
- `curated_campaigns` - Campaign definitions with creative assets, targeting, and scheduling
- `curated_campaign_items` - Items featured in campaigns with custom metadata
- `curated_collections` - Reusable item groups (manual/algorithmic/hybrid)
- `curated_collection_items` - Items within collections
- `curated_campaign_collections` - Link campaigns to collections

**Analytics Tables:**
- `curated_campaign_impressions` - View tracking
- `curated_campaign_clicks` - Click tracking
- `curated_campaign_conversions` - Conversion tracking (add_to_cart, favorite, purchase)
- `user_curated_campaign_frequency` - Frequency cap tracking

**Helper Functions:**
- `get_eligible_curated_campaigns()` - Find campaigns user should see
- `get_curated_campaign_items()` - Get items for a campaign

**Views:**
- `active_curated_campaigns` - Currently running campaigns
- `curated_campaign_performance` - Performance metrics and ROI

---

### 2. Backend Service (`/src/services/curatedCampaignService.js`)

Core methods for campaign management:

**Campaign Operations:**
- `getEligibleCampaigns()` - Get campaigns for placement slot
- `getCampaignDetails()` - Full campaign with items
- `getCampaignItems()` - Items for a campaign
- `createCampaign()` - Create new campaign
- `updateCampaign()` - Update existing campaign
- `deleteCampaign()` - Delete campaign
- `duplicateCampaign()` - Clone existing campaign
- `listCampaigns()` - List with filters

**Item Management:**
- `addItemsToCampaign()` - Add items to campaign
- `removeItemsFromCampaign()` - Remove items from campaign

**Collection Management:**
- `createCollection()` - Create reusable item collection

**Analytics:**
- `trackImpression()` - Record view
- `trackClick()` - Record click
- `trackConversion()` - Record conversion
- `getCampaignPerformance()` - Detailed metrics
- `getCampaignsOverview()` - Overall analytics
- `getCampaignCountsByStatus()` - Dashboard counts

---

### 3. API Routes

#### Public Routes (`/src/routes/curatedCampaignRoutes.js`)
- `GET /api/v1/curated-campaigns/eligible` - Get eligible campaigns
- `GET /api/v1/curated-campaigns/:id` - Get campaign details
- `GET /api/v1/curated-campaigns/:id/items` - Get campaign items
- `POST /api/v1/curated-campaigns/:id/impressions` - Track view
- `POST /api/v1/curated-campaigns/:id/clicks` - Track click
- `POST /api/v1/curated-campaigns/:id/conversions` - Track conversion

#### Admin Routes (`/src/routes/admin/curatedCampaigns.js`)
- `GET /api/v1/admin/curated-campaigns` - List all campaigns
- `POST /api/v1/admin/curated-campaigns` - Create campaign
- `PUT /api/v1/admin/curated-campaigns/:id` - Update campaign
- `PATCH /api/v1/admin/curated-campaigns/:id/status` - Update status
- `DELETE /api/v1/admin/curated-campaigns/:id` - Delete campaign
- `POST /api/v1/admin/curated-campaigns/:id/items` - Add items
- `DELETE /api/v1/admin/curated-campaigns/:id/items` - Remove items
- `GET /api/v1/admin/curated-campaigns/:id/performance` - Analytics
- `POST /api/v1/admin/curated-campaigns/:id/duplicate` - Duplicate
- `POST /api/v1/admin/curated-campaigns/collections` - Create collection
- `GET /api/v1/admin/curated-campaigns/templates` - Get templates

---

### 4. Newsfeed Integration (`/src/services/newsfeedService.js`)

**Smart Fallback Logic:**
The newsfeed now prioritizes content as:
1. **Sponsored content** (paid) - takes precedence if available
2. **Curated campaigns** (organic) - fills empty slots
3. **Regular modules** (brand content) - default feed

**Modified Methods:**
- `getCompleteFeed()` - Now returns `hero_content` (sponsored OR curated)
- `insertSponsoredAndCuratedModules()` - Injects both types at positions 3 & 8

**Placement Slots Supported:**
- `homepage_hero` - Hero banner at top
- `newsfeed_position_3` - 3rd position in feed
- `newsfeed_position_8` - 8th position in feed
- Plus: `newsfeed_top`, `newsfeed_position_5`, `stories_carousel`, `category_hero`, `search_hero`

---

### 5. Controller (`/src/controllers/curatedCampaignController.js`)

Handles HTTP requests and responses for all campaign operations with:
- Request validation using express-validator
- Error handling and logging
- Authentication checks
- Response formatting

---

## Campaign Types Supported

| Type | Use Case |
|------|----------|
| `seasonal_collection` | Seasonal trends (Spring 2026, Holiday 2025) |
| `trend_spotlight` | Trending styles (Y2K, Cottagecore) |
| `style_edit` | Curated style guides (Minimalist Essentials) |
| `new_arrivals` | Latest drops (New: Designer Denim) |
| `sale_promotion` | Sales and discounts (End of Season Sale) |
| `brand_story` | Brand storytelling (Meet the Designer) |
| `gift_guide` | Gift recommendations (Holiday Gift Guide) |
| `occasion_based` | Event-based (Wedding Season Edit) |
| `editorial` | Editorial content (How to Style Oversized Blazers) |

---

## Features

### Campaign Management
✅ Create campaigns with creative assets (images, colors, copy)
✅ Schedule campaigns with start/end dates
✅ Set priority levels for campaign ordering
✅ Lifecycle management (draft → scheduled → active → paused → completed)
✅ Duplicate campaigns for quick creation
✅ Template library for common campaign types

### Content Curation
✅ Hand-pick items to feature
✅ Create reusable collections (manual, algorithmic, hybrid)
✅ Custom titles/descriptions/images per item
✅ Position control for item ordering
✅ Link multiple collections to campaigns

### Targeting & Display
✅ Placement slot selection (8 locations)
✅ Geographic targeting (countries/regions)
✅ Audience targeting (genders, styles, age ranges)
✅ Frequency capping (max impressions per user)
✅ New user targeting option

### Analytics & Tracking
✅ Impression tracking with view duration
✅ Click tracking by element type
✅ Conversion tracking (add_to_cart, favorite, purchase)
✅ ROI calculation (conversion value)
✅ Daily breakdown reports
✅ CTR and conversion rate metrics
✅ Unique users reached

---

## How It Works

### Content Serving Flow

```
1. User loads newsfeed
   ↓
2. NewsfeedService.getCompleteFeed()
   ↓
3. Check for sponsored content at placement slot
   ↓
4. If no sponsored content:
   ↓ CuratedCampaignService.getEligibleCampaigns()
   ↓ - Check campaign status (active)
   ↓ - Check timing (starts_at, ends_at)
   ↓ - Check frequency cap
   ↓ - Check targeting (geo, audience)
   ↓ - Order by priority
   ↓
5. Return curated campaign
   ↓
6. Frontend renders campaign
   ↓
7. Track impression
   ↓
8. User clicks → Track click
   ↓
9. User converts → Track conversion
```

### Priority System

When multiple campaigns exist for the same slot:
1. Filter by eligibility (status, timing, frequency, targeting)
2. Order by priority (higher number = higher priority)
3. Randomize among same priority
4. Return top result

---

## Example Usage

### Create a "Shop Latest Season" Campaign

```bash
POST /api/v1/admin/curated-campaigns
{
  "name": "Shop Latest Season Finds",
  "campaignType": "seasonal_collection",
  "placementSlot": "homepage_hero",
  "priority": 100,
  "startsAt": "2026-03-01T00:00:00Z",
  "endsAt": "2026-05-31T23:59:59Z",
  "heroImageUrl": "https://cdn.example.com/spring.jpg",
  "headline": "Shop the Season",
  "subheadline": "Discover this season's must-haves",
  "callToAction": "Explore Collection",
  "maxImpressionsPerUser": 5,
  "items": [
    { "itemId": "uuid-1", "position": 1 },
    { "itemId": "uuid-2", "position": 2 }
  ]
}
```

### Frontend Integration

```javascript
// Fetch newsfeed
const feed = await fetch('/api/v1/newsfeed').then(r => r.json());

// Check for curated hero content
if (feed.hero_content?.type === 'curated') {
  const campaign = feed.hero_content.campaign;

  // Render hero banner with campaign data
  renderHero(campaign);

  // Track impression
  await fetch(`/api/v1/curated-campaigns/${campaign.id}/impressions`, {
    method: 'POST',
    body: JSON.stringify({
      placementShown: 'homepage_hero',
      deviceType: 'mobile'
    })
  });
}
```

---

## Files Created/Modified

### New Files
- ✅ `/src/db/migrations/050_curated_marketing_campaigns.sql` - Database schema
- ✅ `/src/services/curatedCampaignService.js` - Business logic
- ✅ `/src/controllers/curatedCampaignController.js` - HTTP handlers
- ✅ `/src/routes/curatedCampaignRoutes.js` - Public API routes
- ✅ `/src/routes/admin/curatedCampaigns.js` - Admin API routes
- ✅ `/CURATED_CAMPAIGNS_GUIDE.md` - Comprehensive documentation

### Modified Files
- ✅ `/src/routes/index.js` - Registered new routes
- ✅ `/src/services/newsfeedService.js` - Integrated curated campaigns

---

## Next Steps

### 1. Run Database Migration
```bash
psql -U your_user -d your_database -f src/db/migrations/050_curated_marketing_campaigns.sql
```

### 2. Start Server
```bash
npm start
```

### 3. Test API
```bash
# Create a test campaign
curl -X POST http://localhost:3000/api/v1/admin/curated-campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "campaignType": "new_arrivals",
    "placementSlot": "homepage_hero"
  }'
```

### 4. Integrate Frontend
- Update newsfeed component to render curated campaigns
- Add tracking calls for impressions/clicks/conversions
- Build admin UI for campaign management

### 5. Monitor Performance
- Track CTR (aim for 3-5%)
- Monitor conversion rate (target 5-10%)
- Analyze user engagement patterns
- A/B test different campaigns

---

## Benefits vs. Sponsored Content

| Feature | Sponsored | Curated |
|---------|-----------|---------|
| **Cost** | Paid (CPM/CPC/Flat) | Free (organic) |
| **Use Case** | External advertisers | Internal marketing |
| **Approval** | Requires approval flow | Direct control |
| **Budget** | Budget tracking | No budget limits |
| **Flexibility** | Advertiser constraints | Full creative control |
| **Targeting** | Similar options | Similar options |
| **Analytics** | Similar metrics | Similar metrics |

---

## Summary

You now have a complete content curation system that allows you to:
- ✅ Create organic marketing campaigns
- ✅ Fill blank tiles when no sponsored content exists
- ✅ Target specific audiences and locations
- ✅ Track full funnel analytics (impressions → clicks → conversions)
- ✅ Manage campaigns through admin APIs
- ✅ Reuse collections across multiple campaigns

The system seamlessly integrates with your existing newsfeed, prioritizing sponsored content when available, but falling back to curated campaigns to ensure no blank spaces in your feed.

Perfect for running seasonal collections, new arrival promotions, sale campaigns, and editorial content without needing paid advertising budget!
