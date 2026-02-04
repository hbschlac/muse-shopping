# Retailer API Integration - Complete Implementation

## Overview

The Muse Shopping frontend now has full integration with retailer APIs (Target, Walmart, Nordstrom) through the backend services. Users can connect their retailer accounts, search products, and make purchases directly through affiliate links.

## Backend Infrastructure

### Retailer APIs Implemented

The backend has three retailer API clients ready:

1. **Target API** (`src/services/retailerAPIs/targetAPI.js`)
   - OAuth 2.0 authentication
   - Product search and details
   - Real-time pricing
   - Inventory checking

2. **Walmart API** (`src/services/retailerAPIs/walmartAPI.js`)
   - OAuth 2.0 authentication
   - Product catalog access
   - Price tracking
   - Affiliate link generation

3. **Nordstrom API** (`src/services/retailerAPIs/nordstromAPI.js`)
   - OAuth 2.0 authentication
   - Product search
   - Real-time availability
   - Checkout link generation

### Retailer API Factory

The `RetailerAPIFactory` (`src/services/retailerAPIFactory.js`) provides:
- Dynamic API client instantiation
- OAuth flow management
- Token exchange and refresh
- Unified interface for all retailers

### Database Schema

Existing tables support retailer integration:
- `product_catalog` - Stores products from all retailers
- `product_realtime_cache` - Caches live product data
- `product_price_history` - Tracks price changes
- `api_call_tracking` - Monitors API usage and costs
- `batch_import_logs` - Records catalog sync jobs

### Backend Services

1. **Product Catalog Batch Service** (`src/services/productCatalogBatchService.js`)
   - Imports full catalogs from retailers
   - Updates existing products
   - Tracks price changes
   - Cleans up expired cache

2. **Product Realtime Service** (`src/services/productRealtimeService.js`)
   - Gets live product data
   - Manages cache (TTL-based)
   - Tracks user interactions
   - Generates affiliate links
   - Batch fetches for cart items

3. **Store Connection Service** (`src/services/storeConnectionService.js`)
   - Manages OAuth flows
   - Stores access tokens
   - Handles token refresh
   - User connection management

## Frontend Implementation

### API Service Layer

**File**: `/frontend/lib/api/retailers.ts`

Provides complete interface for retailer operations:

```typescript
// Get available retailers
await getRetailers()

// Connect retailer account
initiateRetailerAuth(retailerId)
await completeRetailerAuth(retailerId, code, state)

// Get connected accounts
await getConnectedRetailers()

// Disconnect account
await disconnectRetailer(retailerId)

// Search products
await searchRetailerProducts(retailerId, {
  query: 'blue dress',
  price_min: 50,
  price_max: 200,
  page: 1
})

// Get product details
await getRetailerProductDetails(productId)

// Get checkout link
await getRetailerCheckoutLink(productId, variantId)

// Track interactions
await trackProductInteraction(productId, 'view')

// Batch operations
await getBatchProductData([productId1, productId2])

// Admin operations
await importRetailerCatalog(retailerId, 'full')
await getProductCacheStats(24)
await getAPICostStats(7)
await getBatchImportStats(7)
```

### React Hooks

**useRetailerProducts** (`/frontend/lib/hooks/useRetailerProducts.ts`)

```typescript
const { data, loading, error, refetch } = useRetailerProducts({
  retailerId: 'target',
  query: 'shoes',
  price_min: 50,
  price_max: 150,
  page: 1,
  enabled: true
});
```

**useAuth** (existing)
- Manages authentication state
- Required for retailer operations

### Components

#### 1. RetailerConnections Component

**File**: `/frontend/components/RetailerConnections.tsx`

Features:
- Lists all available retailers
- Shows connection status
- OAuth connect/disconnect buttons
- Displays connected account details
- Shows access scopes

#### 2. RetailerProductCard Component

**File**: `/frontend/components/RetailerProductCard.tsx`

Features:
- Product image with discount badges
- Save/unsave functionality
- Stock status indicators
- Free shipping badges
- Promotion tags
- Direct checkout button (opens affiliate link)
- Estimated delivery info
- Price with original price strikethrough
- Click tracking

#### 3. Retailers Page

**File**: `/frontend/app/retailers/page.tsx`

Features:
- Retailer tabs (Target, Walmart, Nordstrom)
- Search bar with submit
- Price range filters
- Product grid (responsive)
- Save products to favorites
- Real-time product data
- Loading/error states
- Empty states
- Load more pagination

#### 4. Retailer Settings Page

**File**: `/frontend/app/settings/retailers/page.tsx`

Features:
- Manage retailer connections
- Connect/disconnect accounts
- View connection status
- Back navigation

#### 5. OAuth Callback Handler

**File**: `/frontend/app/auth/retailer/callback/page.tsx`

Features:
- Handles OAuth redirect
- Completes token exchange
- Shows loading state
- Success/error feedback
- Auto-redirect to settings

## Integration Testing

### Backend Tests

**File**: `/tests/integration/product.test.js`

Comprehensive tests covering:

