# Nordstrom Inventory Tracking System

## Academic Research Documentation

This system provides automated tracking and analysis of Nordstrom's women's clothing inventory for academic research purposes.

---

## ⚠️ IMPORTANT: Legal & Ethical Compliance

**Before using this system, you MUST:**

1. **Review Nordstrom's Terms of Service**
   - Visit: https://www.nordstrom.com/browse/customer-service/policy/terms-conditions

2. **Check robots.txt**
   - Visit: https://www.nordstrom.com/robots.txt
   - Ensure your scraping complies with their directives

3. **Consider Requesting Permission**
   - For academic research, contact Nordstrom directly
   - Ask if they have an API or data partnership program
   - Email: customer service or their developer relations team

4. **Institutional Review Board (IRB)**
   - Check if your research requires IRB approval
   - Ensure compliance with your institution's research ethics guidelines

5. **Rate Limiting**
   - The system includes 2-second delays between requests
   - Adjust if needed to be more conservative
   - Never overwhelm their servers

6. **Respect Data Usage**
   - Use data only for stated academic research purposes
   - Do not redistribute scraped data
   - Comply with applicable data protection regulations

---

## System Overview

### Components

1. **Database Schema** (`migrations/069_create_nordstrom_inventory.sql`)
   - `nordstrom_products` - Product catalog
   - `nordstrom_product_variants` - Size/color variants
   - `nordstrom_product_reviews` - Customer reviews
   - `nordstrom_inventory_snapshots` - Daily summaries
   - `nordstrom_price_history` - Price tracking

2. **Scraping Service** (`src/services/nordstromInventoryService.js`)
   - Puppeteer-based web scraper
   - Stealth plugin to avoid detection
   - Respectful rate limiting (2s between requests)
   - Error handling and retry logic

3. **Scheduled Jobs**
   - `nordstromInventoryJob.js` - Single scrape execution
   - `nordstromInventoryScheduler.js` - 24-hour recurring scraper

4. **API Routes** (`src/routes/nordstromInventoryRoutes.js`)
   - Query products with filters
   - View statistics and analytics
   - Export data as CSV
   - Track price history

---

## Installation & Setup

### 1. Run Database Migration

```bash
# Run migration to create tables
npm run migrate

# Or run directly
psql -d your_database -f migrations/069_create_nordstrom_inventory.sql
```

### 2. Verify Dependencies

All required dependencies are already in your `package.json`:
- `puppeteer` - Browser automation
- `puppeteer-extra` - Extended functionality
- `puppeteer-extra-plugin-stealth` - Stealth mode

### 3. Configure (Optional)

Edit `src/services/nordstromInventoryService.js` to adjust:

```javascript
this.requestDelay = 2000;        // Delay between requests (ms)
this.maxProductsPerRun = 500;    // Max products per scrape
```

---

## Usage

### Option 1: Manual Scrape (One-Time)

Run a single scrape immediately:

```bash
npm run nordstrom:scrape
```

This will:
- Scrape Nordstrom's women's clothing inventory
- Store products in the database
- Generate a daily snapshot
- Exit when complete

### Option 2: Automated Scheduler (24-Hour Recurring)

Start the scheduler for daily automatic scrapes:

```bash
npm run nordstrom:scheduler
```

This will:
- Run an initial scrape immediately
- Schedule scrapes every 24 hours
- Run continuously until stopped (Ctrl+C)
- Auto-restart after errors (max 3 consecutive failures)

**Production Deployment:**

For production, use a process manager:

```bash
# Using PM2
pm2 start src/jobs/nordstromInventoryScheduler.js --name nordstrom-scheduler

# Using systemd (create service file)
sudo systemctl start nordstrom-scheduler
```

---

## API Endpoints

All endpoints are prefixed with `/api/v1/nordstrom`

### 1. Get Inventory Statistics

```bash
GET /api/v1/nordstrom/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_products": 1234,
    "in_stock_count": 890,
    "out_of_stock_count": 344,
    "total_brands": 156,
    "avg_price": 89.99,
    "min_price": 12.50,
    "max_price": 1299.00,
    "avg_rating": 4.2,
    "total_reviews": 45678
  }
}
```

