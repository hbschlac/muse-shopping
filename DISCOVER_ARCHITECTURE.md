# DISCOVER Architecture: JAR + SERVICE Design

## 🎯 Problem Statement

**Challenge:** Surface real-time product data (price, availability, variants) to users while minimizing API costs from affiliate networks.

**Solution:** Hybrid architecture combining:
- **JAR (Batch Job):** Scheduled bulk imports of product catalogs (low cost, high volume)
- **SERVICE (Real-time API):** On-demand fresh data when users click products (higher cost, but targeted)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DISCOVER SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐              ┌──────────────────┐        │
│  │   BATCH JAR     │              │  REALTIME SERVICE│        │
│  │   (Scheduled)   │              │  (On-Demand)     │        │
│  └────────┬────────┘              └────────┬─────────┘        │
│           │                                 │                  │
│           │ Every 6-24 hours                │ User clicks      │
│           │                                 │ product          │
│           ▼                                 ▼                  │
│  ┌─────────────────────────────────────────────────┐          │
│  │         Affiliate Networks                      │          │
│  │  • Rakuten  • CJ  • ShareASale  • Impact        │          │
│  │  • Amazon Associates                            │          │
│  └─────────────────────────────────────────────────┘          │
│           │                                 │                  │
│           │ Bulk catalog                    │ Single product   │
│           │ (1000s products)                │ (fresh data)     │
│           ▼                                 ▼                  │
│  ┌─────────────────────────────────────────────────┐          │
│  │           PostgreSQL Database                   │          │
│  │  • product_catalog (base data)                  │          │
│  │  • product_realtime_cache (fresh data, 15min)   │          │
│  │  • product_price_history (tracking)             │          │
│  │  • api_call_tracking (cost monitoring)          │          │
│  └─────────────────────────────────────────────────┘          │
│           │                                 │                  │
│           └─────────────┬───────────────────┘                  │
│                         ▼                                      │
│                  ┌─────────────┐                               │
│                  │  API Routes │                               │
│                  │  /products  │                               │
│                  └──────┬──────┘                               │
│                         │                                      │
│                         ▼                                      │
│                  ┌─────────────┐                               │
│                  │  Frontend   │                               │
│                  │  (User)     │                               │
│                  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### 1. `product_catalog` (Batch Updated)
**Purpose:** Store base product data from daily imports

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| external_product_id | VARCHAR(255) | Store's product ID |
| store_id | INTEGER | FK to stores |
| brand_id | INTEGER | FK to brands |
| product_name | TEXT | Product title |
| product_description | TEXT | Full description |
| category | VARCHAR(100) | Main category |
| price_cents | INTEGER | Base price (updated daily) |
| is_available | BOOLEAN | Stock status |
| primary_image_url | TEXT | Main product image |
| additional_images | JSONB | Array of images |
| product_url | TEXT | Store product page |
| affiliate_link | TEXT | Affiliate tracking link |
| metadata | JSONB | Sizes, colors, materials |
| last_batch_update | TIMESTAMP | Last JAR update |
| last_realtime_check | TIMESTAMP | Last SERVICE check |

**Updated by:** JAR (every 6-24 hours)
**Read by:** Frontend (newsfeed, search, browse)

---

### 2. `product_realtime_cache` (Real-time Cache)
**Purpose:** Cache fresh API data with 15-minute TTL

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| product_catalog_id | INTEGER | FK to product_catalog |
| current_price_cents | INTEGER | Live price |
| is_available | BOOLEAN | Live stock status |
| available_variants | JSONB | Sizes/colors in stock |
| shipping_info | JSONB | Shipping estimates |
| promotions | JSONB | Active discounts |
| fetched_at | TIMESTAMP | When fetched |
| expires_at | TIMESTAMP | Cache expiry (15 min) |

**Updated by:** SERVICE (when user clicks product)
**TTL:** 15 minutes
**Purpose:** Reduce API costs by caching recent lookups

---

### 3. `product_price_history`
**Purpose:** Track price changes for drop alerts

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| product_catalog_id | INTEGER | FK to product_catalog |
| price_cents | INTEGER | New price |
| original_price_cents | INTEGER | MSRP |
| update_source | VARCHAR(20) | 'batch_jar' or 'realtime_service' |
| detected_at | TIMESTAMP | When price changed |

