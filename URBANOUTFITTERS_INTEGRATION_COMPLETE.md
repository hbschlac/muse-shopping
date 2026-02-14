# Urban Outfitters Integration Complete

## Overview
Complete Urban Outfitters women's clothing inventory integration has been created following the exact Aritzia/Abercrombie pattern.

## Files Created

### 1. Database Migration
**Location:** `/Users/hannahschlacter/Desktop/muse-shopping/migrations/076_create_urbanoutfitters_inventory.sql`

Creates the complete database schema with:
- `urbanoutfitters_products` - Main product catalog
- `urbanoutfitters_price_history` - Price tracking over time
- `urbanoutfitters_stock_history` - Stock status tracking
- `urbanoutfitters_inventory_snapshots` - Daily snapshots for trend analysis
- All necessary indexes for performance optimization

### 2. Inventory Scraping Service
**Location:** `/Users/hannahschlacter/Desktop/muse-shopping/src/services/urbanoutfittersInventoryService.js`

Features:
- Puppeteer-based web scraping with stealth plugin
- Base URL: `https://www.urbanoutfitters.com`
- Women's Category URL: `https://www.urbanoutfitters.com/womens-clothes`
- Respectful scraping: 3-second delays between requests
- Max 100 products per run (academic research)
- Comprehensive product data extraction:
  - Product ID, name, brand
  - Current & original pricing
  - Sale status & percentage
  - Stock status
  - Ratings & reviews
  - Colors & sizes
  - Images & product URLs
- Database transaction handling
- Price history tracking

Methods:
- `scrapeInventory()` - Main orchestration
- `getCategoryUrls(page)` - Extract category URLs
- `scrapeCategory(page, url)` - Scrape products from category
- `saveProduct(product)` - Database persistence
- `saveSnapshot(date, stats, duration)` - Daily snapshots
- `getInventoryStats()` - Retrieve statistics
- `getProducts(filters)` - Query with filtering
- `getPriceHistory(productId)` - Price tracking

### 3. Integration Service
**Location:** `/Users/hannahschlacter/Desktop/muse-shopping/src/services/urbanoutfittersIntegrationService.js`

Features:
- Syncs `urbanoutfitters_products` to main `items` table
- Store management (creates/updates Urban Outfitters store)
- Price synchronization from latest scrape
- Brand mapping via brand lookup
- Integration statistics
- Brand-specific product queries
- Newsfeed generation for followed brands

Methods:
- `syncUrbanOutfittersToItems()` - Sync to items table
- `updatePricesFromLatestScrape()` - Price updates
- `getIntegrationStats()` - Integration metrics
- `getProductsByBrand(brandName)` - Brand filtering
- `getNewsfeedItems(userId, limit, offset)` - Newsfeed data

### 4. Inventory Routes
**Location:** `/Users/hannahschlacter/Desktop/muse-shopping/src/routes/urbanoutfittersInventoryRoutes.js`

Endpoints:
- `GET /api/v1/urbanoutfitters/stats` - Overall statistics
- `GET /api/v1/urbanoutfitters/products` - Product listing with filters
- `GET /api/v1/urbanoutfitters/products/:productId` - Single product
- `GET /api/v1/urbanoutfitters/products/:productId/price-history` - Price history
- `GET /api/v1/urbanoutfitters/brands` - Unique brands
- `GET /api/v1/urbanoutfitters/export/csv` - CSV export for research
- `POST /api/v1/urbanoutfitters/scrape/trigger` - Manual scrape trigger

### 5. Integration Routes
**Location:** `/Users/hannahschlacter/Desktop/muse-shopping/src/routes/urbanoutfittersIntegrationRoutes.js`

Endpoints:
- `POST /api/v1/urbanoutfitters-integration/sync` - Sync to items table
- `POST /api/v1/urbanoutfitters-integration/update-prices` - Price updates
- `GET /api/v1/urbanoutfitters-integration/stats` - Integration statistics
- `GET /api/v1/urbanoutfitters-integration/brand/:brandName` - Brand products
- `GET /api/v1/urbanoutfitters-integration/newsfeed` - Newsfeed (auth required)

### 6. Job: Inventory Scraper
**Location:** `/Users/hannahschlacter/Desktop/muse-shopping/src/jobs/urbanoutfittersInventoryJob.js`

- Single-run scraping job
- Can be executed directly: `node src/jobs/urbanoutfittersInventoryJob.js`
- Logs comprehensive scrape statistics
- Handles errors gracefully
- Used by scheduler for recurring execution

### 7. Scheduler: Daily Runs at 9 AM
**Location:** `/Users/hannahschlacter/Desktop/muse-shopping/src/jobs/urbanoutfittersInventoryScheduler.js`

Features:
- Cron schedule: Daily at 9:00 AM (`0 0 9 * * *`)
- Runs `runUrbanOutfittersScrape()` from job
- Prevents concurrent scrapes
- Methods:
  - `start()` - Start scheduler
  - `stop()` - Stop scheduler
  - `triggerNow()` - Force immediate scrape

