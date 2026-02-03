/**
 * Catalog Sync Service
 * Manages syncing product catalogs from retailers with queue management
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class CatalogSyncService {
  /**
   * Queue a catalog sync job
   * @param {Object} options - Sync options
   * @param {number} options.storeId - Store ID to sync
   * @param {string} options.syncType - 'full', 'incremental', 'category', 'brand'
   * @param {number} options.priority - Priority (0-100, default 50)
   * @param {string} options.categoryFilter - Optional category filter
   * @param {string} options.brandFilter - Optional brand filter
   * @param {Date} options.scheduledFor - Optional scheduled time
   * @returns {Promise<Object>} Created sync job
   */
  static async queueSync(options) {
    const {
      storeId,
      syncType = 'full',
      priority = 50,
      categoryFilter = null,
      brandFilter = null,
      scheduledFor = null,
      metadata = {}
    } = options;

    try {
      const result = await pool.query(
        `INSERT INTO catalog_sync_queue (
          store_id,
          sync_type,
          priority,
          category_filter,
          brand_filter,
          scheduled_for,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [storeId, syncType, priority, categoryFilter, brandFilter, scheduledFor, JSON.stringify(metadata)]
      );

      logger.info(`Queued ${syncType} sync for store ${storeId} with priority ${priority}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to queue sync:', error);
      throw error;
    }
  }

  /**
   * Get next pending sync job
   * @returns {Promise<Object|null>} Next sync job or null
   */
  static async getNextJob() {
    try {
      const result = await pool.query(
        `UPDATE catalog_sync_queue
        SET status = 'running', started_at = NOW()
        WHERE id = (
          SELECT id FROM catalog_sync_queue
          WHERE status = 'pending'
          AND (scheduled_for IS NULL OR scheduled_for <= NOW())
          ORDER BY priority DESC, created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *`
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get next job:', error);
      throw error;
    }
  }

  /**
   * Mark sync job as completed
   * @param {number} jobId - Job ID
   * @param {number} productsSync - Number of products synced
   * @param {number} productsFailed - Number of products that failed
   * @returns {Promise<Object>} Updated job
   */
  static async completeJob(jobId, productsSynced, productsFailed = 0) {
    try {
      const result = await pool.query(
        `UPDATE catalog_sync_queue
        SET
          status = 'completed',
          completed_at = NOW(),
          products_synced = $2,
          products_failed = $3
        WHERE id = $1
        RETURNING *`,
        [jobId, productsSynced, productsFailed]
      );

      logger.info(`Completed sync job ${jobId}: ${productsSynced} synced, ${productsFailed} failed`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to complete job:', error);
      throw error;
    }
  }

  /**
   * Mark sync job as failed
   * @param {number} jobId - Job ID
   * @param {string} errorMessage - Error message
   * @returns {Promise<Object>} Updated job
   */
  static async failJob(jobId, errorMessage) {
    try {
      const result = await pool.query(
        `UPDATE catalog_sync_queue
        SET
          status = CASE
            WHEN retry_count < max_retries THEN 'pending'
            ELSE 'failed'
          END,
          retry_count = retry_count + 1,
          error_message = $2,
          completed_at = CASE
            WHEN retry_count >= max_retries THEN NOW()
            ELSE NULL
          END
        WHERE id = $1
        RETURNING *`,
        [jobId, errorMessage]
      );

      const job = result.rows[0];
      if (job.status === 'failed') {
        logger.error(`Sync job ${jobId} failed after ${job.retry_count} retries: ${errorMessage}`);
      } else {
        logger.warn(`Sync job ${jobId} failed, will retry (${job.retry_count}/${job.max_retries}): ${errorMessage}`);
      }

      return job;
    } catch (error) {
      logger.error('Failed to mark job as failed:', error);
      throw error;
    }
  }

  /**
   * Sync a product from retailer data
   * @param {Object} productData - Product data from retailer
   * @param {number} storeId - Store ID
   * @returns {Promise<Object>} Created/updated product
   */
  static async syncProduct(productData, storeId) {
    const {
      externalId,
      brandId = null,
      name,
      description,
      shortDescription = null,
      category,
      subcategory = null,
      productType = null,
      gender = null,
      priceCents,
      originalPriceCents = null,
      currency = 'USD',
      isAvailable = true,
      stockStatus = 'in_stock',
      imageUrl,
      additionalImages = [],
      productUrl,
      affiliateLink = null,
      colors = [],
      sizes = [],
      materials = [],
      careInstructions = null,
      metadata = {},
      syncSource = 'api'
    } = productData;

    try {
      const result = await pool.query(
        `INSERT INTO product_catalog (
          external_product_id,
          store_id,
          brand_id,
          product_name,
          product_description,
          short_description,
          category,
          sub_category,
          product_type,
          gender,
          price_cents,
          original_price_cents,
          currency,
          is_available,
          stock_status,
          primary_image_url,
          additional_images,
          product_url,
          affiliate_link,
          colors,
          sizes,
          materials,
          care_instructions,
          metadata,
          sync_source,
          sync_status,
          last_batch_update
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW())
        ON CONFLICT (external_product_id, store_id)
        DO UPDATE SET
          product_name = EXCLUDED.product_name,
          product_description = EXCLUDED.product_description,
          price_cents = EXCLUDED.price_cents,
          original_price_cents = EXCLUDED.original_price_cents,
          is_available = EXCLUDED.is_available,
          stock_status = EXCLUDED.stock_status,
          primary_image_url = EXCLUDED.primary_image_url,
          additional_images = EXCLUDED.additional_images,
          affiliate_link = EXCLUDED.affiliate_link,
          colors = EXCLUDED.colors,
          sizes = EXCLUDED.sizes,
          materials = EXCLUDED.materials,
          metadata = EXCLUDED.metadata,
          last_batch_update = NOW(),
          updated_at = NOW()
        RETURNING *`,
        [
          externalId,
          storeId,
          brandId,
          name,
          description,
          shortDescription,
          category,
          subcategory,
          productType,
          gender,
          priceCents,
          originalPriceCents,
          currency,
          isAvailable,
          stockStatus,
          imageUrl,
          JSON.stringify(additionalImages),
          productUrl,
          affiliateLink,
          colors,
          sizes,
          materials,
          careInstructions,
          JSON.stringify(metadata),
          syncSource,
          'active'
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error(`Failed to sync product ${externalId}:`, error);
      throw error;
    }
  }

  /**
   * Sync multiple products in batch
   * @param {Array} products - Array of product data
   * @param {number} storeId - Store ID
   * @returns {Promise<Object>} Sync stats
   */
  static async syncProductsBatch(products, storeId) {
    let synced = 0;
    let failed = 0;
    const errors = [];

    for (const productData of products) {
      try {
        await this.syncProduct(productData, storeId);
        synced++;

        if (synced % 100 === 0) {
          logger.info(`Progress: ${synced}/${products.length} products synced`);
        }
      } catch (error) {
        failed++;
        errors.push({
          externalId: productData.externalId,
          error: error.message
        });
      }
    }

    logger.info(`Batch sync completed: ${synced} synced, ${failed} failed`);

    return {
      synced,
      failed,
      errors
    };
  }

  /**
   * Execute a sync job
   * @param {number} jobId - Job ID
   * @param {Function} syncFunction - Function that returns product data
   * @returns {Promise<Object>} Sync results
   */
  static async executeJob(jobId, syncFunction) {
    try {
      // Get job details
      const jobResult = await pool.query(
        'SELECT * FROM catalog_sync_queue WHERE id = $1',
        [jobId]
      );

      const job = jobResult.rows[0];
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      logger.info(`Executing sync job ${jobId} for store ${job.store_id}`);

      // Execute the sync function to get product data
      const products = await syncFunction(job);

      // Sync products
      const stats = await this.syncProductsBatch(products, job.store_id);

      // Mark job as completed
      await this.completeJob(jobId, stats.synced, stats.failed);

      return {
        jobId,
        ...stats
      };
    } catch (error) {
      logger.error(`Job ${jobId} execution failed:`, error);
      await this.failJob(jobId, error.message);
      throw error;
    }
  }

  /**
   * Get sync queue status
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Sync jobs
   */
  static async getQueueStatus(filters = {}) {
    const { storeId = null, status = null, limit = 50 } = filters;

    let query = `
      SELECT
        csq.*,
        s.name as store_name,
        s.slug as store_slug
      FROM catalog_sync_queue csq
      JOIN stores s ON csq.store_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (storeId) {
      query += ` AND csq.store_id = $${paramIndex}`;
      params.push(storeId);
      paramIndex++;
    }

    if (status) {
      query += ` AND csq.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY csq.priority DESC, csq.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get queue status:', error);
      throw error;
    }
  }

  /**
   * Get sync statistics
   * @param {number} storeId - Optional store ID filter
   * @returns {Promise<Object>} Sync statistics
   */
  static async getSyncStats(storeId = null) {
    try {
      let query = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE status = 'running') as running_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
          SUM(products_synced) as total_products_synced,
          SUM(products_failed) as total_products_failed,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
        FROM catalog_sync_queue
      `;

      const params = [];
      if (storeId) {
        query += ' WHERE store_id = $1';
        params.push(storeId);
      }

      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get sync stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old completed jobs
   * @param {number} daysOld - Delete jobs older than this many days
   * @returns {Promise<number>} Number of jobs deleted
   */
  static async cleanupOldJobs(daysOld = 30) {
    try {
      const result = await pool.query(
        `DELETE FROM catalog_sync_queue
        WHERE status IN ('completed', 'failed')
        AND completed_at < NOW() - INTERVAL '1 day' * $1
        RETURNING id`,
        [daysOld]
      );

      logger.info(`Cleaned up ${result.rowCount} old sync jobs`);
      return result.rowCount;
    } catch (error) {
      logger.error('Failed to cleanup old jobs:', error);
      throw error;
    }
  }
}

module.exports = CatalogSyncService;
