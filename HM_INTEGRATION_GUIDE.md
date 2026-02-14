# H&M Integration - Implementation Guide

Complete guide to integrate the H&M inventory system into your Muse application.

## Step 1: Run Database Migration

Execute the H&M inventory migration to create all required tables:

```bash
# Option 1: Using your migration runner
node /Users/hannahschlacter/Desktop/muse-shopping/run-migrations.js

# Option 2: Direct PostgreSQL
psql -U your_username -d your_database -f /Users/hannahschlacter/Desktop/muse-shopping/migrations/075_create_hm_inventory.sql
```

### Verification
```bash
# Connect to your database and run:
\dt hm_*  -- List H&M tables
\di hm_*  -- List H&M indexes
```

Should see:
- hm_products
- hm_price_history
- hm_stock_history
- hm_inventory_snapshots

## Step 2: Register Routes in Main Application

### In your main app file (e.g., `src/app.js` or `src/server.js`):

```javascript
// Import H&M routes
const hmInventoryRoutes = require('./routes/hmInventoryRoutes');
const hmIntegrationRoutes = require('./routes/hmIntegrationRoutes');

// Register the routes (add after other route registrations)
app.use('/api/v1/hm', hmInventoryRoutes);
app.use('/api/v1/hm-integration', hmIntegrationRoutes);
```

### Expected location pattern
Look for similar lines in your app:
```javascript
// Existing Aritzia routes (for reference)
const aritziaInventoryRoutes = require('./routes/aritziaInventoryRoutes');
const aritziaIntegrationRoutes = require('./routes/aritziaIntegrationRoutes');

app.use('/api/v1/aritzia', aritziaInventoryRoutes);
app.use('/api/v1/aritzia-integration', aritziaIntegrationRoutes);

// Add H&M routes after Aritzia
const hmInventoryRoutes = require('./routes/hmInventoryRoutes');
const hmIntegrationRoutes = require('./routes/hmIntegrationRoutes');

app.use('/api/v1/hm', hmInventoryRoutes);
app.use('/api/v1/hm-integration', hmIntegrationRoutes);
```

## Step 3: Initialize the Scheduler

### In your main app startup file:

```javascript
// Import the H&M scheduler
const hmScheduler = require('./jobs/hmInventoryScheduler');

// Start the scheduler (add during app initialization)
hmScheduler.start();

// Optional: Add logging
console.log('H&M scheduler initialized - will run daily at 8 AM');
```

### If you have a centralized scheduler setup
Add to your scheduler initialization section:
```javascript
// H&M Integration
const hmScheduler = require('./jobs/hmInventoryScheduler');

schedulers.push({
  name: 'H&M Inventory',
  scheduler: hmScheduler,
  schedule: 'Daily at 8 AM'
});

hmScheduler.start();
```

## Step 4: Verify Integration

### 1. Check Routes Are Registered
```bash
# Run your app and test an endpoint
curl http://localhost:3000/api/v1/hm/stats
```

Expected response:
```json
{
  "total_products": 0,
  "in_stock_count": 0,
  "out_of_stock_count": 0,
  "total_brands": 0,
  "avg_price": null,
  "min_price": null,
  "max_price": null,
  "avg_rating": null,
  "total_reviews": null,
  "products_on_sale": 0,
  "avg_discount": null
}
```

### 2. Trigger Manual Scrape
```bash
curl -X POST http://localhost:3000/api/v1/hm/scrape/trigger
```

Expected response:
```json
{
  "message": "Scrape started in background",
  "status": "processing"
}
```

Check logs for scraping progress (look for `[H&M]` prefix)

### 3. Check Stats After Scrape
```bash
curl http://localhost:3000/api/v1/hm/stats
```

Should now show products scraped (after a few minutes)

### 4. Sync to Items Table
```bash
curl -X POST http://localhost:3000/api/v1/hm-integration/sync
```

Expected response:
```json
{
  "success": true,
  "storeId": 123,
  "itemsCreated": 45
}
```

### 5. Verify Integration Stats
```bash
curl http://localhost:3000/api/v1/hm-integration/stats
```

## Available H&M API Endpoints

### Inventory Management (`/api/v1/hm/`)
```
GET    /stats                              - Inventory statistics
GET    /products                           - List products with filters
GET    /products/:productId                - Single product details
GET    /products/:productId/price-history  - Price history
GET    /brands                             - Unique brands list
GET    /export/csv                         - Export to CSV
POST   /scrape/trigger                     - Manually trigger scrape
```

### Integration Management (`/api/v1/hm-integration/`)
```
POST   /sync                               - Sync products to items table
POST   /update-prices                      - Update prices from latest scrape
GET    /stats                              - Integration statistics
GET    /brand/:brandName                   - Products for specific brand
GET    /newsfeed                           - User newsfeed items (auth required)
```

## Query Parameters

### Products Endpoint
```bash
# Filter by brand
GET /api/v1/hm/products?brand=COS

# Filter by price range
GET /api/v1/hm/products?minPrice=50&maxPrice=200

# Filter by stock status
GET /api/v1/hm/products?inStock=true

# Filter by sale status
GET /api/v1/hm/products?onSale=true

# Pagination
GET /api/v1/hm/products?limit=50&offset=0

# Combined filters
GET /api/v1/hm/products?brand=COS&inStock=true&minPrice=50&maxPrice=200&limit=20
```

## Scheduler Information

### Schedule Details
- **Frequency**: Daily
- **Time**: 8 AM (UTC timezone by default)
- **Cron Format**: `0 0 8 * * *`

