/**
 * Product Realtime Service
 *
 * Purpose: On-demand real-time product data fetching
 * Trigger: User clicks into product detail page
 * Cost: Higher per-call, but only when needed
 *
 * Features:
 * - Fetch fresh product data (price, availability, variants)
 * - Smart caching to minimize API costs
 * - Track user interactions to trigger updates
 * - Generate affiliate deep links
 */

const pool = require('../db/pool');

class ProductRealtimeService {
  // Cache TTL in minutes
  static CACHE_TTL_MINUTES = 15;

  /**
   * Get real-time product data for product detail page
   * Strategy: Check cache first, fetch from API if expired
   *
   * @param {number} productId - Product catalog ID
   * @param {number} userId - User ID (for tracking)
   * @returns {Promise<Object>} Real-time product data
   */
  async getRealtimeProductData(productId, userId) {
    // Track user interaction
    await this._trackInteraction(userId, productId, 'view');

    // Check cache first
    const cached = await this._getCachedData(productId);
    if (cached && !this._isCacheExpired(cached)) {
      console.log(`[REALTIME] Cache HIT for product ${productId}`);
      return {
        ...cached.data,
        source: 'cache',
        cached_at: cached.fetched_at,
      };
    }

    // Cache miss or expired - fetch fresh data
    console.log(`[REALTIME] Cache MISS for product ${productId} - fetching from API`);
    const freshData = await this._fetchFreshProductData(productId);

    // Update cache
    await this._updateCache(productId, freshData);

    return {
      ...freshData,
      source: 'api',
      fetched_at: new Date(),
    };
  }

  /**
   * Generate affiliate deep link for checkout
   * @param {number} productId - Product catalog ID
   * @param {number} userId - User ID
   * @returns {Promise<string>} Affiliate link with tracking
   */
  async generateAffiliateLink(productId, userId) {
    // Track click
    await this._trackInteraction(userId, productId, 'click');

    // Get product details
    const product = await this._getProduct(productId);

    // Generate deep link with affiliate tracking
    // TODO: Implement actual affiliate network deep link generation
    const deepLink = await this._generateDeepLink(product);

    // Track API call
    await this._trackApiCall(product.store_id, 'deep_link', deepLink);

    return deepLink;
  }

  /**
   * Track user adding item to cart (triggers real-time refresh)
   * @param {number} userId - User ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Updated product data
   */
  async trackCartAdd(userId, productId) {
    // Track interaction
    await this._trackInteraction(userId, productId, 'cart_add', true);

    // Force fresh data for cart items (ensure price is current)
    const freshData = await this._fetchFreshProductData(productId);
    await this._updateCache(productId, freshData);

    return freshData;
  }

  /**
   * Batch fetch real-time data for multiple products (e.g., cart page)
   * @param {Array<number>} productIds - Array of product IDs
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Real-time data for all products
   */
  async batchGetRealtimeData(productIds, userId) {
    const results = [];

    for (const productId of productIds) {
      try {
        const data = await this.getRealtimeProductData(productId, userId);
        results.push({ productId, data, success: true });
      } catch (error) {
        console.error(`[REALTIME] Failed to fetch product ${productId}:`, error.message);
        results.push({ productId, error: error.message, success: false });
      }
    }

    return results;
  }