1. **JAR (Batch) Tests**
   - ✅ Import full catalog for store
   - ✅ Log batch import stats
   - ✅ Update existing products on re-import
   - ✅ Track price changes
   - ✅ Get import statistics

2. **SERVICE (Real-time) Tests**
   - ✅ Get real-time product data (cache miss)
   - ✅ Return cached data (cache hit)
   - ✅ Track user interactions
   - ✅ Generate affiliate checkout link
   - ✅ Force fresh data on cart add
   - ✅ Batch fetch multiple products
   - ✅ Get cache statistics
   - ✅ Get cost statistics

3. **API Endpoint Tests**
   - ✅ GET /products/:productId
   - ✅ GET /products/:productId/checkout-link
   - ✅ POST /products/:productId/cart
   - ✅ POST /products/cart-batch
   - ✅ GET /products/stats/cache
   - ✅ GET /products/stats/cost
   - ✅ GET /products/stats/batch-imports
   - ✅ POST /products/admin/batch-import
   - ✅ Authentication requirement

4. **Cache Optimization Tests**
   - ✅ Expire cache after TTL
   - ✅ Clean up expired cache entries

5. **Cost Tracking Tests**
   - ✅ Track API calls

To run tests:
```bash
# From root directory
npm test
```

## API Endpoints

### Retailer Connection Endpoints

```typescript
// Get available retailers
GET /api/v1/store-connections/retailers

// Get user's connected retailers
GET /api/v1/store-connections
Authorization: Bearer {token}

// Initiate OAuth flow
GET /api/v1/store-connections/:retailerId/authorize?redirect_uri={uri}&state={state}

// Complete OAuth flow
POST /api/v1/store-connections/:retailerId/callback
Body: { code, state }
Authorization: Bearer {token}

// Disconnect retailer
DELETE /api/v1/store-connections/:retailerId
Authorization: Bearer {token}

// Search retailer products
GET /api/v1/store-connections/:retailerId/products?q={query}&price_min={min}&price_max={max}
Authorization: Bearer {token}
```

### Product Endpoints

```typescript
// Get product details
GET /api/v1/products/:productId
Authorization: Bearer {token}

// Get checkout link
GET /api/v1/products/:productId/checkout-link?variant_id={variantId}
Authorization: Bearer {token}

// Track interaction
POST /api/v1/products/:productId/interactions
Body: { interaction_type: 'view' | 'click' | 'cart_add' }
Authorization: Bearer {token}

// Batch get products
POST /api/v1/products/cart-batch
Body: { productIds: [...] }
Authorization: Bearer {token}

// Admin: Import catalog
POST /api/v1/products/admin/batch-import
Body: { storeId, jobType: 'full' | 'price_update' }
Authorization: Bearer {token}

// Get cache stats
GET /api/v1/products/stats/cache?hours=24
Authorization: Bearer {token}

// Get cost stats
GET /api/v1/products/stats/cost?days=7
Authorization: Bearer {token}

// Get batch import stats
GET /api/v1/products/stats/batch-imports?days=7
Authorization: Bearer {token}
```

## TypeScript Types

All types defined in `/frontend/lib/api/retailers.ts`:

```typescript
interface RetailerProduct {
  retailer_id: string;
  retailer_name: string;
  product_id: string;
  name: string;
  price: number;
  original_price?: number;
  currency: string;
  image_url: string;
  product_url: string;
  in_stock: boolean;
  availability?: {
    online: boolean;
    in_store?: boolean;
    shipping_available?: boolean;
  };
  variants?: Array<{
    id: string;
    size?: string;
    color?: string;
    in_stock: boolean;
  }>;
  shipping_info?: {
    free_shipping: boolean;
    estimated_delivery?: string;
  };
  promotions?: Array<{
    type: string;
    description: string;
    discount_percent?: number;
  }>;
}

interface RetailerSearchParams {
  query?: string;
  category?: string;
  brand?: string;
  price_min?: number;
  price_max?: number;
  page?: number;
  limit?: number;
}

interface RetailerAuthStatus {
  retailer_id: string;
  retailer_name: string;
  is_connected: boolean;
  access_token_expires_at?: string;
  scopes?: string[];
}
```

## User Flow

### Connecting a Retailer Account

1. User navigates to **Settings > Retailer Accounts**
2. Clicks "Connect" on Target/Walmart/Nordstrom
3. Frontend calls `initiateRetailerAuth(retailerId)`
4. User redirected to retailer's OAuth page
5. User authorizes Muse Shopping
6. Retailer redirects to `/auth/retailer/callback?code=...&state=...`
7. Callback page calls `completeRetailerAuth()`
8. Backend exchanges code for access token
9. Token stored in database
10. User redirected to settings with success message

### Shopping from a Retailer

1. User navigates to **Retailers** page
2. Selects retailer tab (Target/Walmart/Nordstrom)
3. Searches for products or browses catalog
4. Applies price filters
5. Views product cards with:
   - Live pricing
   - Discount badges
   - Stock status
   - Save button