**Use cases:**
- Price drop notifications
- Historical price tracking
- "Lowest price in 30 days" badges

---

### 4. `batch_import_logs`
**Purpose:** Monitor JAR job performance

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| store_id | INTEGER | Store being imported |
| job_type | VARCHAR(50) | 'full_catalog' or 'price_update' |
| status | VARCHAR(20) | 'running', 'completed', 'failed' |
| products_processed | INTEGER | Total products |
| products_created | INTEGER | New products |
| products_updated | INTEGER | Updated products |
| duration_seconds | INTEGER | Job duration |

---

### 5. `api_call_tracking`
**Purpose:** Monitor API costs and usage

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| store_id | INTEGER | Store API called |
| api_type | VARCHAR(50) | 'batch_import', 'realtime_lookup', 'deep_link' |
| call_count | INTEGER | Number of calls |
| estimated_cost_cents | INTEGER | Cost in cents |
| response_time_ms | INTEGER | Response time |
| called_at | TIMESTAMP | When called |

---

### 6. `product_user_interactions`
**Purpose:** Track user engagement and trigger real-time updates

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | User ID |
| product_catalog_id | INTEGER | Product ID |
| interaction_type | VARCHAR(50) | 'view', 'click', 'save', 'cart_add', 'purchase' |
| triggered_realtime_fetch | BOOLEAN | Did this trigger API call? |

---

## 🔄 Data Flow

### Scenario 1: Daily Batch Import (JAR)

```
1. Scheduler triggers at 2 AM
   ↓
2. JAR loops through all stores
   ↓
3. For each store:
   - Call affiliate network bulk API
   - Get 1000s of products
   - Upsert into product_catalog
   - Update prices, availability
   ↓
4. Log stats to batch_import_logs
   ↓
5. Track API calls to api_call_tracking
```

**Cost:** Low (1-2 bulk API calls per store per day)
**Data freshness:** 24 hours old (max)

---

### Scenario 2: User Views Product (SERVICE)

```
1. User clicks product in newsfeed
   ↓
2. Frontend calls: GET /api/v1/products/:productId
   ↓
3. Service checks product_realtime_cache
   ↓
4. IF cache exists AND not expired (< 15 min):
   - Return cached data ✓
   - Cost: $0 (cache hit)
   ↓
5. ELSE (cache miss or expired):
   - Call affiliate API for fresh data
   - Update product_catalog with latest price
   - Insert/update product_realtime_cache
   - Set expires_at = NOW() + 15 minutes
   - Return fresh data
   - Cost: ~$0.01 per call (cache miss)
```

**Cache hit rate target:** 70-80%
**Cost savings:** 70-80% reduction in API calls

---

### Scenario 3: User Adds to Cart (SERVICE)

```
1. User clicks "Add to Cart"
   ↓
2. Frontend calls: POST /api/v1/products/:productId/cart
   ↓
3. Service ALWAYS fetches fresh data (ignore cache)
   - Ensure price is current before purchase
   ↓
4. Update cache with fresh data
   ↓
5. Track interaction: cart_add (high value)
   ↓
6. Return latest price, availability, variants
```

**Why skip cache?** Ensure user sees current price before checkout

---

## 💰 Cost Optimization Strategy

### JAR (Batch) Costs

| Operation | Frequency | Cost per Call | Daily Cost |
|-----------|-----------|---------------|------------|
| Full catalog import | 1x/day | $0.50 | $0.50/store |
| Price update | 2x/day | $0.10 | $0.20/store |
| **Total per store** | | | **$0.70/day** |
| **Total (20 stores)** | | | **$14/day** |

### SERVICE (Real-time) Costs

| Scenario | Cache Hit Rate | API Calls per 1000 Views | Cost per 1000 Views |
|----------|---------------|--------------------------|---------------------|
| **With 15-min cache (target)** | 75% | 250 | $2.50 |
| No cache | 0% | 1000 | $10.00 |
| **Savings** | | | **$7.50** (75% reduction) |

### Monthly Cost Projection

**Assumptions:**
- 20 stores
- 10,000 product views/day
- 75% cache hit rate

