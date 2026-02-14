# Urban Outfitters Integration - Quick Start Guide

## Setup Instructions

### 1. Run Database Migration
```bash
# Apply the migration to create all Urban Outfitters tables
node run-migrations.js
# Or manually:
psql -U postgres -d muse_shopping -f migrations/076_create_urbanoutfitters_inventory.sql
```

### 2. Register Routes in Main App
Add to `src/app.js` or your routes index:

```javascript
const urbanoutfittersInventoryRoutes = require('./routes/urbanoutfittersInventoryRoutes');
const urbanoutfittersIntegrationRoutes = require('./routes/urbanoutfittersIntegrationRoutes');

app.use('/api/v1/urbanoutfitters', urbanoutfittersInventoryRoutes);
app.use('/api/v1/urbanoutfitters-integration', urbanoutfittersIntegrationRoutes);
```

### 3. Optional: Start Daily Scheduler
Add to `src/server.js` startup:

```javascript
const urbanoutfittersScheduler = require('./jobs/urbanoutfittersInventoryScheduler');

// Start Urban Outfitters scheduler (daily at 9 AM)
urbanoutfittersScheduler.start();

// On shutdown
process.on('SIGINT', () => {
  urbanoutfittersScheduler.stop();
  process.exit(0);
});
```

## Common Operations

### Manual Scrape
```bash
# Trigger via API
curl -X POST http://localhost:3000/api/v1/urbanoutfitters/scrape/trigger

# Or run directly
node src/jobs/urbanoutfittersInventoryJob.js
```

### Get Statistics
```bash
curl http://localhost:3000/api/v1/urbanoutfitters/stats
```

### Get Products with Filters
```bash
# All products
curl http://localhost:3000/api/v1/urbanoutfitters/products

# On sale only
curl 'http://localhost:3000/api/v1/urbanoutfitters/products?onSale=true'

# Specific brand
curl 'http://localhost:3000/api/v1/urbanoutfitters/products?brand=Free%20People'

# Price range
curl 'http://localhost:3000/api/v1/urbanoutfitters/products?minPrice=50&maxPrice=200'

# Pagination
curl 'http://localhost:3000/api/v1/urbanoutfitters/products?limit=20&offset=0'
```

### Sync to Main Catalog
```bash
# Sync Urban Outfitters products to items table
curl -X POST http://localhost:3000/api/v1/urbanoutfitters-integration/sync

# Update prices from latest scrape
curl -X POST http://localhost:3000/api/v1/urbanoutfitters-integration/update-prices
```

### Export Data
```bash
# CSV export for research
curl http://localhost:3000/api/v1/urbanoutfitters/export/csv > urbanoutfitters_data.csv
```

## Configuration

### Scrape Settings
Modify in `src/services/urbanoutfittersInventoryService.js`:
```javascript
this.womensCategoryUrl = `${this.baseUrl}/womens-clothes`;
this.requestDelay = 3000; // milliseconds between requests
this.maxProductsPerRun = 100; // products per run
```

### Scheduler Time
Modify in `src/jobs/urbanoutfittersInventoryScheduler.js`:
```javascript
// Change cron schedule (currently 9 AM daily)
this.task = cron.schedule('0 0 9 * * *', async () => {
```

Cron format: `second minute hour day month weekday`
- `0 0 9 * * *` = 9:00 AM daily
- `0 0 * * * *` = Every hour
- `0 0 0 * * 0` = Every Sunday midnight

## API Endpoints

### Inventory Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/urbanoutfitters/stats` | Overall statistics |
| GET | `/api/v1/urbanoutfitters/products` | List products (filterable) |
| GET | `/api/v1/urbanoutfitters/products/:id` | Single product |
| GET | `/api/v1/urbanoutfitters/products/:id/price-history` | Price history |
| GET | `/api/v1/urbanoutfitters/brands` | List all brands |
| GET | `/api/v1/urbanoutfitters/export/csv` | CSV export |
| POST | `/api/v1/urbanoutfitters/scrape/trigger` | Trigger scrape |

### Integration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/urbanoutfitters-integration/sync` | Sync to items table |
| POST | `/api/v1/urbanoutfitters-integration/update-prices` | Update prices |
| GET | `/api/v1/urbanoutfitters-integration/stats` | Integration stats |
| GET | `/api/v1/urbanoutfitters-integration/brand/:name` | Brand products |
| GET | `/api/v1/urbanoutfitters-integration/newsfeed` | User newsfeed (auth) |

## Monitoring

### Check Logs
```bash
# Look for Urban Outfitters log entries
tail -f logs/app.log | grep "Urban Outfitters"
```

### View Database
```bash
# Check product count
psql -U postgres -d muse_shopping -c "SELECT COUNT(*) FROM urbanoutfitters_products;"

# Check latest scrape
psql -U postgres -d muse_shopping -c "SELECT * FROM urbanoutfitters_inventory_snapshots ORDER BY snapshot_date DESC LIMIT 1;"

# Check price changes
psql -U postgres -d muse_shopping -c "SELECT COUNT(*) FROM urbanoutfitters_price_history;"
```

## Troubleshooting

### Scrape Hangs
- Check network connectivity
- Increase timeout values in service
- Verify Urban Outfitters website is accessible

### Database Errors
- Ensure migration was run: `migrations/076_create_urbanoutfitters_inventory.sql`
- Check database user permissions
- Verify connection string in `.env`

### Missing Products
- May need to adjust CSS selectors in scraper
- Check if Urban Outfitters changed website structure
- Look at error logs for details

### Rate Limiting
- Current delay: 3 seconds between requests
- Increase `this.requestDelay` if getting blocked
- Consider spreading scrapes across multiple times

## Pattern Consistency

This integration mirrors:
- **Aritzia**: `migrations/071`, `services/aritzia*`, `routes/aritzia*`
- **Abercrombie**: `migrations/070`, `services/abercrombie*`, `routes/abercrombie*`

All three follow identical patterns for:
- Database structure
- Service methods
- API endpoints
- Scheduling approach
- Error handling

## Next Steps

1. ✅ Files created
2. ⚪ Run migration: `node run-migrations.js`
3. ⚪ Register routes in `src/app.js`
4. ⚪ Start scheduler in `src/server.js`
5. ⚪ Test via `curl` commands above
6. ⚪ Monitor logs and database
7. ⚪ Adjust selectors if needed based on site changes

## Files Overview

```
migrations/076_create_urbanoutfitters_inventory.sql
src/services/urbanoutfittersInventoryService.js (21K - scraping)
src/services/urbanoutfittersIntegrationService.js (8K - sync)
src/routes/urbanoutfittersInventoryRoutes.js (5.5K - API)
src/routes/urbanoutfittersIntegrationRoutes.js (3K - API)
src/jobs/urbanoutfittersInventoryJob.js (1.3K - runner)
src/jobs/urbanoutfittersInventoryScheduler.js (2.4K - scheduler)
```

Total: 7 files, ~46KB production-ready code