6. Clicks "Buy Now"
7. Frontend gets affiliate checkout link
8. Opens retailer checkout in new tab
9. User completes purchase on retailer site
10. Interaction tracked in backend

## Analytics & Tracking

### Product Interactions

All product interactions are tracked:
- **view** - Product card viewed
- **click** - Product clicked/details viewed
- **cart_add** - Added to cart (triggers fresh data fetch)

### Cache Performance

Cache statistics available:
- Cache hits vs misses
- Hit rate percentage
- Average cache age
- Expired cache cleanup

### API Cost Tracking

Monitor API usage costs:
- Total API calls per retailer
- Estimated costs
- Daily breakdown
- Cache effectiveness

### Batch Import Monitoring

Track catalog sync jobs:
- Products processed
- New products created
- Existing products updated
- Errors encountered
- Last import timestamp

## Caching Strategy

### Product Data Cache

- **TTL**: Configurable (default: 1 hour)
- **Strategy**: Cache-aside pattern
- **Invalidation**: TTL-based expiration
- **Force refresh**: Cart add operations

### Cache Flow

1. Request product data
2. Check cache (by product ID)
3. If cached and not expired → return cached data
4. If not cached or expired → fetch from retailer API
5. Store in cache with TTL
6. Return fresh data

### Benefits

- Reduced API costs (fewer calls to retailer APIs)
- Faster response times (sub-10ms vs 200ms+)
- Better user experience
- Scalable to thousands of products

## Cost Optimization

### Batch vs Real-time

**Batch Import (JAR)**:
- Runs on schedule (e.g., nightly)
- Updates full catalog
- Cost: ~$0.001 per product
- Used for: Browse, search, initial data

**Real-time Lookup (SERVICE)**:
- On-demand when user interacts
- Gets live pricing/stock
- Cost: ~$0.01 per call
- Used for: Checkout, cart, product details

### Best Practices

1. **Use batch imports** for product discovery
2. **Use real-time only** when necessary:
   - Viewing product details
   - Adding to cart
   - Checking out
3. **Leverage cache** to minimize API calls
4. **Monitor costs** with statistics endpoints

## Files Created

### API Layer
- `/frontend/lib/api/retailers.ts` - Retailer API service
- `/frontend/lib/hooks/useRetailerProducts.ts` - Products hook

### Components
- `/frontend/components/RetailerConnections.tsx` - Connection management
- `/frontend/components/RetailerProductCard.tsx` - Product display

### Pages
- `/frontend/app/retailers/page.tsx` - Shop retailers
- `/frontend/app/settings/retailers/page.tsx` - Manage connections
- `/frontend/app/auth/retailer/callback/page.tsx` - OAuth callback

### Documentation
- `/RETAILER_INTEGRATION.md` - This file

## Next Steps

### Immediate
1. ✅ API service layer complete
2. ✅ React components built
3. ✅ Pages created
4. ✅ OAuth flow implemented
5. ⏳ Test integration with backend

### Short-term
1. Add product detail page with retailer data
2. Integrate search with retailer products
3. Add retailer filters to main search
4. Show retailer products in newsfeed
5. Implement shopping cart with retailer items

### Long-term
1. Add more retailers (Amazon, Shopify stores, etc.)
2. Price drop alerts
3. Inventory tracking
4. Order sync from retailer accounts
5. Cross-retailer price comparison

## Testing Instructions

### 1. Start Backend Server
```bash
cd /Users/hannahschlacter/Desktop/muse-shopping
npm run dev
```

### 2. Start Frontend Server
```bash
cd /Users/hannahschlacter/Desktop/muse-shopping/frontend
npm run dev
```

### 3. Run Backend Tests
```bash
cd /Users/hannahschlacter/Desktop/muse-shopping
npm test
```

### 4. Manual Testing

**Connect Retailer:**
1. Navigate to http://localhost:3001/settings/retailers
2. Click "Connect" on Target/Walmart/Nordstrom
3. Complete OAuth flow
4. Verify connection appears as "Connected"

**Browse Products:**
1. Navigate to http://localhost:3001/retailers
2. Switch between retailer tabs
3. Search for products
4. Apply price filters
5. Click product to view details
6. Click "Buy Now" to test checkout link

**Test Cache:**
1. View a product (cache miss - slow)
2. View same product again (cache hit - fast)
3. Check network requests in browser DevTools

## Environment Variables

Add to `/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Backend already has retailer API credentials configured in `.env`.

## Security Notes

- OAuth state parameter validates against CSRF
- Access tokens stored server-side only
- Affiliate links prevent credential exposure
- User interactions tracked for analytics
- Rate limiting on API endpoints

## Performance Metrics

Expected performance:
- **Cache hit**: <10ms response time
- **Cache miss**: 200-500ms (retailer API call)
- **Batch import**: ~5-10 products/second
- **Search**: <100ms with indexed database

## Support

For issues or questions:
1. Check `/API_INTEGRATION.md` for general API docs
2. Review `/tests/integration/product.test.js` for examples
3. Check backend logs for API errors
4. Monitor cache stats for performance issues