| Component | Monthly Cost |
|-----------|--------------|
| JAR batch imports | $420 (20 stores × $0.70 × 30 days) |
| Real-time API calls | $75 (10K views × $0.0025 × 30 days) |
| **Total** | **$495/month** |

**Without caching:** $3,420/month (7x more expensive!)

---

## 🚀 API Endpoints

### Product Endpoints

#### `GET /api/v1/products/:productId`
**Purpose:** Get real-time product details
**When:** User clicks into product page
**Response:**
```json
{
  "success": true,
  "data": {
    "current_price_cents": 2999,
    "is_available": true,
    "available_variants": {
      "sizes": ["S", "M", "L", "XL"],
      "colors": ["Black", "White"]
    },
    "shipping_info": {
      "free_shipping": true,
      "estimated_days": "3-5"
    },
    "promotions": [
      {
        "type": "discount",
        "description": "10% off with code SAVE10",
        "code": "SAVE10"
      }
    ],
    "source": "cache",
    "cached_at": "2024-01-15T10:30:00Z"
  }
}
```

---

#### `GET /api/v1/products/:productId/checkout-link`
**Purpose:** Generate affiliate tracking link
**When:** User clicks "Buy Now"
**Response:**
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://affiliate.com/track?id=abc123&product=xyz&user=muse_user_456"
  }
}
```

---

#### `POST /api/v1/products/:productId/cart`
**Purpose:** Add to cart (triggers fresh price check)
**When:** User clicks "Add to Cart"
**Response:**
```json
{
  "success": true,
  "data": {
    "current_price_cents": 2999,
    "is_available": true,
    "message": "Fresh price verified"
  }
}
```

---

#### `POST /api/v1/products/cart-batch`
**Purpose:** Get real-time data for all cart items
**When:** User views cart page
**Request:**
```json
{
  "productIds": [1, 5, 12, 23]
}
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "productId": 1,
      "success": true,
      "data": { "current_price_cents": 2999, ... }
    },
    {
      "productId": 5,
      "success": true,
      "data": { "current_price_cents": 4500, ... }
    }
  ]
}
```

---

### Admin/Analytics Endpoints

#### `GET /api/v1/products/stats/cost?days=7`
**Purpose:** Monitor API costs
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "store_name": "Nordstrom",
      "api_type": "realtime_lookup",
      "call_count": 1250,
      "total_cost_cents": 1250,
      "avg_response_time_ms": 450
    }
  ]
}
```

---

#### `GET /api/v1/products/stats/cache?hours=24`
**Purpose:** Monitor cache performance
**Response:**
```json
{
  "success": true,
  "data": {
    "cache_hits": 7500,
    "cache_misses": 2500,
    "cache_hit_rate_percent": 75.00
  }
}
```

---

#### `GET /api/v1/products/stats/batch-imports?days=7`
**Purpose:** Monitor JAR job performance
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "store_name": "Nordstrom",
      "job_type": "full_catalog",
      "status": "completed",
      "job_count": 7,
      "total_processed": 35000,
      "total_created": 500,
      "total_updated": 34500,
      "avg_duration_seconds": 120
    }
  ]
}
```

---

## 🔧 Running the System

### 1. Run Database Migration

```bash
PGPASSWORD='SecurePassword123!' psql -h localhost -p 5432 -U muse_admin -d muse_shopping_dev -f migrations/013_create_product_catalog.sql
```

---

### 2. Run JAR (Batch Import)

#### Full Catalog Import
```bash
node src/jobs/productCatalogBatchJob.js --mode=full
```

**When:** Daily at 2 AM (set up with cron)
**Duration:** ~2-5 minutes per store
**Output:**
```
========================================
BATCH JOB: Full Catalog Import
========================================
Started: 2024-01-15T02:00:00.000Z

--- Importing Nordstrom (ID: 2) ---
✓ Nordstrom: 450 created, 4500 updated

--- Importing Target (ID: 4) ---
✓ Target: 120 created, 2800 updated

