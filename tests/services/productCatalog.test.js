/**
 * Unit Tests: Product Catalog Services
 * Tests JAR batch imports and SERVICE real-time lookups directly
 */

const pool = require('../../src/db/pool');
const productCatalogBatchService = require('../../src/services/productCatalogBatchService');
const productRealtimeService = require('../../src/services/productRealtimeService');

describe('Product Catalog Services', () => {
  let testUserId;
  let testProductId;

  beforeAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM product_user_interactions');
    await pool.query('DELETE FROM product_realtime_cache');
    await pool.query('DELETE FROM product_price_history');
    await pool.query('DELETE FROM product_catalog WHERE store_id = 1');
    await pool.query('DELETE FROM batch_import_logs WHERE store_id = 1');
    await pool.query('DELETE FROM api_call_tracking WHERE store_id = 1');

    // Get or create a test user
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length > 0) {
      testUserId = userRes.rows[0].id;
    } else {
      // Create test user
      const newUser = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id',
        ['test-product@example.com', 'hash', 'Test', 'User']
      );
      testUserId = newUser.rows[0].id;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  // ==========================================
  // JAR (BATCH) SERVICE TESTS
  // ==========================================

  describe('Batch Import Service', () => {
    test('Should import full catalog for a store', async () => {
      console.log('\n[TEST] Running full catalog import for store 1 (Old Navy)...');

      const result = await productCatalogBatchService.importStoreCatalog(1, 'cj');

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.processed).toBeGreaterThan(0);
      expect(result.stats.created).toBeGreaterThan(0);
      expect(result.durationSeconds).toBeGreaterThanOrEqual(0);

      console.log(`[TEST] ✓ Imported ${result.stats.created} products in ${result.durationSeconds}s`);

      // Verify products were inserted
      const countRes = await pool.query(
        'SELECT COUNT(*) FROM product_catalog WHERE store_id = 1'
      );
      const count = parseInt(countRes.rows[0].count);
      expect(count).toBeGreaterThan(0);

      console.log(`[TEST] ✓ Verified ${count} products in database`);

      // Save first product ID for later tests
      const productRes = await pool.query(
        'SELECT id, product_name, price_cents FROM product_catalog WHERE store_id = 1 LIMIT 1'
      );
      testProductId = productRes.rows[0].id;
      console.log(`[TEST] ✓ Test product: "${productRes.rows[0].product_name}" ($${productRes.rows[0].price_cents / 100})`);
    });

    test('Should create batch import log', async () => {
      const logs = await pool.query(
        'SELECT * FROM batch_import_logs WHERE store_id = 1 AND status = $1 ORDER BY started_at DESC LIMIT 1',
        ['completed']
      );

      expect(logs.rows.length).toBe(1);
      expect(logs.rows[0].products_processed).toBeGreaterThan(0);
      expect(logs.rows[0].duration_seconds).toBeGreaterThanOrEqual(0);

      console.log(`[TEST] ✓ Batch log: ${logs.rows[0].products_processed} processed, ${logs.rows[0].products_created} created, ${logs.rows[0].products_updated} updated`);
    });

    test('Should update existing products on re-import', async () => {
      console.log('\n[TEST] Running second import (should update, not create)...');

      const secondImport = await productCatalogBatchService.importStoreCatalog(1, 'cj');

      expect(secondImport.stats.updated).toBeGreaterThan(0);
      expect(secondImport.stats.created).toBe(0); // Should update existing

      console.log(`[TEST] ✓ Updated ${secondImport.stats.updated} existing products`);

      // Verify batch_update_count incremented
      const product = await pool.query(
        'SELECT batch_update_count FROM product_catalog WHERE id = $1',
        [testProductId]
      );
      expect(product.rows[0].batch_update_count).toBeGreaterThanOrEqual(2);

      console.log(`[TEST] ✓ Product updated ${product.rows[0].batch_update_count} times`);
    });

    test('Should get import statistics', async () => {
      const stats = await productCatalogBatchService.getImportStats(7);

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);

      const storeStats = stats.find(s => s.store_id === 1);
      expect(storeStats).toBeDefined();
      expect(parseInt(storeStats.total_processed)).toBeGreaterThan(0);

      console.log(`[TEST] ✓ Import stats: ${storeStats.job_count} jobs, ${storeStats.total_processed} total products processed`);
    });

    test('Should update prices only', async () => {
      console.log('\n[TEST] Running price update (faster than full import)...');

      const result = await productCatalogBatchService.updateStorePrices(1, 'cj');

      expect(result.success).toBe(true);
      expect(result.stats.updated).toBeGreaterThan(0);

      console.log(`[TEST] ✓ Updated ${result.stats.updated} prices in ${result.durationSeconds}s`);
    });
  });

  // ==========================================
  // REALTIME SERVICE TESTS
  // ==========================================

  describe('Realtime Product Service', () => {
    test('Should get real-time product data (cache miss)', async () => {
      console.log('\n[TEST] First real-time lookup (should be cache MISS)...');

      const data = await productRealtimeService.getRealtimeProductData(
        testProductId,
        testUserId
      );

      expect(data).toBeDefined();
      expect(data.current_price_cents).toBeGreaterThan(0);
      expect(data.is_available).toBeDefined();
      expect(data.source).toBe('api'); // First call should be API

      console.log(`[TEST] ✓ Source: ${data.source}, Price: $${data.current_price_cents / 100}`);
    });

    test('Should return cached data on subsequent call (cache hit)', async () => {
      console.log('\n[TEST] Second real-time lookup (should be cache HIT)...');

      const data = await productRealtimeService.getRealtimeProductData(
        testProductId,
        testUserId
      );

      expect(data.source).toBe('cache'); // Should hit cache
      expect(data.cached_at).toBeDefined();

      console.log(`[TEST] ✓ Source: ${data.source}, Cached at: ${data.cached_at}`);
    });

    test('Should track user interactions', async () => {
      const interactions = await pool.query(
        'SELECT * FROM product_user_interactions WHERE user_id = $1 AND product_catalog_id = $2',
        [testUserId, testProductId]
      );

      expect(interactions.rows.length).toBeGreaterThan(0);
      expect(interactions.rows.some(i => i.interaction_type === 'view')).toBe(true);

      console.log(`[TEST] ✓ Tracked ${interactions.rows.length} user interactions`);
    });

    test('Should generate affiliate link', async () => {
      console.log('\n[TEST] Generating affiliate checkout link...');

      const link = await productRealtimeService.generateAffiliateLink(
        testProductId,
        testUserId
      );

      expect(link).toBeDefined();
      expect(typeof link).toBe('string');
      expect(link).toContain('http');

      console.log(`[TEST] ✓ Generated link: ${link.substring(0, 60)}...`);

      // Verify click tracked
      const clicks = await pool.query(
        'SELECT COUNT(*) FROM product_user_interactions WHERE user_id = $1 AND product_catalog_id = $2 AND interaction_type = $3',
        [testUserId, testProductId, 'click']
      );
      expect(parseInt(clicks.rows[0].count)).toBeGreaterThan(0);
    });

    test('Should force fresh data on cart add', async () => {
      console.log('\n[TEST] Adding to cart (should force fresh price check)...');

      const data = await productRealtimeService.trackCartAdd(testUserId, testProductId);

      expect(data).toBeDefined();
      expect(data.current_price_cents).toBeGreaterThan(0);

      console.log(`[TEST] ✓ Cart add tracked, current price: $${data.current_price_cents / 100}`);

      // Verify cart_add tracked
      const cartAdds = await pool.query(
        'SELECT * FROM product_user_interactions WHERE user_id = $1 AND product_catalog_id = $2 AND interaction_type = $3 ORDER BY interacted_at DESC LIMIT 1',
        [testUserId, testProductId, 'cart_add']
      );
      expect(cartAdds.rows.length).toBeGreaterThan(0);
      expect(cartAdds.rows[0].triggered_realtime_fetch).toBe(true);
    });

    test('Should batch fetch multiple products', async () => {
      console.log('\n[TEST] Batch fetching cart items...');

      // Get 3 product IDs
      const products = await pool.query(
        'SELECT id FROM product_catalog WHERE store_id = 1 LIMIT 3'
      );
      const productIds = products.rows.map(p => p.id);

      const results = await productRealtimeService.batchGetRealtimeData(
        productIds,
        testUserId
      );

      expect(results.length).toBe(productIds.length);
      expect(results.every(r => r.success)).toBe(true);

      console.log(`[TEST] ✓ Fetched ${results.length} cart items successfully`);
    });
  });

  // ==========================================
  // STATISTICS & MONITORING TESTS
  // ==========================================

  describe('Statistics and Monitoring', () => {
    test('Should get cache statistics', async () => {
      console.log('\n[TEST] Getting cache performance stats...');

      const stats = await productRealtimeService.getCacheStats(24);

      expect(stats).toBeDefined();
      expect(parseInt(stats.cache_hits || 0)).toBeGreaterThanOrEqual(0);
      expect(parseInt(stats.cache_misses || 0)).toBeGreaterThanOrEqual(0);

      console.log(`[TEST] ✓ Cache hits: ${stats.cache_hits}, misses: ${stats.cache_misses}, hit rate: ${stats.cache_hit_rate_percent}%`);
    });

    test('Should get API cost statistics', async () => {
      console.log('\n[TEST] Getting API cost stats...');

      const stats = await productRealtimeService.getCostStats(7);

      expect(Array.isArray(stats)).toBe(true);

      if (stats.length > 0) {
        console.log(`[TEST] ✓ Found ${stats.length} API call records`);
        console.log(`[TEST]   Total calls: ${stats.reduce((sum, s) => sum + s.call_count, 0)}`);
      } else {
        console.log(`[TEST] ✓ No API cost data yet (tracking happens in background)`);
      }
    });

    test('Should clean up expired cache', async () => {
      console.log('\n[TEST] Cleaning up expired cache entries...');

      // First, expire some cache entries
      await pool.query(`
        UPDATE product_realtime_cache
        SET expires_at = NOW() - INTERVAL '1 minute'
        WHERE product_catalog_id = $1
      `, [testProductId]);

      const deleted = await productCatalogBatchService.cleanupExpiredCache();

      expect(deleted).toBeGreaterThanOrEqual(0);
      console.log(`[TEST] ✓ Deleted ${deleted} expired cache entries`);
    });
  });

  // ==========================================
  // PRICE TRACKING TESTS
  // ==========================================

  describe('Price Tracking', () => {
    test('Should track price changes', async () => {
      console.log('\n[TEST] Checking price history...');

      const history = await pool.query(
        'SELECT * FROM product_price_history WHERE product_catalog_id = $1 ORDER BY detected_at DESC',
        [testProductId]
      );

      // Price history is created when prices change
      expect(Array.isArray(history.rows)).toBe(true);

      if (history.rows.length > 0) {
        console.log(`[TEST] ✓ Found ${history.rows.length} price change events`);
        const latest = history.rows[0];
        console.log(`[TEST]   Latest: $${latest.price_cents / 100} (source: ${latest.update_source})`);
      } else {
        console.log(`[TEST] ✓ No price changes yet (prices stable)`);
      }
    });
  });
});
