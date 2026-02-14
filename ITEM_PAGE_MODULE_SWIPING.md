# Item/Product Page - Module Swiping Integration ✅

## Overview

The item/product page now has complete module swiping support with activity tracking, A/B testing integration, and position-based click tracking for the Similar Items carousel.

## What Was Implemented

### 1. Product View Tracking

**Automatic Product View Tracking:**
- When a user lands on a product page, their view is automatically tracked
- Includes product ID and brand ID
- Respects privacy consent settings
- Triggers on page load when product data is available

**Implementation:**
```typescript
// In /app/product/[id]/page.tsx
const { trackProductView, trackAddToCart } = useActivityTracking();

useEffect(() => {
  if (product) {
    trackProductView(product.id, product.brand_id);
  }
}, [product, trackProductView]);
```

### 2. Add to Cart Tracking

**Automatic Cart Action Tracking:**
- Tracks when user adds product to cart
- Includes product ID, brand ID, and price
- Logged as conversion activity
- Integrates with experiment tracking if available

**Implementation:**
```typescript
const handleAddToCart = async () => {
  // ... add to cart logic ...

  // Track add to cart activity
  if (product) {
    trackAddToCart(
      product.id,
      product.brand_id,
      product.best_price ? product.best_price * 100 : undefined
    );
  }
};
```

### 3. Similar Items Module with Position Tracking

**Swipeable Carousel with Click Tracking:**
- Horizontal scrolling module with snap-to-grid
- Each item click tracked with position (1-indexed)
- Optional module ID for A/B testing
- Smooth touch scrolling on mobile

**Key Features:**
- **Position Tracking**: Items tracked as position 1, 2, 3, etc.
- **Module ID Support**: Can pass `moduleId` prop for experiment tracking
- **Fallback Data**: Uses demo data if API fails
- **Loading States**: Skeleton UI while loading
- **Error Handling**: Graceful degradation with debug info

**Implementation:**
```typescript
// SimilarItems component
const handleItemClick = (itemId: number, position: number) => {
  // Track click with position and optional module ID for A/B testing
  trackClick(itemId, moduleId, position);
};

// In the render:
{items.map((item, index) => (
  <ProductTile
    key={item.id}
    product={item}
    onClick={() => handleItemClick(item.id, index + 1)}
    // ... other props
  />
))}
```

## How It Works

### User Flow

1. **User lands on product page** → Product view tracked
2. **User scrolls to Similar Items** → Module visible
3. **User swipes/scrolls through items** → Touch-optimized scrolling
4. **User clicks on an item** → Click tracked with position
5. **User navigates to clicked product** → New product view tracked
6. **User adds to cart** → Cart action tracked

### Data Tracked

**Product View Event:**
```json
{
  "activityType": "product_view",
  "activityCategory": "browsing",
  "pageType": "product_detail",
  "productId": 123,
  "brandId": 45
}
```

**Similar Item Click Event:**
```json
{
  "activityType": "click",
  "activityCategory": "engagement",
  "itemId": 456,
  "moduleId": 7,  // Optional, for A/B testing
  "positionInFeed": 3  // Position in carousel (1-indexed)
}
```

**Add to Cart Event:**
```json
{
  "activityType": "add_to_cart",
  "activityCategory": "conversion",
  "productId": 123,
  "brandId": 45,
  "interactionData": {
    "value_cents": 4999
  }
}
```

## Integration with Systems

### ✅ Activity Tracking System
- All events logged to `shopper_activity` table
- Privacy consent automatically checked
- Viewport dimensions included
- Device type detected

### ✅ Experiment Service (A/B Testing)
- Module ID links to experiment assignments
- Click position tracked for analysis
- Automatic logging to `experiment_events` via database triggers
- Variant assignment happens automatically when moduleId provided

### ✅ Shopper Segmentation
- Activity updates engagement metrics
- Influences segment assignment
- Product views affect "window_shopper" vs "power_user" segments

### ✅ Recommendation Engine
- Click position helps optimize item ordering
- Similar item performance tracked
- Informs content-based recommendations

## Component API

### SimilarItems Component