### 2. Query Products

```bash
GET /api/v1/nordstrom/products?brand=Nike&inStock=true&limit=50
```

**Query Parameters:**
- `brand` - Filter by brand name (partial match)
- `inStock` - true/false
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `category` - Filter by category
- `limit` - Results per page (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": "12345",
      "product_name": "Women's Athletic Leggings",
      "brand_name": "Nike",
      "current_price": 49.99,
      "image_url": "https://...",
      "product_url": "https://...",
      "is_in_stock": true,
      "average_rating": 4.5,
      "review_count": 234,
      "first_seen_at": "2026-02-11",
      "last_seen_at": "2026-02-11"
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0,
    "pages": 4
  }
}
```

### 3. Get Product Details

```bash
GET /api/v1/nordstrom/products/:productId
```

### 4. Get Price History

```bash
GET /api/v1/nordstrom/products/:productId/price-history
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "price": 49.99,
      "was_on_sale": false,
      "recorded_at": "2026-02-11T12:00:00Z"
    },
    {
      "price": 39.99,
      "was_on_sale": true,
      "recorded_at": "2026-02-10T12:00:00Z"
    }
  ]
}
```

### 5. Get All Brands

```bash
GET /api/v1/nordstrom/brands
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "brand_name": "Nike",
      "product_count": 234,
      "avg_price": 65.50,
      "in_stock_count": 189
    }
  ]
}
```

### 6. Get Daily Snapshots

```bash
GET /api/v1/nordstrom/snapshots?limit=30
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "snapshot_date": "2026-02-11",
      "total_products": 1234,
      "in_stock_products": 890,
      "out_of_stock_products": 344,
      "average_price": 89.99,
      "scrape_duration_seconds": 1847,
      "scrape_status": "success"
    }
  ]
}
```

### 7. Export as CSV

```bash
GET /api/v1/nordstrom/export/csv?brand=Nike
```

Downloads a CSV file with all product data.

### 8. Trigger Manual Scrape

```bash
POST /api/v1/nordstrom/scrape/trigger
```

**Note:** Consider adding authentication to this endpoint in production.

### 9. Check Scheduler Status

```bash
GET /api/v1/nordstrom/scheduler/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "lastRunTime": "2026-02-11T12:00:00Z",
    "nextRunTime": "2026-02-12T12:00:00Z",
    "consecutiveErrors": 0,
    "intervalHours": 24,
    "uptime": 86400
  }
}
```

---

## Data Analysis Examples

### Example 1: Brand Analysis

```sql
-- Top 10 brands by product count
SELECT
  brand_name,
  COUNT(*) as products,
  AVG(current_price) as avg_price,
  AVG(average_rating) as avg_rating
FROM nordstrom_products
WHERE brand_name IS NOT NULL
GROUP BY brand_name
ORDER BY products DESC
LIMIT 10;
```

### Example 2: Price Trends

```sql
-- Track price changes over time for a brand
SELECT
  p.brand_name,
  DATE(h.recorded_at) as date,
  AVG(h.price) as avg_price,
  COUNT(DISTINCT p.product_id) as products_tracked
FROM nordstrom_price_history h
JOIN nordstrom_products p ON h.product_id = p.product_id
WHERE p.brand_name = 'Nike'
GROUP BY p.brand_name, DATE(h.recorded_at)
ORDER BY date DESC;
```

### Example 3: Inventory Turnover

```sql
-- Products that went out of stock
SELECT
  product_id,
  product_name,
  brand_name,
  current_price,
  first_seen_at,
  last_seen_at,
  (last_seen_at - first_seen_at) as days_available
FROM nordstrom_products
WHERE is_in_stock = false
ORDER BY last_seen_at DESC;
```

### Example 4: Daily Inventory Changes

```sql
-- Inventory changes over time
SELECT
  snapshot_date,
  total_products,
  in_stock_products,
  out_of_stock_products,
  (in_stock_products::float / NULLIF(total_products, 0) * 100) as stock_percentage,
  average_price
