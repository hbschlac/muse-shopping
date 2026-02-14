# Quick Start: New Retailer Integrations

## 🚀 5-Minute Setup Guide

Get The Commense, Sunfere, and Shop Cider integrations running in 5 minutes.

---

## Step 1: Run Migrations (30 seconds)

```bash
# Navigate to project directory
cd /Users/hannahschlacter/Desktop/muse-shopping

# Run all three migrations
psql $DATABASE_URL -f migrations/071_create_commense_inventory.sql
psql $DATABASE_URL -f migrations/072_create_sunfere_inventory.sql
psql $DATABASE_URL -f migrations/073_create_shopcider_inventory.sql
```

**Expected output:** Tables created successfully (15 new tables total)

---

## Step 2: Test One Scraper (2 minutes)

Start with The Commense:

```bash
node src/jobs/commenseInventoryJob.js
```

**What happens:**
1. Browser opens (you'll see it scraping)
2. Visits thecommense.com
3. Extracts up to 100 products
4. Saves to database
5. Syncs to main items table
6. Shows success message

**Expected output:**
```
[Commense] Starting inventory scrape
[Commense] Found 5 collection URLs
[Commense] Scraping collection: https://thecommense.com/collections/all
[Commense] Page info: {"title":"All Products",...}
[Commense] Scrape completed. Products: 100, Errors: 0
[Commense Integration] Starting sync to items table
[Commense Integration] Synced 100 products to items table
```

---

## Step 3: Verify Data (30 seconds)

```sql
-- Check The Commense products
SELECT COUNT(*) FROM commense_products;
-- Expected: 100 (or fewer if website has less)

-- Check synced items
SELECT COUNT(*) FROM items
WHERE store_id = (SELECT id FROM stores WHERE slug = 'thecommense');
-- Expected: Same as above

-- View sample products
SELECT product_name, current_price, brand_name, product_url
FROM commense_products
LIMIT 5;
```

---

## Step 4: Test API (30 seconds)

```bash
# Start your server (if not already running)
npm start

# In another terminal:

# Get stats
curl http://localhost:3000/api/v1/commense/stats

# Get products
curl http://localhost:3000/api/v1/commense/products?limit=10

# Trigger manual scrape
curl -X POST http://localhost:3000/api/v1/commense/scrape/trigger
```

---

## Step 5: Test Other Retailers (2 minutes each)

```bash
# Sunfere
node src/jobs/sunfereInventoryJob.js

# Shop Cider
node src/jobs/shopciderInventoryJob.js
```

---

## 🎯 Production Setup

### Option A: Using PM2 (Recommended)

```bash
# Install PM2 if you haven't
npm install -g pm2

# Start all three schedulers
pm2 start src/jobs/commenseInventoryScheduler.js --name "commense-scraper"
pm2 start src/jobs/sunfereInventoryScheduler.js --name "sunfere-scraper"
pm2 start src/jobs/shopciderInventoryScheduler.js --name "shopcider-scraper"

# Save PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

### Option B: Using Cron

```bash
# Edit crontab
crontab -e

# Add these lines:
0 3 * * * cd /Users/hannahschlacter/Desktop/muse-shopping && node src/jobs/commenseInventoryJob.js >> logs/commense.log 2>&1
0 4 * * * cd /Users/hannahschlacter/Desktop/muse-shopping && node src/jobs/sunfereInventoryJob.js >> logs/sunfere.log 2>&1
0 5 * * * cd /Users/hannahschlacter/Desktop/muse-shopping && node src/jobs/shopciderInventoryJob.js >> logs/shopcider.log 2>&1
```

### Option C: Manual Schedulers

```bash
# Run in background
nohup node src/jobs/commenseInventoryScheduler.js > logs/commense-scheduler.log 2>&1 &
nohup node src/jobs/sunfereInventoryScheduler.js > logs/sunfere-scheduler.log 2>&1 &
nohup node src/jobs/shopciderInventoryScheduler.js > logs/shopcider-scheduler.log 2>&1 &
```

---

## 📊 Quick Monitoring

### Check scraper status:

```bash
# View logs
tail -f logs/commense-scheduler.log

# Check PM2 status (if using PM2)
pm2 status
pm2 logs commense-scraper
```

### Check data in database:

```sql
-- Overall summary
SELECT
  'Commense' as retailer,
  COUNT(*) as products,
  AVG(current_price) as avg_price,
  MIN(last_scraped_at) as oldest_scrape,
  MAX(last_scraped_at) as newest_scrape
FROM commense_products
UNION ALL
SELECT
  'Sunfere' as retailer,
  COUNT(*) as products,
  AVG(current_price) as avg_price,
  MIN(last_scraped_at) as oldest_scrape,
  MAX(last_scraped_at) as newest_scrape
FROM sunfere_products
UNION ALL
SELECT
  'Shop Cider' as retailer,
  COUNT(*) as products,
  AVG(current_price) as avg_price,
  MIN(last_scraped_at) as oldest_scrape,
  MAX(last_scraped_at) as newest_scrape
FROM shopcider_products;
```

---

## 🔧 Common Commands

### Manual scraping:

```bash
# Scrape and sync in one command
node src/jobs/commenseInventoryJob.js
node src/jobs/sunfereInventoryJob.js
node src/jobs/shopciderInventoryJob.js
```

### Update prices only:

```bash
curl -X POST http://localhost:3000/api/v1/commense-integration/update-prices
curl -X POST http://localhost:3000/api/v1/sunfere-integration/update-prices
curl -X POST http://localhost:3000/api/v1/shopcider-integration/update-prices
```

### Export data:

```bash
curl "http://localhost:3000/api/v1/commense/export/csv" -o commense_data.csv
curl "http://localhost:3000/api/v1/sunfere/export/csv" -o sunfere_data.csv
curl "http://localhost:3000/api/v1/shopcider/export/csv" -o shopcider_data.csv
```

### Get stats:

```bash
curl http://localhost:3000/api/v1/commense/stats | json_pp
curl http://localhost:3000/api/v1/sunfere/stats | json_pp
curl http://localhost:3000/api/v1/shopcider/stats | json_pp
```

---

## ❓ Troubleshooting

### "No products found"

1. Check if website is accessible:
   ```bash
   curl -I https://thecommense.com
   ```

2. Run scraper with visible browser:
   - Edit service file
   - Change `headless: false` → `headless: true`
   - Watch what happens

3. Check for errors:
   ```sql
   SELECT error_log FROM commense_inventory_snapshots
   ORDER BY snapshot_date DESC LIMIT 1;
   ```

### "Connection refused"

Make sure your server is running:
```bash
npm start
```

### "Table does not exist"

Run the migrations:
```bash
psql $DATABASE_URL -f migrations/071_create_commense_inventory.sql
```

---

## 📝 Configuration

### Change scrape frequency:

Edit scheduler files:
```javascript
// Daily at 3 AM → Every 6 hours
cron.schedule('0 3 * * *', ...) → cron.schedule('0 */6 * * *', ...)
```

### Change product limit:

Edit service files:
```javascript
this.maxProductsPerRun = 100; → this.maxProductsPerRun = 500;
```

### Change scrape delay:

Edit service files:
```javascript
this.requestDelay = 2000; → this.requestDelay = 5000; // 5 seconds
```

---

## ✅ Success Checklist

- [ ] Migrations run successfully
- [ ] At least one scraper tested and working
- [ ] Products visible in database
- [ ] API endpoints responding
- [ ] Schedulers set up (for production)
- [ ] Monitoring configured

---

## 🎉 You're Done!

Your three new retailer integrations are now collecting fashion inventory data for academic research.

**Schedule:**
- The Commense: Daily at 3:00 AM
- Sunfere: Daily at 4:00 AM
- Shop Cider: Daily at 5:00 AM

**Total Products:** Up to 300 per day (100 per retailer)

For detailed documentation, see: `NEW_RETAILER_INTEGRATIONS_COMPLETE.md`