```typescript
interface SimilarItemsProps {
  productId: string;          // Product to find similar items for
  limit?: number;             // Number of items to show (default: 16)
  moduleId?: number;          // Optional: Module ID for A/B testing
}

// Usage:
<SimilarItems
  productId={productId}
  limit={20}
  moduleId={7}  // Include for experiment tracking
/>
```

### ProductTile Component

```typescript
interface ProductTileProps {
  product: Product;
  aspectRatio?: 'portrait' | 'square' | 'landscape';
  showDetails?: boolean;
  showBrand?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;  // Called before navigation
}

// Usage:
<ProductTile
  product={item}
  aspectRatio="portrait"
  showBrand={true}
  size="md"
  onClick={() => handleItemClick(item.id, position)}
/>
```

## Styling & UX

### Scrolling Behavior
```css
/* Horizontal scroll with snap */
overflow-x: auto
snap-x snap-mandatory

/* Hide scrollbar while maintaining touch */
hide-scrollbar
-webkit-overflow-scrolling: touch

/* Items snap to grid */
flex gap-3
```

### Responsive Design
- **Mobile**: Smooth swipe gestures, momentum scrolling
- **Desktop**: Mouse drag or trackpad scroll
- **Tablet**: Touch-optimized with snap points

### Visual Feedback
- Hover states on ProductTile
- Shadow transitions
- Video autoplay on hover (desktop)
- Sale badges for discounted items

## Testing

### Manual Testing

1. **Product View Tracking:**
   ```bash
   # Open product page
   # Check Network tab for POST to /api/shopper/activity
   # Should see:
   {
     "activityType": "product_view",
     "productId": 123,
     "brandId": 45
   }
   ```

2. **Similar Items Click Tracking:**
   ```bash
   # Scroll to Similar Items
   # Click on 3rd item in carousel
   # Check Network tab for POST to /api/shopper/activity
   # Should see:
   {
     "activityType": "click",
     "itemId": 456,
     "positionInFeed": 3
   }
   ```

3. **Add to Cart Tracking:**
   ```bash
   # Click "Add to Cart" button
   # Check Network tab for POST to /api/shopper/activity
   # Should see:
   {
     "activityType": "add_to_cart",
     "productId": 123,
     "interactionData": { "value_cents": 4999 }
   }
   ```

### Verify Privacy Consent

1. Clear localStorage
2. Open product page
3. Privacy banner should appear
4. Without accepting, NO tracking requests should be sent
5. Accept consent
6. Tracking requests should now be sent

### Verify Position Tracking

1. Open product page with Similar Items
2. Click on 1st item → `positionInFeed: 1`
3. Click on 5th item → `positionInFeed: 5`
4. Verify in database:
   ```sql
   SELECT item_id, position_in_feed, occurred_at
   FROM shopper_activity
   WHERE activity_type = 'click'
   ORDER BY occurred_at DESC
   LIMIT 10;
   ```

## Database Queries

### Check Product Page Activity

```sql
-- Product views today
SELECT
  product_id,
  COUNT(*) as views,
  COUNT(DISTINCT user_id) as unique_viewers
FROM shopper_activity
WHERE activity_type = 'product_view'
  AND occurred_at >= CURRENT_DATE
GROUP BY product_id
ORDER BY views DESC
LIMIT 10;
```

### Similar Items Click-Through Rate

```sql
-- CTR by position in Similar Items module
SELECT
  position_in_feed,
  COUNT(*) as clicks,
  COUNT(DISTINCT user_id) as unique_clickers
FROM shopper_activity
WHERE activity_type = 'click'
  AND module_id = 7  -- Similar Items module
  AND occurred_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY position_in_feed
ORDER BY position_in_feed;
```

### Product Page Conversion Funnel

