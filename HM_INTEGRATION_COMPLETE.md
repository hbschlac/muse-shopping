# H&M Integration Complete

Complete H&M inventory integration following the exact Aritzia pattern has been created.

## Files Created

### 1. Database Migration
**File**: `/Users/hannahschlacter/Desktop/muse-shopping/migrations/075_create_hm_inventory.sql`
- Main products table: `hm_products`
- Price history table: `hm_price_history`
- Stock history table: `hm_stock_history`
- Daily snapshots table: `hm_inventory_snapshots`
- Indexes and permissions configured
- Research-focused schema with academic compliance notices

### 2. Scraping Service
**File**: `/Users/hannahschlacter/Desktop/muse-shopping/src/services/hmInventoryService.js`
- Base URL: `https://www2.hm.com`
- Women's category URL: `https://www2.hm.com/en_us/ladies.html`
- Features:
  - Puppeteer-based web scraping with Stealth plugin
  - Product data extraction (name, price, brand, images, ratings, variants)
  - Database persistence with ON CONFLICT handling
  - Price history tracking
  - Inventory snapshots for trend analysis
  - Auto-scroll for lazy-loaded content
  - Request rate limiting (3 second delays)
  - Max 100 products per run for academic research

### 3. Integration Service
**File**: `/Users/hannahschlacter/Desktop/muse-shopping/src/services/hmIntegrationService.js`
- Syncs H&M inventory to main `items` table
- Features:
  - Store creation/retrieval
  - Product synchronization with conflict handling
  - Price updates from latest scrape
  - Integration statistics
  - Brand-specific product queries
  - User newsfeed integration (based on brand follows)
  - Transaction support with rollback on error

### 4. Inventory Routes
**File**: `/Users/hannahschlacter/Desktop/muse-shopping/src/routes/hmInventoryRoutes.js`
- Endpoints:
  - `GET /api/v1/hm/stats` - Overall inventory statistics
  - `GET /api/v1/hm/products` - Products with filters (brand, price, stock, sale)
  - `GET /api/v1/hm/products/:productId` - Single product
  - `GET /api/v1/hm/products/:productId/price-history` - Price history
  - `GET /api/v1/hm/brands` - Unique brands list
  - `GET /api/v1/hm/export/csv` - CSV export for research
  - `POST /api/v1/hm/scrape/trigger` - Manual scrape trigger

### 5. Integration Routes
**File**: `/Users/hannahschlacter/Desktop/muse-shopping/src/routes/hmIntegrationRoutes.js`
- Endpoints:
  - `POST /api/v1/hm-integration/sync` - Sync products to items table
  - `POST /api/v1/hm-integration/update-prices` - Update prices from scrape
  - `GET /api/v1/hm-integration/stats` - Integration statistics
  - `GET /api/v1/hm-integration/brand/:brandName` - Brand products
  - `GET /api/v1/hm-integration/newsfeed` - User newsfeed items

### 6. Inventory Job
**File**: `/Users/hannahschlacter/Desktop/muse-shopping/src/jobs/hmInventoryJob.js`
- Single-run scraper job
- Runs once and exits with appropriate status codes
- Can be triggered manually or via scheduler
- Comprehensive logging and error reporting

### 7. Inventory Scheduler
**File**: `/Users/hannahschlacter/Desktop/muse-shopping/src/jobs/hmInventoryScheduler.js`
- Scheduled scraping with cron
- **Schedule**: Daily at 8 AM (configured as specified)
- Prevents concurrent runs
- Supports immediate trigger for testing
- Graceful shutdown handling

## Integration Points

To complete the integration, these need to be registered in your main server files:

### In `/src/routes/index.js` or your main app file:
```javascript
const hmInventoryRoutes = require('./routes/hmInventoryRoutes');
const hmIntegrationRoutes = require('./routes/hmIntegrationRoutes');

app.use('/api/v1/hm', hmInventoryRoutes);
app.use('/api/v1/hm-integration', hmIntegrationRoutes);
```

### In your scheduler initialization (if centralized):
```javascript
const hmScheduler = require('./jobs/hmInventoryScheduler');
hmScheduler.start();
```

## Database Migration

Run the migration to create all H&M tables:
```bash
node /Users/hannahschlacter/Desktop/muse-shopping/run-migrations.js
```

Or run directly with:
```bash
psql -U your_user -d your_db -f /Users/hannahschlacter/Desktop/muse-shopping/migrations/075_create_hm_inventory.sql
```

## Key Features

- **Academic Compliance**: All tables and services include compliance notices for research ethics
- **Exact Aritzia Pattern**: Uses identical structure, naming conventions, and functionality
- **Full Integration**: Syncs to main items catalog with store tracking
- **Price Tracking**: Historical price records for trend analysis
- **User Integration**: Supports newsfeed filtering based on brand follows
- **Error Handling**: Comprehensive error logging and graceful failure handling
- **Performance**: Indexes on critical fields, transaction support, rate limiting
- **Research Data**: CSV export, snapshots for trend analysis, raw data storage

## Naming Convention

- Prefix: `hm` (lowercase, no special characters)
- Display name: `H&M`
- Table prefix: `hm_`
- Log prefix: `[H&M]`

## Files and Line Counts

| File | Lines |
|------|-------|
| Migration (075_create_hm_inventory.sql) | 134 |
| Inventory Service | 672 |
| Integration Service | 269 |
| Inventory Routes | 174 |
| Integration Routes | 93 |
| Inventory Job | 43 |
| Scheduler | 95 |
| **Total** | **1,480 lines** |

## Testing

To test the integration:

1. **Run migration**: Apply the migration to create tables
2. **Trigger manual scrape**: `POST /api/v1/hm/scrape/trigger`
3. **Check stats**: `GET /api/v1/hm/stats`
4. **Sync to items**: `POST /api/v1/hm-integration/sync`
5. **Verify integration**: `GET /api/v1/hm-integration/stats`

The scheduler will automatically run daily at 8 AM once started.
