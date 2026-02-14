# H&M Inventory Integration - Complete Implementation

Complete, production-ready H&M inventory integration following the exact Aritzia pattern.

## Quick Start

1. **Run migration**: Execute `migrations/075_create_hm_inventory.sql`
2. **Register routes**: Add to main app (see `HM_INTEGRATION_GUIDE.md`)
3. **Start scheduler**: Initialize in app startup (see `HM_INTEGRATION_GUIDE.md`)
4. **Test**: `GET /api/v1/hm/stats`

## Documentation Index

| Document | Purpose |
|----------|---------|
| **README_HM_INTEGRATION.md** | This file - overview and index |
| **HM_INTEGRATION_GUIDE.md** | Complete step-by-step implementation guide |
| **HM_INTEGRATION_COMPLETE.md** | Feature overview and architecture details |
| **HM_ARITZIA_PATTERN_MATCH.md** | Pattern compliance verification |
| **HM_INTEGRATION_CHECKLIST.md** | Implementation verification checklist |
| **HM_SUMMARY.txt** | Executive summary |

## Files Delivered

### Production Code (1,480 lines)
```
migrations/
  075_create_hm_inventory.sql         (133 lines)

src/services/
  hmInventoryService.js               (673 lines)
  hmIntegrationService.js             (272 lines)

src/routes/
  hmInventoryRoutes.js                (174 lines)
  hmIntegrationRoutes.js              (92 lines)

src/jobs/
  hmInventoryJob.js                   (42 lines)
  hmInventoryScheduler.js             (94 lines)
```

## Architecture Overview

```
H&M Website
    ↓
hmInventoryService (Puppeteer scraper)
    ↓
hm_products, hm_price_history, etc.
    ↓
hmIntegrationService (sync to items)
    ↓
Main items table (Muse catalog)
    ↓
hmInventoryRoutes & hmIntegrationRoutes (API)
    ↓
Frontend / External APIs
```

## Key Components

### 1. Database Layer
- 4 tables with full schema (products, price_history, stock_history, snapshots)
- 8 performance indexes
- Academic research compliance

### 2. Scraping Service
- Puppeteer-based extraction
- Base URL: `https://www2.hm.com`
- Women's category: `https://www2.hm.com/en_us/ladies.html`
- Max 100 products per run
- 3-second request delays

### 3. Integration Service
- Syncs scraped data to main items table
- Price update logic
- Brand and category integration
- Newsfeed support

### 4. API Endpoints (12 total)
- 7 inventory endpoints for data access
- 5 integration endpoints for data synchronization

### 5. Scheduled Scraping
- Runs daily at 8 AM
- Configurable timing (cron format)
- Prevents concurrent execution
- Full error logging

## Configuration

### URLs
```javascript
Base URL: https://www2.hm.com
Women's URL: https://www2.hm.com/en_us/ladies.html
User-Agent: Modern Chrome browser
```

### Scraping
```javascript
Max Products: 100 per run
Request Delay: 3 seconds
Auto-scroll: Enabled
Conflict Resolution: ON CONFLICT
```

### Schedule
```bash
Time: 8 AM daily
Format: 0 0 8 * * * (cron)
Timezone: System default (UTC in cron)
```

## Integration Steps

### Step 1: Database Migration
```bash
node run-migrations.js
# OR
psql -U user -d database -f migrations/075_create_hm_inventory.sql
```

### Step 2: Register Routes
In your main app (`src/app.js` or `src/server.js`):
```javascript
const hmInventoryRoutes = require('./routes/hmInventoryRoutes');
const hmIntegrationRoutes = require('./routes/hmIntegrationRoutes');

app.use('/api/v1/hm', hmInventoryRoutes);
app.use('/api/v1/hm-integration', hmIntegrationRoutes);
```

### Step 3: Initialize Scheduler
In app startup:
```javascript
const hmScheduler = require('./jobs/hmInventoryScheduler');
hmScheduler.start();
```

### Step 4: Test Integration
```bash
# Check stats
curl http://localhost:3000/api/v1/hm/stats

# Trigger scrape
curl -X POST http://localhost:3000/api/v1/hm/scrape/trigger

# Sync to items
curl -X POST http://localhost:3000/api/v1/hm-integration/sync

# Check integration stats
curl http://localhost:3000/api/v1/hm-integration/stats
```

