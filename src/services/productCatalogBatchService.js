/**
 * Product Catalog Batch Service (JAR)
 *
 * Purpose: Scheduled batch imports of product catalogs from affiliate networks
 * Run Frequency: Every 6-24 hours
 * Cost: Low (bulk operations, scheduled)
 *
 * Features:
 * - Import full product catalogs from affiliate networks
 * - Update prices, availability, metadata
 * - Track import stats and errors
 * - Minimize API calls through bulk operations
 */

const pool = require('../db/pool');

class ProductCatalogBatchService {
  /**
   * Import full product catalog from a store
   * @param {number} storeId - Store ID from stores table
   * @param {string} affiliateNetwork - 'rakuten', 'cj', 'shareasale', 'impact', 'amazon'
   * @returns {Promise<Object>} Import statistics
   */
  async importStoreCatalog(storeId, affiliateNetwork) {
    const logId = await this._createImportLog(storeId, 'full_catalog');
    const startTime = Date.now();

    try {
      await this._updateLogStatus(logId, 'running');

      // Get store details
      const store = await this._getStore(storeId);

      // Fetch products from affiliate network
      const products = await this._fetchProductsFromNetwork(store, affiliateNetwork);

      // Process products in batches
      const stats = await this._processProductBatch(storeId, products);

      // Complete log
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      await this._completeImportLog(logId, stats, durationSeconds);

      return {
        success: true,
        stats,
        durationSeconds,
      };
    } catch (error) {
      await this._failImportLog(logId, error);
      throw error;
    }
  }

  /**
   * Incremental price update (faster, cheaper than full import)
   * @param {number} storeId - Store ID
   * @param {string} affiliateNetwork - Network name
   * @returns {Promise<Object>} Update statistics
   */
  async updateStorePrices(storeId, affiliateNetwork) {
    const logId = await this._createImportLog(storeId, 'price_update');
    const startTime = Date.now();

    try {
      await this._updateLogStatus(logId, 'running');

      // Get existing products for this store
      const existingProducts = await this._getExistingProducts(storeId);

      // Fetch updated pricing from network (cheaper API call)
      const priceUpdates = await this._fetchPriceUpdates(affiliateNetwork, existingProducts);

      // Update prices in database
      const stats = await this._updatePrices(priceUpdates);

      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      await this._completeImportLog(logId, stats, durationSeconds);

      return {
        success: true,
        stats,
        durationSeconds,
      };
    } catch (error) {
      await this._failImportLog(logId, error);
      throw error;
    }
  }

  /**
   * Get products that need real-time refresh (popular items)
   * @param {number} limit - Max products to return
   * @returns {Promise<Array>} Products needing refresh
   */
  async getProductsNeedingRefresh(limit = 100) {
    const query = `
      SELECT
        pc.id,
        pc.external_product_id,
        pc.store_id,
        pc.product_name,
        pc.last_realtime_check,
        COUNT(pui.id) as recent_interactions
      FROM product_catalog pc
      LEFT JOIN product_user_interactions pui
        ON pc.id = pui.product_catalog_id
        AND pui.interacted_at > NOW() - INTERVAL '24 hours'
      WHERE
        pc.is_available = true
        AND (
          pc.last_realtime_check IS NULL
          OR pc.last_realtime_check < NOW() - INTERVAL '1 hour'
        )
      GROUP BY pc.id
      HAVING COUNT(pui.id) > 0  -- Only refresh products with recent activity
      ORDER BY COUNT(pui.id) DESC, pc.last_realtime_check ASC NULLS FIRST
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Clean up old cache entries
   * @returns {Promise<number>} Number of entries deleted
   */
  async cleanupExpiredCache() {
    const query = `
      DELETE FROM product_realtime_cache
      WHERE expires_at < NOW()
      RETURNING id
    `;

    const result = await pool.query(query);
    return result.rowCount;
  }

  /**
   * Get batch import statistics
   * @param {number} days - Days to look back
   * @returns {Promise<Array>} Import stats
   */
  async getImportStats(days = 7) {
    const query = `
      SELECT
        bil.store_id,
        s.display_name as store_name,
        bil.job_type,
        bil.status,
        COUNT(*) as job_count,
        SUM(bil.products_processed) as total_processed,
        SUM(bil.products_created) as total_created,
        SUM(bil.products_updated) as total_updated,
        SUM(bil.products_failed) as total_failed,
        AVG(bil.duration_seconds) as avg_duration_seconds
      FROM batch_import_logs bil
      JOIN stores s ON bil.store_id = s.id
      WHERE bil.started_at > NOW() - INTERVAL '${days} days'
      GROUP BY bil.store_id, s.display_name, bil.job_type, bil.status
      ORDER BY bil.store_id, bil.job_type
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  async _createImportLog(storeId, jobType) {
    const query = `
      INSERT INTO batch_import_logs (store_id, job_type, status)
      VALUES ($1, $2, 'running')
      RETURNING id
    `;

    const result = await pool.query(query, [storeId, jobType]);
    return result.rows[0].id;
  }

  async _updateLogStatus(logId, status) {
    const query = `
      UPDATE batch_import_logs
      SET status = $1
      WHERE id = $2
    `;

    await pool.query(query, [status, logId]);
  }

  async _completeImportLog(logId, stats, durationSeconds) {
    const query = `
      UPDATE batch_import_logs
      SET
        status = 'completed',
        products_processed = $1,
        products_created = $2,
        products_updated = $3,
        products_failed = $4,
        completed_at = NOW(),
        duration_seconds = $5
      WHERE id = $6
    `;

    await pool.query(query, [
      stats.processed,
      stats.created,
      stats.updated,
      stats.failed,
      durationSeconds,
      logId,
    ]);
  }

  async _failImportLog(logId, error) {
    const query = `
      UPDATE batch_import_logs
      SET
        status = 'failed',
        completed_at = NOW(),
        error_message = $1,
        error_details = $2
      WHERE id = $3
    `;

    await pool.query(query, [
      error.message,
      JSON.stringify({ stack: error.stack }),
      logId,
    ]);
  }

  async _getStore(storeId) {
    const query = 'SELECT * FROM stores WHERE id = $1';
    const result = await pool.query(query, [storeId]);
    return result.rows[0];
  }

  async _getExistingProducts(storeId) {
    const query = `
      SELECT id, external_product_id, price_cents
      FROM product_catalog
      WHERE store_id = $1 AND is_available = true
    `;

    const result = await pool.query(query, [storeId]);
    return result.rows;
  }

  /**
   * Fetch products from affiliate network
   * NOTE: This is a STUB - you'll implement actual network calls
   */
  async _fetchProductsFromNetwork(store, affiliateNetwork) {
    // TODO: Implement actual affiliate network API calls
    // For now, return mock data for testing

    console.log(`[BATCH] Fetching products from ${affiliateNetwork} for store: ${store.display_name}`);

    // Mock product data structure
    return [
      {
        external_id: 'PROD-001',
        name: 'Classic White T-Shirt',
        description: 'Comfortable cotton t-shirt',
        category: 'Apparel',
        sub_category: 'Tops',
        price_cents: 2999,
        original_price_cents: 3499,
        is_available: true,
        stock_status: 'in_stock',
        primary_image_url: 'https://example.com/tshirt.jpg',
        additional_images: ['https://example.com/tshirt-2.jpg'],
        product_url: 'https://store.com/products/white-tshirt',
        affiliate_link: 'https://affiliate.com/track?id=123',
        metadata: {
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          colors: ['White', 'Black', 'Gray'],
          material: '100% Cotton',
        },
      },
      // More products...
    ];
  }

  /**
   * Fetch price updates (cheaper API call than full catalog)
   */
  async _fetchPriceUpdates(affiliateNetwork, existingProducts) {
    // TODO: Implement actual price update API calls
    console.log(`[BATCH] Fetching price updates from ${affiliateNetwork}`);

    return existingProducts.map(product => ({
      external_id: product.external_product_id,
      price_cents: product.price_cents - 500, // Mock: prices dropped $5
      is_available: true,
    }));
  }

  /**
   * Process and insert/update products in batch
   */
  async _processProductBatch(storeId, products) {
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const product of products) {
      try {
        const result = await this._upsertProduct(storeId, product);
        if (result.created) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`[BATCH] Failed to process product ${product.external_id}:`, error.message);
        failed++;
      }
    }

