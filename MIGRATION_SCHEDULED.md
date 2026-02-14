# Migration Scheduled for 6:00 PM PST

**Date:** Tuesday, February 10, 2026
**Time:** 6:00 PM PST
**Status:** ✅ SCHEDULED

---

## What's Happening

The latency optimization migration (067_add_performance_indexes.sql) has been scheduled to run automatically at 6:00 PM PST today.

### Migration Will:
- ✅ Create pg_trgm extension for full-text search
- ✅ Add 30+ performance indexes on critical tables
- ✅ Run ANALYZE on all tables for query planner optimization
- ✅ Use safe execution wrapper (won't fail on missing tables)

**Expected Duration:** 2-5 minutes depending on database size

---

## Scheduled Job Details

**Job Number:** 1
**Execution Time:** Tue Feb 10 18:00:00 2026
**Log File:** `/Users/hannahschlacter/Desktop/muse-shopping/migration-067.log`

To view scheduled jobs:
```bash
atq
```

To cancel the migration:
```bash
atrm 1
```

---

## After Migration Completes (6:05 PM PST)

### Step 1: Check the migration log
```bash
cat /Users/hannahschlacter/Desktop/muse-shopping/migration-067.log
```

Look for:
- ✅ "Migration completed successfully!"
- List of indexes created

### Step 2: Update .env file

Add these performance settings to your `.env`:

```bash
# Database Performance
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_MAX_SERVERLESS=2
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=20000

# Cache Configuration
PERSONALIZATION_CACHE_SIZE=1000
PERSONALIZATION_CACHE_TTL=300000
ITEM_CACHE_SIZE=500
ITEM_CACHE_TTL=180000

# Performance Monitoring
SLOW_REQUEST_THRESHOLD_MS=2000
CRITICAL_SLOW_THRESHOLD_MS=5000
```

### Step 3: Restart the backend server

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping
npm run dev
```

### Step 4: Verify the optimizations

```bash
# Test the API
curl http://localhost:3000/api/v1/health/detailed

# Check cache stats (requires admin token)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/v1/admin/cache/stats
```

---

## If Migration Fails

If the migration fails (check the log file), you can run it manually:

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping
./run-latency-migration.sh
```

Or run directly with psql:

```bash
psql $DATABASE_URL -f migrations/067_add_performance_indexes.sql
```

---

## Manual Execution (If Needed)

If you need to run the migration manually instead of waiting:

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping
./run-latency-migration.sh | tee migration-067.log
```

---

## Expected Performance Improvements

Once migration completes and server restarts:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Item Search | 800-1500ms | 200-500ms | **-67%** |
| Chat Response | 2000-3000ms | 1200-1800ms | **-40%** |
| Product Detail | 300-600ms | 100-200ms | **-67%** |
| Cart Operations | 600-1200ms | 200-400ms | **-67%** |

---

## Rollback Plan (If Needed)

If you encounter issues after the migration, you can remove the indexes:

```sql
-- Connect to database
psql $DATABASE_URL

-- Drop indexes (example)
DROP INDEX IF EXISTS idx_items_brand_id_active;
DROP INDEX IF EXISTS idx_items_category_active;
-- etc...
```

However, the indexes are **non-destructive** and **backwards-compatible**, so rollback should not be necessary.

---

## Questions?

- **Migration script:** `/Users/hannahschlacter/Desktop/muse-shopping/run-latency-migration.sh`
- **Migration file:** `/Users/hannahschlacter/Desktop/muse-shopping/migrations/067_add_performance_indexes.sql`
- **Documentation:** See `LATENCY_OPTIMIZATION_REPORT.md` and `LATENCY_OPTIMIZATIONS_SUMMARY.md`

---

**Current Time:** 4:53 PM PST
**Migration Starts In:** ~67 minutes
**Status:** Waiting for scheduled execution...