## API Endpoints Reference

### Inventory (`/api/v1/hm/`)
```
GET    /stats                              - Inventory statistics
GET    /products                           - Product listing with filters
GET    /products/:productId                - Single product
GET    /products/:productId/price-history  - Price history
GET    /brands                             - Unique brands
GET    /export/csv                         - CSV export
POST   /scrape/trigger                     - Manual scrape
```

### Integration (`/api/v1/hm-integration/`)
```
POST   /sync                               - Sync to items table
POST   /update-prices                      - Update prices
GET    /stats                              - Integration stats
GET    /brand/:brandName                   - Brand products
GET    /newsfeed                           - User newsfeed items
```

## Database Schema

### hm_products
Main product table with pricing, availability, ratings, and variants

### hm_price_history
Historical price records for trend analysis

### hm_stock_history
Stock availability tracking

### hm_inventory_snapshots
Daily snapshots for inventory analysis

## Query Examples

```bash
# Get products on sale
GET /api/v1/hm/products?onSale=true

# Price range filter
GET /api/v1/hm/products?minPrice=50&maxPrice=200

# Filter by brand
GET /api/v1/hm/products?brand=COS

# In-stock only
GET /api/v1/hm/products?inStock=true

# Pagination
GET /api/v1/hm/products?limit=50&offset=0

# Combined filters
GET /api/v1/hm/products?brand=COS&inStock=true&minPrice=50&maxPrice=200
```

## Monitoring

### View H&M logs
```bash
tail -f app.log | grep "\[H&M\]"
```

### Check scheduler
```bash
# In Node.js console
hmScheduler.triggerNow()
  .then(() => console.log('Done'))
  .catch(err => console.error(err))
```

## Configuration Changes

### Change Schedule Time
Edit `src/jobs/hmInventoryScheduler.js` line 27:
```javascript
// Current: 8 AM
this.task = cron.schedule('0 0 8 * * *', ...

// To 2 AM
this.task = cron.schedule('0 0 2 * * *', ...
```

### Change Max Products
Edit `src/services/hmInventoryService.js` line 29:
```javascript
// Current: 100
this.maxProductsPerRun = 100;

// Change to 200
this.maxProductsPerRun = 200;
```

### Change Request Delay
Edit `src/services/hmInventoryService.js` line 28:
```javascript
// Current: 3 seconds
this.requestDelay = 3000;

// Change to 5 seconds
this.requestDelay = 5000;
```

## Pattern Compliance

- **100% Matches Aritzia Pattern**: Identical structure and naming
- **Database Schema**: Identical to Aritzia
- **Service Methods**: All methods implemented identically
- **Route Patterns**: Same endpoint structure
- **Error Handling**: Consistent with Aritzia
- **Logging**: Uses same prefix format `[H&M]`

## Features

- Puppeteer-based web scraping
- Stealth plugin for anti-bot detection
- Automatic product extraction
- Price history tracking
- Daily snapshots
- Transaction support with rollback
- Rate limiting
- CSV export
- Full-text search
- User newsfeed integration
- Brand-specific queries
- Comprehensive error handling
- Academic compliance notices

## Quality Assurance

- Valid JavaScript (all files)
- Valid SQL syntax
- Consistent indentation
- Proper error handling
- Resource cleanup
- Transaction support
- Production-ready logging

## Troubleshooting

See `HM_INTEGRATION_GUIDE.md` for:
- Step-by-step implementation
- Database schema details
- Complete endpoint reference
- Query examples
- Configuration guide
- Troubleshooting section

## Support

For detailed implementation instructions:
- See `HM_INTEGRATION_GUIDE.md`

For pattern verification:
- See `HM_ARITZIA_PATTERN_MATCH.md`

For feature overview:
- See `HM_INTEGRATION_COMPLETE.md`

For verification checklist:
- See `HM_INTEGRATION_CHECKLIST.md`

## Status

- Development: COMPLETE
- Testing: READY
- Documentation: COMPLETE
- Deployment: READY
- Production: READY

The integration is ready for immediate deployment.

---

**Total Implementation**: 1,480 lines of code across 7 production-ready files with comprehensive documentation.
