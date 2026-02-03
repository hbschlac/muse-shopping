/**
 * Catalog Sync Service Tests
 */

const CatalogSyncService = require('../src/services/catalogSyncService');
const pool = require('../src/db/pool');

// Test data
let testStore;
let testBrand;

beforeAll(async () => {
  // Use timestamp to ensure unique test data
  const timestamp = Date.now();

  // Create test store
  const storeResult = await pool.query(
    `INSERT INTO stores (name, slug, display_name, website_url, is_active)
    VALUES ($1, $2, $3, $4, true)
    RETURNING *`,
    [`Test Store Sync ${timestamp}`, `test-store-sync-${timestamp}`, `Test Store Sync ${timestamp}`, 'https://teststore.com']
  );
  testStore = storeResult.rows[0];

  // Create test brand
  const brandResult = await pool.query(
    `INSERT INTO brands (name, slug, is_active)
    VALUES ($1, $2, true)
    RETURNING *`,
    [`Test Brand Sync ${timestamp}`, `test-brand-sync-${timestamp}`]
  );
  testBrand = brandResult.rows[0];
});

afterAll(async () => {
  // Cleanup
  await pool.query('DELETE FROM catalog_sync_queue WHERE store_id = $1', [testStore.id]);
  await pool.query('DELETE FROM product_catalog WHERE store_id = $1', [testStore.id]);
  await pool.query('DELETE FROM stores WHERE id = $1', [testStore.id]);
  await pool.query('DELETE FROM brands WHERE id = $1', [testBrand.id]);
  await pool.end();
});

