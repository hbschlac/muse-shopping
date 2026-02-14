# Target Integration Setup Guide

Complete Target women's clothing inventory integration following the Aritzia pattern.

## Files Created

### 1. Database Migration
**File:** `/migrations/073_create_target_inventory.sql`

Creates four main tables:
- `target_products` - Main product catalog
- `target_price_history` - Price tracking over time
- `target_stock_history` - Stock status history
- `target_inventory_snapshots` - Daily inventory statistics

Includes full-text search indexes and performance optimization.

**To run:**
```bash
npm run migrate:up
# or manually with psql
psql -U <user> -d <database> -f migrations/073_create_target_inventory.sql
```

### 2. Inventory Service
**File:** `/src/services/targetInventoryService.js`

Handles web scraping of Target's women's clothing section.

**Key features:**
- Uses Puppeteer for browser automation
- Base URL: `https://www.target.com`
- Women's category: `https://www.target.com/c/women-s-clothing/-/N-5xtd6`
- Scrapes products, prices, ratings, stock status
- Auto-scrolls to load lazy content
- Respectful 3-second delays between requests
- Limits to 100 products per run for academic research

**Main method:** `async scrapeInventory()`

### 3. Integration Service
**File:** `/src/services/targetIntegrationService.js`

Syncs Target inventory data with main Muse items catalog.

**Methods:**
- `syncTargetToItems()` - Syncs Target products to items table
- `updatePricesFromLatestScrape()` - Updates prices in items table
- `getIntegrationStats()` - Gets sync statistics
- `getProductsByBrand(brandName)` - Get products for a specific brand
- `getNewsfeedItems(userId, limit, offset)` - Get items for user newsfeed

### 4. Inventory Routes
**File:** `/src/routes/targetInventoryRoutes.js`

REST API endpoints for Target product data:

```
GET  /api/v1/target/stats                    - Inventory statistics
GET  /api/v1/target/products                 - Get products with filters
GET  /api/v1/target/products/:productId      - Get single product
GET  /api/v1/target/products/:productId/price-history - Price history
GET  /api/v1/target/brands                   - Get all unique brands
GET  /api/v1/target/export/csv               - Export data as CSV
POST /api/v1/target/scrape/trigger           - Manually trigger scrape
```

### 5. Integration Routes
**File:** `/src/routes/targetIntegrationRoutes.js`

REST API endpoints for integration:

```
POST /api/v1/target-integration/sync         - Sync to items table
POST /api/v1/target-integration/update-prices - Update prices
GET  /api/v1/target-integration/stats        - Integration stats
GET  /api/v1/target-integration/brand/:name  - Get products by brand
GET  /api/v1/target-integration/newsfeed     - Get newsfeed items (auth required)
```

### 6. Scraping Job
**File:** `/src/jobs/targetInventoryJob.js`

Standalone job that runs the scraper once and exits.

**To run manually:**
```bash
node src/jobs/targetInventoryJob.js
```

### 7. Scheduler
**File:** `/src/jobs/targetInventoryScheduler.js`

Automated scheduler that runs scrapes daily at 6 AM.

**To start scheduler:**
```bash
node src/jobs/targetInventoryScheduler.js
```

**Features:**
- Runs at 6 AM every day (cron: `0 0 6 * * *`)
- Prevents concurrent scrapes
- Logs all activities
- Can be triggered manually via `triggerNow()`

## Integration with Main App

### 1. Register Routes in app.js

Add to your Express app:

```javascript
const targetInventoryRoutes = require('./routes/targetInventoryRoutes');
const targetIntegrationRoutes = require('./routes/targetIntegrationRoutes');

app.use('/api/v1/target', targetInventoryRoutes);
app.use('/api/v1/target-integration', targetIntegrationRoutes);
```

### 2. Start Scheduler

In your main app initialization (e.g., `src/server.js`):

```javascript
const targetInventoryScheduler = require('./jobs/targetInventoryScheduler');

// Start scheduler when server starts
targetInventoryScheduler.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping schedulers...');
  targetInventoryScheduler.stop();
  process.exit(0);
});
```

## Usage Examples

### Trigger a manual scrape
```bash
curl -X POST http://localhost:3000/api/v1/target/scrape/trigger
```

### Get statistics
```bash
curl http://localhost:3000/api/v1/target/stats
```

### Get products with filters
```bash
curl "http://localhost:3000/api/v1/target/products?brand=Universal%20Thread&inStock=true&minPrice=10&maxPrice=100"
```

### Sync to items table
```bash
curl -X POST http://localhost:3000/api/v1/target-integration/sync
```

### Update prices
```bash
curl -X POST http://localhost:3000/api/v1/target-integration/update-prices
```

### Export CSV
```bash
curl http://localhost:3000/api/v1/target/export/csv > target_products.csv
```

## Database Schema Summary

### target_products
- `id` - Primary key
- `product_id` - Unique Target product ID
- `product_name`, `brand_name` - Product info
- `current_price`, `original_price` - Pricing
- `is_on_sale`, `sale_percentage` - Sale info
- `image_url`, `product_url` - Links
- `is_in_stock`, `stock_status` - Availability
- `average_rating`, `review_count` - Reviews
- `available_sizes[]`, `available_colors[]` - Variants
- `first_seen_at`, `last_seen_at`, `last_scraped_at` - Tracking
- `raw_data` - Full JSON from scrape

### target_price_history
- `product_id` - References target_products
- `price`, `sale_price` - Price data
- `was_on_sale` - Sale status
- `recorded_at` - Timestamp (unique with product_id)

### target_stock_history
- `product_id` - References target_products
- `is_in_stock`, `stock_status` - Stock info
- `available_variants` - Count
- `recorded_at` - Timestamp

### target_inventory_snapshots
- `snapshot_date` - Unique daily date
- `total_products`, `in_stock_products`, `out_of_stock_products` - Counts
- `average_price`, `median_price` - Pricing stats
- `products_on_sale`, `average_discount_percentage` - Sale stats
- `categories_breakdown`, `brands_breakdown` - JSONB breakdowns
- `scrape_duration_seconds`, `scrape_status`, `error_log` - Metadata

## Performance Notes

- Indexes on: brand_name, category, price, is_in_stock, last_seen_at
- Full-text search index on product_name + description
- Unique constraints on product_id for products table
- Unique constraints on (product_id, recorded_at) for history tables
- Maximum 100 products per scrape run (configurable)
- 3-second delay between category requests (respectful scraping)

## Compliance & Ethics

All scraping is designed for academic research purposes:
- Complies with robots.txt
- Respectful request delays
- Rate limiting built-in
- Contact Target for explicit permission recommended
- Data retention follows research ethics guidelines

## Pattern Consistency

This implementation exactly mirrors the Aritzia integration pattern:
- Same database structure (products, price_history, stock_history, snapshots)
- Same service architecture (inventory + integration services)
- Same route organization
- Same job/scheduler pattern
- Same configuration and logging approach
- Simply replace "aritzia/Aritzia" with "target/Target"