```sql
-- Conversion funnel for a specific product
WITH product_events AS (
  SELECT
    user_id,
    MAX(CASE WHEN activity_type = 'product_view' THEN 1 ELSE 0 END) as viewed,
    MAX(CASE WHEN activity_type = 'click' THEN 1 ELSE 0 END) as clicked_similar,
    MAX(CASE WHEN activity_type = 'add_to_cart' THEN 1 ELSE 0 END) as added_to_cart
  FROM shopper_activity
  WHERE product_id = 123
    AND occurred_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY user_id
)
SELECT
  COUNT(*) as total_viewers,
  SUM(clicked_similar) as clicked_similar_items,
  SUM(added_to_cart) as added_to_cart,
  ROUND(SUM(clicked_similar)::DECIMAL / COUNT(*) * 100, 2) as similar_click_rate,
  ROUND(SUM(added_to_cart)::DECIMAL / COUNT(*) * 100, 2) as add_to_cart_rate
FROM product_events;
```

## Performance Optimizations

### Implemented

1. **Lazy Loading**: Similar items load after product details
2. **Demo Fallback**: Instant fallback to demo data on API failure
3. **Fire-and-Forget Tracking**: Activity tracking doesn't block UI
4. **Local Consent Check**: Privacy consent checked from localStorage (no API call)

### Future Enhancements

1. **Infinite Scroll**: Load more similar items on scroll end
2. **Image Lazy Loading**: Only load images in viewport
3. **Prefetch Next Products**: Prefetch product data for similar items
4. **Virtual Scrolling**: For very large carousels

## A/B Testing Scenarios

### Scenario 1: Test Similar Items Algorithm

```typescript
// Control: Random similar items
<SimilarItems productId={productId} moduleId={1} />

// Variant A: Category-based similar items
<SimilarItems productId={productId} moduleId={2} />

// Variant B: Brand-based similar items
<SimilarItems productId={productId} moduleId={3} />
```

**Analysis:**
- Compare click-through rates across modules
- Measure which algorithm leads to higher conversion
- Check if position bias exists (are items at position 1 always clicked more?)

### Scenario 2: Test Module Size

```typescript
// Control: 16 items
<SimilarItems productId={productId} limit={16} moduleId={4} />

// Variant: 8 items
<SimilarItems productId={productId} limit={8} moduleId={5} />
```

**Analysis:**
- Does showing fewer items increase engagement?
- Is there an optimal number of items?
- Do users scroll to the end?

## Troubleshooting

### Issue: Clicks Not Tracked

**Check:**
1. User has accepted privacy consent
2. `useActivityTracking` hook is imported
3. `onClick` handler is passed to ProductTile
4. Network tab shows POST to `/api/shopper/activity`

**Fix:**
```typescript
// Verify onClick is passed
<ProductTile
  product={item}
  onClick={() => handleItemClick(item.id, index + 1)}  // ✅
/>

// NOT just:
<ProductTile product={item} />  // ❌ Missing onClick
```

### Issue: Position Not Tracked

**Check:**
1. Index is passed correctly (0-based → convert to 1-based)
2. Position is included in trackClick call

**Fix:**
```typescript
// Correct: Convert 0-based index to 1-based position
{items.map((item, index) => (
  <ProductTile
    onClick={() => handleItemClick(item.id, index + 1)}  // ✅
  />
))}

// Incorrect: Using 0-based index
{items.map((item, index) => (
  <ProductTile
    onClick={() => handleItemClick(item.id, index)}  // ❌
  />
))}
```

### Issue: Module ID Not Tracked

**Check:**
1. `moduleId` prop passed to SimilarItems component
2. `moduleId` is forwarded to `trackClick`

**Fix:**
```typescript
// In parent component (product page)
<SimilarItems
  productId={productId}
  moduleId={7}  // ✅ Pass module ID
/>
```

## Summary

✅ **Product page now fully supports:**
- Automatic product view tracking
- Add to cart tracking with price
- Similar Items module with swipe support
- Position-based click tracking
- A/B testing integration
- Privacy compliance
- Experiment tracking

✅ **Data flows to:**
- `shopper_activity` table
- `experiment_events` table (if module has experiment)
- `shopper_engagement_metrics` (aggregated)
- User segments (influences assignment)

✅ **Ready for:**
- Click-through rate analysis
- Position bias analysis
- A/B testing different algorithms
- Conversion funnel optimization
- Personalized recommendations

The item/product page is now a fully instrumented, trackable, and testable experience! 🎉