  /**
   * Get cost statistics for real-time API calls
   * @param {number} days - Days to look back
   * @returns {Promise<Object>} Cost stats
   */
  async getCostStats(days = 7) {
    const query = `
      SELECT
        act.store_id,
        s.display_name as store_name,
        act.api_type,
        COUNT(*) as call_count,
        SUM(act.estimated_cost_cents) as total_cost_cents,
        AVG(act.response_time_ms) as avg_response_time_ms
      FROM api_call_tracking act
      JOIN stores s ON act.store_id = s.id
      WHERE act.called_at > NOW() - INTERVAL '${days} days'
      GROUP BY act.store_id, s.display_name, act.api_type
      ORDER BY total_cost_cents DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get cache hit rate statistics
   * @param {number} hours - Hours to look back
   * @returns {Promise<Object>} Cache performance stats
   */
  async getCacheStats(hours = 24) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE source = 'cache') as cache_hits,
        COUNT(*) FILTER (WHERE source = 'api') as cache_misses,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE source = 'cache') / NULLIF(COUNT(*), 0),
          2
        ) as cache_hit_rate_percent
      FROM (
        SELECT
          CASE
            WHEN prc.expires_at > NOW() THEN 'cache'
            ELSE 'api'
          END as source
        FROM product_user_interactions pui
        LEFT JOIN product_realtime_cache prc
          ON pui.product_catalog_id = prc.product_catalog_id
        WHERE pui.interacted_at > NOW() - INTERVAL '${hours} hours'
          AND pui.interaction_type IN ('view', 'click')
      ) stats
    `;

    const result = await pool.query(query);
    return result.rows[0] || { cache_hits: 0, cache_misses: 0, cache_hit_rate_percent: 0 };
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  async _getCachedData(productId) {
    const query = `
      SELECT
        product_catalog_id,
        current_price_cents,
        is_available,
        available_variants,
        shipping_info,
        promotions,
        fetched_at,
        expires_at
      FROM product_realtime_cache
      WHERE product_catalog_id = $1
    `;

    const result = await pool.query(query, [productId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      data: {
        current_price_cents: row.current_price_cents,
        is_available: row.is_available,
        available_variants: row.available_variants,
        shipping_info: row.shipping_info,
        promotions: row.promotions,
      },
      fetched_at: row.fetched_at,
      expires_at: row.expires_at,
    };
  }

  _isCacheExpired(cached) {
    return new Date(cached.expires_at) < new Date();
  }

  async _fetchFreshProductData(productId) {
    // Get base product info
    const product = await this._getProduct(productId);

    // Fetch fresh data from affiliate network
    // TODO: Implement actual affiliate API call
    const freshData = await this._callAffiliateApi(product);

    // Update product catalog with fresh data
    await this._updateProductCatalog(productId, freshData);

    // Track API call cost
    await this._trackApiCall(product.store_id, 'realtime_lookup', freshData);

    return freshData;
  }

  async _getProduct(productId) {
    const query = `
      SELECT
        pc.*,
        s.display_name as store_name,
        s.integration_type
      FROM product_catalog pc
      JOIN stores s ON pc.store_id = s.id
      WHERE pc.id = $1
    `;

    const result = await pool.query(query, [productId]);

    if (result.rows.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Call affiliate network API for real-time data
   * NOTE: This is a STUB - you'll implement actual network calls
   */
  async _callAffiliateApi(product) {
    console.log(`[REALTIME] Calling API for product: ${product.product_name}`);

    // TODO: Implement actual affiliate network API calls
    // For now, return mock fresh data

    return {
      current_price_cents: product.price_cents - Math.floor(Math.random() * 500), // Random price variation
      is_available: true,
      available_variants: {
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Black', 'White', 'Gray'],
      },
      shipping_info: {
        free_shipping: true,
        estimated_days: '3-5',
      },
      promotions: [
        {
          type: 'discount',
          description: '10% off with code SAVE10',
          code: 'SAVE10',
        },
      ],
    };
  }

  async _updateCache(productId, freshData) {
    const expiresAt = new Date(Date.now() + ProductRealtimeService.CACHE_TTL_MINUTES * 60 * 1000);

    const query = `
      INSERT INTO product_realtime_cache (
        product_catalog_id,
        current_price_cents,
        is_available,
        available_variants,
        shipping_info,
        promotions,
        fetched_at,
        expires_at,
        api_call_cost_cents
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
      ON CONFLICT (product_catalog_id) DO UPDATE SET
        current_price_cents = EXCLUDED.current_price_cents,
        is_available = EXCLUDED.is_available,
        available_variants = EXCLUDED.available_variants,
        shipping_info = EXCLUDED.shipping_info,
        promotions = EXCLUDED.promotions,
        fetched_at = NOW(),
        expires_at = EXCLUDED.expires_at,
        api_call_cost_cents = EXCLUDED.api_call_cost_cents
    `;

    await pool.query(query, [
      productId,
      freshData.current_price_cents,
      freshData.is_available,
      JSON.stringify(freshData.available_variants),
      JSON.stringify(freshData.shipping_info),
      JSON.stringify(freshData.promotions),
      expiresAt,
      1, // TODO: Calculate actual API cost
    ]);
  }

  async _updateProductCatalog(productId, freshData) {
    const query = `
      UPDATE product_catalog
      SET
        price_cents = $1,
        is_available = $2,
        last_realtime_check = NOW(),
        realtime_check_count = realtime_check_count + 1
      WHERE id = $3
    `;

    await pool.query(query, [
      freshData.current_price_cents,
      freshData.is_available,
      productId,
    ]);
  }

  async _trackInteraction(userId, productId, interactionType, triggeredRealtimeFetch = false) {
    const query = `
      INSERT INTO product_user_interactions (
        user_id,
        product_catalog_id,
        interaction_type,
        triggered_realtime_fetch
      ) VALUES ($1, $2, $3, $4)
    `;

    await pool.query(query, [userId, productId, interactionType, triggeredRealtimeFetch]);
  }

  async _trackApiCall(storeId, apiType, responseData) {
    const query = `
      INSERT INTO api_call_tracking (
        store_id,
        api_type,
        endpoint,
        call_count,
        estimated_cost_cents,
        response_status,
        response_time_ms
      ) VALUES ($1, $2, $3, 1, $4, $5, $6)
    `;

    await pool.query(query, [
      storeId,
      apiType,
      'affiliate-api', // TODO: Get actual endpoint
      1, // TODO: Calculate actual cost
      200, // TODO: Get actual status
      50, // TODO: Measure actual response time
    ]);
  }

  async _generateDeepLink(product) {
    // TODO: Implement actual affiliate deep link generation
    // Different logic for each affiliate network

    const baseLink = product.affiliate_link || product.product_url;

    // Add tracking parameters
    const deepLink = `${baseLink}?muse_user=track&source=muse_app`;

    return deepLink;
  }
}

module.exports = new ProductRealtimeService();