### Scheduler Methods
```javascript
const hmScheduler = require('./jobs/hmInventoryScheduler');

// Start the scheduler
hmScheduler.start();

// Trigger immediate scrape (for testing)
hmScheduler.triggerNow()
  .then(() => console.log('Scrape completed'))
  .catch(err => console.error('Scrape failed:', err));

// Stop the scheduler
hmScheduler.stop();
```

## Monitoring and Logging

All H&M operations log with the `[H&M]` prefix for easy filtering:

```bash
# View all H&M logs
tail -f your_app.log | grep "\[H&M\]"

# View only H&M errors
tail -f your_app.log | grep "\[H&M\].*Error"

# View H&M scrape progress
tail -f your_app.log | grep "\[H&M\].*Scraping"
```

## Configuration

### To Change Scheduler Time
Edit `/src/jobs/hmInventoryScheduler.js` line 27:

```javascript
// Current: 8 AM (0 0 8 * * *)
this.task = cron.schedule('0 0 8 * * *', async () => {

// Change to 2 AM (0 0 2 * * *)
this.task = cron.schedule('0 0 2 * * *', async () => {

// Change to 6 PM (0 0 18 * * *)
this.task = cron.schedule('0 0 18 * * *', async () => {
```

### To Change Max Products Per Run
Edit `/src/services/hmInventoryService.js` line 29:

```javascript
// Current: 100 products
this.maxProductsPerRun = 100;

// Change to 200 products
this.maxProductsPerRun = 200;
```

### To Change Request Delay
Edit `/src/services/hmInventoryService.js` line 28:

```javascript
// Current: 3000ms (3 seconds)
this.requestDelay = 3000;

// Change to 5000ms (5 seconds)
this.requestDelay = 5000;
```

## Database Schema Reference

### hm_products
```sql
id              SERIAL PRIMARY KEY
product_id      VARCHAR(255) UNIQUE
product_name    TEXT
brand_name      VARCHAR(255)
current_price   DECIMAL(10, 2)
original_price  DECIMAL(10, 2)
is_on_sale      BOOLEAN
sale_percentage INTEGER
category        VARCHAR(255)
subcategory     VARCHAR(255)
image_url       TEXT
product_url     TEXT
is_in_stock     BOOLEAN
average_rating  DECIMAL(3, 2)
review_count    INTEGER
available_colors TEXT[]
available_sizes TEXT[]
first_seen_at   TIMESTAMP
last_seen_at    TIMESTAMP
last_scraped_at TIMESTAMP
raw_data        JSONB
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### hm_price_history
```sql
id          SERIAL PRIMARY KEY
product_id  VARCHAR(255) FOREIGN KEY
price       DECIMAL(10, 2)
was_on_sale BOOLEAN
sale_price  DECIMAL(10, 2)
recorded_at TIMESTAMP
```

### hm_stock_history
```sql
id                SERIAL PRIMARY KEY
product_id        VARCHAR(255) FOREIGN KEY
is_in_stock       BOOLEAN
stock_status      VARCHAR(50)
available_variants INTEGER
recorded_at       TIMESTAMP
```

### hm_inventory_snapshots
```sql
id                            SERIAL PRIMARY KEY
snapshot_date                 DATE UNIQUE
total_products                INTEGER
in_stock_products             INTEGER
out_of_stock_products         INTEGER
average_price                 DECIMAL(10, 2)
median_price                  DECIMAL(10, 2)
products_on_sale              INTEGER
average_discount_percentage   DECIMAL(5, 2)
categories_breakdown          JSONB
brands_breakdown              JSONB
scrape_duration_seconds       INTEGER
scrape_status                 VARCHAR(50)
error_log                     TEXT
created_at                    TIMESTAMP
```

## Troubleshooting

### Routes Not Found (404)
- Verify routes are registered in main app
- Check that files are in correct paths
- Restart the application

### Database Connection Errors
- Verify migration ran successfully
- Check database connection settings
- Ensure user has proper permissions

### Scraper Not Running
- Check logs for `[H&M]` errors
- Verify Puppeteer is installed: `npm list puppeteer`
- Check system has Chrome/Chromium installed
- Try manual trigger: `POST /api/v1/hm/scrape/trigger`

### Scheduler Not Running at Scheduled Time
- Verify scheduler was started in app initialization
- Check system timezone matches expectations
- Verify cron syntax is correct
- Check logs for scheduler initialization message

### No Data After Scrape
- Check logs for scrape errors
- Verify H&M website structure hasn't changed
- Try increasing `maxProductsPerRun` temporarily
- Check database connection in scrape logs

## Support Files

Documentation files created for reference:
- `HM_INTEGRATION_COMPLETE.md` - Feature overview
- `HM_ARITZIA_PATTERN_MATCH.md` - Pattern comparison
- `HM_INTEGRATION_CHECKLIST.md` - Verification checklist
- `HM_INTEGRATION_GUIDE.md` - This file

All files are located in:
`/Users/hannahschlacter/Desktop/muse-shopping/`

## Success Indicators

You'll know the integration is successful when:
- ✓ Database migration completes without errors
- ✓ API endpoints respond with correct data structures
- ✓ Scraper can extract products from H&M
- ✓ Products sync to main items table
- ✓ Scheduler initializes and runs on schedule
- ✓ Logs show `[H&M]` prefix for all operations
- ✓ Data appears in `/api/v1/hm/stats` endpoint