FROM nordstrom_inventory_snapshots
ORDER BY snapshot_date DESC
LIMIT 30;
```

---

## Monitoring & Logs

### View Logs

```bash
# If using PM2
pm2 logs nordstrom-scheduler

# Check application logs
tail -f logs/app.log
```

### Key Metrics to Monitor

1. **Scrape Success Rate**
   - Check `nordstrom_inventory_snapshots.scrape_status`

2. **Products Discovered**
   - Track `total_products` over time

3. **Scrape Duration**
   - Monitor `scrape_duration_seconds`
   - Alert if exceeds threshold

4. **Error Rate**
   - Check error logs in snapshots
   - Alert on consecutive failures

---

## Troubleshooting

### Issue: Scraper fails immediately

**Solution:**
1. Check internet connection
2. Verify Nordstrom website is accessible
3. Check if Nordstrom changed their HTML structure
4. Review error logs for details

### Issue: No products found

**Solution:**
1. Nordstrom may have changed their CSS selectors
2. Update selectors in `nordstromInventoryService.js`
3. Test on actual Nordstrom pages to verify structure

### Issue: Getting blocked/CAPTCHAs

**Solution:**
1. Increase `requestDelay` to be more conservative
2. Reduce `maxProductsPerRun`
3. Consider using residential proxies
4. Contact Nordstrom for API access

### Issue: Database connection errors

**Solution:**
1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure migration was run successfully

---

## Performance Optimization

### For Large-Scale Research

If you need to scrape more products:

1. **Increase Limits**
   ```javascript
   this.maxProductsPerRun = 2000; // Increase cautiously
   ```

2. **Use Multiple Workers**
   - Run multiple instances with different category URLs
   - Implement distributed scraping

3. **Optimize Database**
   ```sql
   -- Add additional indexes if needed
   CREATE INDEX idx_custom ON nordstrom_products(your_field);
   ```

4. **Cache Results**
   - Store frequently accessed data in Redis
   - Reduce database queries

---

## Research Citations

When publishing research using this data, consider:

1. **Data Source Disclosure**
   - Clearly state data was scraped from Nordstrom.com
   - Include scraping date range
   - Note any limitations or biases

2. **Methodology Transparency**
   - Describe scraping approach
   - Document filters and exclusions
   - Share sample sizes

3. **Ethical Statement**
   - Confirm compliance with terms of service
   - Note any permissions obtained
   - Address data protection compliance

---

## Limitations

1. **Data Completeness**
   - May not capture all products due to pagination limits
   - Some products may be missed if not visible in listings

2. **Real-Time Accuracy**
   - Snapshot every 24 hours (not real-time)
   - Stock status may change between scrapes

3. **Historical Data**
   - Only captures data from first scrape forward
   - No historical data before system implementation

4. **Website Changes**
   - Scraper may break if Nordstrom updates their website
   - Requires maintenance and updates

---

## Support

For issues or questions:

1. Check logs for error messages
2. Review this documentation
3. Inspect database for data integrity
4. Test manually with `npm run nordstrom:scrape`

---

## License & Academic Use

This system is provided for academic research purposes. Users are responsible for:
- Obtaining necessary permissions
- Complying with all applicable laws
- Following ethical research guidelines
- Respecting website terms of service

**Disclaimer:** The creators of this system are not responsible for misuse or violations of terms of service.

---

## Quick Start Checklist

- [ ] Read and understand Terms of Service compliance requirements
- [ ] Run database migration: `npm run migrate`
- [ ] Test single scrape: `npm run nordstrom:scrape`
- [ ] Verify data in database: Check `nordstrom_products` table
- [ ] Test API endpoints: GET `/api/v1/nordstrom/stats`
- [ ] Start scheduler (if needed): `npm run nordstrom:scheduler`
- [ ] Monitor logs for errors
- [ ] Export sample data: GET `/api/v1/nordstrom/export/csv`
- [ ] Document your research methodology
- [ ] Set up monitoring and alerts

---

**Last Updated:** February 11, 2026
**System Version:** 1.0.0