## Architecture

### Database Schema
```
urbanoutfitters_products (main catalog)
├── urbanoutfitters_price_history (price tracking)
├── urbanoutfitters_stock_history (stock tracking)
└── urbanoutfitters_inventory_snapshots (daily snapshots)
```

### Data Flow
```
Scraper → urbanoutfitters_products 
       → Integration Service → items (main catalog)
       → Price History Tracking
       → Daily Snapshots
```

### API Layers
```
GET /api/v1/urbanoutfitters/* (Inventory endpoints)
POST /api/v1/urbanoutfitters/scrape/trigger

POST /api/v1/urbanoutfitters-integration/* (Sync endpoints)
GET /api/v1/urbanoutfitters-integration/* (Stats endpoints)
```

## Configuration

### Scraper Settings
- **Request Delay:** 3 seconds (respectful scraping)
- **Max Products Per Run:** 100 (academic research)
- **User Agent:** Chrome 120 on macOS
- **Timeout:** 30s for page load, 60s for category
- **Scroll:** Auto-scroll enabled for lazy-loaded content

### Schedule
- **Frequency:** Daily
- **Time:** 9:00 AM (UTC)
- **Concurrency Control:** Prevents overlapping scrapes

## Database Tables

### urbanoutfitters_products
```sql
- id (PRIMARY KEY)
- product_id (UNIQUE)
- product_name
- brand_name
- current_price / original_price
- is_on_sale, sale_percentage
- category, subcategory, description
- image_url, product_url
- is_in_stock, stock_status
- average_rating, review_count
- available_sizes[], available_colors[]
- first_seen_at, last_seen_at, last_scraped_at
- raw_data (JSONB)
```

### urbanoutfitters_price_history
```sql
- id (PRIMARY KEY)
- product_id (FK)
- price
- was_on_sale, sale_price
- recorded_at
- UNIQUE(product_id, recorded_at)
```

### urbanoutfitters_stock_history
```sql
- id (PRIMARY KEY)
- product_id (FK)
- is_in_stock
- stock_status
- available_variants
- recorded_at
```

### urbanoutfitters_inventory_snapshots
```sql
- id (PRIMARY KEY)
- snapshot_date (UNIQUE)
- total_products
- in_stock_products, out_of_stock_products
- average_price, median_price
- products_on_sale, average_discount_percentage
- categories_breakdown (JSONB)
- brands_breakdown (JSONB)
- scrape_duration_seconds
- scrape_status
- error_log
```

## Testing

### Manual Scrape
```bash
# Trigger immediate scrape
curl -X POST http://localhost:3000/api/v1/urbanoutfitters/scrape/trigger

# Get statistics
curl http://localhost:3000/api/v1/urbanoutfitters/stats

# Get products
curl 'http://localhost:3000/api/v1/urbanoutfitters/products?limit=10&onSale=true'

# Export CSV
curl http://localhost:3000/api/v1/urbanoutfitters/export/csv > data.csv
```

### Integration Testing
```bash
# Sync to items table
curl -X POST http://localhost:3000/api/v1/urbanoutfitters-integration/sync

# Get integration stats
curl http://localhost:3000/api/v1/urbanoutfitters-integration/stats

# Get brand products
curl http://localhost:3000/api/v1/urbanoutfitters-integration/brand/Free%20People
```

## Compliance Notes

The scraper includes built-in compliance documentation:
- References Urban Outfitters Terms of Service compliance
- References robots.txt compliance
- Academic research purpose only
- Data protection regulations notice
- Respectful rate limiting (3 seconds between requests)

For production use, ensure you have explicit permission from Urban Outfitters or use their official API if available.

## Integration with Main Muse System

The integration service automatically:
1. Creates/updates the "Urban Outfitters" store in the `stores` table
2. Syncs products to the `items` table with proper store_id
3. Maps brands to the `brands` table
4. Updates prices on subsequent scrapes
5. Maintains metadata for sale status, ratings, etc.

This allows Urban Outfitters products to be:
- Included in product search
- Displayed in user newsfeeds (for followed brands)
- Tracked for price changes
- Analyzed across multiple retailers

## File Summary

| File | Size | Purpose |
|------|------|---------|
| Migration SQL | 5.2K | Database schema |
| Inventory Service | 21K | Scraping logic |
| Integration Service | 8.0K | Data sync |
| Inventory Routes | 5.5K | API endpoints |
| Integration Routes | 3.0K | Sync endpoints |
| Job File | 1.3K | Single run scraper |
| Scheduler | 2.4K | Daily scheduling |

**Total: 7 files, ~46K of production-ready code**

## Pattern Consistency

This integration follows the exact same pattern as:
- Aritzia (migrations/071, services/aritzia*)
- Abercrombie (migrations/070, services/abercrombie*)

All naming conventions, database structures, API patterns, and scheduling match the established pattern for consistency and maintainability.