========================================
BATCH JOB COMPLETE
========================================
Duration: 180s
Stores processed: 20
Successful: 19
Failed: 1
========================================
```

---

#### Price Update Only (Faster)
```bash
node src/jobs/productCatalogBatchJob.js --mode=price
```

**When:** Every 6-12 hours
**Duration:** ~30 seconds per store

---

#### Cache Cleanup
```bash
node src/jobs/productCatalogBatchJob.js --mode=cleanup
```

**When:** Hourly
**Purpose:** Delete expired cache entries

---

### 3. Set Up Cron Jobs

```bash
# Edit crontab
crontab -e

# Add these lines:

# Full catalog import at 2 AM daily
0 2 * * * cd /path/to/muse-shopping && node src/jobs/productCatalogBatchJob.js --mode=full >> logs/batch-full.log 2>&1

# Price update every 6 hours
0 */6 * * * cd /path/to/muse-shopping && node src/jobs/productCatalogBatchJob.js --mode=price >> logs/batch-price.log 2>&1

# Cache cleanup every hour
0 * * * * cd /path/to/muse-shopping && node src/jobs/productCatalogBatchJob.js --mode=cleanup >> logs/batch-cleanup.log 2>&1
```

---

### 4. Start API Server

```bash
npm start
```

The real-time SERVICE endpoints are now available at:
- `http://localhost:3000/api/v1/products/:productId`
- `http://localhost:3000/api/v1/products/:productId/checkout-link`
- `http://localhost:3000/api/v1/products/:productId/cart`

---

## 📈 Monitoring & Optimization

### Key Metrics to Track

1. **Cache Hit Rate**
   - Target: 75-80%
   - Monitor: `GET /api/v1/products/stats/cache`
   - Action: Increase TTL if too many misses

2. **API Call Costs**
   - Target: < $500/month
   - Monitor: `GET /api/v1/products/stats/cost`
   - Action: Reduce real-time calls if too high

3. **Batch Import Success Rate**
   - Target: 95%+ successful
   - Monitor: `GET /api/v1/products/stats/batch-imports`
   - Action: Fix failing stores

4. **Data Freshness**
   - Batch data: 24 hours old (acceptable for browsing)
   - Real-time data: < 15 minutes (for purchase decisions)

---

## 🎯 Smart Triggers for Real-Time Updates

### When to Fetch Fresh Data

| User Action | Trigger Real-time? | Reason |
|-------------|-------------------|--------|
| Browse newsfeed | ❌ No | Use batch data (24 hours old is fine) |
| View product page | ✅ Yes (if cache expired) | Show fresher data (15 min cache) |
| Click "Buy Now" | ✅ Yes (always) | Ensure current price |
| Add to cart | ✅ Yes (always) | Verify availability |
| View cart | ✅ Yes (batch check all) | Confirm all prices current |

---

## 🔮 Future Enhancements

### Phase 2: Predictive Pre-caching
- Use ML to predict which products user will click
- Pre-fetch and cache those products
- Increase cache hit rate to 85%+

### Phase 3: Webhook Integration
- Some affiliate networks support webhooks
- Get notified when price/availability changes
- Update database in real-time without API calls

### Phase 4: Price Drop Alerts
- Use `product_price_history` table
- Notify users when saved items drop in price
- Increase conversion rates

---

## 📝 Next Steps

1. ✅ Database schema created
2. ✅ JAR batch service built
3. ✅ Real-time service built
4. ✅ API endpoints created
5. ⏳ Test with real affiliate network APIs
6. ⏳ Set up cron jobs for production
7. ⏳ Monitor costs and optimize cache TTL
8. ⏳ Build frontend product detail page

---

## 💡 Key Takeaways

### JAR (Batch) Strategy
- ✅ **Low cost:** Bulk API calls (1-2 per store per day)
- ✅ **High volume:** Import 1000s of products at once
- ✅ **Good enough:** 24-hour-old data is fine for browsing
- ⚠️ **Not real-time:** Don't use for checkout decisions

### SERVICE (Real-time) Strategy
- ✅ **Fresh data:** Always current (< 15 min old)
- ✅ **Smart caching:** 75% cost reduction
- ✅ **Targeted:** Only fetch when user needs it
- ⚠️ **Higher cost:** Use sparingly, cache aggressively

### Combined Power
- **Best of both worlds:** Low cost + fresh data when needed
- **User experience:** Fast browsing + accurate checkout
- **Scalable:** Can handle millions of products
- **Cost-effective:** 7x cheaper than real-time-only approach
