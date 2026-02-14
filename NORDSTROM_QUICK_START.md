# Nordstrom Inventory System - Quick Start Guide

## ⚠️ Legal Notice

**STOP!** Before using this system:

1. ✅ Review [Nordstrom Terms of Service](https://www.nordstrom.com/browse/customer-service/policy/terms-conditions)
2. ✅ Check [Nordstrom robots.txt](https://www.nordstrom.com/robots.txt)
3. ✅ Consider requesting permission for academic research
4. ✅ Ensure IRB compliance (if required)

**You are responsible for legal and ethical compliance.**

---

## Installation (5 minutes)

### Step 1: Run Setup Script

```bash
./setup-nordstrom-research.sh
```

This will:
- Verify dependencies
- Run database migration
- Create required tables

### Step 2: Test Installation

```bash
./test-nordstrom-system.sh
```

Should show: "✓ All tests passed!"

---

## Basic Usage

### Single Scrape (Test)

Run once to test:

```bash
npm run nordstrom:scrape
```

Wait ~10-30 minutes for completion.

### Automated Daily Scrapes

Run continuously:

```bash
npm run nordstrom:scheduler
```

Keep this running in background (use PM2/systemd for production).

---

## Access Your Data

### Via API

Start your server:
```bash
npm start
```

Then query:

```bash
# Get statistics
curl http://localhost:3000/api/v1/nordstrom/stats

# Get products
curl "http://localhost:3000/api/v1/nordstrom/products?brand=Nike&limit=10"

# Export CSV
curl "http://localhost:3000/api/v1/nordstrom/export/csv" -o nordstrom_data.csv
```

### Via Database

```bash
# Connect to database
psql -d muse_shopping

# View products
SELECT product_name, brand_name, current_price, is_in_stock
FROM nordstrom_products
LIMIT 10;

# Count by brand
SELECT brand_name, COUNT(*) as count
FROM nordstrom_products
GROUP BY brand_name
ORDER BY count DESC
LIMIT 10;
```

---

## API Endpoints Cheat Sheet

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/nordstrom/stats` | Overall statistics |
| `GET /api/v1/nordstrom/products` | List products (with filters) |
| `GET /api/v1/nordstrom/products/:id` | Single product |
| `GET /api/v1/nordstrom/products/:id/price-history` | Price changes |
| `GET /api/v1/nordstrom/brands` | All brands |
| `GET /api/v1/nordstrom/snapshots` | Daily summaries |
| `GET /api/v1/nordstrom/export/csv` | Export CSV |
| `POST /api/v1/nordstrom/scrape/trigger` | Manual scrape |

**Query Parameters for `/products`:**
- `brand` - Filter by brand
- `inStock` - true/false
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `category` - Filter by category
- `limit` - Results per page
- `offset` - Pagination

---

## Monitoring

### Check Scraper Status

```bash
# View logs (if using PM2)
pm2 logs nordstrom-scheduler

# Check latest snapshot
psql -d muse_shopping -c "SELECT * FROM nordstrom_inventory_snapshots ORDER BY snapshot_date DESC LIMIT 1;"

# Get scheduler status
curl http://localhost:3000/api/v1/nordstrom/scheduler/status
```

---

## Common Issues

### Issue: No products found

**Cause:** Nordstrom changed their website structure

**Fix:**
1. Open `src/services/nordstromInventoryService.js`
2. Update CSS selectors in `scrapeCategory()` method
3. Test on actual Nordstrom page

### Issue: Getting blocked

**Cause:** Too many requests

**Fix:**
1. Increase delay: `this.requestDelay = 5000` (5 seconds)
2. Reduce max products: `this.maxProductsPerRun = 100`
3. Consider proxies or contact Nordstrom

### Issue: Scheduler stopped

**Cause:** 3 consecutive errors

**Fix:**
1. Check logs for errors
2. Fix underlying issue
3. Restart: `npm run nordstrom:scheduler`

---

## Data Export Examples

### Export All Products

```bash
curl "http://localhost:3000/api/v1/nordstrom/export/csv" -o all_products.csv
```

### Export Nike Products

```bash
curl "http://localhost:3000/api/v1/nordstrom/export/csv?brand=Nike" -o nike_products.csv
```

### Export In-Stock Only

```bash
curl "http://localhost:3000/api/v1/nordstrom/export/csv?inStock=true" -o in_stock.csv
```

---

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start scheduler
pm2 start src/jobs/nordstromInventoryScheduler.js --name nordstrom

# Monitor
pm2 status
pm2 logs nordstrom

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Using Cron (Alternative)

```bash
# Edit crontab
crontab -e

# Add daily scrape at 2 AM
0 2 * * * cd /path/to/muse-shopping && npm run nordstrom:scrape >> /var/log/nordstrom-scrape.log 2>&1
```

---

## Configuration

Edit `src/services/nordstromInventoryService.js`:

```javascript
// Delay between requests (milliseconds)
this.requestDelay = 2000;  // 2 seconds

// Max products per scrape run
this.maxProductsPerRun = 500;

// Base URL
this.baseUrl = 'https://www.nordstrom.com';
```

---

## Research Tips

1. **Run Initial Scrape**
   - Get baseline data first
   - Verify data quality

2. **Schedule Regular Scrapes**
   - Daily is recommended
   - Captures trends over time

3. **Monitor for Changes**
   - Track new products
   - Identify removed items
   - Analyze price fluctuations

4. **Export Regularly**
   - Back up data as CSV
   - Archive snapshots

5. **Document Methodology**
   - Note scraping parameters
   - Record date ranges
   - Document any issues

---

## File Locations

```
migrations/069_create_nordstrom_inventory.sql  # Database schema
src/services/nordstromInventoryService.js      # Scraping logic
src/jobs/nordstromInventoryJob.js              # Single scrape job
src/jobs/nordstromInventoryScheduler.js        # 24-hour scheduler
src/routes/nordstromInventoryRoutes.js         # API endpoints
```

---

## Getting Help

1. Check logs: `pm2 logs nordstrom` or console output
2. Review error messages in database snapshots
3. Read full docs: `NORDSTROM_INVENTORY_SYSTEM.md`
4. Test with: `./test-nordstrom-system.sh`

---

## Remember

- ✅ This is for academic research only
- ✅ Respect rate limits (default: 2s between requests)
- ✅ Don't redistribute scraped data
- ✅ Monitor system regularly
- ✅ Keep documentation of your research

---

**Ready to start?**

```bash
# 1. Setup
./setup-nordstrom-research.sh

# 2. Test
./test-nordstrom-system.sh

# 3. Run first scrape
npm run nordstrom:scrape

# 4. View results
psql -d muse_shopping -c "SELECT COUNT(*) FROM nordstrom_products;"

# 5. Start scheduler
npm run nordstrom:scheduler
```

---

**Last Updated:** February 11, 2026