describe('CatalogSyncService', () => {
  describe('queueSync', () => {
    test('should queue a full sync job', async () => {
      const job = await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'full',
        priority: 80
      });

      expect(job).toBeDefined();
      expect(job.store_id).toBe(testStore.id);
      expect(job.sync_type).toBe('full');
      expect(job.priority).toBe(80);
      expect(job.status).toBe('pending');
    });

    test('should queue an incremental sync job', async () => {
      const job = await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'incremental',
        priority: 50
      });

      expect(job).toBeDefined();
      expect(job.sync_type).toBe('incremental');
    });

    test('should queue a category-filtered sync job', async () => {
      const job = await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'category',
        categoryFilter: 'dresses',
        priority: 60
      });

      expect(job).toBeDefined();
      expect(job.category_filter).toBe('dresses');
    });

    test('should queue a brand-filtered sync job', async () => {
      const job = await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'brand',
        brandFilter: 'Gucci',
        priority: 70
      });

      expect(job).toBeDefined();
      expect(job.brand_filter).toBe('Gucci');
    });
  });

  describe('getNextJob', () => {
    test('should get next pending job by priority', async () => {
      // Queue multiple jobs
      await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'full',
        priority: 30
      });

      await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'incremental',
        priority: 90
      });

      const job = await CatalogSyncService.getNextJob();

      expect(job).toBeDefined();
      expect(job.priority).toBe(90); // Highest priority job
      expect(job.status).toBe('running');
    });

    test('should return null when no pending jobs', async () => {
      // Clear all pending jobs
      await pool.query(
        'UPDATE catalog_sync_queue SET status = $1 WHERE store_id = $2',
        ['completed', testStore.id]
      );

      const job = await CatalogSyncService.getNextJob();
      expect(job).toBeNull();
    });
  });

  describe('completeJob', () => {
    test('should mark job as completed', async () => {
      const queuedJob = await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'full',
        priority: 50
      });

      // Start the job
      await pool.query(
        'UPDATE catalog_sync_queue SET status = $1, started_at = NOW() WHERE id = $2',
        ['running', queuedJob.id]
      );

      const completedJob = await CatalogSyncService.completeJob(queuedJob.id, 100, 5);

      expect(completedJob.status).toBe('completed');
      expect(completedJob.products_synced).toBe(100);
      expect(completedJob.products_failed).toBe(5);
      expect(completedJob.completed_at).toBeDefined();
    });
  });

  describe('failJob', () => {
    test('should mark job as pending for retry on first failure', async () => {
      const queuedJob = await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'full',
        priority: 50
      });

      // Start the job
      await pool.query(
        'UPDATE catalog_sync_queue SET status = $1, started_at = NOW() WHERE id = $2',
        ['running', queuedJob.id]
      );

      const failedJob = await CatalogSyncService.failJob(queuedJob.id, 'API timeout');

      expect(failedJob.status).toBe('pending'); // Ready for retry
      expect(failedJob.retry_count).toBe(1);
      expect(failedJob.error_message).toBe('API timeout');
    });

    test('should mark job as failed after max retries', async () => {
      const queuedJob = await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'full',
        priority: 50
      });

      // Simulate being at max retries (retry_count = 3 means already failed 3 times)
      await pool.query(
        'UPDATE catalog_sync_queue SET status = $1, retry_count = $2, max_retries = $3, started_at = NOW() WHERE id = $4',
        ['running', 3, 3, queuedJob.id]
      );

      const failedJob = await CatalogSyncService.failJob(queuedJob.id, 'API timeout');

      expect(failedJob.status).toBe('failed'); // No more retries
      expect(failedJob.retry_count).toBe(4);
      expect(failedJob.completed_at).toBeDefined();
    });
  });

  describe('syncProduct', () => {
    test('should insert a new product', async () => {
      const product = await CatalogSyncService.syncProduct({
        externalId: 'TEST-PRODUCT-001',
        brandId: testBrand.id,
        name: 'Test Product 1',
        description: 'A test product',
        category: 'dresses',
        priceCents: 9999,
        originalPriceCents: 14999,
        isAvailable: true,
        imageUrl: 'https://example.com/image.jpg',
        productUrl: 'https://teststore.com/product-1',
        colors: ['black', 'white'],
        sizes: ['S', 'M', 'L'],
        metadata: { test: true }
      }, testStore.id);

      expect(product).toBeDefined();
      expect(product.external_product_id).toBe('TEST-PRODUCT-001');
      expect(product.product_name).toBe('Test Product 1');
      expect(product.price_cents).toBe(9999);
      expect(product.colors).toEqual(['black', 'white']);
    });

    test('should update existing product on conflict', async () => {
      // Insert initial product
      await CatalogSyncService.syncProduct({
        externalId: 'TEST-PRODUCT-002',
        brandId: testBrand.id,
        name: 'Test Product 2',
        description: 'Initial description',
        category: 'tops',
        priceCents: 5000,
        isAvailable: true,
        imageUrl: 'https://example.com/image2.jpg',
        productUrl: 'https://teststore.com/product-2'
      }, testStore.id);

      // Update with new price
      const updated = await CatalogSyncService.syncProduct({
        externalId: 'TEST-PRODUCT-002',
        brandId: testBrand.id,
        name: 'Test Product 2 Updated',
        description: 'Updated description',
        category: 'tops',
        priceCents: 4500,
        isAvailable: true,
        imageUrl: 'https://example.com/image2-new.jpg',
        productUrl: 'https://teststore.com/product-2'
      }, testStore.id);

      expect(updated.product_name).toBe('Test Product 2 Updated');
      expect(updated.price_cents).toBe(4500);
      expect(updated.product_description).toBe('Updated description');
    });
  });

  describe('syncProductsBatch', () => {
    test('should sync multiple products in batch', async () => {
      const products = [
        {
          externalId: 'BATCH-001',
          brandId: testBrand.id,
          name: 'Batch Product 1',
          description: 'Batch test 1',
          category: 'dresses',
          priceCents: 7999,
          isAvailable: true,
          imageUrl: 'https://example.com/batch1.jpg',
          productUrl: 'https://teststore.com/batch1'
        },
        {
          externalId: 'BATCH-002',
          brandId: testBrand.id,
          name: 'Batch Product 2',
          description: 'Batch test 2',
          category: 'tops',
          priceCents: 4999,
          isAvailable: true,
          imageUrl: 'https://example.com/batch2.jpg',
          productUrl: 'https://teststore.com/batch2'
        },
        {
          externalId: 'BATCH-003',
          brandId: testBrand.id,
          name: 'Batch Product 3',
          description: 'Batch test 3',
          category: 'skirts',
          priceCents: 5999,
          isAvailable: true,
          imageUrl: 'https://example.com/batch3.jpg',
          productUrl: 'https://teststore.com/batch3'
        }
      ];

      const stats = await CatalogSyncService.syncProductsBatch(products, testStore.id);

      expect(stats.synced).toBe(3);
      expect(stats.failed).toBe(0);
    });

    test('should handle partial failures in batch', async () => {
      const products = [
        {
          externalId: 'BATCH-GOOD',
          brandId: testBrand.id,
          name: 'Good Product',
          description: 'Valid product',
          category: 'dresses',
          priceCents: 7999,
          isAvailable: true,
          imageUrl: 'https://example.com/good.jpg',
          productUrl: 'https://teststore.com/good'
        },
        {
          // Missing required fields - will fail
          externalId: 'BATCH-BAD',
          brandId: testBrand.id
          // Missing name, category, price, etc.
        }
      ];

      const stats = await CatalogSyncService.syncProductsBatch(products, testStore.id);

      expect(stats.synced).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.errors).toHaveLength(1);
    });
  });

  describe('getQueueStatus', () => {
    test('should get queue status with filters', async () => {
      const jobs = await CatalogSyncService.getQueueStatus({
        storeId: testStore.id,
        limit: 10
      });

      expect(Array.isArray(jobs)).toBe(true);
      jobs.forEach(job => {
        expect(job.store_id).toBe(testStore.id);
        expect(job.store_name).toBeDefined();
      });
    });

    test('should filter by status', async () => {
      const completedJobs = await CatalogSyncService.getQueueStatus({
        status: 'completed',
        limit: 5
      });

      completedJobs.forEach(job => {
        expect(job.status).toBe('completed');
      });
    });
  });

  describe('getSyncStats', () => {
    test('should get sync statistics', async () => {
      const stats = await CatalogSyncService.getSyncStats(testStore.id);

      expect(stats).toBeDefined();
      expect(typeof stats.pending_count).toBe('string');
      expect(typeof stats.completed_count).toBe('string');
      expect(typeof stats.failed_count).toBe('string');
    });

    test('should get global sync statistics', async () => {
      const stats = await CatalogSyncService.getSyncStats();

      expect(stats).toBeDefined();
    });
  });

  describe('cleanupOldJobs', () => {
    test('should clean up old completed jobs', async () => {
      // Create an old completed job
      const oldJob = await CatalogSyncService.queueSync({
        storeId: testStore.id,
        syncType: 'full',
        priority: 50
      });

      await pool.query(
        `UPDATE catalog_sync_queue
        SET status = 'completed',
            completed_at = NOW() - INTERVAL '31 days'
        WHERE id = $1`,
        [oldJob.id]
      );

      const deletedCount = await CatalogSyncService.cleanupOldJobs(30);

      expect(deletedCount).toBeGreaterThanOrEqual(1);
    });
  });
});