    return {
      processed: products.length,
      created,
      updated,
      failed,
    };
  }

  /**
   * Insert or update a single product
   */
  async _upsertProduct(storeId, product) {
    const query = `
      INSERT INTO product_catalog (
        external_product_id,
        store_id,
        product_name,
        product_description,
        category,
        sub_category,
        price_cents,
        original_price_cents,
        is_available,
        stock_status,
        primary_image_url,
        additional_images,
        product_url,
        affiliate_link,
        metadata,
        last_batch_update,
        batch_update_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), 1)
      ON CONFLICT (external_product_id, store_id) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        product_description = EXCLUDED.product_description,
        category = EXCLUDED.category,
        sub_category = EXCLUDED.sub_category,
        price_cents = EXCLUDED.price_cents,
        original_price_cents = EXCLUDED.original_price_cents,
        is_available = EXCLUDED.is_available,
        stock_status = EXCLUDED.stock_status,
        primary_image_url = EXCLUDED.primary_image_url,
        additional_images = EXCLUDED.additional_images,
        product_url = EXCLUDED.product_url,
        affiliate_link = EXCLUDED.affiliate_link,
        metadata = EXCLUDED.metadata,
        last_batch_update = NOW(),
        batch_update_count = product_catalog.batch_update_count + 1
      RETURNING (xmax = 0) AS created
    `;

    const result = await pool.query(query, [
      product.external_id,
      storeId,
      product.name,
      product.description,
      product.category,
      product.sub_category,
      product.price_cents,
      product.original_price_cents,
      product.is_available,
      product.stock_status,
      product.primary_image_url,
      JSON.stringify(product.additional_images),
      product.product_url,
      product.affiliate_link,
      JSON.stringify(product.metadata),
    ]);

    return { created: result.rows[0].created };
  }

  /**
   * Update prices for existing products
   */
  async _updatePrices(priceUpdates) {
    let updated = 0;
    let failed = 0;

    for (const update of priceUpdates) {
      try {
        const query = `
          UPDATE product_catalog
          SET
            price_cents = $1,
            is_available = $2,
            last_batch_update = NOW(),
            batch_update_count = batch_update_count + 1
          WHERE external_product_id = $3
        `;

        await pool.query(query, [
          update.price_cents,
          update.is_available,
          update.external_id,
        ]);

        updated++;
      } catch (error) {
        console.error(`[BATCH] Failed to update price for ${update.external_id}:`, error.message);
        failed++;
      }
    }

    return {
      processed: priceUpdates.length,
      created: 0,
      updated,
      failed,
    };
  }
}

module.exports = new ProductCatalogBatchService();
