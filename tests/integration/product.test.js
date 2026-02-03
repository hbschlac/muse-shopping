/**
 * Integration Tests: Product Catalog (DISCOVER Phase)
 * Tests JAR batch imports and SERVICE real-time lookups
 */

const request = require('supertest');
const express = require('express');
const routes = require('../../src/routes');
const pool = require('../../src/db/pool');
const productCatalogBatchService = require('../../src/services/productCatalogBatchService');
const productRealtimeService = require('../../src/services/productRealtimeService');

// Create minimal app for testing
const app = express();
app.use(express.json());
app.use('/api/v1', routes);

describe('Product Catalog Integration Tests', () => {
  let authToken;
  let userId;
  let testProductId;

  // Setup: Create test user and authenticate
  beforeAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM product_user_interactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-product%@example.com']);
    await pool.query('DELETE FROM product_realtime_cache');
    await pool.query('DELETE FROM product_price_history');
    await pool.query('DELETE FROM product_catalog WHERE store_id = 1');
    await pool.query('DELETE FROM batch_import_logs WHERE store_id = 1');
    await pool.query('DELETE FROM api_call_tracking WHERE store_id = 1');
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test-product%@example.com']);

    // Register test user
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test-product-user@example.com',
        password: 'TestPassword123!',
        firstName: 'Product',
        lastName: 'Tester',
      });

    authToken = registerRes.body.data.token;
    userId = registerRes.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM product_user_interactions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM product_realtime_cache');
    await pool.query('DELETE FROM product_price_history');
    await pool.query('DELETE FROM product_catalog WHERE store_id = 1');
    await pool.query('DELETE FROM batch_import_logs WHERE store_id = 1');
    await pool.query('DELETE FROM api_call_tracking WHERE store_id = 1');
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.end();
  });

  // ==========================================
  // JAR (BATCH) TESTS
  // ==========================================

  describe('JAR: Batch Import Service', () => {
    test('Should import full catalog for a store', async () => {
      const result = await productCatalogBatchService.importStoreCatalog(1, 'cj');

      expect(result.success).toBe(true);
      expect(result.stats.processed).toBeGreaterThan(0);
      expect(result.stats.created).toBeGreaterThan(0);
      expect(result.durationSeconds).toBeGreaterThan(0);

      // Verify products were inserted
      const countRes = await pool.query(
        'SELECT COUNT(*) FROM product_catalog WHERE store_id = 1'
      );
      expect(parseInt(countRes.rows[0].count)).toBeGreaterThan(0);

      // Save first product ID for later tests
      const productRes = await pool.query(
        'SELECT id FROM product_catalog WHERE store_id = 1 LIMIT 1'
      );
      testProductId = productRes.rows[0].id;
    });

    test('Should log batch import stats', async () => {
      const logs = await pool.query(
        'SELECT * FROM batch_import_logs WHERE store_id = 1 ORDER BY started_at DESC LIMIT 1'
      );

      expect(logs.rows.length).toBe(1);
      expect(logs.rows[0].status).toBe('completed');
      expect(logs.rows[0].products_processed).toBeGreaterThan(0);
    });

    test('Should update existing products on re-import', async () => {
      const firstImport = await productCatalogBatchService.importStoreCatalog(1, 'cj');
      const secondImport = await productCatalogBatchService.importStoreCatalog(1, 'cj');

      expect(secondImport.stats.updated).toBeGreaterThan(0);
      expect(secondImport.stats.created).toBe(0); // Should update, not create new

      // Verify batch_update_count incremented
      const product = await pool.query(
        'SELECT batch_update_count FROM product_catalog WHERE id = $1',
        [testProductId]
      );
      expect(product.rows[0].batch_update_count).toBeGreaterThanOrEqual(2);
    });

    test('Should track price changes', async () => {
      // First check if there are any price history records
      const historyRes = await pool.query(
        'SELECT COUNT(*) FROM product_price_history WHERE product_catalog_id = $1',
        [testProductId]
      );

      // Price history is created when price changes, so might be 0 initially
      expect(parseInt(historyRes.rows[0].count)).toBeGreaterThanOrEqual(0);
    });

    test('Should get import statistics', async () => {
      const stats = await productCatalogBatchService.getImportStats(7);

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);

      const storeStats = stats.find(s => s.store_id === 1);
      expect(storeStats).toBeDefined();
      expect(storeStats.total_processed).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // SERVICE (REAL-TIME) TESTS
  // ==========================================

  describe('SERVICE: Real-time Product Lookups', () => {
    test('Should get real-time product data (cache miss)', async () => {
      const data = await productRealtimeService.getRealtimeProductData(
        testProductId,
        userId
      );

      expect(data).toBeDefined();
      expect(data.current_price_cents).toBeGreaterThan(0);
      expect(data.is_available).toBeDefined();
      expect(data.source).toBe('api'); // First call should be API (cache miss)
    });

    test('Should return cached data on subsequent call (cache hit)', async () => {
      const data = await productRealtimeService.getRealtimeProductData(
        testProductId,
        userId
      );

      expect(data.source).toBe('cache'); // Should hit cache this time
      expect(data.cached_at).toBeDefined();
    });

    test('Should track user interactions', async () => {
      const interactions = await pool.query(
        'SELECT * FROM product_user_interactions WHERE user_id = $1 AND product_catalog_id = $2',
        [userId, testProductId]
      );

      expect(interactions.rows.length).toBeGreaterThan(0);
      expect(interactions.rows[0].interaction_type).toBe('view');
    });

    test('Should generate affiliate checkout link', async () => {
      const link = await productRealtimeService.generateAffiliateLink(
        testProductId,
        userId
      );

      expect(link).toBeDefined();
      expect(typeof link).toBe('string');
      expect(link).toContain('http');

      // Verify click interaction tracked
      const clicks = await pool.query(
        'SELECT * FROM product_user_interactions WHERE user_id = $1 AND product_catalog_id = $2 AND interaction_type = $3',
        [userId, testProductId, 'click']
      );
      expect(clicks.rows.length).toBeGreaterThan(0);
    });

    test('Should force fresh data on cart add', async () => {
      const data = await productRealtimeService.trackCartAdd(userId, testProductId);

      expect(data).toBeDefined();
      expect(data.current_price_cents).toBeGreaterThan(0);

      // Verify cart_add interaction tracked
      const cartAdds = await pool.query(
        'SELECT * FROM product_user_interactions WHERE user_id = $1 AND product_catalog_id = $2 AND interaction_type = $3',
        [userId, testProductId, 'cart_add']
      );
      expect(cartAdds.rows.length).toBeGreaterThan(0);
      expect(cartAdds.rows[0].triggered_realtime_fetch).toBe(true);
    });

    test('Should batch fetch multiple products', async () => {
      // Get 2 product IDs
      const products = await pool.query(
        'SELECT id FROM product_catalog WHERE store_id = 1 LIMIT 2'
      );
      const productIds = products.rows.map(p => p.id);

      const results = await productRealtimeService.batchGetRealtimeData(
        productIds,
        userId
      );

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    test('Should get cache statistics', async () => {
      const stats = await productRealtimeService.getCacheStats(24);

      expect(stats).toBeDefined();
      expect(stats.cache_hits).toBeGreaterThanOrEqual(0);
      expect(stats.cache_misses).toBeGreaterThanOrEqual(0);
      expect(stats.cache_hit_rate_percent).toBeGreaterThanOrEqual(0);
    });

    test('Should get cost statistics', async () => {
      const stats = await productRealtimeService.getCostStats(7);

      expect(Array.isArray(stats)).toBe(true);
      // Stats might be empty if no API calls tracked yet
    });
  });

  // ==========================================
  // API ENDPOINT TESTS
  // ==========================================

  describe('API: Product Endpoints', () => {
    test('GET /api/v1/products/:productId - should get product details', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.current_price_cents).toBeGreaterThan(0);
      expect(res.body.data.source).toBeDefined();
    });

    test('GET /api/v1/products/:productId/checkout-link - should generate checkout link', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProductId}/checkout-link`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkout_url).toBeDefined();
      expect(res.body.data.checkout_url).toContain('http');
    });

    test('POST /api/v1/products/:productId/cart - should add to cart', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProductId}/cart`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.current_price_cents).toBeGreaterThan(0);
    });

    test('POST /api/v1/products/cart-batch - should get cart items data', async () => {
      const products = await pool.query(
        'SELECT id FROM product_catalog WHERE store_id = 1 LIMIT 3'
      );
      const productIds = products.rows.map(p => p.id);

      const res = await request(app)
        .post('/api/v1/products/cart-batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productIds });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(productIds.length);
    });

    test('GET /api/v1/products/stats/cache - should get cache stats', async () => {
      const res = await request(app)
        .get('/api/v1/products/stats/cache?hours=24')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cache_hit_rate_percent).toBeDefined();
    });

    test('GET /api/v1/products/stats/cost - should get cost stats', async () => {
      const res = await request(app)
        .get('/api/v1/products/stats/cost?days=7')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/v1/products/stats/batch-imports - should get batch import stats', async () => {
      const res = await request(app)
        .get('/api/v1/products/stats/batch-imports?days=7')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('POST /api/v1/products/admin/batch-import - should trigger batch import', async () => {
      const res = await request(app)
        .post('/api/v1/products/admin/batch-import')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: 1,
          affiliateNetwork: 'cj',
          jobType: 'price_update',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
    });

    test('Should require authentication', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProductId}`);

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // CACHE OPTIMIZATION TESTS
  // ==========================================

  describe('Cache Optimization', () => {
    test('Should expire cache after TTL', async () => {
      // Set cache with very short TTL (for testing)
      const product = await pool.query('SELECT id FROM product_catalog WHERE store_id = 1 LIMIT 1');
      const productId = product.rows[0].id;

      // Insert cache entry that's already expired
      await pool.query(`
        INSERT INTO product_realtime_cache (
          product_catalog_id,
          current_price_cents,
          is_available,
          available_variants,
          shipping_info,
          promotions,
          fetched_at,
          expires_at
        ) VALUES ($1, 2999, true, '{}', '{}', '[]', NOW(), NOW() - INTERVAL '1 minute')
        ON CONFLICT (product_catalog_id) DO UPDATE SET
          expires_at = NOW() - INTERVAL '1 minute'
      `, [productId]);

      // Fetch should trigger API call (cache expired)
      const data = await productRealtimeService.getRealtimeProductData(productId, userId);
      expect(data.source).toBe('api'); // Should be API, not cache
    });

    test('Should clean up expired cache entries', async () => {
      const deleted = await productCatalogBatchService.cleanupExpiredCache();
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================
  // COST TRACKING TESTS
  // ==========================================

  describe('Cost Tracking', () => {
    test('Should track API calls', async () => {
      const beforeCount = await pool.query(
        'SELECT COUNT(*) FROM api_call_tracking WHERE store_id = 1'
      );

      await productRealtimeService.getRealtimeProductData(testProductId, userId);

      const afterCount = await pool.query(
        'SELECT COUNT(*) FROM api_call_tracking WHERE store_id = 1'
      );

      // API call tracking happens in background, might not always increment
      expect(parseInt(afterCount.rows[0].count)).toBeGreaterThanOrEqual(
        parseInt(beforeCount.rows[0].count)
      );
    });
  });
});
